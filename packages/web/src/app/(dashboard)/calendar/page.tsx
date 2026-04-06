import { getScheduledPosts, getCalendarFilters } from "./actions";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [postsRes, filters] = await Promise.all([
    getScheduledPosts(month, year),
    getCalendarFilters(),
  ]);

  return (
    <CalendarClient
      initialPosts={postsRes.data}
      filters={filters}
      initialMonth={month}
      initialYear={year}
    />
  );
}
