package com.marketplace.ai.presentation.map

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.data.remote.mock.MockAiEngine
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.repository.ListingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MapUiState(
    val listings: List<Listing> = emptyList(),
    val selectedListing: Listing? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class MapViewModel @Inject constructor(
    private val repository: ListingRepository,
    private val aiEngine: MockAiEngine,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MapUiState())
    val uiState: StateFlow<MapUiState> = _uiState.asStateFlow()

    init {
        loadMapData()
    }

    private fun loadMapData() {
        viewModelScope.launch {
            repository.getListings(null).collect { result ->
                when (result) {
                    is Resource.Loading -> _uiState.update { it.copy(isLoading = true) }
                    is Resource.Success -> {
                        // In a real map, we'd filter by bounding box.
                        // Here, we'll just rank them by AI so the most relevant pins are highlighted.
                        val ranked = aiEngine.scoreAndRankListings(result.data)
                        _uiState.update { it.copy(listings = ranked, isLoading = false) }
                    }
                    is Resource.Error -> _uiState.update { it.copy(error = result.message, isLoading = false) }
                }
            }
        }
    }

    fun selectListing(listing: Listing?) {
        _uiState.update { it.copy(selectedListing = listing) }
        if (listing != null) {
            aiEngine.trackView(listing.id, dwellTimeMs = 2000) // Small bump for map click
        }
    }
}
