"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Prospect, ProspectNote } from "./types";

export async function getProspects(): Promise<{
  data: Prospect[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("influencer_prospects")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as Prospect[] };
}

export async function createProspect(formData: {
  name: string;
  instagram_url: string;
  prospect_type: string;
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
  proposed_scope: string;
  influencer_asking_price: string;
  status: string;
  partnership_status: string;
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

  const { error } = await supabase.from("influencer_prospects").insert({
    tenant_id: tenantUser.tenant_id,
    ...formData,
  });

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return {};
}

export async function updateProspect(
  id: string,
  formData: {
    name: string;
    instagram_url: string;
    prospect_type: string;
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
    proposed_scope: string;
    influencer_asking_price: string;
    status: string;
    partnership_status: string;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("influencer_prospects")
    .update(formData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return {};
}

export async function updateProspectStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("influencer_prospects")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return {};
}

export async function updatePartnershipStatus(
  id: string,
  partnershipStatus: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("influencer_prospects")
    .update({ partnership_status: partnershipStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return {};
}

export async function archiveProspect(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("influencer_prospects")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return {};
}

export async function getProspectNotes(
  prospectId: string
): Promise<{ data: ProspectNote[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prospect_notes")
    .select("id, prospect_id, content, author_id, created_at")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  // Get author names
  const authorIds = [...new Set((data || []).map((n) => n.author_id))];
  let authorMap = new Map<string, string>();

  if (authorIds.length > 0) {
    const { data: users } = await supabase
      .from("tenant_users")
      .select("user_id")
      .in("user_id", authorIds);

    // Use auth metadata for names (since tenant_users doesn't have names)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      authorMap.set(
        user.id,
        (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          user.email?.split("@")[0] ||
          "Usuario"
      );
    }
  }

  const notes: ProspectNote[] = (data || []).map((n) => ({
    id: n.id,
    prospect_id: n.prospect_id,
    content: n.content,
    author_name: authorMap.get(n.author_id) || "Usuario",
    created_at: n.created_at,
  }));

  return { data: notes };
}

export async function addProspectNote(
  prospectId: string,
  content: string
): Promise<{ error?: string }> {
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

  const { error } = await supabase.from("prospect_notes").insert({
    prospect_id: prospectId,
    tenant_id: tenantUser.tenant_id,
    author_id: user.id,
    content,
  });

  if (error) return { error: error.message };
  return {};
}

export async function importProspects(
  rows: {
    name: string;
    instagram_url: string;
    prospect_type: string;
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
    proposed_scope: string;
    influencer_asking_price: string;
    status: string;
    partnership_status: string;
  }[]
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { count: 0, error: "Tenant nao encontrado" };

  const insertRows = rows.map((r) => ({
    tenant_id: tenantUser.tenant_id,
    ...r,
  }));

  const { error } = await supabase
    .from("influencer_prospects")
    .insert(insertRows);

  if (error) return { count: 0, error: error.message };

  revalidatePath("/prospects");
  return { count: rows.length };
}

export async function convertToInfluencer(
  prospectId: string,
  couponCode: string
): Promise<{ influencerId?: string; error?: string }> {
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

  // Get prospect data
  const { data: prospect } = await supabase
    .from("influencer_prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (!prospect) return { error: "Prospect nao encontrada" };

  // Extract instagram handle from URL
  let handle = prospect.instagram_url || "";
  handle = handle
    .replace(/https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/$/, "")
    .replace(/^@/, "");

  // Create influencer
  const { data: influencer, error: infError } = await supabase
    .from("influencers")
    .insert({
      tenant_id: tenantUser.tenant_id,
      name: prospect.name,
      instagram_handle: handle || null,
      coupon_code: couponCode,
    })
    .select("id")
    .single();

  if (infError) return { error: infError.message };

  // Link prospect to influencer
  await supabase
    .from("influencer_prospects")
    .update({
      converted_influencer_id: influencer.id,
      partnership_status: "fechada",
    })
    .eq("id", prospectId);

  revalidatePath("/prospects");
  revalidatePath("/influencers");
  return { influencerId: influencer.id };
}
