package com.marketplace.ai.presentation.chat

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.marketplace.ai.data.remote.mock.MockAiEngine
import com.marketplace.ai.data.remote.mock.MockChatProvider
import com.marketplace.ai.domain.model.ChatConversation
import com.marketplace.ai.domain.model.ChatMessage
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.repository.ListingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatUiState(
    val listing: Listing? = null,
    val conversation: ChatConversation? = null,
    val messages: List<ChatMessage> = emptyList(),
    val inputText: String = "",
    val quickReplies: List<String> = emptyList(),
    val isLoading: Boolean = true,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val savedStateHandle: SavedStateHandle,
    private val chatProvider: MockChatProvider,
    private val listingRepository: ListingRepository,
    private val aiEngine: MockAiEngine,
) : ViewModel() {

    private val listingId: String = checkNotNull(savedStateHandle["listingId"])

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    init {
        loadChat()
    }

    private fun loadChat() {
        viewModelScope.launch {
            // Load listing
            listingRepository.getListingById(listingId).collect { resource ->
                resource.data?.let { listing ->
                    _uiState.update { it.copy(listing = listing, quickReplies = aiEngine.getChatQuickReplies(listing.contentType)) }
                    
                    // Initialize conversation
                    val conv = chatProvider.getConversationForListing(listing.id, listing.sellerId)
                    _uiState.update { it.copy(conversation = conv, isLoading = false) }

                    // Observe messages
                    chatProvider.observeMessages(conv.id).collect { msgs ->
                        _uiState.update { it.copy(messages = msgs) }
                    }
                }
            }
        }
    }

    fun updateInputText(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun sendMessage() {
        val text = _uiState.value.inputText
        val convId = _uiState.value.conversation?.id
        if (text.isNotBlank() && convId != null) {
            _uiState.update { it.copy(inputText = "") }
            viewModelScope.launch {
                chatProvider.sendMessage(convId, text)
            }
        }
    }
}
