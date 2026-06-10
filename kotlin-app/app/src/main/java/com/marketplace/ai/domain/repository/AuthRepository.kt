package com.marketplace.ai.domain.repository

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.AuthState
import com.marketplace.ai.domain.model.User
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    fun getAuthState(): Flow<AuthState>
    suspend fun login(email: String, password: String): Resource<User>
    suspend fun register(name: String, email: String, password: String): Resource<User>
    suspend fun forgotPassword(email: String): Resource<String>
    suspend fun logout()
}
