"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ColorEntry = {
  name: string;
  hex: string;
};

export type BrandVisualIdentity = {
  id: string;
  logo_url: string | null;
  color_palette: ColorEntry[];
  primary_font: string | null;
  secondary_font: string | null;
};

export async function getVisualIdentity(): Promise<{ data: BrandVisualIdentity | null; error?: string }> {
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
    .from("brand_visual_identity")
    .select("*")
    .eq("tenant_id", tenantUser.tenant_id)
    .single();

  if (error && error.code !== "PGRST116") {
    return { data: null, error: error.message };
  }

  return { data };
}

export async function saveVisualIdentity(formData: {
  color_palette: ColorEntry[];
  primary_font: string;
  secondary_font: string;
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
    .from("brand_visual_identity")
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

export async function uploadLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  const file = formData.get("logo") as File;
  if (!file) return { error: "Nenhum arquivo selecionado" };

  const ext = file.name.split(".").pop();
  const filePath = `${tenantUser.tenant_id}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("brand-assets")
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from("brand-assets")
    .getPublicUrl(filePath);

  // Save URL to visual identity table
  await supabase
    .from("brand_visual_identity")
    .upsert(
      {
        tenant_id: tenantUser.tenant_id,
        logo_url: urlData.publicUrl,
      },
      { onConflict: "tenant_id" }
    );

  revalidatePath("/branding");
  return { url: urlData.publicUrl };
}
