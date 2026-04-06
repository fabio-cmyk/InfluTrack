export type PostFormat =
  | "reels"
  | "stories"
  | "feed"
  | "tiktok"
  | "youtube"
  | "shorts"
  | "carousel"
  | "live"
  | "other";

export type PostStatus = "scheduled" | "published" | "missed" | "cancelled";

export type ScheduledPost = {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  post_format: PostFormat;
  status: PostStatus;
  notes: string | null;
  campaign_id: string | null;
  influencer_id: string | null;
  campaign_name: string | null;
  influencer_name: string | null;
  created_at: string;
};

export type CalendarCampaign = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

export type CalendarFilters = {
  campaigns: { id: string; name: string }[];
  influencers: { id: string; name: string }[];
};
