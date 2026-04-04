// TikTok industry slugs mapped to PT-BR labels
// Shared between client (UI) and server (actions)

export const NICHE_OPTIONS: { slug: string; label: string }[] = [
  { slug: "beauty-and-personal-care", label: "Beleza" },
  { slug: "apparel-and-accessories", label: "Moda" },
  { slug: "health", label: "Saude/Fitness" },
  { slug: "food-and-beverage", label: "Comida" },
  { slug: "baby-kids-and-maternity", label: "Maternidade" },
  { slug: "pets", label: "Pets" },
  { slug: "tech-and-electronics", label: "Tech" },
  { slug: "games", label: "Games" },
  { slug: "education", label: "Educacao" },
  { slug: "sports-and-outdoor", label: "Esportes" },
  { slug: "home-improvement", label: "Casa/Decor" },
  { slug: "travel", label: "Viagem" },
  { slug: "financial-services", label: "Financas" },
  { slug: "news-and-entertainment", label: "Entretenimento" },
  { slug: "business-services", label: "Servicos" },
  { slug: "household-products", label: "Produtos Domesticos" },
  { slug: "life-services", label: "Lifestyle" },
  { slug: "vehicle-and-transportation", label: "Automotivo" },
];

export function getNicheLabel(slug: string): string | null {
  return NICHE_OPTIONS.find((n) => n.slug === slug)?.label || null;
}
