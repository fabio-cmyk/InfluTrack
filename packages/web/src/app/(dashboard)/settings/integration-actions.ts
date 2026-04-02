"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

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

async function getAppBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function testYampiConnection(alias: string, token: string, secretKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.dooki.com.br/v2/${alias}/webhooks`, {
      headers: {
        "User-Token": token,
        "User-Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Yampi retornou ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Falha ao conectar com Yampi: ${String(err)}` };
  }
}

async function registerYampiWebhook(
  alias: string,
  token: string,
  secretKey: string,
  webhookUrl: string
): Promise<{ webhookId?: number; error?: string }> {
  try {
    const res = await fetch(`https://api.dooki.com.br/v2/${alias}/webhooks`, {
      method: "POST",
      headers: {
        "User-Token": token,
        "User-Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "InfluTrack - Pedidos Pagos",
        url: webhookUrl,
        events: ["order.paid"],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { error: `Erro ao registrar webhook: ${res.status} - ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const webhookId = data.data?.id || data.id;
    return { webhookId };
  } catch (err) {
    return { error: `Falha ao registrar webhook: ${String(err)}` };
  }
}

async function importYampiProducts(
  alias: string,
  token: string,
  secretKey: string,
  tenantId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imported: number; error?: string }> {
  try {
    let page = 1;
    let imported = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `https://api.dooki.com.br/v2/${alias}/catalog/products?page=${page}&limit=50`,
        {
          headers: {
            "User-Token": token,
            "User-Secret-Key": secretKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) break;

      const json = await res.json();
      const products = json.data || [];

      if (products.length === 0) break;

      for (const p of products) {
        const sku = p.sku?.data?.[0];
        await supabase.from("products").upsert(
          {
            tenant_id: tenantId,
            external_id: p.id?.toString(),
            name: p.name || "Produto sem nome",
            sku: sku?.sku || null,
            price: Number(sku?.price_sale || sku?.price || p.price || 0),
            cost: sku?.price_cost ? Number(sku.price_cost) : null,
            image_url: p.images?.data?.[0]?.url || null,
            source: "yampi",
            synced_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,external_id,source" }
        );
        imported++;
      }

      hasMore = json.meta?.pagination?.current_page < json.meta?.pagination?.total_pages;
      page++;
    }

    return { imported };
  } catch (err) {
    return { imported: 0, error: String(err) };
  }
}

async function deleteYampiWebhook(
  alias: string,
  token: string,
  secretKey: string,
  webhookId: string
): Promise<void> {
  try {
    await fetch(`https://api.dooki.com.br/v2/${alias}/webhooks/${webhookId}`, {
      method: "DELETE",
      headers: {
        "User-Token": token,
        "User-Secret-Key": secretKey,
      },
    });
  } catch {
    // Best effort — don't block disconnect
  }
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

  // Yampi: test connection + auto-register webhook
  if (provider === "yampi") {
    const { alias, token, secret_key } = credentials;
    if (!alias || !token || !secret_key) {
      return { error: "Alias, Token e Secret Key sao obrigatorios" };
    }

    // Test connection
    const test = await testYampiConnection(alias, token, secret_key);
    if (!test.ok) return { error: test.error };

    // Register webhook automatically
    const baseUrl = await getAppBaseUrl();
    const webhookUrl = `${baseUrl}/api/webhooks/yampi?alias=${alias}`;
    const webhook = await registerYampiWebhook(alias, token, secret_key, webhookUrl);

    if (webhook.error) return { error: webhook.error };

    // Import products from Yampi catalog
    await importYampiProducts(alias, token, secret_key, tenantUser.tenant_id, supabase);

    // Save with webhook_id for cleanup on disconnect
    const { error } = await supabase
      .from("integrations")
      .upsert(
        {
          tenant_id: tenantUser.tenant_id,
          provider,
          credentials: {
            ...credentials,
            webhook_id: webhook.webhookId?.toString() || "",
            webhook_url: webhookUrl,
          },
          status: "connected",
        },
        { onConflict: "tenant_id,provider" }
      );

    if (error) return { error: error.message };

    revalidatePath("/settings");
    return {};
  }

  // Other providers: simple save
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

  // Yampi: remove webhook before disconnecting
  if (provider === "yampi") {
    const { data: integration } = await supabase
      .from("integrations")
      .select("credentials")
      .eq("tenant_id", tenantUser.tenant_id)
      .eq("provider", "yampi")
      .single();

    if (integration?.credentials) {
      const { alias, token, secret_key, webhook_id } = integration.credentials;
      if (alias && token && secret_key && webhook_id) {
        await deleteYampiWebhook(alias, token, secret_key, webhook_id);
      }
    }
  }

  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("tenant_id", tenantUser.tenant_id)
    .eq("provider", provider);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}
