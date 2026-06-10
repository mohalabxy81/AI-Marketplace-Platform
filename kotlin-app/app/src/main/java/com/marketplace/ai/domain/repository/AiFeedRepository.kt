package com.marketplace.ai.domain.repository

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.FeedSection
import com.marketplace.ai.domain.model.SearchSuggestion
import kotlinx.coroutines.flow.Flow

interface AiFeedRepository {
    fun getPersonalizedFeed(): Flow<Resource<List<FeedSection>>>
    fun getTrending(): Flow<Resource<List<FeedSection>>>
    fun getSearchSuggestions(query: String): Flow<Resource<List<SearchSuggestion>>>
}
