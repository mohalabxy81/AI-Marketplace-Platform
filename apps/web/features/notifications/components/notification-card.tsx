import { Bell, Info, AlertCircle, CheckCircle, Tag } from "lucide-react";
import type { DbNotification } from "@/types/database";

const typeIcons = {
  listing: Tag,
  team: CheckCircle,
  alert: AlertCircle,
  system: Info,
};

const typeColors = {
  listing: "text-blue-500 bg-blue-500/10",
  team: "text-green-500 bg-green-500/10",
  alert: "text-red-500 bg-red-500/10",
  system: "text-gray-500 bg-gray-500/10",
};

interface NotificationCardProps {
  notification: DbNotification;
  onRead?: (id: string) => void;
}

export function NotificationCard({ notification, onRead }: NotificationCardProps) {
  const Icon = typeIcons[notification.type] || Bell;
  const colors = typeColors[notification.type] || typeColors.system;

  return (
    <div
      className={`p-4 flex items-start gap-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
        notification.is_read
          ? "bg-white/50 border-gray-100 opacity-70"
          : "bg-white border-blue-100 shadow-sm"
      }`}
      onClick={() => !notification.is_read && onRead?.(notification.id)}
    >
      <div className={`p-2 rounded-lg shrink-0 ${colors}`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className={`text-sm font-medium truncate ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
            {notification.title}
          </h4>
          <span className="text-xs text-gray-400 shrink-0">
            {new Date(notification.created_at).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
      </div>

      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5 shadow-sm shadow-blue-500/20" />
      )}
    </div>
  );
}
