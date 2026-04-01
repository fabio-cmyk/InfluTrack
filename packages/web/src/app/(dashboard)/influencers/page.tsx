import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export default function InfluencersPage() {
  return (
    <div>
      <PageHeader
        title="Influencers"
        description="Gerencie seus influencers"
      >
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar Influencer
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum influencer cadastrado. Adicione influencers para começar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
