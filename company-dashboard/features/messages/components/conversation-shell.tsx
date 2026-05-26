"use client";

import { Send, MoreVertical, Image as ImageIcon, Smile } from "lucide-react";

export function ConversationShell() {
  return (
    <div className="flex-1 flex flex-col bg-white h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6">
        <div>
          <h2 className="font-semibold text-gray-900">Team General</h2>
          <p className="text-sm text-gray-500">Internal team communication</p>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="text-center text-sm text-gray-400 my-4">Today</div>
        
        {/* Placeholder Message 1 */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-600 font-medium text-xs">JS</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-gray-900 text-sm">John Smith</span>
              <span className="text-xs text-gray-400">10:42 AM</span>
            </div>
            <div className="mt-1 text-gray-700 bg-gray-50 p-3 rounded-2xl rounded-tl-none border border-gray-100 inline-block">
              Hey team, I just updated the pricing on the downtown apartment listing. Let me know if the analytics start showing more engagement.
            </div>
          </div>
        </div>

        {/* Placeholder Message 2 */}
        <div className="flex gap-4 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <span className="text-purple-600 font-medium text-xs">ME</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-2 flex-row-reverse">
              <span className="font-medium text-gray-900 text-sm">You</span>
              <span className="text-xs text-gray-400">10:45 AM</span>
            </div>
            <div className="mt-1 text-white bg-blue-600 p-3 rounded-2xl rounded-tr-none shadow-sm inline-block">
              Sounds good. I&apos;ll keep an eye on the realtime activity feed.
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
            <ImageIcon className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            placeholder="Type a message..." 
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm px-2 text-gray-900"
          />
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
            <Smile className="w-5 h-5" />
          </button>
          <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
