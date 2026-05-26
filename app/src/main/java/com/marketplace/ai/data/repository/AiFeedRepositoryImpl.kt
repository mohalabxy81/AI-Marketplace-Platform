package com.marketplace.ai.data.repository

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.data.remote.mock.MockAiEngine
import com.marketplace.ai.data.remote.mock.MockDataProvider
import com.marketplace.ai.domain.model.FeedSection
import com.marketplace.ai.domain.model.SearchSuggestion
import com.marketplace.ai.domain.repository.AiFeedRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AiFeedRepositoryImpl @Inject constructor(
    private val aiEngine: MockAiEngine,
) : AiFeedRepository {

    override fun getPersonalizedFeed(): Flow<Resource<List<FeedSection>>> = flow {
        emit(Resource.Loading())
        try {
            val allListings = MockDataProvider.getListings()
            val feed = aiEngine.getAiPersonalizedFeed(allListings)
            emit(Resource.Success(feed))
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Failed to load feed"))
        }
    }

    override fun getTrending(): Flow<Resource<List<FeedSection>>> = flow {
        emit(Resource.Loading())
        delay(400)
        try {
            val allListings = MockDataProvider.getListings()
            val feed = aiEngine.getAiPersonalizedFeed(allListings).filter {
                it.type == com.marketplace.ai.domain.model.FeedSectionType.TRENDING
            }
            emit(Resource.Success(feed))
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Failed to load trending"))
        }
    }

    override fun getSearchSuggestions(query: String): Flow<Resource<List<SearchSuggestion>>> = flow {
        emit(Resource.Loading())
        try {
            val allListings = MockDataProvider.getListings()
            val suggestions = aiEngine.getAiSearchSuggestions(query, allListings)
            emit(Resource.Success(suggestions))
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Failed to load suggestions"))
        }
    }
}
