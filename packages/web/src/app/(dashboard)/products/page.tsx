"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, AlertTriangle, RefreshCw } from "lucide-react";
import { getProducts, createProduct, updateProductCost, type Product } from "./actions";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<{ id: string; cost: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await getProducts();
    setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFormLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createProduct({
      name: fd.get("name") as string,
      sku: fd.get("sku") as string,
      price: Number(fd.get("price")),
      cost: fd.get("cost") ? Number(fd.get("cost")) : null,
    });
    if (result.error) { setError(result.error); setFormLoading(false); return; }
    setFormLoading(false);
    setFormOpen(false);
    loadData();
  }

  async function handleSaveCost() {
    if (!editingCost) return;
    await updateProductCost(editingCost.id, editingCost.cost ? Number(editingCost.cost) : null);
    setProducts(products.map(p => p.id === editingCost.id ? { ...p, cost: editingCost.cost ? Number(editingCost.cost) : null } : p));
    setEditingCost(null);
  }

  const SOURCE_LABELS: Record<string, string> = { shopify: "Shopify", yampi: "Yampi", manual: "Manual" };

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos" description="Catalogo de produtos e custos">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">Carregando...</p></CardContent></Card>
      ) : products.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><p className="text-sm text-muted-foreground">Nenhum produto cadastrado. Importe ou adicione produtos ao catalogo.</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Preco</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Ultima Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                    <TableCell>R$ {Number(p.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      {editingCost?.id === p.id ? (
                        <div className="flex gap-1 items-center">
                          <Input
                            value={editingCost.cost}
                            onChange={(e) => setEditingCost({ ...editingCost, cost: e.target.value })}
                            type="number" step="0.01" className="w-24 h-8"
                          />
                          <Button size="sm" variant="outline" onClick={handleSaveCost} className="h-8">OK</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingCost({ id: p.id, cost: p.cost ? String(p.cost) : "" })}
                          className="flex items-center gap-1 hover:underline"
                        >
                          {p.cost != null ? (
                            `R$ ${Number(p.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              Informar
                            </span>
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{SOURCE_LABELS[p.source] || p.source}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.synced_at ? new Date(p.synced_at).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Product Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
            <DialogDescription>Adicione um produto manualmente ao catalogo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <div className="space-y-2"><Label htmlFor="name">Nome *</Label><Input id="name" name="name" required placeholder="Camiseta Premium" /></div>
              <div className="space-y-2"><Label htmlFor="sku">SKU</Label><Input id="sku" name="sku" placeholder="CAM-001" /></div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2"><Label htmlFor="price">Preco (R$) *</Label><Input id="price" name="price" type="number" step="0.01" min="0" required placeholder="99.90" /></div>
                <div className="space-y-2"><Label htmlFor="cost">Custo (R$)</Label><Input id="cost" name="cost" type="number" step="0.01" min="0" placeholder="35.00" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={formLoading}>{formLoading ? "Salvando..." : "Adicionar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
