import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const source = request.headers.get("x-source") || "shopify";

  const admin = createAdminClient();

  // Extract order data based on source
  const tenantId = body.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }

  const externalId = body.external_id || body.id?.toString();
  if (!externalId) {
    return NextResponse.json({ error: "external_id required" }, { status: 400 });
  }

  // Insert order (dedup via UNIQUE constraint)
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      tenant_id: tenantId,
      external_id: externalId,
      order_date: body.order_date || body.created_at || new Date().toISOString(),
      total_amount: body.total_amount || body.total_price || 0,
      discount_code: body.discount_code || body.discount_codes?.[0]?.code || null,
      source,
      raw_data: body,
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
  const items = body.line_items || body.items || [];
  if (items.length > 0 && order) {
    const orderItems = items.map((item: Record<string, unknown>) => {
      const productId = item.product_id as string | undefined;
      return {
        order_id: order.id,
        tenant_id: tenantId,
        external_product_id: productId?.toString() || null,
        product_name: (item.title as string) || (item.name as string) || "Unknown",
        quantity: (item.quantity as number) || 1,
        unit_price: Number(item.price) || 0,
        unit_cost: item.cost ? Number(item.cost) : null,
      };
    });

    await admin.from("order_items").insert(orderItems);
  }

  return NextResponse.json({ success: true, order_id: order?.id });
}
