"use client";

import { useState } from "react";
import { Send, MoreVertical, Image as ImageIcon, Smile, Hash, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageItem {
  id: string;
  sender: string;
  senderInitials: string;
  avatarColor: string;
  time: string;
  body: string;
  isMe: boolean;
}

interface ConversationShellProps {
  chatName: string;
  chatType: "channel" | "direct";
  description: string;
  messages: MessageItem[];
  onSendMessage: (body: string) => void;
}

export function ConversationShell({
  chatName,
  chatType,
  description,
  messages,
  onSendMessage,
}: ConversationShellProps) {
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-surface)] h-[calc(100vh-var(--header-height)-1.5rem)]">
      {/* Header */}
      <div className="h-16 border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-[var(--color-surface-alt)]">
        <div className="flex items-center gap-2">
          {chatType === "channel" ? (
            <Hash className="w-4 h-4 text-[var(--color-accent)]" />
          ) : (
            <Users className="w-4 h-4 text-[var(--color-accent)]" />
          )}
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text)]">{chatName}</h2>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{description}</p>
          </div>
        </div>
        <button className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-[var(--radius-xs)] hover:bg-[var(--color-border)] transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        <div className="text-center text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] my-4">
          Session feed established
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-3 max-w-[80%]", msg.isMe ? "ml-auto flex-row-reverse" : "")}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-7 h-7 rounded-[var(--radius-xs)] flex items-center justify-center shrink-0 text-[10px] font-bold border border-[var(--color-border)]",
                msg.avatarColor
              )}
            >
              {msg.senderInitials}
            </div>

            <div className={cn("flex flex-col", msg.isMe ? "items-end" : "items-start")}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-xs text-[var(--color-text)]">
                  {msg.isMe ? "You" : msg.sender}
                </span>
                <span className="text-[9px] text-[var(--color-text-subtle)] font-mono">{msg.time}</span>
              </div>
              <div
                className={cn(
                  "text-xs px-3 py-2 border rounded-[var(--radius-xs)] leading-relaxed break-words",
                  msg.isMe
                    ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] border-[var(--color-accent)]/30"
                    : "bg-[var(--color-surface-alt)] text-[var(--color-text)] border-[var(--color-border)]"
                )}
              >
                {msg.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[var(--color-surface-alt)] border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xs)] p-1.5 focus-within:border-[var(--color-accent)] transition-colors">
          <button className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-[var(--radius-xs)] hover:bg-[var(--color-surface-alt)] transition-colors">
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            id="message-input"
            type="text"
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none focus:outline-none text-xs px-2 text-[var(--color-text)] placeholder-[var(--color-text-subtle)]"
          />
          <button className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-[var(--radius-xs)] hover:bg-[var(--color-surface-alt)] transition-colors">
            <Smile className="w-4 h-4" />
          </button>
          <button
            onClick={handleSend}
            className="p-2 bg-[var(--color-accent)] text-black rounded-[var(--radius-xs)] hover:bg-amber-500 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
