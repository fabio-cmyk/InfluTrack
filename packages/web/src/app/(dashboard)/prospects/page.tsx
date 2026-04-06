import { getProspects } from "./actions";
import { ProspectsClient } from "./prospects-client";

export default async function ProspectsPage() {
  const { data } = await getProspects();
  return <ProspectsClient initialProspects={data} />;
}
