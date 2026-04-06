"use client";

import { useState, useCallback, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isWithinInterval,
  parseISO,
  max as dateMax,
  min as dateMin,
  differenceInDays,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/shared/empty-state";
import { FormatBadge } from "@/components/shared/format-badge";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  getScheduledPosts,
  getCalendarCampaigns,
  updatePostStatus,
  deleteScheduledPost,
} from "./actions";
import { PostFormDialog } from "./post-form-dialog";
import type {
  ScheduledPost,
  CalendarCampaign,
  CalendarFilters,
  PostFormat,
  PostStatus,
} from "./types";

const STATUS_CONFIG: Record<
  PostStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    dot: string;
  }
> = {
  scheduled: { label: "Agendado", variant: "secondary", dot: "bg-yellow-400" },
  published: { label: "Publicado", variant: "default", dot: "bg-green-500" },
  missed: { label: "Perdido", variant: "destructive", dot: "bg-red-500" },
  cancelled: { label: "Cancelado", variant: "outline", dot: "bg-gray-400" },
};

const CAMPAIGN_COLORS = [
  "bg-blue-500/20 text-blue-700 border-blue-500/40",
  "bg-emerald-500/20 text-emerald-700 border-emerald-500/40",
  "bg-violet-500/20 text-violet-700 border-violet-500/40",
  "bg-amber-500/20 text-amber-700 border-amber-500/40",
  "bg-rose-500/20 text-rose-700 border-rose-500/40",
  "bg-cyan-500/20 text-cyan-700 border-cyan-500/40",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

interface CalendarClientProps {
  initialPosts: ScheduledPost[];
  initialCampaigns: CalendarCampaign[];
  filters: CalendarFilters;
  initialMonth: number;
  initialYear: number;
}

export function CalendarClient({
  initialPosts,
  initialCampaigns,
  filters,
  initialMonth,
  initialYear,
}: CalendarClientProps) {
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts);
  const [campaigns, setCampaigns] = useState<CalendarCampaign[]>(initialCampaigns);
  const [currentDate, setCurrentDate] = useState(
    new Date(initialYear, initialMonth - 1, 1)
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [detailPost, setDetailPost] = useState<ScheduledPost | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterInfluencer, setFilterInfluencer] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const loadData = useCallback(async (date: Date) => {
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    const [postsRes, campaignsRes] = await Promise.all([
      getScheduledPosts(m, y),
      getCalendarCampaigns(m, y),
    ]);
    setPosts(postsRes.data);
    setCampaigns(campaignsRes);
  }, []);

  async function navigateMonth(direction: "prev" | "next") {
    const newDate =
      direction === "prev"
        ? subMonths(currentDate, 1)
        : addMonths(currentDate, 1);
    setCurrentDate(newDate);
    await loadData(newDate);
  }

  function handleDayClick(day: Date) {
    setEditingPost(null);
    setDefaultDate(format(day, "yyyy-MM-dd"));
    setFormOpen(true);
  }

  function handleNewPost() {
    setEditingPost(null);
    setDefaultDate("");
    setFormOpen(true);
  }

  function handleEditPost(post: ScheduledPost) {
    setDetailPost(null);
    setEditingPost(post);
    setDefaultDate("");
    setFormOpen(true);
  }

  async function handleStatusChange(post: ScheduledPost, status: PostStatus) {
    await updatePostStatus(post.id, status);
    setDetailPost(null);
    await loadData(currentDate);
  }

  async function handleDelete(post: ScheduledPost) {
    await deleteScheduledPost(post.id);
    setDetailPost(null);
    await loadData(currentDate);
  }

  async function handleSaved() {
    await loadData(currentDate);
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Group posts by date
  const postsByDate = new Map<string, ScheduledPost[]>();
  for (const post of posts) {
    const key = post.scheduled_date;
    if (!postsByDate.has(key)) postsByDate.set(key, []);
    postsByDate.get(key)!.push(post);
  }

  // Apply filters
  const filteredPostsByDate = new Map<string, ScheduledPost[]>();
  for (const [date, dayPosts] of postsByDate) {
    const filtered = dayPosts.filter((p) => {
      if (filterCampaign && p.campaign_id !== filterCampaign) return false;
      if (filterInfluencer && p.influencer_id !== filterInfluencer) return false;
      if (filterFormat && p.post_format !== filterFormat) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
    if (filtered.length > 0) filteredPostsByDate.set(date, filtered);
  }

  // Build campaign bars per week
  const campaignBars = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = week[0];
      const weekEnd = week[6];
      const bars: {
        campaign: CalendarCampaign;
        startCol: number;
        span: number;
        color: string;
      }[] = [];

      campaigns.forEach((camp, idx) => {
        const campStart = parseISO(camp.start_date);
        const campEnd = parseISO(camp.end_date);

        // Check if campaign overlaps this week
        if (campEnd < weekStart || campStart > weekEnd) return;

        const visibleStart = dateMax([campStart, weekStart]);
        const visibleEnd = dateMin([campEnd, weekEnd]);
        const startCol = getDay(visibleStart);
        const span = differenceInDays(visibleEnd, visibleStart) + 1;
        const color = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];

        bars.push({ campaign: camp, startCol, span, color });
      });

      return bars;
    });
  }, [weeks, campaigns]);

  const totalPosts = posts.length;
  const hasContent = totalPosts > 0 || campaigns.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario de Postagens"
        description="Planeje e acompanhe todas as postagens programadas"
      >
        <Button onClick={handleNewPost}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Postagem
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterCampaign}
          onValueChange={(v) => setFilterCampaign(v ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {filters.campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterInfluencer}
          onValueChange={(v) => setFilterInfluencer(v ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Influencer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {filters.influencers.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterFormat}
          onValueChange={(v) => setFilterFormat(v ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="reels">Reels</SelectItem>
            <SelectItem value="stories">Stories</SelectItem>
            <SelectItem value="feed">Feed</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="shorts">Shorts</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="scheduled">Agendado</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="missed">Perdido</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign legend */}
      {campaigns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Campanhas:
          </span>
          {campaigns.map((camp, idx) => {
            const color = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];
            return (
              <span
                key={camp.id}
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${color}`}
              >
                {camp.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Calendar */}
      <Card>
        <CardContent className="p-0">
          {/* Month header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!hasContent &&
          !filterCampaign &&
          !filterInfluencer &&
          !filterFormat &&
          !filterStatus ? (
            <div className="py-8">
              <EmptyState
                icon={CalendarDays}
                title="Nenhuma postagem agendada"
                description="Crie sua primeira postagem para comecar a organizar o calendario."
              />
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, weekIdx) => {
                const bars = campaignBars[weekIdx] || [];

                return (
                  <div key={weekIdx}>
                    {/* Campaign bars row */}
                    {bars.length > 0 && (
                      <div className="relative grid grid-cols-7 border-b bg-muted/20">
                        {bars.map((bar) => (
                          <div
                            key={bar.campaign.id}
                            className={`truncate border rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight ${bar.color}`}
                            style={{
                              gridColumn: `${bar.startCol + 1} / span ${bar.span}`,
                            }}
                            title={`${bar.campaign.name} (${new Date(bar.campaign.start_date + "T12:00:00").toLocaleDateString("pt-BR")} - ${new Date(bar.campaign.end_date + "T12:00:00").toLocaleDateString("pt-BR")})`}
                          >
                            {bar.campaign.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                      {week.map((day) => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        const dayPosts =
                          filteredPostsByDate.get(dateKey) || [];
                        const inMonth = isSameMonth(day, currentDate);
                        const todayFlag = isToday(day);
                        const maxVisible = 3;

                        return (
                          <div
                            key={dateKey}
                            className={`min-h-[100px] border-b border-r p-1.5 transition-colors cursor-pointer hover:bg-accent/30 ${
                              !inMonth ? "bg-muted/30" : ""
                            }`}
                            onClick={() => handleDayClick(day)}
                          >
                            <div
                              className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                                todayFlag
                                  ? "bg-primary text-primary-foreground"
                                  : !inMonth
                                    ? "text-muted-foreground/50"
                                    : "text-foreground"
                              }`}
                            >
                              {format(day, "d")}
                            </div>
                            <div className="space-y-0.5">
                              {dayPosts
                                .slice(0, maxVisible)
                                .map((post) => (
                                  <button
                                    key={post.id}
                                    type="button"
                                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight hover:bg-accent/50 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailPost(post);
                                    }}
                                    title={
                                      STATUS_CONFIG[post.status].label
                                    }
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_CONFIG[post.status].dot}`}
                                    />
                                    <FormatBadge
                                      format={
                                        post.post_format as PostFormat
                                      }
                                      showLabel={false}
                                    />
                                    <span className="truncate">
                                      {post.title}
                                    </span>
                                  </button>
                                ))}
                              {dayPosts.length > maxVisible && (
                                <div className="px-1 text-[10px] text-muted-foreground">
                                  +{dayPosts.length - maxVisible} mais
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <PostFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        filters={filters}
        editingPost={editingPost}
        defaultDate={defaultDate}
        onSaved={handleSaved}
      />

      {/* Detail dialog */}
      <Dialog
        open={!!detailPost}
        onOpenChange={(open) => !open && setDetailPost(null)}
      >
        <DialogContent className="sm:max-w-md">
          {detailPost && (
            <>
              <DialogHeader>
                <DialogTitle>{detailPost.title}</DialogTitle>
                <DialogDescription>
                  Detalhes da postagem agendada
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <FormatBadge
                    format={detailPost.post_format as PostFormat}
                  />
                  <Badge
                    variant={STATUS_CONFIG[detailPost.status].variant}
                  >
                    {STATUS_CONFIG[detailPost.status].label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Data:</span>{" "}
                    {new Date(
                      detailPost.scheduled_date + "T12:00:00"
                    ).toLocaleDateString("pt-BR")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hora:</span>{" "}
                    {detailPost.scheduled_time?.slice(0, 5) || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Campanha:
                    </span>{" "}
                    {detailPost.campaign_name || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Influencer:
                    </span>{" "}
                    {detailPost.influencer_name || "—"}
                  </div>
                </div>

                {detailPost.description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Descricao:
                    </span>
                    <p className="mt-1">{detailPost.description}</p>
                  </div>
                )}

                {detailPost.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Observacoes:
                    </span>
                    <p className="mt-1">{detailPost.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <div className="flex w-full flex-wrap gap-2">
                  {detailPost.status === "scheduled" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(detailPost, "published")
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Publicado
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(detailPost, "cancelled")
                        }
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(detailPost, "missed")
                        }
                      >
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        Perdido
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditPost(detailPost)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(detailPost)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Excluir
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
