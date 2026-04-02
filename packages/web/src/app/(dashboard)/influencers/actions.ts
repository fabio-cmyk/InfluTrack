"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Influencer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  city: string | null;
  state: string | null;
  niche: string | null;
  coupon_code: string;
  is_archived: boolean;
  created_at: string;
  // New fields
  status: string;
  utm_medium: string | null;
  size: string | null;
  origin: string | null;
  commission_type: string;
  commission_rate: number;
  monthly_fee: number;
  bonus_rules: string | null;
  pix_key: string | null;
  address: string | null;
  payment_info: string | null;
};

export type InfluencerFormData = {
  // Basico
  name: string;
  status: string;
  utm_medium: string;
  coupon_code: string;
  size: string;
  niche: string;
  origin: string;
  // Social
  instagram_handle: string;
  tiktok_handle: string;
  // Comissao
  commission_type: string;
  commission_rate: number;
  monthly_fee: number;
  bonus_rules: string;
  // Contato
  email: string;
  phone: string;
  pix_key: string;
  address: string;
  payment_info: string;
};

export async function getInfluencers(search?: string, niche?: string): Promise<{ data: Influencer[]; error?: string }> {
  const supabase = await createClient();

  let query = supabase
    .from("influencers")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,instagram_handle.ilike.%${search}%,tiktok_handle.ilike.%${search}%`);
  }

  if (niche) {
    query = query.eq("niche", niche);
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };
  return { data: data || [] };
}

export async function getNiches(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("influencers")
    .select("niche")
    .eq("is_archived", false)
    .not("niche", "is", null);

  const niches = [...new Set((data || []).map((d) => d.niche).filter(Boolean))] as string[];
  return niches.sort();
}

export async function createInfluencer(formData: InfluencerFormData): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  const { error } = await supabase.from("influencers").insert({
    tenant_id: tenantUser.tenant_id,
    ...formData,
  });

  if (error) {
    if (error.code === "23505") return { error: "Cupom ja existe para outro influencer" };
    return { error: error.message };
  }

  revalidatePath("/influencers");
  return {};
}

export async function updateInfluencer(id: string, formData: InfluencerFormData): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("influencers")
    .update(formData)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Cupom ja existe para outro influencer" };
    return { error: error.message };
  }

  revalidatePath("/influencers");
  return {};
}

export async function archiveInfluencer(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("influencers")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/influencers");
  return {};
}

export async function getInfluencer(id: string): Promise<{ data: Influencer | null; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data };
}
