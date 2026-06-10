package com.marketplace.ai.presentation.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.data.remote.mock.MockAiEngine
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.model.SearchSuggestion
import com.marketplace.ai.domain.usecase.feed.GetSearchSuggestionsUseCase
import com.marketplace.ai.domain.usecase.listing.SearchListingsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val query: String = "",
    val results: List<Listing> = emptyList(),
    val suggestions: List<SearchSuggestion> = emptyList(),
    val recentSearches: List<String> = emptyList(),
    val isLoading: Boolean = false,
    val hasSearched: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val searchListingsUseCase: SearchListingsUseCase,
    private val getSearchSuggestionsUseCase: GetSearchSuggestionsUseCase,
    private val aiEngine: MockAiEngine,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()
    
    private var searchJob: Job? = null

    init {
        _uiState.update { it.copy(recentSearches = aiEngine.getRecentSearches()) }
        loadSuggestions("")
    }

    fun updateQuery(query: String) {
        _uiState.update { it.copy(query = query, hasSearched = false) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // Debounce typing
            if (query.length >= 2) {
                _uiState.update { it.copy(isLoading = true) } // Show skeleton
                loadSuggestions(query)
                search(query, recordSearch = false)
            } else {
                _uiState.update { it.copy(results = emptyList(), isLoading = false) }
                loadSuggestions(query)
            }
        }
    }

    fun search(query: String = _uiState.value.query, recordSearch: Boolean = true) {
        if (query.isBlank()) return
        
        if (recordSearch) {
            aiEngine.trackSearch(query)
            _uiState.update { it.copy(recentSearches = aiEngine.getRecentSearches()) }
        }
        
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            searchListingsUseCase(query).collect { result ->
                when (result) {
                    is Resource.Loading -> _uiState.update { it.copy(isLoading = true) }
                    is Resource.Success -> {
                        _uiState.update { 
                            it.copy(
                                results = result.data, 
                                isLoading = false, 
                                hasSearched = true,
                                query = query // Ensure UI matches executed search
                            ) 
                        }
                    }
                    is Resource.Error -> _uiState.update { it.copy(error = result.message, isLoading = false, hasSearched = true) }
                }
            }
        }
    }

    fun clearRecentSearches() {
        // Mock only: we'd usually clear from a local DB here
    }

    private fun loadSuggestions(query: String) {
        viewModelScope.launch {
            getSearchSuggestionsUseCase(query).collect { result ->
                if (result is Resource.Success) {
                    _uiState.update { it.copy(suggestions = result.data) }
                }
            }
        }
    }
}
