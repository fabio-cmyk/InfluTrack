"use client";

import { useState, useCallback, useEffect, Fragment } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShoppingCart, DollarSign, Tag, TagsIcon, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { getOrders, getOrderItems, getOrderStats, type Order, type OrderItem } from "./actions";

function fmt(val: number): string {
  return `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, withCoupon: 0, withoutCoupon: 0 });
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("");
  const [couponFilter, setCouponFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<OrderItem[]>([]);

  const loadData = useCallback(async (source?: string, coupon?: string) => {
    setLoading(true);
    const filters: { source?: string; hasCoupon?: boolean } = {};
    if (source) filters.source = source;
    if (coupon === "yes") filters.hasCoupon = true;
    else if (coupon === "no") filters.hasCoupon = false;

    const [ordersRes, statsRes] = await Promise.all([
      getOrders(filters),
      getOrderStats(),
    ]);
    setOrders(ordersRes.data);
    setStats(statsRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilter() {
    loadData(sourceFilter || undefined, couponFilter || undefined);
  }

  async function toggleExpand(orderId: string) {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      setExpandedItems([]);
      return;
    }
    const { data } = await getOrderItems(orderId);
    setExpandedItems(data);
    setExpandedOrder(orderId);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" description="Pedidos recebidos via webhook (Yampi/Shopify)" />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalOrders}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(stats.totalRevenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com Cupom</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.withCoupon}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sem Cupom</CardTitle>
            <TagsIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.withoutCoupon}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas as fontes</option>
          <option value="yampi">Yampi</option>
          <option value="shopify">Shopify</option>
        </select>
        <select
          value={couponFilter}
          onChange={(e) => setCouponFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os pedidos</option>
          <option value="yes">Com cupom</option>
          <option value="no">Sem cupom</option>
        </select>
        <Button variant="outline" onClick={handleFilter}>Filtrar</Button>
      </div>

      {/* Orders Table */}
      {loading ? (
        <Card><CardContent className="py-8 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
      ) : orders.length === 0 ? (
        <Card><CardContent className="py-8"><EmptyState icon={ShoppingCart} title="Nenhum pedido recebido" description="Configure o webhook da Yampi em Configuracoes > Integracoes." /></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Cupom</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <Fragment key={order.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggleExpand(order.id)}>
                      <TableCell>
                        {order.items_count > 0 && (
                          expandedOrder === order.id
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{order.external_id}</TableCell>
                      <TableCell className="text-sm">{new Date(order.order_date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{fmt(order.total_amount)}</TableCell>
                      <TableCell>
                        {order.discount_code ? (
                          <code className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium">{order.discount_code}</code>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.influencer_name ? (
                          <span className="text-sm font-medium">{order.influencer_name}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.campaign_name ? (
                          <Badge variant="outline" className="text-xs">{order.campaign_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">{order.influencer_name ? "Organico" : "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">{order.source}</Badge>
                      </TableCell>
                    </TableRow>
                    {expandedOrder === order.id && expandedItems.length > 0 && (
                      <TableRow>
                        <TableCell />
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Itens do pedido ({expandedItems.length})</p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>Qtd</TableHead>
                                <TableHead>Preco Unit.</TableHead>
                                <TableHead>Custo Unit.</TableHead>
                                <TableHead>Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expandedItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm">{item.product_name}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>{fmt(item.unit_price)}</TableCell>
                                  <TableCell>{item.unit_cost != null ? fmt(item.unit_cost) : <span className="text-muted-foreground">—</span>}</TableCell>
                                  <TableCell className="font-medium">{fmt(item.unit_price * item.quantity)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
