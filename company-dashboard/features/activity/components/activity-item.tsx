import { User, Edit3, Trash2, Mail, Shield, Share, Eye, CheckCircle } from "lucide-react";
import type { DbAuditLog } from "@/types/database";

const actionConfig = {
  created: { icon: CheckCircle, color: "text-green-500 bg-green-500/10" },
  edited: { icon: Edit3, color: "text-blue-500 bg-blue-500/10" },
  deleted: { icon: Trash2, color: "text-red-500 bg-red-500/10" },
  invited: { icon: Mail, color: "text-purple-500 bg-purple-500/10" },
  role_changed: { icon: Shield, color: "text-orange-500 bg-orange-500/10" },
  published: { icon: Share, color: "text-indigo-500 bg-indigo-500/10" },
  archived: { icon: Eye, color: "text-gray-500 bg-gray-500/10" },
};

interface ActivityItemProps {
  activity: DbAuditLog & { actor: { full_name: string | null; email: string; role: string } };
}

export function ActivityItem({ activity }: ActivityItemProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (actionConfig as any)[activity.action] || { icon: User, color: "text-gray-500 bg-gray-500/10" };
  const Icon = config.icon;

  const actorName = activity.actor?.full_name || activity.actor?.email || "Unknown User";

  return (
    <div className="flex gap-4 relative">
      <div className="absolute top-10 bottom-0 left-5 w-px bg-gray-100 -ml-px" />
      
      <div className={`relative z-10 flex shrink-0 items-center justify-center w-10 h-10 rounded-full border border-white ${config.color} ring-4 ring-white`}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 pb-8">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-900">
              <span className="font-semibold text-gray-900">{actorName}</span>
              {" "}
              <span className="text-gray-500">{activity.action}</span>
              {" "}
              <span className="font-medium text-gray-900">{activity.entity_type}</span>
            </p>
            <span className="text-xs text-gray-400">
              {new Date(activity.created_at).toLocaleString()}
            </span>
          </div>
          {Object.keys(activity.metadata || {}).length > 0 && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg font-mono">
              {JSON.stringify(activity.metadata)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
