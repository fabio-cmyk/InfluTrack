import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function verifyHmac(body: string, signature: string, secret: string): boolean {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  return computed === signature;
}

async function logWebhook(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string | null,
  status: string,
  details: Record<string, unknown>
) {
  try {
    await admin.from("sync_logs").insert({
      tenant_id: tenantId || "00000000-0000-0000-0000-000000000000",
      provider: "yampi",
      sync_type: "orders",
      status,
      error_details: details,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
  } catch {
    // Don't fail the webhook if logging fails
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const { searchParams } = new URL(request.url);
  const alias = searchParams.get("alias");

  const admin = createAdminClient();

  // Log every incoming call for debugging
  let tenantId: string | null = null;

  if (!alias) {
    await logWebhook(admin, null, "failed", { error: "no alias param", url: request.url });
    return NextResponse.json({ error: "alias query param required" }, { status: 400 });
  }

  // Find tenant by alias — search directly by credentials->alias
  const { data: integration, error: integrationError } = await admin
    .from("integrations")
    .select("tenant_id, credentials")
    .eq("provider", "yampi")
    .eq("status", "connected")
    .filter("credentials->>alias", "eq", alias)
    .single();

  if (integrationError || !integration) {
    // Fallback: try any connected yampi integration
    const { data: fallback } = await admin
      .from("integrations")
      .select("tenant_id, credentials")
      .eq("provider", "yampi")
      .eq("status", "connected")
      .limit(1)
      .single();

    if (!fallback) {
      await logWebhook(admin, null, "failed", { error: "no integration found", alias, integrationError });
      return NextResponse.json({ error: "No Yampi integration found for alias: " + alias }, { status: 404 });
    }

    tenantId = fallback.tenant_id;
  } else {
    tenantId = integration.tenant_id;
  }

  // Validate HMAC signature if present
  const signature = request.headers.get("x-yampi-hmac-sha256");
  const webhookSecret = integration?.credentials?.webhook_secret;
  if (signature && webhookSecret) {
    if (!verifyHmac(rawBody, signature, webhookSecret)) {
      await logWebhook(admin, tenantId, "failed", { error: "invalid HMAC signature" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // Parse body
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await logWebhook(admin, tenantId, "failed", { error: "invalid JSON", body: rawBody.slice(0, 500) });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event;
  const resource = payload.resource || payload.data || payload;

  // Log the incoming event
  await logWebhook(admin, tenantId, "started", {
    event,
    alias,
    has_resource: !!resource,
    keys: Object.keys(payload),
    resource_keys: resource ? Object.keys(resource) : [],
  });

  // Parse Yampi date objects: {date: "2026-04-01 22:35:32.000000", timezone_type: 3, timezone: "America/Sao_Paulo"}
  function parseYampiDate(val: unknown): string {
    if (!val) return new Date().toISOString();
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null && "date" in val) {
      return (val as { date: string }).date;
    }
    return new Date().toISOString();
  }

  // Accept all order events, not just order.*
  // Some Yampi versions may send different event names
  const isOrderEvent = event?.startsWith("order.") || event?.includes("order") || event?.includes("paid");

  if (!isOrderEvent) {
    await logWebhook(admin, tenantId, "completed", { message: "event ignored", event });
    return NextResponse.json({ message: "Event ignored", event }, { status: 200 });
  }

  // Extract order ID — try multiple fields
  const externalId = (
    resource.id ||
    resource.number ||
    resource.order_id ||
    resource.order_number ||
    payload.id ||
    payload.order_id
  )?.toString();

  if (!externalId) {
    await logWebhook(admin, tenantId, "failed", { error: "no order ID", resource_keys: Object.keys(resource) });
    return NextResponse.json({ error: "No order ID in payload" }, { status: 400 });
  }

  // Extract coupon/discount code — try multiple fields
  const discountCode = (
    resource.promocode?.code ||
    resource.coupon_code ||
    resource.discount_code ||
    resource.metadata?.coupon ||
    resource.metadata?.discount_code ||
    resource.cupom ||
    null
  );

  // Extract total — try multiple fields
  const totalAmount = Number(
    resource.value_total ||
    resource.total ||
    resource.amount ||
    resource.value_products ||
    payload.value_total ||
    0
  );

  // Insert order
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      tenant_id: tenantId,
      external_id: externalId,
      order_date: parseYampiDate(resource.created_at || resource.updated_at || resource.paid_at),
      total_amount: totalAmount,
      discount_code: discountCode,
      source: "yampi",
      raw_data: payload,
    })
    .select("id")
    .single();

  if (orderError) {
    if (orderError.code === "23505") {
      await logWebhook(admin, tenantId, "completed", { message: "duplicate order", externalId });
      return NextResponse.json({ message: "Order already processed" }, { status: 200 });
    }
    await logWebhook(admin, tenantId, "failed", { error: orderError.message, code: orderError.code });
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // Insert order items — try multiple payload structures
  const items = resource.items?.data || resource.items || resource.line_items || resource.products || [];
  let itemsInserted = 0;

  if (Array.isArray(items) && items.length > 0 && order) {
    const orderItems = items.map((item: Record<string, unknown>) => ({
      order_id: order.id,
      tenant_id: tenantId,
      external_product_id: (item.product_id || item.sku_id || item.id)?.toString() || null,
      product_name: (item.name as string) || (item.title as string) || (item.item_sku as string) || (item.sku as string) || "Produto Yampi",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.price || item.unit_price || item.value) || 0,
      unit_cost: item.price_cost != null ? Number(item.price_cost) : (item.cost != null ? Number(item.cost) : null),
    }));

    const { error: itemsError } = await admin.from("order_items").insert(orderItems);
    if (!itemsError) itemsInserted = orderItems.length;
  }

  await logWebhook(admin, tenantId, "completed", {
    order_id: order.id,
    external_id: externalId,
    event,
    total_amount: totalAmount,
    discount_code: discountCode,
    items_count: itemsInserted,
  });

  return NextResponse.json({
    success: true,
    order_id: order.id,
    event,
    items_count: itemsInserted,
  });
}
