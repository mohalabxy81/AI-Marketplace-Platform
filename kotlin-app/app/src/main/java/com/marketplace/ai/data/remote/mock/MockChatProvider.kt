package com.marketplace.ai.data.remote.mock

import com.marketplace.ai.domain.model.ChatConversation
import com.marketplace.ai.domain.model.ChatMessage
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockChatProvider @Inject constructor() {
    private val currentUserId = "u1" // Mock current buyer
    
    private val messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    private val conversations = MutableStateFlow<List<ChatConversation>>(emptyList())

    suspend fun getConversationForListing(listingId: String, sellerId: String): ChatConversation {
        delay(300)
        val existing = conversations.value.find { it.listingId == listingId && it.buyerId == currentUserId }
        if (existing != null) return existing

        val newConv = ChatConversation(
            id = "conv_${System.currentTimeMillis()}",
            listingId = listingId,
            buyerId = currentUserId,
            sellerId = sellerId,
            lastMessage = null,
            unreadCount = 0,
            updatedAt = System.currentTimeMillis()
        )
        conversations.update { it + newConv }
        return newConv
    }

    fun observeMessages(conversationId: String): Flow<List<ChatMessage>> {
        return messages.map { list -> list.filter { it.conversationId == conversationId }.sortedBy { it.timestamp } }
    }

    suspend fun sendMessage(conversationId: String, text: String) {
        delay(200) // Network delay
        val newMsg = ChatMessage(
            id = "msg_${System.currentTimeMillis()}",
            conversationId = conversationId,
            senderId = currentUserId,
            text = text,
            timestamp = System.currentTimeMillis()
        )
        messages.update { it + newMsg }
        updateConversationLastMessage(conversationId, newMsg)
        
        // Mock seller auto-reply
        simulateSellerReply(conversationId)
    }

    private suspend fun simulateSellerReply(conversationId: String) {
        delay(1500) // Typing delay
        val conv = conversations.value.find { it.id == conversationId } ?: return
        val replyText = listOf(
            "Hello! Yes, it is still available.",
            "I can offer a 10% discount if you buy today.",
            "Where are you located?",
            "Thanks for your interest!",
            "Let me check the details and get back to you.",
        ).random()

        val replyMsg = ChatMessage(
            id = "msg_${System.currentTimeMillis()}",
            conversationId = conversationId,
            senderId = conv.sellerId, // Not current user
            text = replyText,
            timestamp = System.currentTimeMillis()
        )
        messages.update { it + replyMsg }
        updateConversationLastMessage(conversationId, replyMsg)
    }

    private fun updateConversationLastMessage(conversationId: String, message: ChatMessage) {
        conversations.update { list ->
            list.map { conv ->
                if (conv.id == conversationId) {
                    conv.copy(lastMessage = message, updatedAt = message.timestamp)
                } else conv
            }
        }
    }
}
