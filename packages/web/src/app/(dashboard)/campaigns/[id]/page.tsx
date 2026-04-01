"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Badge available for future use
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Check, Plus, Trash2, Archive } from "lucide-react";
import {
  getCampaign, updateCampaign, archiveCampaign,
  getCampaignInfluencers, addInfluencersToCampaign, removeInfluencerFromCampaign,
  type Campaign, type CampaignInfluencer,
} from "../actions";
import { getInfluencers, type Influencer } from "../../influencers/actions";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [linked, setLinked] = useState<CampaignInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [allInfluencers, setAllInfluencers] = useState<Influencer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [now] = useState(() => Date.now());

  // Edit fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cResult, iResult] = await Promise.all([
      getCampaign(id),
      getCampaignInfluencers(id),
    ]);
    if (cResult.data) {
      const c = cResult.data;
      setCampaign(c);
      setName(c.name);
      setDescription(c.description || "");
      setBudget(c.budget ? String(c.budget) : "");
      setStartDate(c.start_date || "");
      setEndDate(c.end_date || "");
    }
    setLinked(iResult.data);
    setLoading(false);
  }, [id]);

  if (!initialized) {
    setInitialized(true);
    loadData();
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const result = await updateCampaign(id, {
      name,
      description,
      budget: budget ? Number(budget) : null,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    if (result.error) setError(result.error);
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  }

  async function handleArchive() {
    await archiveCampaign(id);
    loadData();
  }

  async function openAddModal() {
    const { data } = await getInfluencers();
    const linkedIds = new Set(linked.map((l) => l.influencer_id));
    setAllInfluencers(data.filter((inf) => !linkedIds.has(inf.id)));
    setSelectedIds(new Set());
    setAddModalOpen(true);
  }

  function toggleSelect(infId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(infId)) next.delete(infId); else next.add(infId);
      return next;
    });
  }

  async function handleAddInfluencers() {
    setAddLoading(true);
    await addInfluencersToCampaign(id, Array.from(selectedIds));
    setAddLoading(false);
    setAddModalOpen(false);
    loadData();
  }

  async function handleRemove(linkId: string) {
    await removeInfluencerFromCampaign(linkId, id);
    loadData();
  }

  function getProgress(): number {
    if (!campaign?.start_date || !campaign?.end_date) return 0;
    const start = new Date(campaign.start_date).getTime();
    const end = new Date(campaign.end_date).getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  function getDaysRemaining(): string {
    if (!campaign?.end_date) return "—";
    const diff = Math.ceil((new Date(campaign.end_date).getTime() - now) / 86400000);
    if (diff < 0) return "Encerrada";
    if (diff === 0) return "Ultimo dia";
    return `${diff} dias restantes`;
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!campaign) return <p className="text-muted-foreground">Campanha nao encontrada.</p>;

  const progress = getProgress();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <PageHeader title={campaign.name} description={getDaysRemaining()} />
      </div>

      {/* Timeline */}
      {campaign.start_date && campaign.end_date && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{new Date(campaign.start_date).toLocaleDateString("pt-BR")}</span>
              <span>{progress}%</span>
              <span>{new Date(campaign.end_date).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards - Placeholder */}
      <div className="grid gap-4 md:grid-cols-5">
        {["Vendas", "Receita", "Custo", "Lucro", "ROI"].map((label) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-muted-foreground/40">—</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dados da Campanha</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleArchive}><Archive className="mr-2 h-4 w-4" />Arquivar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saved ? <><Check className="mr-2 h-4 w-4" />Salvo!</> : <><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar"}</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Orcamento (R$)</Label><Input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" step="0.01" /></div>
          </div>
          <div className="space-y-2">
            <Label>Descricao</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2"><Label>Inicio</Label><Input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" /></div>
            <div className="space-y-2"><Label>Termino</Label><Input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Influencers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Influencers ({linked.length})</CardTitle>
          <Button size="sm" onClick={openAddModal}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
        </CardHeader>
        <CardContent>
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum influencer vinculado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cupom</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linked.map((inf) => (
                  <TableRow key={inf.id}>
                    <TableCell>
                      <Link href={`/influencers/${inf.influencer_id}`} className="font-medium text-primary hover:underline">{inf.name}</Link>
                    </TableCell>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{inf.coupon_code}</code></TableCell>
                    <TableCell className="text-muted-foreground/40">—</TableCell>
                    <TableCell className="text-muted-foreground/40">—</TableCell>
                    <TableCell className="text-muted-foreground/40">—</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(inf.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Influencers Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Adicionar Influencers</DialogTitle></DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2">
            {allInfluencers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Todos os influencers ja estao vinculados.</p>
            ) : (
              allInfluencers.map((inf) => (
                <label key={inf.id} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={selectedIds.has(inf.id)} onCheckedChange={() => toggleSelect(inf.id)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{inf.name}</p>
                    <p className="text-xs text-muted-foreground">{inf.instagram_handle || inf.tiktok_handle || "—"} · {inf.niche || "Sem nicho"}</p>
                  </div>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{inf.coupon_code}</code>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleAddInfluencers} disabled={selectedIds.size === 0 || addLoading}>
              {addLoading ? "Adicionando..." : `Vincular ${selectedIds.size} influencer${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
