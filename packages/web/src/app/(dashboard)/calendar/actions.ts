"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledPost, CalendarFilters } from "./types";

export async function getScheduledPosts(
  month: number,
  year: number
): Promise<{ data: ScheduledPost[]; error?: string }> {
  const supabase = await createClient();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // last day of month

  const [postsRes, campaignsRes, influencersRes] = await Promise.all([
    supabase
      .from("scheduled_posts")
      .select("*")
      .eq("is_archived", false)
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_date")
      .order("scheduled_time"),
    supabase.from("campaigns").select("id, name").eq("is_archived", false),
    supabase.from("influencers").select("id, name").eq("is_archived", false),
  ]);

  if (postsRes.error) return { data: [], error: postsRes.error.message };

  const campMap = new Map(
    (campaignsRes.data || []).map((c) => [c.id, c.name])
  );
  const infMap = new Map(
    (influencersRes.data || []).map((i) => [i.id, i.name])
  );

  const posts: ScheduledPost[] = (postsRes.data || []).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    scheduled_date: p.scheduled_date,
    scheduled_time: p.scheduled_time,
    post_format: p.post_format,
    status: p.status,
    notes: p.notes,
    campaign_id: p.campaign_id,
    influencer_id: p.influencer_id,
    campaign_name: p.campaign_id ? campMap.get(p.campaign_id) || null : null,
    influencer_name: p.influencer_id ? infMap.get(p.influencer_id) || null : null,
    created_at: p.created_at,
  }));

  return { data: posts };
}

export async function getCalendarFilters(): Promise<CalendarFilters> {
  const supabase = await createClient();

  const [campaignsRes, influencersRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("influencers")
      .select("id, name")
      .eq("is_archived", false)
      .order("name"),
  ]);

  return {
    campaigns: campaignsRes.data || [],
    influencers: influencersRes.data || [],
  };
}

export async function createScheduledPost(formData: {
  title: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string | null;
  post_format: string;
  campaign_id: string | null;
  influencer_id: string | null;
  notes: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  const { error } = await supabase.from("scheduled_posts").insert({
    tenant_id: tenantUser.tenant_id,
    ...formData,
  });

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return {};
}

export async function updateScheduledPost(
  id: string,
  formData: {
    title: string;
    description: string;
    scheduled_date: string;
    scheduled_time: string | null;
    post_format: string;
    campaign_id: string | null;
    influencer_id: string | null;
    notes: string;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("scheduled_posts")
    .update(formData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return {};
}

export async function updatePostStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("scheduled_posts")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return {};
}

export async function deleteScheduledPost(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("scheduled_posts")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return {};
}
