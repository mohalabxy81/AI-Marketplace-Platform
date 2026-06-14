"use client";

import { useState } from "react";
import { InboxSidebar, ConversationShell, ChatTarget, MessageItem } from "@/features/messages";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";

// ── Mock Targets ───────────────────────────────────────────────

const CHAT_TARGETS: ChatTarget[] = [
  {
    id: "general",
    name: "Team General",
    type: "channel",
    description: "Internal team communication and syncs",
  },
  {
    id: "alerts",
    name: "Listing Alerts",
    type: "channel",
    description: "Automated real-time listing updates and review alerts",
  },
  {
    id: "support",
    name: "Support Team",
    type: "direct",
    description: "Platform core support, billing assistance and advice",
  },
];

// ── Mock Initial Messages ───────────────────────────────────────

const INITIAL_MESSAGES: Record<string, MessageItem[]> = {
  general: [
    {
      id: "g1",
      sender: "John Smith",
      senderInitials: "JS",
      avatarColor: "bg-blue-950 text-blue-400",
      time: "10:42 AM",
      body: "Hey team, I just updated the pricing on the downtown apartment listing. Let me know if the analytics start showing more engagement.",
      isMe: false,
    },
    {
      id: "g2",
      sender: "You",
      senderInitials: "ME",
      avatarColor: "bg-amber-950 text-[var(--color-accent)]",
      time: "10:45 AM",
      body: "Sounds good. I'll keep an eye on the realtime activity feed.",
      isMe: true,
    },
  ],
  alerts: [
    {
      id: "a1",
      sender: "System Kernel",
      senderInitials: "SK",
      avatarColor: "bg-red-950 text-red-400",
      time: "08:15 AM",
      body: "SYSTEM: Listing ID 9e4f2b3c (Industrial Warehouse) has been submitted for Moderation Queue by Agent Sarah.",
      isMe: false,
    },
    {
      id: "a2",
      sender: "System Kernel",
      senderInitials: "SK",
      avatarColor: "bg-red-950 text-red-400",
      time: "09:30 AM",
      body: "SYSTEM: Listing ID 9e4f2b3c approved successfully by Super Admin.",
      isMe: false,
    },
  ],
  support: [
    {
      id: "s1",
      sender: "Support Engine",
      senderInitials: "SE",
      avatarColor: "bg-emerald-950 text-emerald-400",
      time: "Yesterday",
      body: "Welcome to Platform Support. Let us know if you need any adjustments to your Dedicated compute nodes or custom UI branding configs.",
      isMe: false,
    },
  ],
};

export default function MessagesPage() {
  const [activeId, setActiveId] = useState("general");
  const [chatMessages, setChatMessages] = useState<Record<string, MessageItem[]>>(INITIAL_MESSAGES);

  const activeChat = CHAT_TARGETS.find((t) => t.id === activeId) || CHAT_TARGETS[0];
  const messages = chatMessages[activeId] || [];

  const handleSendMessage = (body: string) => {
    const newMsg: MessageItem = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "You",
      senderInitials: "ME",
      avatarColor: "bg-amber-950 text-[var(--color-accent)]",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      body,
      isMe: true,
    };

    setChatMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), newMsg],
    }));
  };

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>Inbox & Collaboration</PageTitle>
          <PageDescription>
            Communicate with teammates, receive listing event notifications, and contact platform support.
          </PageDescription>
        </div>
      </PageHeader>

      <PageContent>
        {/* Messages Shell Container */}
        <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] overflow-hidden">
          <InboxSidebar
            targets={CHAT_TARGETS}
            activeId={activeId}
            onSelect={setActiveId}
          />
          <ConversationShell
            chatName={activeChat.name}
            chatType={activeChat.type}
            description={activeChat.description}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </PageContent>
    </PageContainer>
  );
}
