import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { profile, posts, comments, metrics, brandAssets } = body as {
    profile: Record<string, unknown>;
    posts: Array<Record<string, unknown>>;
    comments: Array<Record<string, unknown>>;
    metrics: Record<string, unknown>;
    brandAssets: Record<string, unknown>;
  };

  if (!profile) {
    return new Response(JSON.stringify({ error: "Dados de perfil obrigatórios" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build rich brand context from all brand assets
  const ba = brandAssets || {};
  const brandParts: string[] = [];
  if (ba.brand_name) brandParts.push(`**Marca:** ${ba.brand_name}`);
  if (ba.mission) brandParts.push(`**Missão:** ${ba.mission}`);
  if (ba.vision) brandParts.push(`**Visão:** ${ba.vision}`);
  if (ba.tone_of_voice) brandParts.push(`**Tom de voz:** ${ba.tone_of_voice}`);
  if (ba.target_audience) brandParts.push(`**Público-alvo:** ${ba.target_audience}`);
  if (Array.isArray(ba.values) && ba.values.length > 0) brandParts.push(`**Valores:** ${ba.values.join(", ")}`);
  if (Array.isArray(ba.product_benefits) && ba.product_benefits.length > 0) brandParts.push(`**Benefícios do produto:** ${ba.product_benefits.join(", ")}`);
  if (Array.isArray(ba.customer_pain_points) && ba.customer_pain_points.length > 0) brandParts.push(`**Dores do cliente:** ${ba.customer_pain_points.join(", ")}`);
  if (Array.isArray(ba.competitive_differentiators) && ba.competitive_differentiators.length > 0) brandParts.push(`**Diferenciais:** ${ba.competitive_differentiators.join(", ")}`);
  if (Array.isArray(ba.brand_keywords) && ba.brand_keywords.length > 0) brandParts.push(`**Keywords:** ${ba.brand_keywords.join(", ")}`);

  const brandContext = brandParts.length > 0
    ? `PERFIL DA MARCA DO CLIENTE:\n${brandParts.join("\n")}\n\nUse estas informações para avaliar o FIT entre o influencer e a marca. Compare tom de voz, público-alvo, valores e posicionamento.`
    : "Não há informações específicas da marca — faça uma análise genérica de potencial.";

  const isTikTok = profile.platform === "tiktok";

  const platformSpecificSection = isTikTok
    ? `## 3. Análise de Conteúdo (TikTok)
Temas recorrentes, formatos de vídeo, qualidade dos hooks (primeiros 3 segundos), uso de trends e sons populares, frequência de postagem, potencial viral, qualidade de edição.
IMPORTANTE: No TikTok, views médias por vídeo é a métrica mais importante. Engagement rate é calculado sobre views (não sobre seguidores).`
    : `## 3. Análise de Conteúdo
Temas recorrentes, formatos preferidos (reels, carrossel, foto), hooks utilizados, frequência de postagem, qualidade visual e textual, estética do feed.`;

  const systemPrompt = `Você é um analista sênior de marketing de influência com 10+ anos de experiência em campanhas digitais no Brasil. Sua análise é detalhada, baseada em dados, e usa linguagem profissional em português.
Plataforma analisada: ${isTikTok ? "TikTok" : "Instagram"}.

${brandContext}

Gere um relatório completo com EXATAMENTE estas 6 seções em markdown:

## 1. Briefing ${isTikTok ? "do Creator" : "da Influencer"}
Posicionamento, público-alvo estimado, tom de comunicação, nicho principal e secundários.

## 2. Score de Parceria (0-100)
Calcule um score com estes pesos:
- Alinhamento com público-alvo: 30%
- Engajamento real: 25%
- Qualidade do conteúdo: 20%
- Potencial de conversão: 15%
- Custo-benefício estimado: 10%

Mostre a nota de cada dimensão e o score final ponderado. Use uma tabela markdown.

${platformSpecificSection}

## 4. Análise de Comentários
Sentimento geral (positivo/neutro/negativo com %), presença de bots ou comentários genéricos, nível de interação real ${isTikTok ? "do creator" : "do influencer"} com a audiência.

## 5. Oportunidades e Riscos
Red flags identificadas, tipo de campanha ideal (awareness, conversão, UGC, etc.), oportunidades específicas.${isTikTok ? " Avalie potencial de viralização e se o creator consegue integrar marcas de forma natural nos vídeos." : ""}

## 6. Recomendação Final
Uma de: **"✅ Recomendo"**, **"⚠️ Com ressalvas"** ou **"❌ Não recomendo"**, com justificativa clara e próximos passos sugeridos.

Seja direto, use dados concretos dos posts e comentários fornecidos. Não invente dados que não estão disponíveis.`;

  const m = metrics || {};
  const userMessage = `Analise este perfil de influencer:

**PERFIL:**
- Handle: @${profile.handle}
- Nome: ${profile.display_name}
- Plataforma: ${profile.platform}
- Seguidores: ${profile.followers}
- Seguindo: ${profile.following}
- Total de posts/videos: ${profile.posts_count}
- Bio: ${profile.biography}
- Verificado: ${profile.is_verified ? "Sim" : "Não"}

**MÉTRICAS CALCULADAS (últimos 30 dias):**
- Posts analisados: ${posts.length}
- Engagement Rate: ${m.engagement_rate || "N/A"}%${isTikTok ? " (sobre views)" : " (sobre seguidores)"}
- Média de Likes por post: ${m.avg_likes || "N/A"}
- Média de Comentários por post: ${m.avg_comments || "N/A"}
- Média de Views por post: ${m.avg_views || "N/A"}
- Ratio seguidores/seguindo: ${m.ratio || "N/A"}
- Total de comentários coletados: ${comments.length}

**POSTS/VÍDEOS ANALISADOS (${posts.length}):**
${posts.map((p, i) => `${i + 1}. [${p.type}] Likes: ${p.like_count} | Comentários: ${p.comment_count} | Views: ${p.play_count || 0} | Caption: "${String(p.caption || "").slice(0, 500)}"`).join("\n")}

**COMENTÁRIOS DA AUDIÊNCIA (${comments.length}):**
${comments.length > 0 ? comments.map((c, i) => `${i + 1}. @${c.username}: "${c.text}" (${c.likes} likes)`).join("\n") : "Sem comentários disponíveis para análise."}`;

  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
