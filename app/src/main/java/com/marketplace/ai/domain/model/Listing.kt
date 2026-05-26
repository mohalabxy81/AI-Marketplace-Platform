package com.marketplace.ai.domain.model

data class Listing(
    val id: String,
    val title: String,
    val description: String,
    val price: Double,
    val currency: String = "USD",
    val imageUrls: List<String>,
    val contentType: ContentType,
    val location: String,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val rating: Float,
    val reviewCount: Int,
    val sellerId: String,
    val sellerName: String,
    val sellerAvatar: String?,
    val isSaved: Boolean = false,
    val createdAt: Long,
    val tags: List<String> = emptyList(),
)

enum class ContentType {
    REAL_ESTATE,
    PRODUCT,
    SERVICE,
    LOCAL_OFFER,
    TRENDING;

    companion object {
        fun fromString(value: String): ContentType {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: PRODUCT
        }
    }
}

data class FeedSection(
    val id: String,
    val title: String,
    val type: FeedSectionType,
    val listings: List<Listing>,
)

enum class FeedSectionType {
    RECOMMENDED,
    BASED_ON_ACTIVITY,
    NEARBY,
    TRENDING,
    SMART_SUGGESTIONS,
    DISCOVER,
}

data class SearchSuggestion(
    val text: String,
    val type: ContentType?,
    val resultCount: Int = 0,
)

data class Category(
    val id: String,
    val name: String,
    val iconName: String,
    val listingCount: Int,
    val contentType: ContentType,
)
