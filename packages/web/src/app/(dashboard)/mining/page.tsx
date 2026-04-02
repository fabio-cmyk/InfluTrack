"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, UserPlus, History, ExternalLink, Eye, Heart, MessageCircle, Share2, CheckCircle } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getSearchHistory, getSearchResults, createSearch, saveResultAsInfluencer, type MiningSearch, type MiningResult } from "./actions";

function fmtNum(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default function MiningPage() {
  const [keywords, setKeywords] = useState("");
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(["instagram", "tiktok"]));
  const [searches, setSearches] = useState<MiningSearch[]>([]);
  const [results, setResults] = useState<MiningResult[]>([]);
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const loadHistory = useCallback(async () => {
    const { data } = await getSearchHistory();
    setSearches(data);
  }, []);

  useEffect(() => {
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  function togglePlatform(p: string) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) { if (next.size > 1) next.delete(p); } else next.add(p);
      return next;
    });
  }

  async function handleSearch() {
    if (!keywords.trim()) return;
    setSearching(true);
    setResults([]);
    const kw = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const result = await createSearch(kw, Array.from(platforms));
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

  return (
    <div className="space-y-6">
      <PageHeader title="Mineracao" description="Descubra influencers que criam conteudo sobre seu nicho" />

      {/* Search Form */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Buscar por palavras-chave</Label>
              <div className="flex gap-2">
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="cinta modeladora, fitness, skincare, moda plus size..."
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching || !keywords.trim()} className="shrink-0">
                  <Search className="mr-2 h-4 w-4" />
                  {searching ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={platforms.has("instagram")} onCheckedChange={() => togglePlatform("instagram")} />
                <span className="text-sm font-medium">Instagram (Reels)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={platforms.has("tiktok")} onCheckedChange={() => togglePlatform("tiktok")} />
                <span className="text-sm font-medium">TikTok (Videos)</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Busca em reels e videos que mencionam esses termos. Extrai os criadores com metricas de engajamento.</p>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {searching && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
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
      )}

      {/* Results Grid */}
      {!searching && activeSearch && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{results.length} influencers encontrados</h2>
          </div>

          {results.length === 0 ? (
            <EmptyState icon={Search} title="Nenhum influencer encontrado" description="Tente outros termos ou selecione ambas plataformas." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => {
                const rd = r.raw_data || {};
                return (
                  <Card key={r.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 pb-4 space-y-4">
                      {/* Header: Avatar + Name + Platform */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {r.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.avatar_url} alt={r.display_name || r.handle} className="h-12 w-12 rounded-full object-cover border-2 border-border" />
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
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm truncate">{r.display_name || r.handle}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">@{r.handle}</p>
                          <Badge variant="outline" className="text-[10px] mt-1 capitalize">{r.platform}</Badge>
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
                          <p className="text-lg font-extrabold">{r.engagement_rate ? `${r.engagement_rate}%` : "—"}</p>
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

                      {/* Caption Preview */}
                      {rd.sample_caption && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          &ldquo;{rd.sample_caption}&rdquo;
                        </p>
                      )}

                      {/* Action */}
                      <div className="pt-1">
                        {r.saved_as_influencer_id ? (
                          <Button size="sm" variant="secondary" className="w-full" disabled>
                            <CheckCircle className="mr-2 h-3.5 w-3.5" />
                            Salvo como Influencer
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => handleSave(r.id)}>
                            <UserPlus className="mr-2 h-3.5 w-3.5" />
                            Salvar como Influencer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Search History */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-sm font-bold"><History className="inline mr-2 h-4 w-4" />Historico de Buscas</CardTitle></CardHeader>
        <CardContent>
          {searches.length === 0 ? (
            <EmptyState icon={Search} title="Nenhuma busca realizada" description="Use o formulario acima para buscar influencers." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palavras-chave</TableHead>
                  <TableHead>Plataformas</TableHead>
                  <TableHead>Resultados</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {searches.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.keywords.join(", ")}</TableCell>
                    <TableCell>{s.platforms.map(p => <Badge key={p} variant="outline" className="mr-1 text-xs capitalize">{p}</Badge>)}</TableCell>
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
