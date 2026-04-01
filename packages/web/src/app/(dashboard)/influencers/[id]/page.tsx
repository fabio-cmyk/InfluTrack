"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, AtSign, Plus, Save, Check } from "lucide-react";
import { getInfluencer, updateInfluencer, type Influencer } from "../actions";
import { getGrowthHistory, addGrowthEntry, type GrowthEntry } from "./actions";
import { getInfluencerMetrics, type InfluencerMetrics } from "@/lib/metrics";

function GrowthChart({ data }: { data: GrowthEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Nenhum registro de crescimento. Adicione dados para ver o grafico.
      </div>
    );
  }

  // Group by platform and sort by date ascending for chart
  const sorted = [...data].sort((a, b) => a.record_date.localeCompare(b.record_date));
  const platforms = [...new Set(sorted.map((d) => d.platform))];
  const platformColors: Record<string, string> = {
    instagram: "#E4405F",
    tiktok: "#000000",
    youtube: "#FF0000",
  };

  // Simple text-based metrics display
  const latestByPlatform = platforms.map((p) => {
    const entries = sorted.filter((d) => d.platform === p);
    const latest = entries[entries.length - 1];
    return { ...latest, platform: p };
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {latestByPlatform.map((entry) => (
          <div key={entry.platform} className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: platformColors[entry.platform] || "#666" }}
              />
              <span className="text-sm font-medium capitalize">{entry.platform}</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {entry.followers?.toLocaleString("pt-BR") || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Engajamento: {entry.engagement_rate ? `${entry.engagement_rate}%` : "—"}
            </p>
          </div>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Plataforma</TableHead>
            <TableHead>Seguidores</TableHead>
            <TableHead>Engajamento</TableHead>
            <TableHead>Posts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{new Date(entry.record_date).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{entry.platform}</Badge>
              </TableCell>
              <TableCell>{entry.followers?.toLocaleString("pt-BR") || "—"}</TableCell>
              <TableCell>{entry.engagement_rate ? `${entry.engagement_rate}%` : "—"}</TableCell>
              <TableCell>{entry.posts_count?.toLocaleString("pt-BR") || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function InfluencerProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [metrics, setMetrics] = useState<InfluencerMetrics | null>(null);
  const [growth, setGrowth] = useState<GrowthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [growthModalOpen, setGrowthModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ig, setIg] = useState("");
  const [tt, setTt] = useState("");
  const [yt, setYt] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [niche, setNiche] = useState("");
  const [coupon, setCoupon] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [infResult, growthResult, metricsResult] = await Promise.all([
      getInfluencer(id),
      getGrowthHistory(id),
      getInfluencerMetrics(id),
    ]);
    setMetrics(metricsResult);
    if (infResult.data) {
      const inf = infResult.data;
      setInfluencer(inf);
      setName(inf.name);
      setEmail(inf.email || "");
      setPhone(inf.phone || "");
      setIg(inf.instagram_handle || "");
      setTt(inf.tiktok_handle || "");
      setYt(inf.youtube_handle || "");
      setCity(inf.city || "");
      setState(inf.state || "");
      setNiche(inf.niche || "");
      setCoupon(inf.coupon_code);
    }
    setGrowth(growthResult.data);
    setLoading(false);
  }, [id]);

  if (!initialized) {
    setInitialized(true);
    loadData();
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const result = await updateInfluencer(id, {
      name, email, phone,
      instagram_handle: ig, tiktok_handle: tt, youtube_handle: yt,
      city, state, niche, coupon_code: coupon,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleAddGrowth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await addGrowthEntry({
      influencer_id: id,
      record_date: fd.get("record_date") as string,
      platform: fd.get("platform") as string,
      followers: Number(fd.get("followers")),
      engagement_rate: Number(fd.get("engagement_rate")),
      posts_count: Number(fd.get("posts_count")),
    });
    if (result.error) {
      alert(result.error);
      return;
    }
    setGrowthModalOpen(false);
    const growthResult = await getGrowthHistory(id);
    setGrowth(growthResult.data);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!influencer) {
    return <p className="text-muted-foreground">Influencer nao encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/influencers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title={influencer.name} description={`Cupom: ${influencer.coupon_code}`} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Vendas</p>
            <p className="mt-1 text-2xl font-bold">{metrics?.total_orders ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="mt-1 text-2xl font-bold">
              {metrics ? `R$ ${Number(metrics.total_revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Lucro Total</p>
            <p className="mt-1 text-2xl font-bold">
              {metrics ? `R$ ${Number(metrics.total_profit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Campanhas</p>
            <p className="mt-1 text-2xl font-bold">{metrics?.campaigns_count ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dados do Influencer</CardTitle>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saved ? <><Check className="mr-2 h-4 w-4" />Salvo!</> : <><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar"}</>}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Cupom</Label><Input value={coupon} onChange={(e) => setCoupon(e.target.value)} className="uppercase" /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>E-mail</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label><AtSign className="inline h-3 w-3 mr-1" />Instagram</Label><Input value={ig} onChange={(e) => setIg(e.target.value)} /></div>
            <div className="space-y-2"><Label>TikTok</Label><Input value={tt} onChange={(e) => setTt(e.target.value)} /></div>
            <div className="space-y-2"><Label>YouTube</Label><Input value={yt} onChange={(e) => setYt(e.target.value)} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Cidade</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div className="space-y-2"><Label>Estado</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
            <div className="space-y-2"><Label>Nicho</Label><Input value={niche} onChange={(e) => setNiche(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Growth History - Story 3.2 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historico de Crescimento</CardTitle>
          <Button size="sm" onClick={() => setGrowthModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <GrowthChart data={growth} />
        </CardContent>
      </Card>

      {/* Campaigns - Placeholder for Epic 4/6 */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma campanha vinculada. Vincule este influencer a campanhas no modulo de Campanhas.
          </p>
        </CardContent>
      </Card>

      {/* Growth Entry Modal */}
      <Dialog open={growthModalOpen} onOpenChange={setGrowthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Crescimento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGrowth}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="record_date">Data</Label>
                <Input id="record_date" name="record_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Plataforma</Label>
                <select name="platform" id="platform" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="followers">Seguidores</Label>
                  <Input id="followers" name="followers" type="number" min="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engagement_rate">Engajamento %</Label>
                  <Input id="engagement_rate" name="engagement_rate" type="number" step="0.01" min="0" max="100" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posts_count">Posts</Label>
                  <Input id="posts_count" name="posts_count" type="number" min="0" required />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
