import { ActivityFeed } from "@/features/activity/components/activity-feed";

export default function ActivityPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Company Activity</h1>
        <p className="text-gray-500 mt-1">Realtime timeline of actions across your team.</p>
      </div>

      <ActivityFeed />
    </div>
  );
}
