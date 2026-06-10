package com.marketplace.ai.domain.usecase.listing

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.ContentType
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.repository.ListingRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetListingsUseCase @Inject constructor(
    private val listingRepository: ListingRepository,
) {
    operator fun invoke(contentType: ContentType? = null): Flow<Resource<List<Listing>>> {
        return listingRepository.getListings(contentType)
    }
}

class GetListingDetailUseCase @Inject constructor(
    private val listingRepository: ListingRepository,
) {
    operator fun invoke(id: String): Flow<Resource<Listing>> {
        return listingRepository.getListingById(id)
    }
}

class SearchListingsUseCase @Inject constructor(
    private val listingRepository: ListingRepository,
) {
    operator fun invoke(
        query: String,
        contentType: ContentType? = null,
    ): Flow<Resource<List<Listing>>> {
        return listingRepository.searchListings(query, contentType)
    }
}

class ToggleSaveUseCase @Inject constructor(
    private val listingRepository: ListingRepository,
) {
    suspend operator fun invoke(listingId: String): Resource<Boolean> {
        return listingRepository.toggleSave(listingId)
    }
}

class GetSavedListingsUseCase @Inject constructor(
    private val listingRepository: ListingRepository,
) {
    operator fun invoke(): Flow<Resource<List<Listing>>> {
        return listingRepository.getSavedListings()
    }
}
