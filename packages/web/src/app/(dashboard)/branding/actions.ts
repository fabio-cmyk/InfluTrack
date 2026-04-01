"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BrandAsset = {
  id: string;
  brand_name: string | null;
  mission: string | null;
  vision: string | null;
  values: string[];
  tone_of_voice: string | null;
  target_audience: string | null;
  customer_pain_points: string[];
  product_benefits: string[];
  competitive_differentiators: string[];
  brand_keywords: string[];
};

export async function getBrandAsset(): Promise<{ data: BrandAsset | null; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { data: null, error: "Tenant nao encontrado" };

  const { data, error } = await supabase
    .from("brand_assets")
    .select("*")
    .eq("tenant_id", tenantUser.tenant_id)
    .single();

  if (error && error.code !== "PGRST116") {
    return { data: null, error: error.message };
  }

  return { data };
}

export async function saveBrandAsset(formData: {
  brand_name: string;
  mission: string;
  vision: string;
  values: string[];
  tone_of_voice: string;
  target_audience: string;
  customer_pain_points: string[];
  product_benefits: string[];
  competitive_differentiators: string[];
  brand_keywords: string[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  const { error } = await supabase
    .from("brand_assets")
    .upsert(
      {
        tenant_id: tenantUser.tenant_id,
        ...formData,
      },
      { onConflict: "tenant_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/branding");
  return {};
}
