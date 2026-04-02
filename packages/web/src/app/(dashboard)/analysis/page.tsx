"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Search, ExternalLink, Heart, MessageCircle, Eye, CheckCircle, UserPlus, History } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { analyzeProfile, getAnalysisHistory, type AnalysisResult, type AnalysisEntry } from "./actions";

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
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
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "strengths">("posts");

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

  const fit = result ? FIT_COLORS[result.fit_classification] || FIT_COLORS.neutral : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Analise de Perfil" description="Analise completa de influencers com metricas e score de fit" />

      {/* Search */}
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
            <div className="w-36 space-y-2">
              <Label className="text-sm font-semibold">Plataforma</Label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !handle.trim()} className="bg-gradient-to-r from-primary to-[oklch(0.6_0.18_350)] text-white shrink-0">
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Analisando..." : "Minerar Dados"}
            </Button>
          </div>
          {error && <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        </CardContent>
      </Card>

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
                    <img src={result.profile.profile_pic} alt={result.profile.display_name} className="h-14 w-14 rounded-full object-cover border-2 border-border" />
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Ratio</span><span className="font-bold">{result.metrics.ratio}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Posts</span><span className="font-bold">{fmtNum(result.profile.posts_count)}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement */}
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Engajamento</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Eng. Rate</span><span className="font-bold">{result.metrics.engagement_rate}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Med. Likes</span><span className="font-bold">{fmtNum(result.metrics.avg_likes)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Med. Coment.</span><span className="font-bold">{fmtNum(result.metrics.avg_comments)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Med. Views</span><span className="font-bold">{fmtNum(result.metrics.avg_views)}</span></div>
                </div>
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
                {([["posts", "Posts Recentes"], ["reels", "Reels & Videos"], ["strengths", "Analise"]] as const).map(([key, label]) => (
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
