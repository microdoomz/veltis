package com.veltis.android.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.storage.TokenManager
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ConnectionState {
    NOT_CONFIGURED,
    CONNECTING,
    CONNECTED,
    FAILED
}

data class MainUiState(
    val apiTokenInput: String = "",
    val baseUrlInput: String = TokenManager.DEFAULT_PRODUCTION_URL,
    val isCustomUrlSelected: Boolean = false,
    val connectionState: ConnectionState = ConnectionState.NOT_CONFIGURED,
    val statusMessage: String? = null,
    val accountsCount: Int = 0,
    val isSaving: Boolean = false,
    val isTesting: Boolean = false
)

class MainViewModel(
    private val repository: VeltisRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    init {
        loadCurrentConfig()
    }

    private fun loadCurrentConfig() {
        val currentToken = tokenManager.getToken() ?: ""
        val currentUrl = tokenManager.getBaseUrl()
        val isConfigured = tokenManager.isTokenConfigured()

        _uiState.update {
            it.copy(
                apiTokenInput = currentToken,
                baseUrlInput = currentUrl,
                connectionState = if (isConfigured) ConnectionState.CONNECTED else ConnectionState.NOT_CONFIGURED,
                statusMessage = if (isConfigured) "Token configured" else "Not configured"
            )
        }

        if (isConfigured) {
            testConnection(silent = true)
        }
    }

    fun onTokenInputChanged(token: String) {
        _uiState.update { it.copy(apiTokenInput = token.trim(), statusMessage = null) }
    }

    fun onBaseUrlInputChanged(url: String) {
        _uiState.update { it.copy(baseUrlInput = url.trim()) }
    }

    fun setPredefinedUrl(url: String) {
        _uiState.update { it.copy(baseUrlInput = url) }
        tokenManager.saveBaseUrl(url)
    }

    fun saveConfiguration() {
        val token = _uiState.value.apiTokenInput.trim()
        val url = _uiState.value.baseUrlInput.trim()

        if (token.isBlank()) {
            _uiState.update {
                it.copy(
                    connectionState = ConnectionState.FAILED,
                    statusMessage = "Please enter a valid Veltis API token (starts with vsh_)"
                )
            }
            return
        }

        tokenManager.saveToken(token)
        tokenManager.saveBaseUrl(url)

        _uiState.update {
            it.copy(
                isSaving = true,
                statusMessage = "Saving and verifying connection..."
            )
        }

        testConnection(silent = false)
    }

    fun testConnection(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) {
                _uiState.update {
                    it.copy(
                        isTesting = true,
                        connectionState = ConnectionState.CONNECTING,
                        statusMessage = "Testing connection..."
                    )
                }
            }

            when (val result = repository.testConnection()) {
                is VeltisResult.Success -> {
                    val accounts = result.data
                    _uiState.update {
                        it.copy(
                            connectionState = ConnectionState.CONNECTED,
                            statusMessage = "Connected successfully (${accounts.size} active spending accounts)",
                            accountsCount = accounts.size,
                            isTesting = false,
                            isSaving = false
                        )
                    }
                    try {
                        com.veltis.android.widget.VeltisWidgetContract.updateWidget(com.veltis.android.VeltisApplication.instance)
                    } catch (_: Exception) {}
                }
                is VeltisResult.Failure -> {
                    val errorMessage = result.error.userFriendlyMessage()
                    _uiState.update {
                        it.copy(
                            connectionState = ConnectionState.FAILED,
                            statusMessage = errorMessage,
                            isTesting = false,
                            isSaving = false
                        )
                    }
                }
            }
        }
    }

    fun clearToken() {
        tokenManager.clearToken()
        _uiState.update {
            it.copy(
                apiTokenInput = "",
                connectionState = ConnectionState.NOT_CONFIGURED,
                statusMessage = "Token cleared",
                accountsCount = 0
            )
        }
        viewModelScope.launch {
            try {
                com.veltis.android.widget.VeltisWidgetContract.updateWidget(com.veltis.android.VeltisApplication.instance)
            } catch (_: Exception) {}
        }
    }
}
