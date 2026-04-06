import { getInfluencers, getNiches } from "./actions";
import { InfluencersClient } from "./influencers-client";

export default async function InfluencersPage() {
  const [infResult, niches] = await Promise.all([
    getInfluencers(),
    getNiches(),
  ]);
  return <InfluencersClient initialInfluencers={infResult.data} initialNiches={niches} />;
}
