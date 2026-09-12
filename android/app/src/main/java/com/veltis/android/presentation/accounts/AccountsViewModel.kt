package com.veltis.android.presentation.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AccountsUiState(
    val isLoading: Boolean = false,
    val accounts: List<AccountDetailDto> = emptyList(),
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val isSubmitting: Boolean = false
)

class AccountsViewModel(
    private val repository: VeltisAppRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AccountsUiState())
    val uiState: StateFlow<AccountsUiState> = _uiState.asStateFlow()

    init {
        loadAccounts()
    }

    fun loadAccounts(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = it.accounts.isEmpty(), errorMessage = null) }
            when (val result = repository.getAccounts(forceRefresh)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isLoading = false, accounts = result.data, errorMessage = null) }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isLoading = false, errorMessage = result.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun createAccount(
        name: String,
        type: String,
        currency: String,
        balance: Double,
        onSuccess: () -> Unit
    ) {
        if (name.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Account name is required.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val result = repository.createAccount(name, type, currency, balance)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            accounts = it.accounts + result.data,
                            successMessage = "Account created successfully!"
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = result.error.userFriendlyMessage())
                    }
                }
            }
        }
    }

    fun reconcileAccount(
        id: String,
        actualBalance: Double,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val result = repository.reconcileAccount(id, actualBalance)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, successMessage = "Account reconciled successfully!")
                    }
                    loadAccounts(forceRefresh = true)
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = result.error.userFriendlyMessage())
                    }
                }
            }
        }
    }

    fun deleteAccount(id: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val result = repository.deleteAccount(id)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            accounts = it.accounts.filter { a -> a.id != id },
                            successMessage = "Account deleted."
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = result.error.userFriendlyMessage())
                    }
                }
            }
        }
    }

    fun clearMessages() = _uiState.update { it.copy(errorMessage = null, successMessage = null) }
}
