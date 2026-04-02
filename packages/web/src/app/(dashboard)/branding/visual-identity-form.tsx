"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Check, Upload, Plus, X, Image } from "lucide-react";
import {
  getVisualIdentity,
  saveVisualIdentity,
  uploadLogo,
  type ColorEntry,
} from "./visual-actions";

function ColorPaletteEditor({
  colors,
  onChange,
}: {
  colors: ColorEntry[];
  onChange: (colors: ColorEntry[]) => void;
}) {
  function addColor() {
    if (colors.length >= 6) return;
    onChange([...colors, { name: "", hex: "#000000" }]);
  }

  function updateColor(index: number, field: keyof ColorEntry, value: string) {
    const updated = [...colors];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function removeColor(index: number) {
    onChange(colors.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Paleta de Cores (max 6)</Label>
        {colors.length < 6 && (
          <Button type="button" variant="outline" size="sm" onClick={addColor}>
            <Plus className="mr-1 h-3 w-3" />
            Adicionar
          </Button>
        )}
      </div>
      {colors.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma cor adicionada. Clique em &ldquo;Adicionar&rdquo; para comecar.
        </p>
      )}
      <div className="grid gap-3">
        {colors.map((color, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-md border"
              style={{ backgroundColor: color.hex }}
            />
            <Input
              value={color.name}
              onChange={(e) => updateColor(i, "name", e.target.value)}
              placeholder="Nome (ex: Primary)"
              className="flex-1"
            />
            <Input
              type="color"
              value={color.hex}
              onChange={(e) => updateColor(i, "hex", e.target.value)}
              className="w-14 p-1 h-10"
            />
            <Input
              value={color.hex}
              onChange={(e) => updateColor(i, "hex", e.target.value)}
              placeholder="#000000"
              className="w-24"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeColor(i)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VisualIdentityForm() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [primaryFont, setPrimaryFont] = useState("");
  const [secondaryFont, setSecondaryFont] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const { data } = await getVisualIdentity();
    if (data) {
      setLogoUrl(data.logo_url);
      setColors(data.color_palette || []);
      setPrimaryFont(data.primary_font || "");
      setSecondaryFont(data.secondary_font || "");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("logo", file);

    const result = await uploadLogo(fd);
    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      setLogoUrl(result.url);
    }
    setUploading(false);
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    setLoading(true);

    const result = await saveVisualIdentity({
      color_palette: colors,
      primary_font: primaryFont,
      secondary_font: secondaryFont,
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
        <CardTitle>Identidade Visual</CardTitle>
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

        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Logotipo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo da marca"
                  className="h-full w-full rounded-lg object-contain p-1"
                />
              ) : (
                <Image aria-hidden className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Upload Logo"}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG ou SVG
              </p>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <ColorPaletteEditor colors={colors} onChange={setColors} />

        {/* Typography */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary-font">Fonte Primaria</Label>
            <Input
              id="primary-font"
              value={primaryFont}
              onChange={(e) => setPrimaryFont(e.target.value)}
              placeholder="Ex: Inter, Montserrat"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary-font">Fonte Secundaria</Label>
            <Input
              id="secondary-font"
              value={secondaryFont}
              onChange={(e) => setSecondaryFont(e.target.value)}
              placeholder="Ex: Roboto, Open Sans"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
