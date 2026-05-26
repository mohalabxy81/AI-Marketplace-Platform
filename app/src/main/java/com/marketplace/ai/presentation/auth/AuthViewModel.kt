package com.marketplace.ai.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.marketplace.ai.core.util.Resource
import com.marketplace.ai.domain.model.AuthState
import com.marketplace.ai.domain.usecase.auth.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false,
)

data class RegisterUiState(
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false,
)

data class ForgotPasswordUiState(
    val email: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false,
    val successMessage: String? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
    private val registerUseCase: RegisterUseCase,
    private val forgotPasswordUseCase: ForgotPasswordUseCase,
    private val getAuthStateUseCase: GetAuthStateUseCase,
    private val logoutUseCase: LogoutUseCase,
) : ViewModel() {

    val authState: StateFlow<AuthState> = getAuthStateUseCase()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AuthState())

    private val _loginState = MutableStateFlow(LoginUiState())
    val loginState: StateFlow<LoginUiState> = _loginState.asStateFlow()

    private val _registerState = MutableStateFlow(RegisterUiState())
    val registerState: StateFlow<RegisterUiState> = _registerState.asStateFlow()

    private val _forgotPasswordState = MutableStateFlow(ForgotPasswordUiState())
    val forgotPasswordState: StateFlow<ForgotPasswordUiState> = _forgotPasswordState.asStateFlow()

    fun updateLoginEmail(email: String) { _loginState.update { it.copy(email = email, error = null) } }
    fun updateLoginPassword(password: String) { _loginState.update { it.copy(password = password, error = null) } }
    fun updateRegisterName(name: String) { _registerState.update { it.copy(name = name, error = null) } }
    fun updateRegisterEmail(email: String) { _registerState.update { it.copy(email = email, error = null) } }
    fun updateRegisterPassword(password: String) { _registerState.update { it.copy(password = password, error = null) } }
    fun updateRegisterConfirmPassword(password: String) { _registerState.update { it.copy(confirmPassword = password, error = null) } }
    fun updateForgotEmail(email: String) { _forgotPasswordState.update { it.copy(email = email, error = null) } }

    fun login() {
        viewModelScope.launch {
            _loginState.update { it.copy(isLoading = true, error = null) }
            when (val result = loginUseCase(_loginState.value.email, _loginState.value.password)) {
                is Resource.Success -> _loginState.update { it.copy(isLoading = false, isSuccess = true) }
                is Resource.Error -> _loginState.update { it.copy(isLoading = false, error = result.message) }
                is Resource.Loading -> {}
            }
        }
    }

    fun register() {
        viewModelScope.launch {
            val s = _registerState.value
            _registerState.update { it.copy(isLoading = true, error = null) }
            when (val result = registerUseCase(s.name, s.email, s.password, s.confirmPassword)) {
                is Resource.Success -> _registerState.update { it.copy(isLoading = false, isSuccess = true) }
                is Resource.Error -> _registerState.update { it.copy(isLoading = false, error = result.message) }
                is Resource.Loading -> {}
            }
        }
    }

    fun forgotPassword() {
        viewModelScope.launch {
            _forgotPasswordState.update { it.copy(isLoading = true, error = null) }
            when (val result = forgotPasswordUseCase(_forgotPasswordState.value.email)) {
                is Resource.Success -> _forgotPasswordState.update { it.copy(isLoading = false, isSuccess = true, successMessage = result.data) }
                is Resource.Error -> _forgotPasswordState.update { it.copy(isLoading = false, error = result.message) }
                is Resource.Loading -> {}
            }
        }
    }

    fun logout() { viewModelScope.launch { logoutUseCase() } }
}
