import { ScheduleBlock } from "@/components/timeline/schedule-block";
import type { Tables } from "@/types/database";

export function UnscheduledList({
  items,
}: {
  items: Tables<"schedule_items">[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Waiting to be scheduled
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ScheduleBlock key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
