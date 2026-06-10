package com.marketplace.ai.domain.model

data class User(
    val id: String,
    val name: String,
    val email: String,
    val avatarUrl: String?,
    val joinDate: Long,
    val listingsCount: Int = 0,
    val savedCount: Int = 0,
)

data class AuthState(
    val isLoggedIn: Boolean = false,
    val user: User? = null,
    val token: String? = null,
)

data class LoginRequest(
    val email: String,
    val password: String,
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
)

data class Notification(
    val id: String,
    val title: String,
    val message: String,
    val imageUrl: String?,
    val isRead: Boolean = false,
    val createdAt: Long,
    val type: NotificationType,
)

enum class NotificationType {
    LISTING_UPDATE,
    PRICE_DROP,
    NEW_MESSAGE,
    SYSTEM,
    RECOMMENDATION,
}
