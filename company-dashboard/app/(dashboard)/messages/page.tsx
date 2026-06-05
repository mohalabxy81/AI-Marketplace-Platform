import { InboxSidebar } from "@/features/messages";
import { ConversationShell } from "@/features/messages";

export default function MessagesPage() {
  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm mt-4">
      <InboxSidebar />
      <ConversationShell />
    </div>
  );
}
