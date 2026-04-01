import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Integrações, equipe e conta"
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Gerencie integrações, membros da equipe e configurações da conta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
