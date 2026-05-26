package com.marketplace.ai.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.data.remote.mock.MockAiEngine
import com.marketplace.ai.domain.model.ContentType
import com.marketplace.ai.domain.model.FeedSection
import com.marketplace.ai.domain.model.SearchSuggestion
import com.marketplace.ai.domain.usecase.feed.GetPersonalizedFeedUseCase
import com.marketplace.ai.domain.usecase.feed.GetSearchSuggestionsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val feedSections: List<FeedSection> = emptyList(),
    val searchSuggestions: List<SearchSuggestion> = emptyList(),
    val recentSearches: List<String> = emptyList(),
    val searchQuery: String = "",
    val searchPlaceholder: String = "Search products, services, places…",
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val selectedContentType: ContentType? = null,
    val showSearchSuggestions: Boolean = false,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getPersonalizedFeedUseCase: GetPersonalizedFeedUseCase,
    private val getSearchSuggestionsUseCase: GetSearchSuggestionsUseCase,
    private val aiEngine: MockAiEngine,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private var placeholderJob: Job? = null

    init {
        loadFeed(isSilentUpdate = false)
        loadSuggestions("")
        startPlaceholderRotation()
        startFeedLifecycleLoop()
        _uiState.update { it.copy(recentSearches = aiEngine.getRecentSearches()) }
    }

    fun refresh() {
        _uiState.update { it.copy(isRefreshing = true) }
        loadFeed(isSilentUpdate = false)
    }

    fun updateSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query, showSearchSuggestions = query.isNotEmpty()) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // Debounce
            loadSuggestions(query)
        }
    }

    fun onSearchSubmit(query: String) {
        aiEngine.trackSearch(query)
        _uiState.update {
            it.copy(
                recentSearches = aiEngine.getRecentSearches(),
                showSearchSuggestions = false,
            )
        }
    }

    fun clearSearch() {
        _uiState.update { it.copy(searchQuery = "", showSearchSuggestions = false) }
    }

    fun selectContentType(type: ContentType?) {
        _uiState.update { it.copy(selectedContentType = type) }
        if (type != null) aiEngine.trackContentTypeInteraction(type)
        loadFeed()
    }

    fun onListingViewed(listingId: String) {
        aiEngine.trackView(listingId)
    }

    fun onListingSaved(listingId: String, isSaved: Boolean) {
        aiEngine.trackSave(listingId, isSaved)
    }

    private fun applyContentTypeFilter(sections: List<FeedSection>): List<FeedSection> {
        val selectedType = _uiState.value.selectedContentType ?: return sections
        return sections.map { section ->
            section.copy(
                listings = section.listings.filter { it.contentType == selectedType },
            )
        }.filter { it.listings.isNotEmpty() }
    }

    private fun loadSuggestions(query: String) {
        viewModelScope.launch {
            getSearchSuggestionsUseCase(query).collect { result ->
                if (result is Resource.Success) {
                    _uiState.update { it.copy(searchSuggestions = result.data) }
                }
            }
        }
    }

    private fun startPlaceholderRotation() {
        placeholderJob = viewModelScope.launch {
            while (true) {
                _uiState.update { it.copy(searchPlaceholder = aiEngine.getAiSearchPlaceholder()) }
                delay(4000)
            }
        }
    }

    private fun startFeedLifecycleLoop() {
        // Lifecycle: Load -> Rank -> Render -> Observe -> Re-rank
        // This simulates the feed silently updating as the user's short-term preferences shift during the session.
        viewModelScope.launch {
            delay(20000) // Wait 20s before first background re-rank
            while (true) {
                // Only re-rank silently if they are not currently pulling to refresh
                if (!_uiState.value.isRefreshing && _uiState.value.feedSections.isNotEmpty()) {
                    loadFeed(isSilentUpdate = true)
                }
                delay(20000) // Re-rank every 20 seconds
            }
        }
    }

    fun loadFeed(isSilentUpdate: Boolean = false) {
        viewModelScope.launch {
            getPersonalizedFeedUseCase().collect { result ->
                when (result) {
                    is Resource.Loading -> {
                        if (!isSilentUpdate) {
                            _uiState.update { it.copy(isLoading = true, error = null) }
                        }
                    }
                    is Resource.Success -> {
                        val filtered = applyContentTypeFilter(result.data)
                        _uiState.update {
                            it.copy(
                                feedSections = filtered,
                                isLoading = false,
                                isRefreshing = false,
                                error = null,
                            )
                        }
                    }
                    is Resource.Error -> {
                        if (!isSilentUpdate) {
                            _uiState.update { it.copy(error = result.message, isLoading = false, isRefreshing = false) }
                        }
                    }
                }
            }
        }
    }
    override fun onCleared() {\n        super.onCleared()\n        placeholderJob?.cancel()\n    }\n}
