"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  cost: number | null;
  source: string;
  synced_at: string | null;
  image_url: string | null;
  is_active: boolean;
};

export async function getProducts(): Promise<{ data: Product[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, price, cost, source, synced_at, image_url, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) return { data: [], error: error.message };
  return { data: data || [] };
}

export async function createProduct(formData: {
  name: string;
  sku: string;
  price: number;
  cost: number | null;
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

  const { error } = await supabase.from("products").insert({
    tenant_id: tenantUser.tenant_id,
    name: formData.name,
    sku: formData.sku || null,
    price: formData.price,
    cost: formData.cost,
    source: "manual",
  });

  if (error) return { error: error.message };

  revalidatePath("/products");
  return {};
}

export async function updateProductCost(id: string, cost: number | null): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ cost })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/products");
  return {};
}
