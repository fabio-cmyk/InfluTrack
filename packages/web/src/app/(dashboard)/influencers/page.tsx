"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Search, Archive } from "lucide-react";
import { getInfluencers, getNiches, archiveInfluencer, type Influencer } from "./actions";
import { InfluencerFormModal } from "./influencer-form";

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [niches, setNiches] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (s?: string, n?: string) => {
    setLoading(true);
    const [infResult, nichesResult] = await Promise.all([
      getInfluencers(s, n),
      getNiches(),
    ]);
    setInfluencers(infResult.data);
    setNiches(nichesResult);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    loadData(search || undefined, selectedNiche || undefined);
  }

  async function handleArchive(id: string) {
    await archiveInfluencer(id);
    setInfluencers(influencers.filter(i => i.id !== id));
  }

  function getMainHandle(inf: Influencer): string {
    return inf.instagram_handle || inf.tiktok_handle || inf.youtube_handle || "—";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Influencers" description="Gerencie seus influencers">
        <Button onClick={() => setFormOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar Influencer
        </Button>
      </PageHeader>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou handle..."
            className="pl-9"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <select
          value={selectedNiche}
          onChange={(e) => {
            setSelectedNiche(e.target.value);
            loadData(search || undefined, e.target.value || undefined);
          }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
        >
          <option value="">Todos os nichos</option>
          {niches.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <Button variant="outline" onClick={handleSearch}>
          Buscar
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      ) : influencers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhum influencer cadastrado. Adicione influencers para comecar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Cupom</TableHead>
                  <TableHead>Comissao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {influencers.map((inf) => (
                  <TableRow key={inf.id}>
                    <TableCell>
                      <Link
                        href={`/influencers/${inf.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inf.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getMainHandle(inf)}
                    </TableCell>
                    <TableCell>
                      {inf.size ? (
                        <Badge variant="outline" className="uppercase text-xs">{inf.size}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {inf.coupon_code}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {inf.commission_rate > 0
                        ? inf.commission_type === "percentage" ? `${inf.commission_rate}%` : `R$ ${inf.commission_rate}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={inf.status === "active" ? "default" : "secondary"} className="text-xs">
                        {inf.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchive(inf.id)}
                        title="Arquivar"
                      >
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <InfluencerFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => loadData(search || undefined, selectedNiche || undefined)}
      />
    </div>
  );
}
