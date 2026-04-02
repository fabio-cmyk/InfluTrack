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
import { Search, UserPlus, History } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getSearchHistory, getSearchResults, createSearch, saveResultAsInfluencer, type MiningSearch, type MiningResult } from "./actions";

export default function MiningPage() {
  const [keywords, setKeywords] = useState("");
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(["instagram"]));
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (activeSearch) {
      const { data } = await getSearchResults(activeSearch);
      setResults(data);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mineracao" description="Descubra novos influencers por palavras-chave" />

      {/* Search Form */}
      <Card>
        <CardHeader><CardTitle>Nova Busca</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Palavras-chave ou termos de busca</Label>
            <div className="flex gap-2">
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="cinta modeladora, fitness, skincare"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching || !keywords.trim()}>
                <Search className="mr-2 h-4 w-4" />
                {searching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={platforms.has("instagram")} onCheckedChange={() => togglePlatform("instagram")} />
              <span className="text-sm">Instagram</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={platforms.has("tiktok")} onCheckedChange={() => togglePlatform("tiktok")} />
              <span className="text-sm">TikTok</span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Busca influencers em reels e videos que mencionam esses termos. Resultados mostram os criadores do conteudo.</p>
        </CardContent>
      </Card>

      {/* Results */}
      {activeSearch && (
        <Card>
          <CardHeader><CardTitle>Resultados</CardTitle></CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <EmptyState icon={Search} title="Nenhum resultado" description="Configure a integracao com Apify para ativar a mineracao." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Handle</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Seguidores</TableHead>
                    <TableHead>Engajamento</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.display_name || r.handle}</TableCell>
                      <TableCell className="text-muted-foreground">{r.handle}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.platform}</Badge></TableCell>
                      <TableCell>{r.followers?.toLocaleString("pt-BR") || "—"}</TableCell>
                      <TableCell>{r.engagement_rate ? `${r.engagement_rate}%` : "—"}</TableCell>
                      <TableCell>
                        {r.saved_as_influencer_id ? (
                          <Badge variant="secondary">Salvo</Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleSave(r.id)}>
                            <UserPlus className="mr-1 h-3 w-3" />Salvar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search History */}
      <Card>
        <CardHeader><CardTitle><History className="inline mr-2 h-4 w-4" />Historico de Buscas</CardTitle></CardHeader>
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
                    <TableCell>{s.keywords.join(", ")}</TableCell>
                    <TableCell>{s.platforms.join(", ")}</TableCell>
                    <TableCell>{s.results_count}</TableCell>
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
