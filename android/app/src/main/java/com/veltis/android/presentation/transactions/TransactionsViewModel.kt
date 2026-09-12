package com.veltis.android.presentation.transactions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.CategoryDto
import com.veltis.android.data.model.TransactionSummaryDto
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TransactionsUiState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val transactions: List<TransactionSummaryDto> = emptyList(),
    val accounts: List<AccountDetailDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val selectedFilterType: String = "all", // 'all', 'expense', 'income', 'transfer'
    val selectedAccountId: String? = null,
    val selectedCategoryId: String? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val pendingSyncCount: Int = 0
)

class TransactionsViewModel(
    private val repository: VeltisAppRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TransactionsUiState())
    val uiState: StateFlow<TransactionsUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = it.transactions.isEmpty(), errorMessage = null) }

            // Parallel load
            val txnsJob = launch { loadTransactions() }
            val accountsJob = launch {
                when (val res = repository.getAccounts()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(accounts = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            val categoriesJob = launch {
                when (val res = repository.getCategories()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(categories = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }

            txnsJob.join()
            accountsJob.join()
            categoriesJob.join()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun loadTransactions() {
        viewModelScope.launch {
            val filterType = if (_uiState.value.selectedFilterType == "all") null else _uiState.value.selectedFilterType
            when (val res = repository.getTransactions(
                type = filterType,
                categoryId = _uiState.value.selectedCategoryId,
                accountId = _uiState.value.selectedAccountId
            )) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(transactions = res.data, errorMessage = null) }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun filterByType(type: String) {
        _uiState.update { it.copy(selectedFilterType = type) }
        loadTransactions()
    }

    fun createTransaction(
        type: String,
        amount: Double,
        accountId: String,
        destAccountId: String? = null,
        description: String? = null,
        categoryId: String? = null,
        date: String? = null,
        onSuccess: () -> Unit
    ) {
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Amount must be positive.") }
            return
        }
        if (accountId.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please select an account.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.createTransaction(
                type = type,
                amount = amount,
                accountId = accountId,
                destAccountId = destAccountId,
                description = description,
                categoryId = categoryId,
                date = date
            )) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            transactions = listOf(res.data) + it.transactions,
                            successMessage = if (res.data.source == "offline_pending") {
                                "Saved offline! Will sync automatically when online."
                            } else {
                                "Transaction recorded successfully!"
                            }
                        )
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage())
                    }
                }
            }
        }
    }

    fun deleteTransaction(id: String) {
        viewModelScope.launch {
            when (val res = repository.deleteTransaction(id)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            transactions = it.transactions.filter { t -> t.id != id },
                            successMessage = "Transaction deleted."
                        )
                    }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun syncQueue() {
        viewModelScope.launch {
            when (val res = repository.syncOfflineQueue()) {
                is VeltisResult.Success -> {
                    if (res.data > 0) {
                        _uiState.update { it.copy(successMessage = "Synced ${res.data} offline transactions!") }
                        loadTransactions()
                    }
                }
                is VeltisResult.Failure -> {}
            }
        }
    }

    fun clearMessages() = _uiState.update { it.copy(errorMessage = null, successMessage = null) }
}
