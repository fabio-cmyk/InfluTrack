import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div>
      <PageHeader
        title="Campanhas"
        description="Gerencie suas campanhas de influência"
      >
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma campanha encontrada. Crie sua primeira campanha para começar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
