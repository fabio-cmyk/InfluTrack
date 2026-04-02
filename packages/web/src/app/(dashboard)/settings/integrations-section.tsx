"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plug, Unplug, ShoppingBag } from "lucide-react";
import { getIntegrations, connectIntegration, disconnectIntegration, type Integration } from "./integration-actions";

const PROVIDERS = [
  {
    id: "shopify",
    name: "Shopify",
    fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "store_url", label: "Store URL", type: "text", placeholder: "minha-loja.myshopify.com" },
    ],
  },
  {
    id: "yampi",
    name: "Yampi",
    description: "Ao conectar, o webhook de pedidos pagos sera registrado automaticamente.",
    fields: [
      { key: "alias", label: "Alias da Loja", type: "text", placeholder: "minha-loja" },
      { key: "token", label: "User Token", type: "password", placeholder: "Seu User-Token da API Yampi" },
      { key: "secret_key", label: "Secret Key", type: "password", placeholder: "Seu User-Secret-Key da API Yampi" },
    ],
  },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  connected: { label: "Conectada", variant: "default" },
  disconnected: { label: "Desconectada", variant: "secondary" },
  error: { label: "Erro", variant: "destructive" },
};

export function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data } = await getIntegrations();
    setIntegrations(data);
  }, []);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getIntegration(provider: string): Integration | undefined {
    return integrations.find((i) => i.provider === provider);
  }

  async function handleConnect(provider: string) {
    setError(null);
    setLoading(true);
    const result = await connectIntegration(provider, credentials);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    setConnectingProvider(null);
    setCredentials({});
    loadData();
  }

  async function handleDisconnect(provider: string) {
    await disconnectIntegration(provider);
    loadData();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Integracoes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {PROVIDERS.map((prov) => {
              const integration = getIntegration(prov.id);
              const status = integration ? STATUS_MAP[integration.status] || STATUS_MAP.disconnected : STATUS_MAP.disconnected;
              const isConnected = integration?.status === "connected";

              return (
                <div key={prov.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{prov.name}</span>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  {integration?.error_message && (
                    <p className="text-xs text-destructive">{integration.error_message}</p>
                  )}

                  {isConnected && integration?.credentials?.webhook_url && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Webhook ativo — pedidos pagos sincronizam automaticamente
                    </p>
                  )}

                  {integration?.last_sync_at && (
                    <p className="text-xs text-muted-foreground">
                      Ultima sync: {new Date(integration.last_sync_at).toLocaleString("pt-BR")}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {isConnected ? (
                      <Button variant="outline" size="sm" onClick={() => handleDisconnect(prov.id)}>
                        <Unplug className="mr-2 h-4 w-4" />
                        Desconectar
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => { setConnectingProvider(prov.id); setCredentials({}); setError(null); }}>
                        <Plug className="mr-2 h-4 w-4" />
                        Conectar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Connect Modal */}
      <Dialog open={!!connectingProvider} onOpenChange={(open) => !open && setConnectingProvider(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar {PROVIDERS.find((p) => p.id === connectingProvider)?.name}</DialogTitle>
            <DialogDescription>Insira as credenciais da sua loja.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            {PROVIDERS.find((p) => p.id === connectingProvider)?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={credentials[field.key] || ""}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => connectingProvider && handleConnect(connectingProvider)} disabled={loading}>
              {loading ? "Conectando..." : "Conectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
