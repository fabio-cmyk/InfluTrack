import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function MiningPage() {
  return (
    <div>
      <PageHeader
        title="Mineração"
        description="Descubra novos influencers por palavras-chave"
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Busque influencers por nicho, palavra-chave ou categoria.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
