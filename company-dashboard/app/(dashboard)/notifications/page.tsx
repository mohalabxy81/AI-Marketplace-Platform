"use client";

import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { NotificationCard } from "@/features/notifications/components/notification-card";

export default function NotificationsPage() {
  const { notifications, isLoading, error, markAsRead, clearAll, unreadCount } = useNotifications();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Manage your alerts and team updates.</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={() => clearAll()}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">Failed to load notifications.</div>
      ) : notifications.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">All caught up</h3>
          <p className="text-gray-500 mt-1">You have no notifications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard 
              key={notification.id} 
              notification={notification} 
              onRead={(id) => markAsRead(id)} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
