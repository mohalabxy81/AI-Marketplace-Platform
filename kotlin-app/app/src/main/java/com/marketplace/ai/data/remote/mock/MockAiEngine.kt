package com.marketplace.ai.data.remote.mock

import com.marketplace.ai.domain.model.*
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.ln
import kotlin.math.pow
import kotlin.random.Random

enum class UserEngagementType { NEW, ACTIVE, HIGH_ENGAGEMENT }

data class UserProfile(
    val userId: String = "u1",
    val longTermPreferences: MutableMap<ContentType, Float> = mutableMapOf(
        ContentType.PRODUCT to 0.7f,
        ContentType.REAL_ESTATE to 0.3f,
        ContentType.SERVICE to 0.5f,
        ContentType.LOCAL_OFFER to 0.4f,
        ContentType.TRENDING to 0.6f,
    ),
    val shortTermSessionInterests: MutableMap<ContentType, Float> = mutableMapOf(),
    val viewHistory: MutableList<String> = mutableListOf(),
    val dwellTimeHistory: MutableMap<String, Long> = mutableMapOf(),
    val scrollDepthHistory: MutableMap<String, Float> = mutableMapOf(),
    val searchHistory: MutableList<String> = mutableListOf(),
    val savedIds: MutableSet<String> = mutableSetOf(),
    val priceRange: ClosedFloatingPointRange<Double> = 50.0..500000.0,
    val sessionStartTime: Long = System.currentTimeMillis(),
    var interactionCount: Int = 0,
) {
    val engagementType: UserEngagementType
        get() = when {
            interactionCount < 5 -> UserEngagementType.NEW
            interactionCount < 20 -> UserEngagementType.ACTIVE
            else -> UserEngagementType.HIGH_ENGAGEMENT
        }
        
    fun getEffectivePreference(type: ContentType): Float {
        val longTerm = longTermPreferences[type] ?: 0.5f
        val shortTerm = shortTermSessionInterests[type]
        // Short term overrides long term in current session if it exists
        return shortTerm ?: longTerm
    }
}

@Singleton
class MockAiEngine @Inject constructor() {

    // Allow simulating different users
    private var currentUserIndex = 0
    private val mockUsers = listOf(
        UserProfile("u1"), // Default user (Balanced, New)
        UserProfile("u2", longTermPreferences = mutableMapOf(ContentType.REAL_ESTATE to 0.9f, ContentType.LOCAL_OFFER to 0.1f), interactionCount = 10), // Active
        UserProfile("u3", longTermPreferences = mutableMapOf(ContentType.SERVICE to 0.8f, ContentType.TRENDING to 0.7f), interactionCount = 30) // High Engagement
    )
    
    private val userProfile: UserProfile
        get() = mockUsers[currentUserIndex]

    fun switchMockUser() {
        currentUserIndex = (currentUserIndex + 1) % mockUsers.size
    }

    private val searchPlaceholders = listOf(
        "Search products, services, places…",
        "What are you looking for today?",
        "Try \"modern loft\" or \"fitness training\"",
        "Discover trending items near you",
        "Find deals on services & products",
        "Search real estate, electronics…",
    )

    private val searchPlaceholdersAr = listOf(
        "ابحث عن منتجات، خدمات، أماكن…",
        "ما الذي تبحث عنه اليوم؟",
        "جرّب \"شقة عصرية\" أو \"تدريب رياضي\"",
        "اكتشف العناصر الرائجة بالقرب منك",
        "اعثر على عروض الخدمات والمنتجات",
    )

    fun getAiSearchPlaceholder(isArabic: Boolean = false): String {
        val list = if (isArabic) searchPlaceholdersAr else searchPlaceholders
        val index = ((System.currentTimeMillis() / 4000) % list.size).toInt()
        return list[index]
    }

    fun trackView(listingId: String, dwellTimeMs: Long = 0) {
        userProfile.interactionCount++
        userProfile.viewHistory.add(listingId)
        if (userProfile.viewHistory.size > 50) {
            userProfile.viewHistory.removeAt(0)
        }
        
        // Track dwell time (longer dwell = higher interest)
        if (dwellTimeMs > 0) {
            val currentDwell = userProfile.dwellTimeHistory[listingId] ?: 0L
            userProfile.dwellTimeHistory[listingId] = currentDwell + dwellTimeMs
        }
    }
    
    fun trackScrollDepth(listingId: String, percentage: Float) {
        // Track how far down a user scrolled on a detail page
        val currentDepth = userProfile.scrollDepthHistory[listingId] ?: 0f
        userProfile.scrollDepthHistory[listingId] = maxOf(currentDepth, percentage)
    }

    fun trackSearch(query: String) {
        userProfile.interactionCount++
        if (query.isNotBlank()) {
            userProfile.searchHistory.add(0, query)
            if (userProfile.searchHistory.size > 20) {
                userProfile.searchHistory.removeAt(userProfile.searchHistory.lastIndex)
            }
        }
    }

    fun trackSave(listingId: String, isSaved: Boolean) {
        userProfile.interactionCount++
        if (isSaved) userProfile.savedIds.add(listingId) else userProfile.savedIds.remove(listingId)
    }

    fun trackContentTypeInteraction(type: ContentType) {
        userProfile.interactionCount++
        // Update short-term session interest rapidly
        val currentShort = userProfile.shortTermSessionInterests[type] ?: userProfile.longTermPreferences[type] ?: 0.5f
        userProfile.shortTermSessionInterests[type] = (currentShort + 0.2f).coerceAtMost(1.0f)
        
        // Update long-term preference slowly
        val currentLong = userProfile.longTermPreferences[type] ?: 0.5f
        userProfile.longTermPreferences[type] = (currentLong + 0.05f).coerceAtMost(1.0f)
        
        // Decay other short-term session interests
        ContentType.entries.forEach { key ->
            if (key != type) {
                val value = userProfile.shortTermSessionInterests[key] ?: userProfile.longTermPreferences[key] ?: 0.5f
                userProfile.shortTermSessionInterests[key] = (value - 0.05f).coerceAtLeast(0.1f)
            }
        }
    }

    fun getRecentSearches(): List<String> = userProfile.searchHistory.distinct().take(8)

    fun scoreAndRankListings(listings: List<Listing>): List<Listing> {
        return listings
            .map { listing -> listing to computeRelevanceScore(listing) }
            .sortedByDescending { it.second }
            .map { it.first }
    }

    private fun computeRelevanceScore(listing: Listing): Float {
        var score = 0f

        // Content type preference (0-30 pts)
        val typePreference = userProfile.getEffectivePreference(listing.contentType)
        score += typePreference * 30f

        // Time-based contextual relevance
        val hourOfDay = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        when {
            // Morning: coffee, breakfast deals, fitness
            hourOfDay in 6..10 && listing.tags.any { it.contains("coffee") || it.contains("fitness") } -> score += 15f
            // Evening: restaurants, entertainment, relaxation
            hourOfDay in 17..22 && listing.tags.any { it.contains("food") || it.contains("spa") } -> score += 15f
        }

        // Recency boost (0-20 pts) — newer items score higher
        val ageHours = (System.currentTimeMillis() - listing.createdAt) / 3600000.0
        val recencyScore = (20f * (1f / (1f + ln(ageHours.coerceAtLeast(1.0)).toFloat())))
        score += recencyScore

        // Rating quality (0-15 pts)
        score += listing.rating * 3f

        // Popularity (review count) (0-15 pts)
        val popularityScore = (15f * (1f - 1f / (1f + listing.reviewCount / 100f)))
        score += popularityScore

        // Dwell time boost (up to +15 pts for spending a lot of time on an item)
        val dwellTime = userProfile.dwellTimeHistory[listing.id] ?: 0L
        if (dwellTime > 5000) { // More than 5 seconds
            score += minOf(15f, (dwellTime / 1000f))
        }
        
        // Scroll Depth boost (+10 pts if they scrolled to the bottom of the details page)
        val scrollDepth = userProfile.scrollDepthHistory[listing.id] ?: 0f
        score += (scrollDepth * 10f)

        // Previously viewed penalty (-5 pts for repeated items unless saved or high dwell)
        if (listing.id in userProfile.viewHistory && dwellTime < 5000 && listing.id !in userProfile.savedIds) {
            score -= 5f
        }

        // Saved items boost (+10 pts — user expressed interest in similar)
        if (listing.id in userProfile.savedIds) {
            score += 10f
        }

        // Search relevance bonus (+10 if tags match recent searches)
        val recentSearches = userProfile.searchHistory.take(5)
        val tagMatch = listing.tags.any { tag ->
            recentSearches.any { search -> tag.contains(search, true) || search.contains(tag, true) }
        }
        if (tagMatch) score += 10f

        // Price range alignment (0-10 pts)
        if (listing.price in userProfile.priceRange) {
            score += 10f
        }

        // Random exploration factor (0-5 pts) to prevent filter bubbles
        score += Random.nextFloat() * 5f

        return score
    }

    suspend fun getAiPersonalizedFeed(allListings: List<Listing>): List<FeedSection> {
        delay(400)
        val ranked = scoreAndRankListings(allListings)

        // Smart section generation based on user profile and engagement
        val topType = ContentType.entries.maxByOrNull { userProfile.getEffectivePreference(it) } ?: ContentType.PRODUCT
        val secondType = ContentType.entries
            .filter { it != topType }
            .maxByOrNull { userProfile.getEffectivePreference(it) } ?: ContentType.SERVICE

        return when (userProfile.engagementType) {
            UserEngagementType.NEW -> listOf(
                FeedSection("new_trending", "Trending Nationwide", FeedSectionType.TRENDING, ranked.sortedByDescending { it.reviewCount }.take(6)),
                FeedSection("new_discover", "Discover Market", FeedSectionType.DISCOVER, ranked.shuffled().take(6)),
                FeedSection("new_nearby", "Popular Near You", FeedSectionType.NEARBY, ranked.filter { it.contentType == ContentType.LOCAL_OFFER }.take(4))
            )
            UserEngagementType.ACTIVE -> listOf(
                FeedSection("ai_recommended", "Picked for You", FeedSectionType.RECOMMENDED, ranked.take(6)),
                FeedSection("ai_activity", "Because You Like ${topType.displayName()}", FeedSectionType.BASED_ON_ACTIVITY, ranked.filter { it.contentType == topType }.take(4)),
                FeedSection("ai_trending", "Trending Now", FeedSectionType.TRENDING, ranked.sortedByDescending { it.reviewCount }.take(4)),
                FeedSection("ai_discover", "Discover", FeedSectionType.DISCOVER, ranked.shuffled().take(6))
            )
            UserEngagementType.HIGH_ENGAGEMENT -> listOf(
                FeedSection("ai_niche", "Deep Dive: ${topType.displayName()}", FeedSectionType.RECOMMENDED, ranked.filter { it.contentType == topType }.take(8)),
                FeedSection("ai_also_liked", "Based on your saves", FeedSectionType.SMART_SUGGESTIONS, ranked.filter { it.contentType == secondType }.take(6)),
                FeedSection("ai_nearby", "Exclusive Near You", FeedSectionType.NEARBY, ranked.filter { it.contentType in listOf(ContentType.LOCAL_OFFER, ContentType.SERVICE) }.take(4))
            )
        }
    }

    suspend fun getAiSearchSuggestions(query: String, allListings: List<Listing>): List<SearchSuggestion> {
        delay(150)
        if (query.isBlank()) {
            // Return smart suggestions based on profile
            val topTypes = ContentType.entries
                .sortedByDescending { userProfile.getEffectivePreference(it) }
                .take(3)

            return buildList {
                topTypes.forEach { type ->
                    val count = allListings.count { it.contentType == type }
                    add(SearchSuggestion("Popular in ${type.displayName()}", type, count))
                }
                userProfile.searchHistory.take(3).forEach { recent ->
                    val count = allListings.count {
                        it.title.contains(recent, true) || it.tags.any { t -> t.contains(recent, true) }
                    }
                    add(SearchSuggestion(recent, null, count))
                }
            }.take(6)
        }

        // Query-based suggestions with scoring
        val directMatches = allListings.filter {
            it.title.contains(query, true) || it.tags.any { t -> t.contains(query, true) }
        }

        val typeGroups = directMatches.groupBy { it.contentType }
        return typeGroups.map { (type, items) ->
            SearchSuggestion("$query in ${type.displayName()}", type, items.size)
        } + listOf(
            SearchSuggestion(query, null, directMatches.size),
        )
    }

    fun getContentTypeDistribution(): Map<ContentType, Float> {
        return ContentType.entries.associateWith { userProfile.getEffectivePreference(it) }
    }

    fun getChatQuickReplies(listingType: ContentType): List<String> {
        return when (listingType) {
            ContentType.REAL_ESTATE -> listOf("Is this property still available?", "Can I schedule a viewing?", "Are utilities included?")
            ContentType.PRODUCT -> listOf("Is the price negotiable?", "Do you offer shipping?", "What is the condition?")
            ContentType.SERVICE -> listOf("What is your availability?", "Can I see past work?", "Do you offer a consultation?")
            ContentType.LOCAL_OFFER -> listOf("Is this deal still active?", "What are the terms?", "Can I use this today?")
            ContentType.TRENDING -> listOf("Is this still in stock?", "When can you deliver?", "What comes in the box?")
        }
    }
}

private fun ContentType.displayName(): String = when (this) {
    ContentType.REAL_ESTATE -> "Real Estate"
    ContentType.PRODUCT -> "Products"
    ContentType.SERVICE -> "Services"
    ContentType.LOCAL_OFFER -> "Local Offers"
    ContentType.TRENDING -> "Trending"
}
