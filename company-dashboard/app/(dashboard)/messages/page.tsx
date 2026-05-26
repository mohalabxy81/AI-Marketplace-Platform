import { InboxSidebar } from "@/features/messages/components/inbox-sidebar";
import { ConversationShell } from "@/features/messages/components/conversation-shell";

export default function MessagesPage() {
  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm mt-4">
      <InboxSidebar />
      <ConversationShell />
    </div>
  );
}
