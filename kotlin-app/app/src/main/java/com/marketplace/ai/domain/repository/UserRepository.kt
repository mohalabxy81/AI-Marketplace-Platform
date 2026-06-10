package com.marketplace.ai.domain.repository

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.User
import kotlinx.coroutines.flow.Flow

interface UserRepository {
    fun getCurrentUser(): Flow<Resource<User>>
    suspend fun updateProfile(name: String, avatarUrl: String?): Resource<User>
}
