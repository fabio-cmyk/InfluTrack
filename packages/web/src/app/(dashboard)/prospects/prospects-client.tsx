"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Plus,
  Upload,
  Funnel,
  ExternalLink,
  Pencil,
  Trash2,
  ArrowRightCircle,
  MessageSquare,
  Send,
} from "lucide-react";
import {
  getProspects,
  updateProspectStatus,
  archiveProspect,
  getProspectNotes,
  addProspectNote,
  convertToInfluencer,
} from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ProspectCard } from "./prospect-card";
import { ProspectForm } from "./prospect-form";
import { ProspectCsvImport } from "./prospect-csv-import";
import type { Prospect, ProspectNote, ProspectStatus } from "./types";

const COLUMNS: {
  key: ProspectStatus;
  label: string;
  color: string;
  headerBg: string;
}[] = [
  {
    key: "analisar",
    label: "Analisar",
    color: "border-t-amber-500",
    headerBg: "bg-amber-50 text-amber-700",
  },
  {
    key: "aprovada",
    label: "Aprovada",
    color: "border-t-emerald-500",
    headerBg: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "reprovada",
    label: "Reprovada",
    color: "border-t-rose-500",
    headerBg: "bg-rose-50 text-rose-700",
  },
  {
    key: "sem_retorno",
    label: "Sem Retorno",
    color: "border-t-slate-400",
    headerBg: "bg-slate-50 text-slate-600",
  },
  {
    key: "contato_futuro",
    label: "Contato Futuro",
    color: "border-t-sky-500",
    headerBg: "bg-sky-50 text-sky-700",
  },
];

const PARTNERSHIP_LABELS: Record<string, string> = {
  em_negociacao: "Em Negociacao",
  fechada: "Fechada",
  sem_retorno: "Sem Retorno",
  contato_futuro: "Contato Futuro",
};

function fmt(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtNum(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

interface ProspectsClientProps {
  initialProspects: Prospect[];
}

export function ProspectsClient({ initialProspects }: ProspectsClientProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data } = await getProspects();
    setProspects(data);
  }, []);

  async function openDetail(prospect: Prospect) {
    setDetailProspect(prospect);
    const { data } = await getProspectNotes(prospect.id);
    setNotes(data);
  }

  async function handleDrop(e: React.DragEvent, targetStatus: ProspectStatus) {
    e.preventDefault();
    setDragOverCol(null);
    const prospectId = e.dataTransfer.getData("text/plain");
    if (!prospectId) return;

    await updateProspectStatus(prospectId, targetStatus);
    await loadData();
  }

  async function handleArchive(prospect: Prospect) {
    await archiveProspect(prospect.id);
    setDetailProspect(null);
    await loadData();
  }

  async function handleAddNote() {
    if (!detailProspect || !newNote.trim()) return;
    await addProspectNote(detailProspect.id, newNote.trim());
    setNewNote("");
    const { data } = await getProspectNotes(detailProspect.id);
    setNotes(data);
  }

  async function handleConvert() {
    if (!detailProspect || !couponCode.trim()) return;
    setConvertLoading(true);
    setConvertError(null);
    const result = await convertToInfluencer(detailProspect.id, couponCode.trim());
    if (result.error) {
      setConvertError(result.error);
      setConvertLoading(false);
      return;
    }
    setConvertLoading(false);
    setConvertOpen(false);
    setCouponCode("");
    setDetailProspect(null);
    await loadData();
  }

  function handleEdit(prospect: Prospect) {
    setDetailProspect(null);
    setEditingProspect(prospect);
    setFormOpen(true);
  }

  function handleNew() {
    setEditingProspect(null);
    setFormOpen(true);
  }

  // Filter
  const filtered = search
    ? prospects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.instagram_url || "").toLowerCase().includes(search.toLowerCase())
      )
    : prospects;

  // Group by status
  const grouped = new Map<ProspectStatus, Prospect[]>();
  for (const col of COLUMNS) grouped.set(col.key, []);
  for (const p of filtered) {
    const list = grouped.get(p.status as ProspectStatus);
    if (list) list.push(p);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospeccao"
        description="Pipeline de prospeccao e negociacao de influencers"
      >
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Prospect
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nome ou Instagram..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} prospects
        </span>
      </div>

      {/* Kanban board */}
      {prospects.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Funnel}
              title="Nenhuma prospect cadastrada"
              description="Adicione prospects manualmente ou importe um CSV."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colProspects = grouped.get(col.key) || [];
            const isDragOver = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                className={`flex w-[280px] shrink-0 flex-col rounded-xl border border-t-[3px] bg-muted/30 ${col.color} ${
                  isDragOver ? "ring-2 ring-primary/30" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.key);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${col.headerBg}`}
                  >
                    {col.label}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {colProspects.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2" style={{ maxHeight: "calc(100vh - 300px)" }}>
                  {colProspects.map((prospect) => (
                    <ProspectCard
                      key={prospect.id}
                      prospect={prospect}
                      onClick={() => openDetail(prospect)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", prospect.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit form */}
      <ProspectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingProspect={editingProspect}
        onSaved={loadData}
      />

      {/* CSV Import */}
      <ProspectCsvImport
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={loadData}
      />

      {/* Detail sheet */}
      <Sheet
        open={!!detailProspect}
        onOpenChange={(open) => !open && setDetailProspect(null)}
      >
        <SheetContent side="right" className="w-[420px] overflow-y-auto sm:max-w-md">
          {detailProspect && (
            <>
              <SheetHeader>
                <SheetTitle>{detailProspect.name}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Identity */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      detailProspect.prospect_type === "nova"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {detailProspect.prospect_type === "nova"
                      ? "Nova"
                      : "Reativada"}
                  </Badge>
                  <Badge variant="outline">
                    {PARTNERSHIP_LABELS[detailProspect.partnership_status]}
                  </Badge>
                  {detailProspect.converted_influencer_id && (
                    <Badge variant="default">Convertida</Badge>
                  )}
                </div>

                {detailProspect.instagram_url && (
                  <a
                    href={detailProspect.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {detailProspect.instagram_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* Metrics */}
                <div className="rounded-lg border p-3">
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                    Metricas
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Seguidores:</span>{" "}
                      {fmtNum(detailProspect.followers_count)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Views Stories:</span>{" "}
                      {fmtNum(detailProspect.avg_story_views)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Eng. Stories:</span>{" "}
                      {detailProspect.story_engagement_rate != null
                        ? `${detailProspect.story_engagement_rate}%`
                        : "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">CPV Stories:</span>{" "}
                      {detailProspect.cost_per_story_view != null
                        ? fmt(detailProspect.cost_per_story_view)
                        : "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Views Reels:</span>{" "}
                      {fmtNum(detailProspect.avg_reel_views)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Eng. Reels:</span>{" "}
                      {detailProspect.reel_engagement_rate != null
                        ? `${detailProspect.reel_engagement_rate}%`
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Budget */}
                <div className="rounded-lg border p-3">
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                    Orcamento
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Seq. Stories:</span>{" "}
                      {fmt(detailProspect.budget_stories_seq)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reels:</span>{" "}
                      {fmt(detailProspect.budget_reels)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reels+Stories:</span>{" "}
                      {fmt(detailProspect.budget_reels_stories)}
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold">Valor Fechado:</span>{" "}
                      <span className="font-semibold text-emerald-600">
                        {fmt(detailProspect.agreed_value)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scope / Asking price */}
                {(detailProspect.proposed_scope ||
                  detailProspect.influencer_asking_price) && (
                  <div className="rounded-lg border p-3 space-y-2">
                    {detailProspect.proposed_scope && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Escopo Proposto:
                        </span>
                        <p className="mt-0.5 whitespace-pre-wrap">
                          {detailProspect.proposed_scope}
                        </p>
                      </div>
                    )}
                    {detailProspect.influencer_asking_price && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Orcamento da Influ:
                        </span>
                        <p className="mt-0.5 whitespace-pre-wrap">
                          {detailProspect.influencer_asking_price}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(detailProspect)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                  {detailProspect.partnership_status === "fechada" &&
                    !detailProspect.converted_influencer_id && (
                      <Button
                        size="sm"
                        onClick={() => setConvertOpen(true)}
                      >
                        <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
                        Converter para Influencer
                      </Button>
                    )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleArchive(detailProspect)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Excluir
                  </Button>
                </div>

                {/* Notes */}
                <div className="rounded-lg border p-3">
                  <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase">
                    <MessageSquare className="h-3 w-3" />
                    Notas de Negociacao
                  </h4>

                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Adicionar nota..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddNote()
                      }
                      className="text-sm"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma nota ainda.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-md bg-muted/50 p-2 text-sm"
                        >
                          <p>{note.content}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {note.author_name} —{" "}
                            {new Date(note.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Convert dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Converter para Influencer</DialogTitle>
            <DialogDescription>
              Informe o cupom de desconto para criar o influencer no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {convertError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {convertError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="coupon">Codigo do Cupom *</Label>
              <Input
                id="coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Ex: INFLUENCER10"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConvert}
              disabled={convertLoading || !couponCode.trim()}
            >
              {convertLoading ? "Convertendo..." : "Converter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
