import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getDashboardData } from "./dashboard-actions";

function fmt(val: number | null | undefined): string {
  if (val == null) return "—";
  return `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const KPI_STYLES = [
  { gradient: "from-[#7C3AED] to-[#A855F7]", emoji: "🛒" },
  { gradient: "from-[#F97316] to-[#FB923C]", emoji: "💰" },
  { gradient: "from-[#14B8A6] to-[#2DD4BF]", emoji: "📈" },
  { gradient: "from-[#3B82F6] to-[#60A5FA]", emoji: "📢" },
  { gradient: "from-[#FB7185] to-[#F43F5E]", emoji: "👥" },
];

export default async function DashboardPage() {
  const data = await getDashboardData();

  const kpis = [
    { label: "Total Vendas", value: String(data.totalOrders) },
    { label: "Receita Total", value: fmt(data.totalRevenue) },
    { label: "Lucro Liquido", value: fmt(data.totalProfit) },
    { label: "Campanhas Ativas", value: String(data.activeCampaigns) },
    { label: "Influencers Ativos", value: String(data.activeInfluencers) },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Ola, <span className="bg-gradient-to-r from-[#F97316] to-[#FB7185] bg-clip-text text-transparent">Fabio</span>
        </h1>
        <p className="text-muted-foreground mt-1">Aqui esta o resumo do seu programa de influencia</p>
      </div>

      {/* KPI Cards — Bold gradient */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`rounded-2xl bg-gradient-to-br ${KPI_STYLES[i].gradient} p-5 text-white relative overflow-hidden transition-transform hover:scale-[1.02]`}
          >
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
            <p className="text-xs font-medium opacity-85">{kpi.label}</p>
            <p className="text-[28px] font-extrabold tracking-tight mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Influencers */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Ranking de Influencers</CardTitle>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FFF7ED] text-[#F97316]">Por Receita</span>
          </CardHeader>
          <CardContent>
            {!data.topInfluencers?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponivel.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topInfluencers.map((inf, i) => (
                    <TableRow key={inf.influencer_id}>
                      <TableCell>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                          i === 0 ? "bg-gradient-to-br from-[#F97316] to-[#FB923C] text-white" : "bg-muted text-foreground"
                        }`}>
                          {i + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/influencers/${inf.influencer_id}`} className="font-semibold hover:underline">{inf.name}</Link>
                      </TableCell>
                      <TableCell className="font-medium">{inf.total_orders}</TableCell>
                      <TableCell className="font-bold text-[#22C55E]">{fmt(inf.total_revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Campanhas Ativas</CardTitle>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FFF7ED] text-[#F97316]">Por Lucro</span>
          </CardHeader>
          <CardContent>
            {!data.topCampaigns?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponivel.</p>
            ) : (
              <div className="space-y-3">
                {data.topCampaigns.map((c, i) => {
                  const colors = [
                    "from-[#F97316] to-[#FB923C]",
                    "from-[#A855F7] to-[#EC4899]",
                    "from-[#3B82F6] to-[#06B6D4]",
                    "from-[#14B8A6] to-[#22C55E]",
                    "from-[#FB7185] to-[#F43F5E]",
                  ];
                  const icons = ["🔥", "✨", "💎", "🚀", "⭐"];
                  return (
                    <div key={c.campaign_id} className="flex items-center gap-4 rounded-xl bg-accent/50 p-4 transition-colors hover:bg-accent">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[i % 5]} flex items-center justify-center text-lg`}>
                        {icons[i % 5]}
                      </div>
                      <div className="flex-1">
                        <Link href={`/campaigns/${c.campaign_id}`} className="font-semibold text-sm hover:underline">{c.name}</Link>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.total_orders} vendas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#22C55E]">{fmt(c.total_profit)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
