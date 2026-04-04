"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, UserPlus, History, ExternalLink, Eye, Heart, MessageCircle, Share2, CheckCircle, Globe, Tag, Users, MapPin } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getSearchHistory, getSearchResults, createSearch, saveResultAsInfluencer, findSimilarProfiles, type MiningSearch, type MiningResult } from "./actions";
import { NICHE_OPTIONS } from "@/lib/niches";

function proxyImg(url: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function fmtNum(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

const FOLLOWER_RANGES = [
  { value: "", label: "Todos" },
  { value: "10K-100K", label: "10K - 100K" },
  { value: "100K-1M", label: "100K - 1M" },
  { value: "1M-10M", label: "1M - 10M" },
  { value: "10M+", label: "10M+" },
];

// ── Skeleton loader for results grid ──
function ResultsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="shadow-sm">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Result card component ──
function ResultCard({
  r,
  onSave,
  onFindSimilar,
  findingSimilar,
}: {
  r: MiningResult;
  onSave: (id: string) => void;
  onFindSimilar: (handle: string) => void;
  findingSimilar: string | null;
}) {
  const rd = r.raw_data || {};
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4 space-y-4">
        {/* Header: Avatar + Name + Platform */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {r.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proxyImg(r.avatar_url)} alt={r.display_name || r.handle} className="h-12 w-12 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-[oklch(0.6_0.18_350)] flex items-center justify-center text-white text-sm font-bold">
                {(r.display_name || r.handle || "?")[0].toUpperCase()}
              </div>
            )}
            {rd.is_verified && (
              <CheckCircle className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-blue-500 bg-white rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{r.display_name || r.handle}</p>
            <p className="text-xs text-muted-foreground truncate">@{r.handle}</p>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="outline" className="text-[10px] capitalize">{r.platform}</Badge>
              {r.niche_estimate && (
                <Badge variant="secondary" className="text-[10px]">{r.niche_estimate}</Badge>
              )}
            </div>
          </div>
          <a
            href={r.profile_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-accent/50 px-3 py-2 text-center">
            <p className="text-lg font-extrabold">{fmtNum(r.followers)}</p>
            <p className="text-[10px] text-muted-foreground">Seguidores</p>
          </div>
          <div className="rounded-lg bg-accent/50 px-3 py-2 text-center">
            <p className="text-lg font-extrabold">{r.engagement_rate ? `${r.engagement_rate}%` : "\u2014"}</p>
            <p className="text-[10px] text-muted-foreground">Engajamento</p>
          </div>
        </div>

        {/* Content Metrics */}
        {(rd.total_views || rd.total_likes || rd.total_comments) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {rd.total_views ? <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmtNum(rd.total_views)}</span> : null}
            {rd.total_likes ? <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmtNum(rd.total_likes)}</span> : null}
            {rd.total_comments ? <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{fmtNum(rd.total_comments)}</span> : null}
            {rd.total_shares ? <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{fmtNum(rd.total_shares)}</span> : null}
            {rd.content_found ? <span className="text-foreground font-medium">{rd.content_found} post{rd.content_found > 1 ? "s" : ""}</span> : null}
          </div>
        )}

        {/* Enrichment: City + Category (Instagram) */}
        {(rd.ig_city || rd.ig_category) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {rd.ig_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{rd.ig_city}</span>}
            {rd.ig_category && <span className="px-1.5 py-0.5 bg-accent rounded text-[10px]">{rd.ig_category}</span>}
          </div>
        )}

        {/* Caption Preview */}
        {rd.sample_caption && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            &ldquo;{rd.sample_caption}&rdquo;
          </p>
        )}

        {/* Actions */}
        <div className="pt-1 space-y-1.5">
          {r.saved_as_influencer_id ? (
            <Button size="sm" variant="secondary" className="w-full" disabled>
              <CheckCircle className="mr-2 h-3.5 w-3.5" />
              Salvo como Influencer
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onSave(r.id)}>
              <UserPlus className="mr-2 h-3.5 w-3.5" />
              Salvar como Influencer
            </Button>
          )}
          {r.platform === "instagram" && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs"
              disabled={findingSimilar === r.handle}
              onClick={() => onFindSimilar(r.handle)}
            >
              <Users className="mr-2 h-3.5 w-3.5" />
              {findingSimilar === r.handle ? "Buscando..." : "Encontrar Similares"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ──
export default function MiningPage() {
  const [activeTab, setActiveTab] = useState("instagram");
  const [keywords, setKeywords] = useState("");
  const [region, setRegion] = useState("brasil");
  // TikTok-specific
  const [niche, setNiche] = useState("");
  const [followerRange, setFollowerRange] = useState("");
  // Shared state
  const [searches, setSearches] = useState<MiningSearch[]>([]);
  const [results, setResults] = useState<MiningResult[]>([]);
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [findingSimilar, setFindingSimilar] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const { data } = await getSearchHistory();
    setSearches(data);
  }, []);

  useEffect(() => {
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  async function handleSearch() {
    const isIg = activeTab === "instagram";
    const isTt = activeTab === "tiktok";

    // TikTok allows empty keywords if niche is selected
    if (isIg && !keywords.trim()) return;
    if (isTt && !keywords.trim() && !niche) return;

    setSearching(true);
    setResults([]);
    const kw = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const result = await createSearch(
      kw,
      [activeTab],
      region,
      isTt ? niche : "",
      isTt ? followerRange : ""
    );
    if (result.id) {
      setActiveSearch(result.id);
      const { data } = await getSearchResults(result.id);
      setResults(data);
      loadHistory();
    }
    setSearching(false);
  }

  async function handleViewResults(searchId: string) {
    setActiveSearch(searchId);
    const { data } = await getSearchResults(searchId);
    setResults(data);
  }

  async function handleSave(resultId: string) {
    await saveResultAsInfluencer(resultId);
    setResults(results.map(r => r.id === resultId ? { ...r, saved_as_influencer_id: "saved" } : r));
  }

  async function handleFindSimilar(handle: string) {
    if (!activeSearch) return;
    setFindingSimilar(handle);
    const result = await findSimilarProfiles(activeSearch, handle);
    if (result.added > 0) {
      const { data } = await getSearchResults(activeSearch);
      setResults(data);
    }
    setFindingSimilar(null);
  }

  // Filter history by active tab platform
  const filteredSearches = searches.filter((s) => s.platforms.includes(activeTab));

  const canSearch = activeTab === "instagram"
    ? keywords.trim().length > 0
    : keywords.trim().length > 0 || niche.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Mineracao" description="Descubra influencers que criam conteudo sobre seu nicho" />

      <Tabs defaultValue="instagram" onValueChange={(v) => { setActiveTab(v as string); setResults([]); setActiveSearch(null); }}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="instagram">
            <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            Instagram
          </TabsTrigger>
          <TabsTrigger value="tiktok">
            <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.16z"/></svg>
            TikTok
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: INSTAGRAM ── */}
        <TabsContent value="instagram">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Buscar por palavras-chave</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="cinta modeladora, skincare, moda plus size..."
                      className="text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={searching || !canSearch} className="shrink-0">
                      <Search className="mr-2 h-4 w-4" />
                      {searching ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1.5 bg-background"
                  >
                    <option value="brasil">Brasil</option>
                    <option value="global">Global</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Busca em Reels por keyword. Enriquece perfis com categoria e localizacao do Instagram.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: TIKTOK ── */}
        <TabsContent value="tiktok">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Buscar por palavras-chave</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder={niche ? "opcional — nicho ja selecionado" : "fitness, skincare, moda..."}
                      className="text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={searching || !canSearch} className="shrink-0">
                      <Search className="mr-2 h-4 w-4" />
                      {searching ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="text-sm border rounded-md px-2 py-1.5 bg-background"
                    >
                      <option value="brasil">Brasil</option>
                      <option value="global">Global</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className="text-sm border rounded-md px-2 py-1.5 bg-background"
                    >
                      <option value="">Todos os nichos</option>
                      {NICHE_OPTIONS.map((n) => (
                        <option key={n.slug} value={n.slug}>{n.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={followerRange}
                      onChange={(e) => setFollowerRange(e.target.value)}
                      className="text-sm border rounded-md px-2 py-1.5 bg-background"
                    >
                      {FOLLOWER_RANGES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {niche
                    ? "Descobre criadores BR por nicho com hashtags trending + criadores populares."
                    : "Busca videos por keyword. Selecione um nicho para resultados mais assertivos."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Loading State */}
      {searching && <ResultsSkeleton />}

      {/* Results Grid */}
      {!searching && activeSearch && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{results.length} influencers encontrados</h2>
          </div>

          {results.length === 0 ? (
            <EmptyState icon={Search} title="Nenhum influencer encontrado" description="Tente outros termos ou ajuste os filtros." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <ResultCard
                  key={r.id}
                  r={r}
                  onSave={handleSave}
                  onFindSimilar={handleFindSimilar}
                  findingSimilar={findingSimilar}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Search History */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-sm font-bold"><History className="inline mr-2 h-4 w-4" />Historico de Buscas</CardTitle></CardHeader>
        <CardContent>
          {filteredSearches.length === 0 ? (
            <EmptyState icon={Search} title="Nenhuma busca realizada" description="Use o formulario acima para buscar influencers." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palavras-chave</TableHead>
                  <TableHead>Resultados</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSearches.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.keywords.join(", ") || "—"}</TableCell>
                    <TableCell className="font-bold">{s.results_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => handleViewResults(s.id)}>Ver</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
