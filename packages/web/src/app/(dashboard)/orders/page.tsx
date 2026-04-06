import { getOrders, getOrderStats } from "./actions";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
  const [ordersRes, stats] = await Promise.all([
    getOrders(),
    getOrderStats(),
  ]);
  return <OrdersClient initialOrders={ordersRes.data} initialStats={stats} />;
}
