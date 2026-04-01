import { PageHeader } from "@/components/shared/page-header";
import { TeamSection } from "./team-section";
import { IntegrationsSection } from "./integrations-section";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Integrações, equipe e conta"
      />

      <IntegrationsSection />
      <TeamSection />
    </div>
  );
}
