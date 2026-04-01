"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Check } from "lucide-react";
import { getBrandAsset, saveBrandAsset } from "./actions";

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addItem() {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInput("");
    }
  }

  function removeItem(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((item, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function BrandIdentityForm() {
  const [brandName, setBrandName] = useState("");
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [differentiators, setDifferentiators] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const loadData = useCallback(async () => {
    const { data } = await getBrandAsset();
    if (data) {
      setBrandName(data.brand_name || "");
      setMission(data.mission || "");
      setVision(data.vision || "");
      setValues(data.values || []);
      setToneOfVoice(data.tone_of_voice || "");
      setTargetAudience(data.target_audience || "");
      setPainPoints(data.customer_pain_points || []);
      setBenefits(data.product_benefits || []);
      setDifferentiators(data.competitive_differentiators || []);
      setKeywords(data.brand_keywords || []);
    }
  }, []);

  if (!initialized) {
    setInitialized(true);
    loadData();
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    setLoading(true);

    const result = await saveBrandAsset({
      brand_name: brandName,
      mission,
      vision,
      values,
      tone_of_voice: toneOfVoice,
      target_audience: targetAudience,
      customer_pain_points: painPoints,
      product_benefits: benefits,
      competitive_differentiators: differentiators,
      brand_keywords: keywords,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Identidade da Marca</CardTitle>
        <Button onClick={handleSave} disabled={loading} size="sm">
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar"}
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="brand-name">Nome da Marca</Label>
          <Input
            id="brand-name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Nome da sua marca"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mission">Missao</Label>
            <textarea
              id="mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Qual a missao da sua marca?"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vision">Visao</Label>
            <textarea
              id="vision"
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="Qual a visao da sua marca?"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone">Tom de Voz</Label>
          <textarea
            id="tone"
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            placeholder="Descreva o tom de comunicacao da sua marca (ex: casual, profissional, irreverente...)"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audience">Publico-Alvo</Label>
          <textarea
            id="audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="Descreva o publico-alvo da sua marca (faixa etaria, interesses, comportamento...)"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <TagInput
          label="Valores"
          values={values}
          onChange={setValues}
          placeholder="Adicionar valor (ex: Transparencia)"
        />

        <TagInput
          label="Dores do Cliente"
          values={painPoints}
          onChange={setPainPoints}
          placeholder="Adicionar dor (ex: Falta de confianca)"
        />

        <TagInput
          label="Beneficios do Produto"
          values={benefits}
          onChange={setBenefits}
          placeholder="Adicionar beneficio (ex: Resultados em 30 dias)"
        />

        <TagInput
          label="Diferenciais Competitivos"
          values={differentiators}
          onChange={setDifferentiators}
          placeholder="Adicionar diferencial (ex: Unico com IA)"
        />

        <TagInput
          label="Palavras-chave da Marca"
          values={keywords}
          onChange={setKeywords}
          placeholder="Adicionar keyword (ex: sustentavel)"
        />
      </CardContent>
    </Card>
  );
}
