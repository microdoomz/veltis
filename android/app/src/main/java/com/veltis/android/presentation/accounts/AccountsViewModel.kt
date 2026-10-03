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

import com.veltis.android.data.model.AllocationDto
import com.veltis.android.data.model.TransactionSummaryDto

data class AccountsUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val accounts: List<AccountDetailDto> = emptyList(),
    val selectedAccount: AccountDetailDto? = null,
    val allocations: List<AllocationDto> = emptyList(),
    val totalAllocated: Double = 0.0,
    val accountTransactions: List<TransactionSummaryDto> = emptyList(),
    val isLoadingDetail: Boolean = false,
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
            _uiState.update { 
                it.copy(
                    isLoading = if (forceRefresh) false else it.accounts.isEmpty(),
                    isRefreshing = forceRefresh,
                    errorMessage = null
                ) 
            }
            when (val result = repository.getAccounts(forceRefresh)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isLoading = false, isRefreshing = false, accounts = result.data, errorMessage = null) }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isLoading = false, isRefreshing = false, errorMessage = result.error.userFriendlyMessage()) }
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

    fun selectAccount(account: AccountDetailDto?) {
        _uiState.update { it.copy(selectedAccount = account, allocations = emptyList(), accountTransactions = emptyList()) }
        if (account != null) {
            loadAllocations(account.id)
            loadAccountTransactions(account.id)
        }
    }

    fun loadAllocations(accountId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingDetail = true) }
            when (val result = repository.getAccountAllocations(accountId)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoadingDetail = false,
                            allocations = result.data.allocations,
                            totalAllocated = result.data.totalAllocated
                        )
                    }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isLoadingDetail = false) }
                }
            }
        }
    }

    fun loadAccountTransactions(accountId: String) {
        viewModelScope.launch {
            when (val result = repository.getTransactions(accountId = accountId)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(accountTransactions = result.data) }
                }
                is VeltisResult.Failure -> {
                    // ignore
                }
            }
        }
    }

    fun createAllocation(
        accountId: String,
        name: String,
        amount: Double,
        description: String? = null,
        color: String? = null,
        onSuccess: () -> Unit
    ) {
        if (name.isBlank() || amount <= 0.0) {
            _uiState.update { it.copy(errorMessage = "Name and a positive amount are required.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val result = repository.createAccountAllocation(accountId, name, amount, description, color)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Allocation created.") }
                    loadAllocations(accountId)
                    loadAccounts(forceRefresh = true)
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = result.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun updateAllocation(
        accountId: String,
        allocationId: String,
        name: String?,
        amount: Double?,
        description: String?,
        color: String?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val result = repository.updateAccountAllocation(accountId, allocationId, name, amount, description, color)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Allocation updated.") }
                    loadAllocations(accountId)
                    loadAccounts(forceRefresh = true)
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = result.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun deleteAllocation(accountId: String, allocationId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val result = repository.deleteAccountAllocation(accountId, allocationId)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Allocation deleted.") }
                    loadAllocations(accountId)
                    loadAccounts(forceRefresh = true)
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = result.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun updateAccountDetails(
        accountId: String,
        name: String?,
        color: String?,
        institutionName: String?,
        accountType: String?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val result = repository.updateAccount(accountId, name, color, institutionName, accountType)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Account updated successfully!"
                        )
                    }
                    loadAccounts(forceRefresh = true)
                    // Update selected account in-place
                    _uiState.update { state ->
                        state.selectedAccount?.let { sel ->
                            if (sel.id == accountId) {
                                state.copy(
                                    selectedAccount = sel.copy(
                                        name = name ?: sel.name,
                                        color = color ?: sel.color,
                                        institutionName = institutionName ?: sel.institutionName,
                                        accountType = accountType ?: sel.accountType
                                    )
                                )
                            } else state
                        } ?: state
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = result.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun clearMessages() = _uiState.update { it.copy(errorMessage = null, successMessage = null) }
}
