package com.marketplace.ai.domain.model

data class ChatMessage(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val text: String,
    val timestamp: Long,
    val isRead: Boolean = false,
)

data class ChatConversation(
    val id: String,
    val listingId: String,
    val buyerId: String,
    val sellerId: String,
    val lastMessage: ChatMessage?,
    val unreadCount: Int = 0,
    val updatedAt: Long,
)
