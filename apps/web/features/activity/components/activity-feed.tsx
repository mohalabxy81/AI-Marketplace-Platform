"use client";

import { useActivity } from "../hooks/use-activity";
import { ActivityItem } from "./activity-item";

export function ActivityFeed() {
  const { activities, isLoading, error } = useActivity();

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Loading activity...</div>;
  }

  if (error) {
    return <div className="text-red-500">Failed to load activity.</div>;
  }

  if (!activities || activities.length === 0) {
    return <div className="text-gray-500">No activity recorded yet.</div>;
  }

  return (
    <div className="max-w-2xl">
      {activities.map((activity) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <ActivityItem key={activity.id} activity={activity as any} />
      ))}
    </div>
  );
}
