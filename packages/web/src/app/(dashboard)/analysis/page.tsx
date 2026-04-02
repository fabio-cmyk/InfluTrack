"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, History, BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getAnalysisHistory, createAnalysis, type AnalysisEntry } from "./actions";

const FIT_COLORS: Record<string, { label: string; className: string }> = {
  recommended: { label: "Recomendado", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  neutral: { label: "Neutro", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  not_recommended: { label: "Nao Recomendado", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
};

export default function AnalysisPage() {
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [history, setHistory] = useState<AnalysisEntry[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    const { data } = await getAnalysisHistory();
    setHistory(data);
  }, []);

  useEffect(() => {
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAnalyze() {
    if (!handle.trim()) return;
    setLoading(true);
    const { data, error } = await createAnalysis(handle.trim(), platform);
    if (data) {
      setCurrentAnalysis(data);
      loadHistory();
    }
    if (error) alert(error);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analise" description="Analise perfis e compatibilidade com sua marca" />

      {/* Analysis Form */}
      <Card>
        <CardHeader><CardTitle>Analisar Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label>Handle do Influencer</Label>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@influencer"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
            </div>
            <div className="w-40 space-y-2">
              <Label>Plataforma</Label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAnalyze} disabled={loading || !handle.trim()}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Analisando..." : "Analisar"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O score de compatibilidade e calculado com base no brand asset cadastrado. Configure a integracao Apify para dados reais.
          </p>
        </CardContent>
      </Card>

      {/* Current Analysis Result */}
      {currentAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resultado: {currentAnalysis.handle}</span>
              <Badge className="capitalize" variant="outline">{currentAnalysis.platform}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold">{currentAnalysis.fit_score ?? "—"}</div>
                <p className="text-sm text-muted-foreground">Fit Score</p>
              </div>
              {currentAnalysis.fit_classification && (
                <div className={`rounded-lg px-4 py-2 ${FIT_COLORS[currentAnalysis.fit_classification]?.className || ""}`}>
                  <p className="font-medium">{FIT_COLORS[currentAnalysis.fit_classification]?.label}</p>
                </div>
              )}
            </div>

            {currentAnalysis.strengths.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Pontos Fortes</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {currentAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {currentAnalysis.concerns.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Pontos de Atencao</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {currentAnalysis.concerns.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader><CardTitle><History className="inline mr-2 h-4 w-4" />Historico de Analises</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState icon={BarChart3} title="Nenhuma analise realizada" description="Insira um handle acima para analisar um perfil." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Handle</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Classificacao</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => setCurrentAnalysis(a)}>
                    <TableCell className="font-medium">{a.handle}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{a.platform}</Badge></TableCell>
                    <TableCell className="font-bold">{a.fit_score ?? "—"}</TableCell>
                    <TableCell>
                      {a.fit_classification && (
                        <span className={`rounded px-2 py-0.5 text-xs ${FIT_COLORS[a.fit_classification]?.className || ""}`}>
                          {FIT_COLORS[a.fit_classification]?.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
