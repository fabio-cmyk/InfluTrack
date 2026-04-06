import { getCampaigns } from "./actions";
import { CampaignsClient } from "./campaigns-client";

export default async function CampaignsPage() {
  const { data } = await getCampaigns();
  return <CampaignsClient initialCampaigns={data} />;
}
