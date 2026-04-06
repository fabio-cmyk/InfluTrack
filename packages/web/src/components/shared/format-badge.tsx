import {
  Film,
  Clock,
  ImageIcon,
  Music,
  CirclePlay,
  Zap,
  Layers,
  Radio,
  FileText,
} from "lucide-react";
import type { PostFormat } from "@/app/(dashboard)/calendar/types";

const FORMAT_CONFIG: Record<
  PostFormat,
  { label: string; color: string; icon: React.ElementType }
> = {
  reels: { label: "Reels", color: "bg-purple-100 text-purple-700", icon: Film },
  stories: { label: "Stories", color: "bg-pink-100 text-pink-700", icon: Clock },
  feed: { label: "Feed", color: "bg-blue-100 text-blue-700", icon: ImageIcon },
  tiktok: { label: "TikTok", color: "bg-teal-100 text-teal-700", icon: Music },
  youtube: { label: "YouTube", color: "bg-red-100 text-red-700", icon: CirclePlay },
  shorts: { label: "Shorts", color: "bg-orange-100 text-orange-700", icon: Zap },
  carousel: { label: "Carousel", color: "bg-indigo-100 text-indigo-700", icon: Layers },
  live: { label: "Live", color: "bg-green-100 text-green-700", icon: Radio },
  other: { label: "Outro", color: "bg-gray-100 text-gray-700", icon: FileText },
};

interface FormatBadgeProps {
  format: PostFormat;
  showLabel?: boolean;
}

export function FormatBadge({ format, showLabel = true }: FormatBadgeProps) {
  const config = FORMAT_CONFIG[format] || FORMAT_CONFIG.other;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {showLabel && config.label}
    </span>
  );
}
