"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Integration = {
  id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  sync_interval: string;
  error_message: string | null;
  credentials: Record<string, string>;
};

export async function getIntegrations(): Promise<{ data: Integration[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("integrations")
    .select("id, provider, status, last_sync_at, sync_interval, error_message, credentials")
    .order("provider");

  if (error) return { data: [], error: error.message };
  return { data: data || [] };
}

export async function connectIntegration(
  provider: string,
  credentials: Record<string, string>
): Promise<{ error?: string }> {
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
    .from("integrations")
    .upsert(
      {
        tenant_id: tenantUser.tenant_id,
        provider,
        credentials,
        status: "connected",
      },
      { onConflict: "tenant_id,provider" }
    );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function disconnectIntegration(provider: string): Promise<{ error?: string }> {
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
    .from("integrations")
    .delete()
    .eq("tenant_id", tenantUser.tenant_id)
    .eq("provider", provider);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}
