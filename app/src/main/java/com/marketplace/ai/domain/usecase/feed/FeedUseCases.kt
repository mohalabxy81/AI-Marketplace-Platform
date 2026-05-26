package com.marketplace.ai.domain.usecase.feed

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.FeedSection
import com.marketplace.ai.domain.model.SearchSuggestion
import com.marketplace.ai.domain.repository.AiFeedRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetPersonalizedFeedUseCase @Inject constructor(
    private val aiFeedRepository: AiFeedRepository,
) {
    operator fun invoke(): Flow<Resource<List<FeedSection>>> {
        return aiFeedRepository.getPersonalizedFeed()
    }
}

class GetTrendingUseCase @Inject constructor(
    private val aiFeedRepository: AiFeedRepository,
) {
    operator fun invoke(): Flow<Resource<List<FeedSection>>> {
        return aiFeedRepository.getTrending()
    }
}

class GetSearchSuggestionsUseCase @Inject constructor(
    private val aiFeedRepository: AiFeedRepository,
) {
    operator fun invoke(query: String): Flow<Resource<List<SearchSuggestion>>> {
        return aiFeedRepository.getSearchSuggestions(query)
    }
}
