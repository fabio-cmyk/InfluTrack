import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function BrandingPage() {
  return (
    <div>
      <PageHeader
        title="Branding"
        description="Identidade e assets da sua marca"
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Configure a identidade visual e os assets da sua marca.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
