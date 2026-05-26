"use client";

import { Users, Hash } from "lucide-react";

export function InboxSidebar() {
  return (
    <div className="w-80 border-r border-gray-100 bg-gray-50/50 flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-gray-100 bg-white">
        <h2 className="font-semibold text-gray-900">Inbox</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
          Channels
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium">
          <Hash className="w-4 h-4" />
          <span>Team General</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
          <Hash className="w-4 h-4" />
          <span>Listing Alerts</span>
        </button>

        <div className="px-3 py-2 mt-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
          Direct Messages
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
          <Users className="w-4 h-4" />
          <span>Support Team</span>
        </button>
      </div>
    </div>
  );
}
