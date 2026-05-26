package com.marketplace.ai.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.data.local.dao.UserDao
import com.marketplace.ai.data.mapper.toDomain
import com.marketplace.ai.data.mapper.toEntity
import com.marketplace.ai.data.remote.mock.MockDataProvider
import com.marketplace.ai.domain.model.AuthState
import com.marketplace.ai.domain.model.User
import com.marketplace.ai.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val userDao: UserDao,
    private val dataStore: DataStore<Preferences>,
) : AuthRepository {

    private val isLoggedInKey = booleanPreferencesKey("is_logged_in")
    private val tokenKey = stringPreferencesKey("auth_token")

    override fun getAuthState(): Flow<AuthState> {
        return dataStore.data.map { prefs ->
            val isLoggedIn = prefs[isLoggedInKey] ?: false
            val token = prefs[tokenKey]
            AuthState(isLoggedIn = isLoggedIn, token = token)
        }
    }

    override suspend fun login(email: String, password: String): Resource<User> {
        return try {
            val user = MockDataProvider.login(email, password)
            userDao.insertUser(user.toEntity())
            dataStore.edit { prefs ->
                prefs[isLoggedInKey] = true
                prefs[tokenKey] = "mock_token_${System.currentTimeMillis()}"
            }
            Resource.Success(user)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Login failed")
        }
    }

    override suspend fun register(name: String, email: String, password: String): Resource<User> {
        return try {
            val user = MockDataProvider.register(name, email, password)
            userDao.insertUser(user.toEntity())
            dataStore.edit { prefs ->
                prefs[isLoggedInKey] = true
                prefs[tokenKey] = "mock_token_${System.currentTimeMillis()}"
            }
            Resource.Success(user)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Registration failed")
        }
    }

    override suspend fun forgotPassword(email: String): Resource<String> {
        return try {
            kotlinx.coroutines.delay(1000)
            Resource.Success("Reset link sent to $email")
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to send reset link")
        }
    }

    override suspend fun logout() {
        userDao.deleteAll()
        dataStore.edit { prefs ->
            prefs[isLoggedInKey] = false
            prefs.remove(tokenKey)
        }
    }
}
