package com.marketplace.ai.presentation.listing

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.usecase.listing.GetListingDetailUseCase
import com.marketplace.ai.domain.usecase.listing.ToggleSaveUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ListingDetailUiState(
    val listing: Listing? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class ListingDetailViewModel @Inject constructor(
    private val getListingDetailUseCase: GetListingDetailUseCase,
    private val toggleSaveUseCase: ToggleSaveUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val listingId: String = savedStateHandle.get<String>("listingId") ?: ""
    private val _uiState = MutableStateFlow(ListingDetailUiState())
    val uiState: StateFlow<ListingDetailUiState> = _uiState.asStateFlow()

    init { loadListing() }

    private fun loadListing() {
        viewModelScope.launch {
            getListingDetailUseCase(listingId).collect { result ->
                when (result) {
                    is Resource.Loading -> _uiState.update { it.copy(isLoading = true) }
                    is Resource.Success -> _uiState.update { it.copy(listing = result.data, isLoading = false) }
                    is Resource.Error -> _uiState.update { it.copy(error = result.message, isLoading = false) }
                }
            }
        }
    }

    fun toggleSave() {
        viewModelScope.launch {
            _uiState.value.listing?.let { listing ->
                toggleSaveUseCase(listing.id)
                _uiState.update { it.copy(listing = listing.copy(isSaved = !listing.isSaved)) }
            }
        }
    }
}
