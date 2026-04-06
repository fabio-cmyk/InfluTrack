"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, CheckCircle2 } from "lucide-react";
import { importProspects } from "./actions";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseBRL(v: string): number | null {
  if (!v) return null;
  const cleaned = v
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.\-]/g, "");
  const n = Number(cleaned);
  return isNaN(n) || n === 0 ? null : n;
}

function parsePercent(v: string): number | null {
  if (!v) return null;
  const cleaned = v.replace(",", ".").replace("%", "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function parseInteger(v: string): number | null {
  if (!v) return null;
  const cleaned = v.replace(/\./g, "").replace(/,/g, "").replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function mapStatus(v: string): string {
  const s = v.toLowerCase().trim();
  if (s.includes("aprovada")) return "aprovada";
  if (s.includes("reprovada")) return "reprovada";
  if (s.includes("sem retorno")) return "sem_retorno";
  if (s.includes("contato futuro")) return "contato_futuro";
  return "analisar";
}

function mapPartnership(v: string): string {
  const s = v.toLowerCase().trim();
  if (s.includes("fechada")) return "fechada";
  if (s.includes("sem retorno")) return "sem_retorno";
  if (s.includes("contato futuro")) return "contato_futuro";
  return "em_negociacao";
}

function mapProspectType(v: string): string {
  return v.toLowerCase().includes("reativada") ? "reativada" : "nova";
}

interface ProspectCsvImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ProspectCsvImport({
  open,
  onOpenChange,
  onImported,
}: ProspectCsvImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    error?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      setTotalRows(lines.length - 1); // exclude header

      // Preview first 4 data rows
      const previewLines = lines.slice(0, 5).map((l) => parseCSVLine(l));
      setPreview(previewLines);
    };
    reader.readAsText(f, "utf-8");
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    // Skip header (first line). Columns are:
    // 0: Mês/ano, 1: INFLUENCIADORA, 2: @ INSTA, 3: (Nova/Reativada),
    // 4: SEGUIDORES, 5: MÉDIA VIEWS STORIES, 6: ORÇAMENTO SEQ. STORIES,
    // 7: ORÇAMENTO REELS + STORIES, 8: CUSTO POR VIEWS STORIES,
    // 9: TAXA DE ENGAJAMENTO STORIES, 10: MÉDIA DE VIEWS REELS,
    // 11: ORÇAMENTO REELS, 12: CUSTO POR VIEWS REELS,
    // 13: TAXA DE ENGAJAMENTO REELS, 14: VALOR FECHADO,
    // 15: STATUS, 16: STATUS PARCERIA, 17: ESCOPO PROPOSTO,
    // 18: ORÇAMENTO ENVIADO POR INFLU/ASSESSORIA

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const name = cols[1]?.trim();
      if (!name) continue;

      rows.push({
        name,
        instagram_url: cols[2]?.trim() || "",
        prospect_type: mapProspectType(cols[3] || ""),
        followers_count: parseInteger(cols[4] || ""),
        avg_story_views: parseInteger(cols[5] || ""),
        budget_stories_seq: parseBRL(cols[6] || ""),
        budget_reels_stories: parseBRL(cols[7] || ""),
        cost_per_story_view: parseBRL(cols[8] || ""),
        story_engagement_rate: parsePercent(cols[9] || ""),
        avg_reel_views: parseInteger(cols[10] || ""),
        budget_reels: parseBRL(cols[11] || ""),
        cost_per_reel_view: parseBRL(cols[12] || ""),
        reel_engagement_rate: parsePercent(cols[13] || ""),
        agreed_value: parseBRL(cols[14] || ""),
        proposed_scope: cols[17]?.trim() || "",
        influencer_asking_price: cols[18]?.trim() || "",
        status: mapStatus(cols[15] || ""),
        partnership_status: mapPartnership(cols[16] || ""),
      });
    }

    const res = await importProspects(rows);
    setResult(res);
    setLoading(false);

    if (!res.error) {
      onImported();
    }
  }

  function handleClose(next: boolean) {
    if (!next) {
      setFile(null);
      setPreview([]);
      setTotalRows(0);
      setResult(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Prospects via CSV</DialogTitle>
          <DialogDescription>
            Selecione o arquivo CSV com os dados de prospeccao. O formato deve
            seguir o padrao da planilha de negociacao.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {result?.count ? (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                {result.count} prospects importadas com sucesso!
              </span>
            </div>
          ) : (
            <>
              {result?.error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {result.error}
                </div>
              )}

              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {file ? file.name : "Clique para selecionar o CSV"}
                </p>
                {totalRows > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalRows} linhas encontradas
                  </p>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {preview.length > 1 && (
                <div className="max-h-[150px] overflow-auto rounded border">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-muted">
                        {preview[0].slice(1, 6).map((h, i) => (
                          <th key={i} className="px-2 py-1 text-left font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, i) => (
                        <tr key={i} className="border-t">
                          {row.slice(1, 6).map((cell, j) => (
                            <td key={j} className="px-2 py-1 truncate max-w-[100px]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {result?.count ? (
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!file || loading}
            >
              {loading ? "Importando..." : `Importar ${totalRows} prospects`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
