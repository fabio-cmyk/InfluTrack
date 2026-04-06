import { getPerformanceData } from "./actions";
import { PerformanceClient } from "./performance-client";

export default async function PerformancePage() {
  const result = await getPerformanceData();
  return <PerformanceClient initialData={result.data} />;
}
