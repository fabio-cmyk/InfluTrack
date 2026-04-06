"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProspect, updateProspect } from "./actions";
import type { Prospect } from "./types";

interface ProspectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProspect?: Prospect | null;
  onSaved: () => void;
}

export function ProspectForm({
  open,
  onOpenChange,
  editingProspect,
  onSaved,
}: ProspectFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prospectType, setProspectType] = useState(
    editingProspect?.prospect_type || "nova"
  );
  const [status, setStatus] = useState(editingProspect?.status || "analisar");
  const [partnershipStatus, setPartnershipStatus] = useState(
    editingProspect?.partnership_status || "em_negociacao"
  );

  const isEditing = !!editingProspect;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      setProspectType("nova");
      setStatus("analisar");
      setPartnershipStatus("em_negociacao");
    } else if (editingProspect) {
      setProspectType(editingProspect.prospect_type);
      setStatus(editingProspect.status);
      setPartnershipStatus(editingProspect.partnership_status);
    }
    onOpenChange(next);
  }

  function parseNum(fd: FormData, key: string): number | null {
    const v = fd.get(key) as string;
    if (!v || v.trim() === "") return null;
    const n = Number(v.replace(/[^\d.,\-]/g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const formData = {
      name: fd.get("name") as string,
      instagram_url: (fd.get("instagram_url") as string) || "",
      prospect_type: prospectType,
      followers_count: parseNum(fd, "followers_count"),
      avg_story_views: parseNum(fd, "avg_story_views"),
      budget_stories_seq: parseNum(fd, "budget_stories_seq"),
      budget_reels_stories: parseNum(fd, "budget_reels_stories"),
      cost_per_story_view: parseNum(fd, "cost_per_story_view"),
      story_engagement_rate: parseNum(fd, "story_engagement_rate"),
      avg_reel_views: parseNum(fd, "avg_reel_views"),
      budget_reels: parseNum(fd, "budget_reels"),
      cost_per_reel_view: parseNum(fd, "cost_per_reel_view"),
      reel_engagement_rate: parseNum(fd, "reel_engagement_rate"),
      agreed_value: parseNum(fd, "agreed_value"),
      proposed_scope: (fd.get("proposed_scope") as string) || "",
      influencer_asking_price: (fd.get("influencer_asking_price") as string) || "",
      status,
      partnership_status: partnershipStatus,
    };

    const result = isEditing
      ? await updateProspect(editingProspect.id, formData)
      : await createProspect(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    handleOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Prospect" : "Nova Prospect"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da prospect."
              : "Cadastre uma nova prospect no pipeline."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Basic */}
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingProspect?.name || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <Input
                  id="instagram_url"
                  name="instagram_url"
                  placeholder="https://instagram.com/..."
                  defaultValue={editingProspect?.instagram_url || ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={prospectType}
                  onValueChange={(v) => setProspectType(v ?? "nova")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova">Nova</SelectItem>
                    <SelectItem value="reativada">Reativada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Metrics */}
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                Metricas
              </h4>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="followers_count" className="text-xs">Seguidores</Label>
                  <Input
                    id="followers_count"
                    name="followers_count"
                    type="number"
                    defaultValue={editingProspect?.followers_count ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="avg_story_views" className="text-xs">Views Stories</Label>
                  <Input
                    id="avg_story_views"
                    name="avg_story_views"
                    type="number"
                    defaultValue={editingProspect?.avg_story_views ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="story_engagement_rate" className="text-xs">Engajamento Stories (%)</Label>
                  <Input
                    id="story_engagement_rate"
                    name="story_engagement_rate"
                    type="number"
                    step="0.01"
                    defaultValue={editingProspect?.story_engagement_rate ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="avg_reel_views" className="text-xs">Views Reels</Label>
                  <Input
                    id="avg_reel_views"
                    name="avg_reel_views"
                    type="number"
                    defaultValue={editingProspect?.avg_reel_views ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reel_engagement_rate" className="text-xs">Engajamento Reels (%)</Label>
                  <Input
                    id="reel_engagement_rate"
                    name="reel_engagement_rate"
                    type="number"
                    step="0.01"
                    defaultValue={editingProspect?.reel_engagement_rate ?? ""}
                  />
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                Orcamento
              </h4>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="budget_stories_seq" className="text-xs">Seq. Stories (R$)</Label>
                  <Input
                    id="budget_stories_seq"
                    name="budget_stories_seq"
                    type="number"
                    step="0.01"
                    defaultValue={editingProspect?.budget_stories_seq ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="budget_reels" className="text-xs">Reels (R$)</Label>
                  <Input
                    id="budget_reels"
                    name="budget_reels"
                    type="number"
                    step="0.01"
                    defaultValue={editingProspect?.budget_reels ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="budget_reels_stories" className="text-xs">Reels+Stories (R$)</Label>
                  <Input
                    id="budget_reels_stories"
                    name="budget_reels_stories"
                    type="number"
                    step="0.01"
                    defaultValue={editingProspect?.budget_reels_stories ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="agreed_value" className="text-xs">Valor Fechado (R$)</Label>
                  <Input
                    id="agreed_value"
                    name="agreed_value"
                    type="number"
                    step="0.01"
                    defaultValue={editingProspect?.agreed_value ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cost_per_story_view" className="text-xs">CPV Stories (R$)</Label>
                  <Input
                    id="cost_per_story_view"
                    name="cost_per_story_view"
                    type="number"
                    step="0.0001"
                    defaultValue={editingProspect?.cost_per_story_view ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cost_per_reel_view" className="text-xs">CPV Reels (R$)</Label>
                  <Input
                    id="cost_per_reel_view"
                    name="cost_per_reel_view"
                    type="number"
                    step="0.0001"
                    defaultValue={editingProspect?.cost_per_reel_view ?? ""}
                  />
                </div>
              </div>
            </div>

            {/* Negotiation */}
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                Negociacao
              </h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="proposed_scope" className="text-xs">Escopo Proposto</Label>
                  <textarea
                    id="proposed_scope"
                    name="proposed_scope"
                    defaultValue={editingProspect?.proposed_scope || ""}
                    className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="influencer_asking_price" className="text-xs">
                    Orcamento Enviado pela Influ
                  </Label>
                  <textarea
                    id="influencer_asking_price"
                    name="influencer_asking_price"
                    defaultValue={editingProspect?.influencer_asking_price || ""}
                    className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v ?? "analisar")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analisar">Analisar</SelectItem>
                        <SelectItem value="aprovada">Aprovada</SelectItem>
                        <SelectItem value="reprovada">Reprovada</SelectItem>
                        <SelectItem value="sem_retorno">Sem Retorno</SelectItem>
                        <SelectItem value="contato_futuro">Contato Futuro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Parceria</Label>
                    <Select
                      value={partnershipStatus}
                      onValueChange={(v) =>
                        setPartnershipStatus(v ?? "em_negociacao")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="em_negociacao">Em Negociacao</SelectItem>
                        <SelectItem value="fechada">Fechada</SelectItem>
                        <SelectItem value="sem_retorno">Sem Retorno</SelectItem>
                        <SelectItem value="contato_futuro">Contato Futuro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Salvando..."
                : isEditing
                  ? "Salvar"
                  : "Criar Prospect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
