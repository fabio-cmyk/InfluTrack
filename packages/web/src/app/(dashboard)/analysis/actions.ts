"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AnalysisEntry = {
  id: string;
  handle: string;
  platform: string;
  fit_score: number | null;
  fit_classification: string | null;
  strengths: string[];
  concerns: string[];
  saved_as_influencer_id: string | null;
  created_at: string;
};

export async function getAnalysisHistory(): Promise<{ data: AnalysisEntry[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analysis_history")
    .select("id, handle, platform, fit_score, fit_classification, strengths, concerns, saved_as_influencer_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return { data: data || [] };
}

export async function createAnalysis(handle: string, platform: string): Promise<{ data?: AnalysisEntry; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  // In production, this would call Apify for profile data and compute fit score
  // For now, create a placeholder analysis
  const fitScore = Math.floor(Math.random() * 60) + 30; // 30-90 range placeholder
  const classification = fitScore >= 70 ? "recommended" : fitScore >= 40 ? "neutral" : "not_recommended";

  const { data, error } = await supabase
    .from("analysis_history")
    .insert({
      tenant_id: tenantUser.tenant_id,
      handle,
      platform,
      analysis_data: {
        note: "Analise placeholder — configure Apify para dados reais",
      },
      fit_score: fitScore,
      fit_classification: classification,
      strengths: ["Engajamento acima da media", "Conteudo consistente"],
      concerns: ["Dados reais indisponiveis sem integracao Apify"],
    })
    .select("id, handle, platform, fit_score, fit_classification, strengths, concerns, saved_as_influencer_id, created_at")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/analysis");
  return { data };
}
