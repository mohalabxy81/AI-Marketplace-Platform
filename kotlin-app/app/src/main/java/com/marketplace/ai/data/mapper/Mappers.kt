package com.marketplace.ai.data.mapper

import com.marketplace.ai.data.local.entity.ListingEntity
import com.marketplace.ai.data.local.entity.UserEntity
import com.marketplace.ai.domain.model.ContentType
import com.marketplace.ai.domain.model.Listing
import com.marketplace.ai.domain.model.User
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

private val gson = Gson()

fun ListingEntity.toDomain(): Listing {
    val imageList: List<String> = try {
        gson.fromJson(imageUrls, object : TypeToken<List<String>>() {}.type)
    } catch (e: Exception) {
        emptyList()
    }
    val tagList: List<String> = try {
        gson.fromJson(tags, object : TypeToken<List<String>>() {}.type)
    } catch (e: Exception) {
        emptyList()
    }
    return Listing(
        id = id,
        title = title,
        description = description,
        price = price,
        currency = currency,
        imageUrls = imageList,
        contentType = ContentType.fromString(contentType),
        location = location,
        rating = rating,
        reviewCount = reviewCount,
        sellerId = sellerId,
        sellerName = sellerName,
        sellerAvatar = sellerAvatar,
        isSaved = isSaved,
        createdAt = createdAt,
        tags = tagList,
    )
}

fun Listing.toEntity(): ListingEntity {
    return ListingEntity(
        id = id,
        title = title,
        description = description,
        price = price,
        currency = currency,
        imageUrls = gson.toJson(imageUrls),
        contentType = contentType.name,
        location = location,
        rating = rating,
        reviewCount = reviewCount,
        sellerId = sellerId,
        sellerName = sellerName,
        sellerAvatar = sellerAvatar,
        isSaved = isSaved,
        createdAt = createdAt,
        tags = gson.toJson(tags),
    )
}

fun UserEntity.toDomain(): User {
    return User(
        id = id,
        name = name,
        email = email,
        avatarUrl = avatarUrl,
        joinDate = joinDate,
        listingsCount = listingsCount,
        savedCount = savedCount,
    )
}

fun User.toEntity(): UserEntity {
    return UserEntity(
        id = id,
        name = name,
        email = email,
        avatarUrl = avatarUrl,
        joinDate = joinDate,
        listingsCount = listingsCount,
        savedCount = savedCount,
    )
}
