package com.marketplace.ai.domain.usecase.auth

import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.User
import com.marketplace.ai.domain.repository.AuthRepository
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(email: String, password: String): Resource<User> {
        if (email.isBlank()) return Resource.Error("Email is required")
        if (password.isBlank()) return Resource.Error("Password is required")
        if (password.length < 8) return Resource.Error("Password must be at least 8 characters")
        return authRepository.login(email, password)
    }
}

class RegisterUseCase @Inject constructor(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(
        name: String,
        email: String,
        password: String,
        confirmPassword: String,
    ): Resource<User> {
        if (name.isBlank()) return Resource.Error("Name is required")
        if (email.isBlank()) return Resource.Error("Email is required")
        if (password.isBlank()) return Resource.Error("Password is required")
        if (password.length < 8) return Resource.Error("Password must be at least 8 characters")
        if (password != confirmPassword) return Resource.Error("Passwords don't match")
        return authRepository.register(name, email, password)
    }
}

class ForgotPasswordUseCase @Inject constructor(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(email: String): Resource<String> {
        if (email.isBlank()) return Resource.Error("Email is required")
        return authRepository.forgotPassword(email)
    }
}

class GetAuthStateUseCase @Inject constructor(
    private val authRepository: AuthRepository,
) {
    operator fun invoke() = authRepository.getAuthState()
}

class LogoutUseCase @Inject constructor(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke() = authRepository.logout()
}
