import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalysisPage() {
  return (
    <div>
      <PageHeader
        title="Análise"
        description="Analise perfis e compatibilidade com sua marca"
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Insira o perfil de um influencer para analisar métricas e compatibilidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
