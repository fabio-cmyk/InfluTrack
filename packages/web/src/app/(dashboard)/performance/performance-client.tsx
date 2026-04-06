"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trophy, TrendingUp, DollarSign, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getPerformanceData, type InfluencerPerformance } from "./actions";

function fmt(val: number): string {
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

interface PerformanceClientProps {
  initialData: InfluencerPerformance[];
}

export function PerformanceClient({ initialData }: PerformanceClientProps) {
  const [data, setData] = useState<InfluencerPerformance[]>(initialData);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"net_profit" | "total_revenue" | "total_orders" | "commission_amount">("net_profit");

  const loadData = useCallback(async (from?: string, to?: string) => {
    const period = from && to ? { from, to } : undefined;
    const result = await getPerformanceData(period);
    setData(result.data);
  }, []);

  function handleFilter() {
    loadData(dateFrom || undefined, dateTo || undefined);
  }

  const sorted = [...data].sort((a, b) => {
    return (b[sortBy] as number) - (a[sortBy] as number);
  });

  const totals = data.reduce(
    (acc, d) => ({
      orders: acc.orders + d.total_orders,
      revenue: acc.revenue + d.total_revenue,
      commission: acc.commission + d.commission_amount,
      netProfit: acc.netProfit + d.net_profit,
    }),
    { orders: 0, revenue: 0, commission: 0, netProfit: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Performance" description="Ranking e comparativo de influencers" />

      {/* Period Filter */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Ate</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={handleFilter}>Filtrar</Button>
        <Button variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); loadData(); }}>Limpar</Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.orders}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(totals.revenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Comissoes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(totals.commission)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Liquido</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(totals.netProfit)}</div></CardContent>
        </Card>
      </div>

      {/* Sort options */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground py-2">Ordenar por:</span>
        {([
          ["net_profit", "Lucro Liquido"],
          ["total_revenue", "Receita"],
          ["total_orders", "Vendas"],
          ["commission_amount", "Comissao"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              sortBy === key ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ranking Table */}
      {sorted.length === 0 ? (
        <Card><CardContent className="py-8"><EmptyState icon={Trophy} title="Nenhum dado de performance" description="Dados aparecem quando influencers gerarem vendas." /></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Cupom</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo Prod.</TableHead>
                  <TableHead className="text-right">Comissao</TableHead>
                  <TableHead className="text-right">Lucro Liquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((inf, i) => (
                  <TableRow key={inf.influencer_id}>
                    <TableCell>
                      <span className={`font-bold text-sm ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/influencers/${inf.influencer_id}`} className="font-medium hover:underline">
                        {inf.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {inf.size ? <Badge variant="outline" className="uppercase text-xs">{inf.size}</Badge> : "—"}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{inf.coupon_code}</code>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{inf.total_orders}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(inf.total_revenue)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">{fmt(inf.total_cost)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-500">
                      -{fmt(inf.commission_amount)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({inf.commission_type === "percentage" ? `${inf.commission_rate}%` : "fixo"})
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${inf.net_profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {fmt(inf.net_profit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
