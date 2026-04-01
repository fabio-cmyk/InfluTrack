import { PageHeader } from "@/components/shared/page-header";
import { BrandIdentityForm } from "./brand-identity-form";
import { VisualIdentityForm } from "./visual-identity-form";

export default function BrandingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding"
        description="Identidade e assets da sua marca"
      />

      <BrandIdentityForm />
      <VisualIdentityForm />
    </div>
  );
}
