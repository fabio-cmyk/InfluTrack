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

export async function POST(request: Request) {
  const rawBody = await request.text();
  const { searchParams } = new URL(request.url);
  const alias = searchParams.get("alias");

  if (!alias) {
    return NextResponse.json({ error: "alias query param required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find tenant by Yampi alias in integrations table
  const { data: integration } = await admin
    .from("integrations")
    .select("tenant_id, credentials")
    .eq("provider", "yampi")
    .eq("status", "connected")
    .single();

  if (!integration) {
    return NextResponse.json({ error: "No Yampi integration found" }, { status: 404 });
  }

  // Check alias matches
  const storedAlias = integration.credentials?.alias;
  if (storedAlias && storedAlias !== alias) {
    // Try finding by alias across all tenants
    const { data: matchingIntegration } = await admin
      .from("integrations")
      .select("tenant_id, credentials")
      .eq("provider", "yampi")
      .eq("status", "connected")
      .filter("credentials->>alias", "eq", alias)
      .single();

    if (!matchingIntegration) {
      return NextResponse.json({ error: "No integration matches this alias" }, { status: 404 });
    }

    // Use matched integration
    Object.assign(integration, matchingIntegration);
  }

  const tenantId = integration.tenant_id;

  // Validate HMAC signature if secret exists
  const signature = request.headers.get("x-yampi-hmac-sha256");
  const webhookSecret = integration.credentials?.webhook_secret;
  if (signature && webhookSecret) {
    if (!verifyHmac(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // Parse body
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event;
  const resource = payload.resource;

  // Only process order events
  if (!event?.startsWith("order.") || !resource) {
    return NextResponse.json({ message: "Event ignored", event }, { status: 200 });
  }

  const externalId = resource.id?.toString() || resource.number?.toString();
  if (!externalId) {
    return NextResponse.json({ error: "No order ID in payload" }, { status: 400 });
  }

  // Extract coupon/discount code
  // Yampi sends promocode_id — we try to match via metadata or discount value
  const discountCode = resource.promocode?.code
    || resource.coupon_code
    || resource.metadata?.coupon
    || null;

  // Insert order
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      tenant_id: tenantId,
      external_id: externalId,
      order_date: resource.created_at || resource.updated_at || new Date().toISOString(),
      total_amount: Number(resource.value_total) || 0,
      discount_code: discountCode,
      source: "yampi",
      raw_data: payload,
    })
    .select("id")
    .single();

  if (orderError) {
    if (orderError.code === "23505") {
      return NextResponse.json({ message: "Order already processed" }, { status: 200 });
    }
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // Insert order items
  const items = resource.items?.data || resource.items || [];
  if (items.length > 0 && order) {
    const orderItems = items.map((item: Record<string, unknown>) => ({
      order_id: order.id,
      tenant_id: tenantId,
      external_product_id: (item.product_id || item.sku_id)?.toString() || null,
      product_name: (item.name as string) || (item.item_sku as string) || "Produto Yampi",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.price) || 0,
      unit_cost: item.price_cost ? Number(item.price_cost) : null,
    }));

    await admin.from("order_items").insert(orderItems);
  }

  return NextResponse.json({
    success: true,
    order_id: order?.id,
    event,
    items_count: items.length,
  });
}
