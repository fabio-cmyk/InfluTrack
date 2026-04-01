import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductsPage() {
  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos e custos"
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum produto cadastrado. Importe ou adicione produtos ao catálogo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
