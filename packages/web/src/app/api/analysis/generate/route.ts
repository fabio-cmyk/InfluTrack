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
  const { profile, posts, comments, brandKeywords } = body as {
    profile: Record<string, unknown>;
    posts: Array<Record<string, unknown>>;
    comments: Array<Record<string, unknown>>;
    brandKeywords: string[];
  };

  if (!profile) {
    return new Response(JSON.stringify({ error: "Dados de perfil obrigatórios" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const brandContext = brandKeywords.length > 0
    ? `A marca do cliente trabalha com: ${brandKeywords.join(", ")}.`
    : "Não há informações específicas da marca — faça uma análise genérica de potencial.";

  const systemPrompt = `Você é um analista sênior de marketing de influência com 10+ anos de experiência em campanhas digitais no Brasil. Sua análise é detalhada, baseada em dados, e usa linguagem profissional em português.

${brandContext}

Gere um relatório completo com EXATAMENTE estas 6 seções em markdown:

## 1. Briefing da Influencer
Posicionamento, público-alvo estimado, tom de comunicação, nicho principal e secundários.

## 2. Score de Parceria (0-100)
Calcule um score com estes pesos:
- Alinhamento com público-alvo: 30%
- Engajamento real: 25%
- Qualidade do conteúdo: 20%
- Potencial de conversão: 15%
- Custo-benefício estimado: 10%

Mostre a nota de cada dimensão e o score final ponderado. Use uma tabela markdown.

## 3. Análise de Conteúdo
Temas recorrentes, formatos preferidos, hooks utilizados, frequência de postagem, qualidade visual e textual.

## 4. Análise de Comentários
Sentimento geral (positivo/neutro/negativo com %), presença de bots ou comentários genéricos, nível de interação real do influencer com a audiência.

## 5. Oportunidades e Riscos
Red flags identificadas, tipo de campanha ideal (awareness, conversão, UGC, etc.), oportunidades específicas.

## 6. Recomendação Final
Uma de: **"✅ Recomendo"**, **"⚠️ Com ressalvas"** ou **"❌ Não recomendo"**, com justificativa clara e próximos passos sugeridos.

Seja direto, use dados concretos dos posts e comentários fornecidos. Não invente dados que não estão disponíveis.`;

  const userMessage = `Analise este perfil de influencer:

**PERFIL:**
- Handle: @${profile.handle}
- Nome: ${profile.display_name}
- Plataforma: ${profile.platform}
- Seguidores: ${profile.followers}
- Seguindo: ${profile.following}
- Posts: ${profile.posts_count}
- Bio: ${profile.biography}
- Verificado: ${profile.is_verified ? "Sim" : "Não"}

**MÉTRICAS:**
- Engagement Rate: ${profile.engagement_rate || "N/A"}%
- Ratio seguidores/seguindo: ${Number(profile.followers) > 0 && Number(profile.following) > 0 ? (Number(profile.followers) / Number(profile.following)).toFixed(1) : "N/A"}

**POSTS RECENTES (${posts.length}):**
${posts.map((p, i) => `${i + 1}. [${p.type}] Likes: ${p.like_count} | Comentários: ${p.comment_count} | Views: ${p.play_count || 0} | Caption: "${String(p.caption || "").slice(0, 280)}"`).join("\n")}

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
