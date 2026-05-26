package com.marketplace.ai.domain.repository

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.ContentType
import com.marketplace.ai.domain.model.Listing
import kotlinx.coroutines.flow.Flow

interface ListingRepository {
    fun getListings(contentType: ContentType? = null): Flow<Resource<List<Listing>>>
    fun getListingById(id: String): Flow<Resource<Listing>>
    fun searchListings(query: String, contentType: ContentType? = null): Flow<Resource<List<Listing>>>
    fun getSavedListings(): Flow<Resource<List<Listing>>>
    suspend fun toggleSave(listingId: String): Resource<Boolean>
}
