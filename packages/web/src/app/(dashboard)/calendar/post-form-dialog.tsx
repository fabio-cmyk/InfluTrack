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
import { createScheduledPost, updateScheduledPost } from "./actions";
import type { ScheduledPost, CalendarFilters, PostFormat } from "./types";

const POST_FORMATS: { value: PostFormat; label: string }[] = [
  { value: "reels", label: "Reels" },
  { value: "stories", label: "Stories" },
  { value: "feed", label: "Feed" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "shorts", label: "Shorts" },
  { value: "carousel", label: "Carousel" },
  { value: "live", label: "Live" },
  { value: "other", label: "Outro" },
];

interface PostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CalendarFilters;
  editingPost?: ScheduledPost | null;
  defaultDate?: string;
  onSaved: () => void;
}

export function PostFormDialog({
  open,
  onOpenChange,
  filters,
  editingPost,
  defaultDate,
  onSaved,
}: PostFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<string>(editingPost?.post_format || "reels");
  const [campaignId, setCampaignId] = useState<string>(editingPost?.campaign_id || "");
  const [influencerId, setInfluencerId] = useState<string>(editingPost?.influencer_id || "");

  const isEditing = !!editingPost;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      setFormat("reels");
      setCampaignId("");
      setInfluencerId("");
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const formData = {
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || "",
      scheduled_date: fd.get("scheduled_date") as string,
      scheduled_time: (fd.get("scheduled_time") as string) || null,
      post_format: format,
      campaign_id: campaignId || null,
      influencer_id: influencerId || null,
      notes: (fd.get("notes") as string) || "",
    };

    const result = isEditing
      ? await updateScheduledPost(editingPost.id, formData)
      : await createScheduledPost(formData);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Postagem" : "Nova Postagem"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados da postagem." : "Agende uma nova postagem no calendario."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Ex: Lancamento colecao verao"
                defaultValue={editingPost?.title || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Briefing da postagem..."
                defaultValue={editingPost?.description || ""}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Data *</Label>
                <Input
                  id="scheduled_date"
                  name="scheduled_date"
                  type="date"
                  required
                  defaultValue={editingPost?.scheduled_date || defaultDate || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_time">Hora</Label>
                <Input
                  id="scheduled_time"
                  name="scheduled_time"
                  type="time"
                  defaultValue={editingPost?.scheduled_time?.slice(0, 5) || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Formato *</Label>
              <Select value={format} onValueChange={(v) => setFormat(v ?? "reels")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  {POST_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Campanha</Label>
                <Select value={campaignId} onValueChange={(v) => setCampaignId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {filters.campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Influencer</Label>
                <Select value={influencerId} onValueChange={(v) => setInfluencerId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {filters.influencers.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observacoes</Label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Notas adicionais..."
                defaultValue={editingPost?.notes || ""}
                className="flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar Postagem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
