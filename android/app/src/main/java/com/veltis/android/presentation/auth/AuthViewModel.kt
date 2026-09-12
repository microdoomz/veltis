package com.veltis.android.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.domain.model.User
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUiState(
    val nameInput: String = "",
    val emailInput: String = "",
    val passwordInput: String = "",
    val confirmPasswordInput: String = "",
    val isPasswordVisible: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val currentUser: User? = null,
    val isAuthenticated: Boolean = false
)

class AuthViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        AuthUiState(
            currentUser = authRepository.getCurrentUser(),
            isAuthenticated = authRepository.isLoggedIn()
        )
    )
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        restoreSession()
    }

    fun restoreSession() {
        viewModelScope.launch {
            when (val result = authRepository.restoreSession()) {
                is VeltisResult.Success -> {
                    val user = result.data
                    _uiState.update {
                        it.copy(
                            currentUser = user,
                            isAuthenticated = user != null
                        )
                    }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isAuthenticated = false, currentUser = null) }
                }
            }
        }
    }

    fun onNameChanged(name: String) = _uiState.update { it.copy(nameInput = name, errorMessage = null) }
    fun onEmailChanged(email: String) = _uiState.update { it.copy(emailInput = email, errorMessage = null) }
    fun onPasswordChanged(password: String) = _uiState.update { it.copy(passwordInput = password, errorMessage = null) }
    fun onConfirmPasswordChanged(confirm: String) = _uiState.update { it.copy(confirmPasswordInput = confirm, errorMessage = null) }
    fun togglePasswordVisibility() = _uiState.update { it.copy(isPasswordVisible = !it.isPasswordVisible) }
    fun clearError() = _uiState.update { it.copy(errorMessage = null) }

    fun login(onSuccess: () -> Unit) {
        val email = _uiState.value.emailInput.trim()
        val password = _uiState.value.passwordInput

        if (email.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your email.") }
            return
        }
        if (password.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your password.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.signIn(email, password)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            currentUser = result.data,
                            isAuthenticated = true,
                            errorMessage = null
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.error.userFriendlyMessage()
                        )
                    }
                }
            }
        }
    }

    fun signup(onSuccess: () -> Unit) {
        val name = _uiState.value.nameInput.trim()
        val email = _uiState.value.emailInput.trim()
        val password = _uiState.value.passwordInput
        val confirm = _uiState.value.confirmPasswordInput

        if (name.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your full name.") }
            return
        }
        if (email.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your email address.") }
            return
        }
        if (password.length < 8) {
            _uiState.update { it.copy(errorMessage = "Password must be at least 8 characters.") }
            return
        }
        if (password != confirm) {
            _uiState.update { it.copy(errorMessage = "Passwords do not match.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.signUp(name, email, password)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            currentUser = result.data,
                            isAuthenticated = true,
                            errorMessage = null
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.error.userFriendlyMessage()
                        )
                    }
                }
            }
        }
    }

    fun forgotPassword(onSuccess: () -> Unit) {
        val email = _uiState.value.emailInput.trim()
        if (email.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your email address.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.sendPasswordReset(email)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            successMessage = "Password reset instructions sent to $email",
                            errorMessage = null
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.error.userFriendlyMessage()
                        )
                    }
                }
            }
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            authRepository.signOut()
            _uiState.update {
                AuthUiState(
                    currentUser = null,
                    isAuthenticated = false
                )
            }
            onLoggedOut()
        }
    }

    fun signInWithBiometrics(
        sessionManager: com.veltis.android.data.storage.SessionManager,
        onSuccess: () -> Unit
    ) {
        val token = sessionManager.getBiometricSessionToken() ?: sessionManager.getSessionToken()
        if (token.isNullOrBlank()) {
            _uiState.update {
                it.copy(errorMessage = "No previous biometric session found. Please sign in with email/password or Google once to link biometrics.")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.handleOAuthCallback(token)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            currentUser = result.data,
                            isAuthenticated = true,
                            errorMessage = null
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = "Biometric session expired. Please sign in with password."
                        )
                    }
                }
            }
        }
    }

    fun initiateGoogleSignIn(context: android.content.Context) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.getGoogleSignInUrl()) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isLoading = false) }
                    try {
                        val customTabsIntent = androidx.browser.customtabs.CustomTabsIntent.Builder()
                            .setShowTitle(true)
                            .build()
                        customTabsIntent.launchUrl(context, android.net.Uri.parse(result.data))
                    } catch (_: Exception) {
                        val browserIntent = android.content.Intent(
                            android.content.Intent.ACTION_VIEW,
                            android.net.Uri.parse(result.data)
                        ).apply {
                            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        context.startActivity(browserIntent)
                    }
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = "Unable to start Google Sign-In. Please check your network."
                        )
                    }
                }
            }
        }
    }

    fun handleDeepLinkToken(token: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.handleOAuthCallback(token)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            currentUser = result.data,
                            isAuthenticated = true,
                            errorMessage = null
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.error.userFriendlyMessage()
                        )
                    }
                }
            }
        }
    }
}
