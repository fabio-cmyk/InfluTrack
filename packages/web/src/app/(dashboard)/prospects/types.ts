export type ProspectStatus =
  | "analisar"
  | "aprovada"
  | "reprovada"
  | "sem_retorno"
  | "contato_futuro";

export type PartnershipStatus =
  | "em_negociacao"
  | "fechada"
  | "sem_retorno"
  | "contato_futuro";

export type Prospect = {
  id: string;
  name: string;
  instagram_url: string | null;
  prospect_type: "nova" | "reativada";
  followers_count: number | null;
  avg_story_views: number | null;
  budget_stories_seq: number | null;
  budget_reels_stories: number | null;
  cost_per_story_view: number | null;
  story_engagement_rate: number | null;
  avg_reel_views: number | null;
  budget_reels: number | null;
  cost_per_reel_view: number | null;
  reel_engagement_rate: number | null;
  agreed_value: number | null;
  proposed_scope: string | null;
  influencer_asking_price: string | null;
  status: ProspectStatus;
  partnership_status: PartnershipStatus;
  prospect_month: string | null;
  converted_influencer_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ProspectNote = {
  id: string;
  prospect_id: string;
  content: string;
  author_name: string;
  created_at: string;
};
