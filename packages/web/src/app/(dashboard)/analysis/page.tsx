"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ExternalLink, Heart, MessageCircle, Eye, CheckCircle, UserPlus, History, Sparkles, Loader2, TrendingUp, Share2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { analyzeProfile, getAnalysisHistory, saveAIReport, type AnalysisResult, type AnalysisEntry } from "./actions";

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function proxyImg(url: string): string {
  if (!url) return "";
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function extractAIScore(markdown: string): { total: number; dimensions: { name: string; score: number; weight: string }[] } | null {
  // Try to find score table in markdown — looks for patterns like "| Dimensão | Nota | Peso |"
  // and "Score final" or "score ponderado" lines
  const dimensions: { name: string; score: number; weight: string }[] = [];
  let total = 0;

  // Match table rows with dimension scores: "| Alinhamento... | 75 | 30% |" or similar
  const tableRows = markdown.match(/\|[^|]+\|\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:\/\s*100)?\s*\|[^|]*\d+%[^|]*\|/g);
  if (tableRows) {
    for (const row of tableRows) {
      const cells = row.split("|").filter(Boolean).map(c => c.trim());
      if (cells.length >= 3) {
        const name = cells[0].replace(/\*\*/g, "").trim();
        const scoreStr = cells[1].replace(/[^\d.,]/g, "").replace(",", ".");
        const score = parseFloat(scoreStr);
        const weightMatch = cells[2]?.match(/(\d+)%/);
        if (!isNaN(score) && name && weightMatch) {
          dimensions.push({ name, score, weight: `${weightMatch[1]}%` });
        }
      }
    }
  }

  // Match total score: "Score final ponderado: 72" or "**Score Final:** 72/100" etc
  const totalMatch = markdown.match(/(?:score\s*final|total|ponderado)[^:]*[:：]\s*\**\s*(\d{1,3}(?:[.,]\d+)?)/i)
    || markdown.match(/(\d{1,3})\s*\/\s*100\s*\**\s*(?:pontos|pts|score final)/i);
  if (totalMatch) {
    total = Math.round(parseFloat(totalMatch[1].replace(",", ".")));
  } else if (dimensions.length > 0) {
    // Calculate from dimensions
    total = Math.round(dimensions.reduce((sum, d) => {
      const w = parseInt(d.weight) / 100;
      return sum + d.score * w;
    }, 0));
  }

  if (dimensions.length === 0 && total === 0) return null;
  return { total, dimensions };
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-3 text-primary">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split("|").filter(Boolean).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return "";
      const tag = match.includes("---") ? "th" : "td";
      return `<tr>${cells.map(c => `<${tag} class="border border-border px-3 py-1.5 text-sm">${c}</${tag}>`).join("")}</tr>`;
    })
    .replace(/^- (.+)$/gm, '<li class="text-sm text-muted-foreground ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-sm text-muted-foreground ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '<div class="h-3"></div>')
    .replace(/\n/g, "<br/>");
}

const FIT_COLORS: Record<string, { label: string; ring: string; text: string; bg: string }> = {
  recommended: { label: "Recomendado", ring: "border-[#22C55E]", text: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
  neutral: { label: "Neutro", ring: "border-[#F59E0B]", text: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  not_recommended: { label: "Nao Recomendado", ring: "border-[#EF4444]", text: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
};

export default function AnalysisPage() {
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "strengths" | "ai">("posts");
  const [aiMarkdown, setAiMarkdown] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiContainerRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    const { data } = await getAnalysisHistory();
    setHistory(data);
  }, []);

  useEffect(() => {
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  async function handleAnalyze() {
    if (!handle.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error: err } = await analyzeProfile(handle.trim(), platform);
    if (err) setError(err);
    if (data) setResult(data);
    setLoading(false);
    loadHistory();
  }

  async function handleGenerateAI() {
    if (!result) return;
    setAiLoading(true);
    setAiError(null);
    setAiMarkdown("");
    setActiveTab("ai");

    try {
      const res = await fetch("/api/analysis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: result.profile,
          posts: result.posts.slice(0, 10).map(p => ({
            type: p.type,
            caption: p.caption.slice(0, 280),
            like_count: p.like_count,
            comment_count: p.comment_count,
            play_count: p.play_count,
          })),
          comments: (result.comments || []).slice(0, 30).map(c => ({
            username: c.username,
            text: c.text,
            likes: c.likes,
          })),
          brandKeywords: result.brandKeywords || [],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro na API");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming não suportado");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullMarkdown = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.error) throw new Error(data.error);
            if (data.text) {
              fullMarkdown += data.text;
              setAiMarkdown(prev => prev + data.text);
              if (aiContainerRef.current) {
                aiContainerRef.current.scrollTop = aiContainerRef.current.scrollHeight;
              }
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // Save AI report to history
      if (fullMarkdown) {
        saveAIReport(result.profile.handle, result.profile.platform, fullMarkdown);
      }
    } catch (err) {
      setAiError(String(err));
    } finally {
      setAiLoading(false);
    }
  }

  const fit = result ? FIT_COLORS[result.fit_classification] || FIT_COLORS.neutral : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Analise de Perfil" description="Analise completa de influencers com metricas e score de fit" />

      {/* Platform Tabs + Search */}
      <Tabs defaultValue="instagram" onValueChange={(v) => { setPlatform(v as string); setResult(null); setError(null); }}>
        <TabsList className="w-full justify-start mb-3">
          <TabsTrigger value="instagram">
            <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            Instagram
          </TabsTrigger>
          <TabsTrigger value="tiktok">
            <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.16z"/></svg>
            TikTok
          </TabsTrigger>
        </TabsList>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-semibold">Handle {platform === "instagram" ? "Instagram" : "TikTok"}</Label>
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={platform === "instagram" ? "@username" : "@handle"}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
              </div>
              <Button onClick={handleAnalyze} disabled={loading || !handle.trim()} className="bg-gradient-to-r from-primary to-[oklch(0.6_0.18_350)] text-white shrink-0">
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Analisando..." : "Analisar Perfil"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {platform === "instagram"
                ? "Analisa perfil, posts recentes, comentarios e calcula engagement sobre seguidores."
                : "Analisa perfil, videos recentes, comentarios e calcula engagement sobre views (padrao TikTok)."}
            </p>
            {error && <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          </CardContent>
        </Card>
      </Tabs>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            {[1,2,3,4,5].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Profile + Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            {/* Profile */}
            <Card className="md:col-span-1 shadow-sm">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center gap-3">
                  {result.profile.profile_pic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxyImg(result.profile.profile_pic)} alt={result.profile.display_name} className="h-14 w-14 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-[oklch(0.6_0.18_350)] flex items-center justify-center text-white font-bold text-lg">
                      {result.profile.display_name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm flex items-center gap-1">
                      {result.profile.display_name}
                      {result.profile.is_verified && <CheckCircle className="h-3.5 w-3.5 text-blue-500" />}
                    </p>
                    <p className="text-xs text-muted-foreground">@{result.profile.handle}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{result.profile.biography || "Sem bio"}</p>
                <a href={`https://${platform === "tiktok" ? "tiktok.com/@" : "instagram.com/"}${result.profile.handle}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <ExternalLink className="h-3 w-3" />Ver perfil
                </a>
              </CardContent>
            </Card>

            {/* Audience */}
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Audiencia</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Seguidores</span><span className="font-bold">{fmtNum(result.profile.followers)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Seguindo</span><span className="font-bold">{fmtNum(result.profile.following)}</span></div>
                  {platform === "tiktok" ? (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Videos</span><span className="font-bold">{fmtNum(result.profile.posts_count)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Views Med.</span><span className="font-bold">{fmtNum(result.metrics.avg_views)}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Ratio</span><span className="font-bold">{result.metrics.ratio}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Posts</span><span className="font-bold">{fmtNum(result.profile.posts_count)}</span></div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Engagement */}
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Engajamento</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Eng. Rate</span>
                    <span className="font-bold">{result.metrics.engagement_rate}%</span>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Med. Likes</span><span className="font-bold">{fmtNum(result.metrics.avg_likes)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Med. Coment.</span><span className="font-bold">{fmtNum(result.metrics.avg_comments)}</span></div>
                  {platform === "tiktok" ? (
                    <div className="flex justify-between"><span className="text-muted-foreground">Med. Views</span><span className="font-bold">{fmtNum(result.metrics.avg_views)}</span></div>
                  ) : (
                    <div className="flex justify-between"><span className="text-muted-foreground">Med. Views</span><span className="font-bold">{result.metrics.avg_views > 0 ? fmtNum(result.metrics.avg_views) : "\u2014"}</span></div>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {platform === "tiktok" ? "Engagement calculado sobre views" : "Engagement calculado sobre seguidores"}
                </p>
              </CardContent>
            </Card>

            {/* Top Content */}
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Top Conteudo</p>
                {result.posts[0] ? (
                  <div className="space-y-2">
                    {result.posts[0].thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={result.posts[0].thumbnail} alt="Top post" className="w-full h-24 object-cover rounded-lg" />
                    )}
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Likes</span><span className="font-bold">{fmtNum(result.posts[0].like_count)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Coment.</span><span className="font-bold">{fmtNum(result.posts[0].comment_count)}</span></div>
                    </div>
                    <a href={result.posts[0].url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                      <ExternalLink className="h-3 w-3" />Ver
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem posts</p>
                )}
              </CardContent>
            </Card>

            {/* Fit Score */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 flex flex-col items-center justify-center">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Score de Fit</p>
                <div className={`w-20 h-20 rounded-full border-4 ${fit?.ring} flex flex-col items-center justify-center`}>
                  <span className={`text-2xl font-extrabold ${fit?.text}`}>{result.fit_score}</span>
                  <span className="text-[9px] text-muted-foreground">/100</span>
                </div>
                <span className={`mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${fit?.bg} ${fit?.text}`}>
                  {fit?.label}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Posts Grid */}
          {result.posts.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {result.posts.slice(0, 3).map((post) => (
                <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer" className="group relative rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                  {post.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.thumbnail} alt={post.caption.slice(0, 30)} className="w-full h-64 object-cover" />
                  ) : (
                    <div className="w-full h-64 bg-muted flex items-center justify-center text-muted-foreground">Sem preview</div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary/90 text-white text-[10px] capitalize">{post.type}</Badge>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="flex items-center gap-3 text-white text-xs">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmtNum(post.like_count)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{fmtNum(post.comment_count)}</span>
                      {post.play_count > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmtNum(post.play_count)}</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Salvar no Acervo
            </Button>
          </div>

          {/* Tabs */}
          <Card className="shadow-sm">
            <CardContent className="pt-0">
              <div className="flex border-b -mx-6 px-6">
                {([["posts", "Posts Recentes"], ["reels", "Reels & Videos"], ["strengths", "Analise"], ["ai", "Analise IA"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="pt-4">
                {(activeTab === "posts" || activeTab === "reels") && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Preview</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Caption</TableHead>
                        <TableHead className="text-right">Likes</TableHead>
                        <TableHead className="text-right">Coment.</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="w-[40px]">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.posts
                        .filter(p => activeTab === "reels" ? p.type === "reel" || p.type === "video" : true)
                        .map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>
                            {post.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={post.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {post.taken_at ? new Date(post.taken_at * 1000).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] capitalize">{post.type}</Badge></TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{post.caption || "—"}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{fmtNum(post.like_count)}</TableCell>
                          <TableCell className="text-right text-sm">{fmtNum(post.comment_count)}</TableCell>
                          <TableCell className="text-right text-sm">{post.play_count > 0 ? fmtNum(post.play_count) : "—"}</TableCell>
                          <TableCell>
                            <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {activeTab === "strengths" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-extrabold ${fit?.text}`}>{result.fit_score}/100</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fit?.bg} ${fit?.text}`}>{fit?.label}</span>
                    </div>

                    {result.strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-bold mb-2">Pontos Fortes</p>
                        <ul className="space-y-1">
                          {result.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-[#22C55E] mt-0.5">+</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.concerns.length > 0 && (
                      <div>
                        <p className="text-sm font-bold mb-2">Pontos de Atencao</p>
                        <ul className="space-y-1">
                          {result.concerns.map((c, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-[#EF4444] mt-0.5">!</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "ai" && (
                  <div className="space-y-4">
                    {!aiMarkdown && !aiLoading && !aiError && (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-[oklch(0.6_0.18_350)]/20 flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-bold text-sm">Analise com Inteligencia Artificial</p>
                          <p className="text-xs text-muted-foreground max-w-md">
                            Claude analisa o perfil como um analista senior de marketing de influencia,
                            gerando briefing, score detalhado, analise de conteudo e recomendacao final.
                          </p>
                        </div>
                        <Button
                          onClick={handleGenerateAI}
                          className="bg-gradient-to-r from-primary to-[oklch(0.6_0.18_350)] text-white"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Gerar Analise IA
                        </Button>
                      </div>
                    )}

                    {aiLoading && !aiMarkdown && (
                      <div className="flex items-center justify-center py-12 space-y-3">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Claude esta analisando o perfil...</p>
                        </div>
                      </div>
                    )}

                    {aiError && (
                      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                        {aiError}
                        <Button variant="outline" size="sm" className="ml-3" onClick={handleGenerateAI}>
                          Tentar novamente
                        </Button>
                      </div>
                    )}

                    {aiMarkdown && (() => {
                      const aiScore = !aiLoading ? extractAIScore(aiMarkdown) : null;
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-sm font-bold">Relatorio IA</span>
                              {aiLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            </div>
                            {!aiLoading && (
                              <Button variant="ghost" size="sm" onClick={handleGenerateAI}>
                                Regenerar
                              </Button>
                            )}
                          </div>

                          {aiScore && aiScore.dimensions.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-[200px_1fr] rounded-lg border border-border bg-muted/20 p-5">
                              {/* Score circle */}
                              <div className="flex flex-col items-center justify-center">
                                <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${
                                  aiScore.total >= 70 ? "border-[#22C55E]" : aiScore.total >= 40 ? "border-[#F59E0B]" : "border-[#EF4444]"
                                }`}>
                                  <span className={`text-3xl font-extrabold ${
                                    aiScore.total >= 70 ? "text-[#22C55E]" : aiScore.total >= 40 ? "text-[#F59E0B]" : "text-[#EF4444]"
                                  }`}>{aiScore.total}</span>
                                  <span className="text-[10px] text-muted-foreground">/100</span>
                                </div>
                                <div className="flex items-center gap-1 mt-2">
                                  <TrendingUp className="h-3 w-3 text-primary" />
                                  <span className="text-xs font-semibold text-muted-foreground">Score IA</span>
                                </div>
                              </div>
                              {/* Dimension bars */}
                              <div className="space-y-3 flex flex-col justify-center">
                                {aiScore.dimensions.map((dim, i) => (
                                  <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="font-medium">{dim.name}</span>
                                      <span className="text-muted-foreground">{Math.round(dim.score)}/100 <span className="text-[10px]">({dim.weight})</span></span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          dim.score >= 70 ? "bg-[#22C55E]" : dim.score >= 40 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                                        }`}
                                        style={{ width: `${Math.min(100, dim.score)}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div
                            ref={aiContainerRef}
                            className="prose prose-sm max-w-none max-h-[600px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-6"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(aiMarkdown) }}
                          />
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* History */}
      {!result && !loading && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold"><History className="inline mr-2 h-4 w-4" />Historico de Analises</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <EmptyState icon={Search} title="Nenhuma analise realizada" description="Insira um handle acima para analisar um perfil." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Handle</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Classificacao</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((a) => {
                    const fc = FIT_COLORS[a.fit_classification || "neutral"];
                    return (
                      <TableRow key={a.id} className="cursor-pointer" onClick={() => { setHandle(a.handle); setPlatform(a.platform); }}>
                        <TableCell className="font-medium">@{a.handle}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{a.platform}</Badge></TableCell>
                        <TableCell className={`font-bold ${fc.text}`}>{a.fit_score}</TableCell>
                        <TableCell><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fc.bg} ${fc.text}`}>{fc.label}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
