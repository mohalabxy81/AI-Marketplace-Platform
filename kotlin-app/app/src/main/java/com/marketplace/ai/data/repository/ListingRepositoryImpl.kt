package com.marketplace.ai.data.repository

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.data.local.dao.ListingDao
import com.marketplace.ai.data.mapper.toDomain
import com.marketplace.ai.data.mapper.toEntity
import com.marketplace.ai.data.remote.mock.MockDataProvider
import com.marketplace.ai.domain.model.ContentType
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.repository.ListingRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ListingRepositoryImpl @Inject constructor(
    private val listingDao: ListingDao,
    private val aiEngine: MockAiEngine,
) : ListingRepository {

    override fun getListings(contentType: ContentType?): Flow<Resource<List<Listing>>> = flow {
        emit(Resource.Loading())
        try {
            val listings = MockDataProvider.getListings()
            listingDao.insertListings(listings.map { it.toEntity() })
            val filtered = if (contentType != null) listings.filter { it.contentType == contentType } else listings
            emit(Resource.Success(aiEngine.scoreAndRankListings(filtered)))
        } catch (e: Exception) {
            // Fallback to cache
            listingDao.getAllListings().collect { cached ->
                val mapped = cached.map { it.toDomain() }
                val filtered = if (contentType != null) mapped.filter { it.contentType == contentType } else mapped
                emit(Resource.Error(e.message ?: "Failed to load", filtered))
            }
        }
    }

    override fun getListingById(id: String): Flow<Resource<Listing>> = flow {
        emit(Resource.Loading())
        try {
            val listing = MockDataProvider.getListingById(id)
            if (listing != null) {
                listingDao.insertListing(listing.toEntity())
                emit(Resource.Success(listing))
            } else {
                emit(Resource.Error("Listing not found"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Failed to load listing"))
        }
    }

    override fun searchListings(query: String, contentType: ContentType?): Flow<Resource<List<Listing>>> = flow {
        emit(Resource.Loading())
        try {
            val results = MockDataProvider.searchListings(query)
            val filtered = if (contentType != null) results.filter { it.contentType == contentType } else results
            emit(Resource.Success(aiEngine.scoreAndRankListings(filtered)))
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Search failed"))
        }
    }

    override fun getSavedListings(): Flow<Resource<List<Listing>>> = flow {
        emit(Resource.Loading())
        listingDao.getSavedListings().collect { cached ->
            emit(Resource.Success(cached.map { it.toDomain() }))
        }
    }

    override suspend fun toggleSave(listingId: String): Resource<Boolean> {
        return try {
            listingDao.getListingById(listingId).collect { entity ->
                if (entity != null) {
                    listingDao.updateSaveStatus(listingId, !entity.isSaved)
                }
            }
            Resource.Success(true)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to save")
        }
    }
}
