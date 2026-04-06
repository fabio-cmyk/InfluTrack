import { getScheduledPosts, getCalendarCampaigns, getCalendarFilters } from "./actions";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [postsRes, campaigns, filters] = await Promise.all([
    getScheduledPosts(month, year),
    getCalendarCampaigns(month, year),
    getCalendarFilters(),
  ]);

  return (
    <CalendarClient
      initialPosts={postsRes.data}
      initialCampaigns={campaigns}
      filters={filters}
      initialMonth={month}
      initialYear={year}
    />
  );
}
