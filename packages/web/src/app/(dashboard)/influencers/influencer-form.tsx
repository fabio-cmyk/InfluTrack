"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { createInfluencer, type InfluencerFormData } from "./actions";

const SIZES = ["pequena", "micro", "nano", "mid", "macro", "celebridade"] as const;
const TABS = ["Basico", "Social", "Comissao", "Contato"] as const;

export function InfluencerFormModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Basico
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [utmMedium, setUtmMedium] = useState("");
  const [coupon, setCoupon] = useState("");
  const [size, setSize] = useState("");
  const [niche, setNiche] = useState("");
  const [nicheInput, setNicheInput] = useState("");
  const [origin, setOrigin] = useState("");

  // Social
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");

  // Comissao
  const [commissionType, setCommissionType] = useState("percentage");
  const [commissionRate, setCommissionRate] = useState("0");
  const [monthlyFee, setMonthlyFee] = useState("0");
  const [bonusRules, setBonusRules] = useState("");

  // Contato
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pix, setPix] = useState("");
  const [address, setAddress] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");

  function reset() {
    setTab(0); setName(""); setStatus("active"); setUtmMedium(""); setCoupon("");
    setSize(""); setNiche(""); setOrigin(""); setInstagram(""); setTiktok("");
    setCommissionType("percentage"); setCommissionRate("0"); setMonthlyFee("0");
    setBonusRules(""); setEmail(""); setPhone(""); setPix(""); setAddress("");
    setPaymentInfo(""); setError(null);
  }

  async function handleSubmit() {
    if (!name || !coupon) {
      setError("Nome e Cupom sao obrigatorios");
      setTab(0);
      return;
    }

    setError(null);
    setLoading(true);

    const formData: InfluencerFormData = {
      name, status, utm_medium: utmMedium, coupon_code: coupon,
      size, niche, origin,
      instagram_handle: instagram, tiktok_handle: tiktok,
      commission_type: commissionType, commission_rate: Number(commissionRate),
      monthly_fee: Number(monthlyFee), bonus_rules: bonusRules,
      email, phone, pix_key: pix, address, payment_info: paymentInfo,
    };

    const result = await createInfluencer(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    reset();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Influencer</DialogTitle>
          <DialogDescription>Preencha os dados do influencer para comecar a rastrear suas vendas.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === i ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="min-h-[280px]">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">{error}</div>}

          {/* Tab: Basico */}
          {tab === 0 && (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do influencer" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>UTM Medium *</Label>
                  <Input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="ex: mariasilva" />
                </div>
                <div className="space-y-2">
                  <Label>Cupom *</Label>
                  <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="ex: MARI10" className="uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tamanho</Label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(size === s ? "" : s)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors uppercase ${
                        size === s ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nicho (Tags)</Label>
                <div className="flex gap-2">
                  <Input
                    value={nicheInput}
                    onChange={(e) => setNicheInput(e.target.value)}
                    placeholder="Digite um nicho e pressione Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && nicheInput.trim()) {
                        e.preventDefault();
                        setNiche(niche ? `${niche}, ${nicheInput.trim()}` : nicheInput.trim());
                        setNicheInput("");
                      }
                    }}
                  />
                </div>
                {niche && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {niche.split(", ").map((n, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Origem da Descoberta</Label>
                <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ex: Indicacao, Mineracao, Instagram" />
              </div>
            </div>
          )}

          {/* Tab: Social */}
          {tab === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Link do Perfil Instagram</Label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/usuario" />
              </div>
              <div className="space-y-2">
                <Label>Link do Perfil TikTok</Label>
                <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@usuario" />
              </div>
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Para adicionar insights historicos (Views Stories, Seguidores, Taxa de Engajamento), salve o influencer primeiro e depois edite para acessar o gerenciador de insights.
              </div>
            </div>
          )}

          {/* Tab: Comissao */}
          {tab === 2 && (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Comissao</Label>
                  <select value={commissionType} onChange={(e) => setCommissionType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="percentage">Percentual</option>
                    <option value="fixed">Fixo por venda</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Comissao ({commissionType === "percentage" ? "%" : "R$"})</Label>
                  <Input value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} type="number" step="0.01" min="0" />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Fee Fixo Mensal (R$)</Label>
                  <Input value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} type="number" step="0.01" min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Regras de Bonus</Label>
                  <Input value={bonusRules} onChange={(e) => setBonusRules(e.target.value)} placeholder="ex: 50 pedidos = +R$300" />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Contato */}
          {tab === 3 && (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>PIX</Label>
                <Input value={pix} onChange={(e) => setPix(e.target.value)} placeholder="Chave PIX (CPF, CNPJ, e-mail ou telefone)" />
              </div>
              <div className="space-y-2">
                <Label>Endereco</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereco completo para envio de produtos" />
              </div>
              <div className="space-y-2">
                <Label>Dados Adicionais para Pagamento</Label>
                <Input value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} placeholder="CNPJ, dados bancarios, etc." />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {tab > 0 && <Button variant="outline" onClick={() => setTab(tab - 1)}>Anterior</Button>}
          </div>
          <div className="flex gap-2">
            {tab < 3 ? (
              <Button onClick={() => setTab(tab + 1)}>Proximo</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Criando..." : "Criar Influencer"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
