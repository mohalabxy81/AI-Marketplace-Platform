package com.marketplace.ai.presentation.explore

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.data.remote.mock.MockDataProvider
import com.marketplace.ai.domain.model.Category
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.usecase.listing.GetListingsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ExploreUiState(
    val categories: List<Category> = emptyList(),
    val featuredListings: List<Listing> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val getListingsUseCase: GetListingsUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ExploreUiState())
    val uiState: StateFlow<ExploreUiState> = _uiState.asStateFlow()

    init { loadData() }

    fun loadData() {
        _uiState.update { it.copy(categories = MockDataProvider.getCategories()) }
        viewModelScope.launch {
            getListingsUseCase().collect { result ->
                when (result) {
                    is Resource.Loading -> _uiState.update { it.copy(isLoading = true) }
                    is Resource.Success -> _uiState.update { it.copy(featuredListings = result.data.take(6), isLoading = false) }
                    is Resource.Error -> _uiState.update { it.copy(error = result.message, isLoading = false) }
                }
            }
        }
    }
}
