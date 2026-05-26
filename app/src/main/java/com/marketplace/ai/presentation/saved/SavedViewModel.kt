package com.marketplace.ai.presentation.saved

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.usecase.listing.GetSavedListingsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SavedViewModel @Inject constructor(
    private val getSavedListingsUseCase: GetSavedListingsUseCase,
) : ViewModel() {
    private val _listings = MutableStateFlow<List<Listing>>(emptyList())
    val listings: StateFlow<List<Listing>> = _listings.asStateFlow()
    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        viewModelScope.launch {
            getSavedListingsUseCase().collect { result ->
                when (result) {
                    is Resource.Success -> { _listings.value = result.data; _isLoading.value = false }
                    is Resource.Loading -> _isLoading.value = true
                    is Resource.Error -> _isLoading.value = false
                }
            }
        }
    }
}
