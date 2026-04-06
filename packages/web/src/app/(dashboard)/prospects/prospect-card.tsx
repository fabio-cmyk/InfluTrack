"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { Prospect } from "./types";

const PARTNERSHIP_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  em_negociacao: { label: "Em Negociacao", variant: "secondary" },
  fechada: { label: "Fechada", variant: "default" },
  sem_retorno: { label: "Sem Retorno", variant: "outline" },
  contato_futuro: { label: "Contato Futuro", variant: "secondary" },
};

function formatFollowers(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatCurrency(v: number | null): string {
  if (!v) return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface ProspectCardProps {
  prospect: Prospect;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

export function ProspectCard({ prospect, onClick, onDragStart }: ProspectCardProps) {
  const partnership = PARTNERSHIP_LABELS[prospect.partnership_status] || PARTNERSHIP_LABELS.em_negociacao;

  const instagramHandle = prospect.instagram_url
    ?.replace(/https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/$/, "") || "";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold truncate">{prospect.name}</h4>
        <Badge
          variant={prospect.prospect_type === "nova" ? "default" : "secondary"}
          className="shrink-0 text-[10px] px-1.5 py-0"
        >
          {prospect.prospect_type === "nova" ? "Nova" : "Reativada"}
        </Badge>
      </div>

      {instagramHandle && (
        <a
          href={prospect.instagram_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          @{instagramHandle}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span title="Seguidores">{formatFollowers(prospect.followers_count)} seg.</span>
        {prospect.story_engagement_rate != null && prospect.story_engagement_rate > 0 && (
          <span title="Engajamento Stories">
            {prospect.story_engagement_rate.toFixed(1)}% eng.
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Badge variant={partnership.variant} className="text-[10px]">
          {partnership.label}
        </Badge>
        {prospect.agreed_value != null && prospect.agreed_value > 0 && (
          <span className="text-xs font-medium text-emerald-600">
            {formatCurrency(prospect.agreed_value)}
          </span>
        )}
      </div>
    </div>
  );
}
