package com.marketplace.ai.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "listings")
data class ListingEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val price: Double,
    val currency: String,
    val imageUrls: String, // JSON array serialized
    val contentType: String,
    val location: String,
    val rating: Float,
    val reviewCount: Int,
    val sellerId: String,
    val sellerName: String,
    val sellerAvatar: String?,
    val isSaved: Boolean,
    val createdAt: Long,
    val tags: String, // JSON array serialized
)

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val name: String,
    val email: String,
    val avatarUrl: String?,
    val joinDate: Long,
    val listingsCount: Int,
    val savedCount: Int,
)

@Entity(tableName = "saved_items")
data class SavedItemEntity(
    @PrimaryKey val listingId: String,
    val savedAt: Long = System.currentTimeMillis(),
)
