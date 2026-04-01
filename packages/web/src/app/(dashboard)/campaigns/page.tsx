"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Archive } from "lucide-react";
import { getCampaigns, createCampaign, archiveCampaign, type Campaign } from "./actions";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Ativa", variant: "default" },
  ended: { label: "Encerrada", variant: "outline" },
  archived: { label: "Arquivada", variant: "destructive" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await getCampaigns();
    setCampaigns(data);
    setLoading(false);
  }, []);

  if (!initialized) {
    setInitialized(true);
    loadData();
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFormLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createCampaign({
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      budget: fd.get("budget") ? Number(fd.get("budget")) : null,
      start_date: (fd.get("start_date") as string) || null,
      end_date: (fd.get("end_date") as string) || null,
    });
    if (result.error) {
      setError(result.error);
      setFormLoading(false);
      return;
    }
    setFormLoading(false);
    setFormOpen(false);
    loadData();
  }

  async function handleArchive(id: string) {
    await archiveCampaign(id);
    loadData();
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Campanhas" description="Gerencie suas campanhas de influencia">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </PageHeader>

      {loading ? (
        <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">Carregando...</p></CardContent></Card>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">Nenhuma campanha criada. Crie sua primeira campanha.</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Orcamento</TableHead>
                  <TableHead>Influencers</TableHead>
                  <TableHead className="w-[80px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const st = STATUS_LABELS[c.status] || STATUS_LABELS.draft;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.start_date)} — {formatDate(c.end_date)}
                      </TableCell>
                      <TableCell>
                        {c.budget ? `R$ ${Number(c.budget).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </TableCell>
                      <TableCell>{c.influencer_count || 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleArchive(c.id)} title="Arquivar">
                          <Archive className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
            <DialogDescription>Defina nome, orcamento e periodo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <div className="space-y-2"><Label htmlFor="name">Nome *</Label><Input id="name" name="name" required placeholder="Black Friday 2026" /></div>
              <div className="space-y-2">
                <Label htmlFor="description">Descricao</Label>
                <textarea id="description" name="description" placeholder="Objetivo da campanha..." className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2"><Label htmlFor="budget">Orcamento (R$)</Label><Input id="budget" name="budget" type="number" step="0.01" min="0" placeholder="5000.00" /></div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2"><Label htmlFor="start_date">Inicio</Label><Input id="start_date" name="start_date" type="date" /></div>
                <div className="space-y-2"><Label htmlFor="end_date">Termino</Label><Input id="end_date" name="end_date" type="date" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={formLoading}>{formLoading ? "Criando..." : "Criar Campanha"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
