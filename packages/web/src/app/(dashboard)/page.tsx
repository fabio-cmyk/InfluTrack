import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Megaphone,
} from "lucide-react";

const kpis = [
  {
    title: "Total de Vendas",
    value: "—",
    icon: ShoppingCart,
    description: "Este mês",
  },
  {
    title: "Receita Total",
    value: "—",
    icon: DollarSign,
    description: "Este mês",
  },
  {
    title: "Lucro Total",
    value: "—",
    icon: TrendingUp,
    description: "Este mês",
  },
  {
    title: "Campanhas Ativas",
    value: "—",
    icon: Megaphone,
    description: "No momento",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu programa de influência"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita & Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Influencers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Campaigns placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top 5 Campanhas por Lucro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
