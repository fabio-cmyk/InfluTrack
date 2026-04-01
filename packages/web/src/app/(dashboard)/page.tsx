"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Megaphone,
  Users,
} from "lucide-react";
import { getDashboardData, type DashboardData } from "./dashboard-actions";

function fmt(val: number | null | undefined): string {
  if (val == null) return "—";
  return `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [initialized, setInitialized] = useState(false);

  const loadData = useCallback(async () => {
    const result = await getDashboardData();
    setData(result);
  }, []);

  if (!initialized) {
    setInitialized(true);
    loadData();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visao geral do seu programa de influencia"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.totalOrders ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(data?.totalRevenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(data?.totalProfit)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campanhas Ativas</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.activeCampaigns ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Influencers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.activeInfluencers ?? "—"}</div></CardContent>
        </Card>
      </div>

      {/* Top tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Influencers por Receita</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.topInfluencers?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado disponivel.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Vendas</TableHead><TableHead>Receita</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.topInfluencers.map((inf) => (
                    <TableRow key={inf.influencer_id}>
                      <TableCell>
                        <Link href={`/influencers/${inf.influencer_id}`} className="text-primary hover:underline">{inf.name}</Link>
                      </TableCell>
                      <TableCell>{inf.total_orders}</TableCell>
                      <TableCell>{fmt(inf.total_revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Campanhas por Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.topCampaigns?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado disponivel.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Campanha</TableHead><TableHead>Vendas</TableHead><TableHead>Lucro</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.topCampaigns.map((c) => (
                    <TableRow key={c.campaign_id}>
                      <TableCell>
                        <Link href={`/campaigns/${c.campaign_id}`} className="text-primary hover:underline">{c.name}</Link>
                      </TableCell>
                      <TableCell>{c.total_orders}</TableCell>
                      <TableCell>{fmt(c.total_profit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
