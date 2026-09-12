package com.veltis.android.presentation.quickadd

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.domain.model.Account
import com.veltis.android.domain.model.TransactionDraft
import com.veltis.android.domain.model.TransactionResult
import com.veltis.android.domain.model.TransactionType
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisAppRepository
import com.veltis.android.domain.repository.VeltisRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class QuickAddUiState(
    val selectedType: TransactionType = TransactionType.EXPENSE,
    val accounts: List<Account> = emptyList(),
    val selectedAccount: Account? = null,
    val amountText: String = "",
    val descriptionText: String = "",
    val isLoadingAccounts: Boolean = false,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
    val successResult: TransactionResult? = null
)

class QuickAddViewModel(
    private val repository: VeltisRepository,
    private val appRepository: VeltisAppRepository? = null,
    private val sessionManager: SessionManager? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow(QuickAddUiState())
    val uiState: StateFlow<QuickAddUiState> = _uiState.asStateFlow()

    init {
        loadAccounts()
    }

    fun loadAccounts(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingAccounts = true, errorMessage = null) }

            if (sessionManager?.isLoggedIn() == true && appRepository != null) {
                when (val result = appRepository.getAccounts(forceRefresh)) {
                    is VeltisResult.Success -> {
                        val accounts = result.data.map {
                            Account(
                                id = it.id,
                                name = it.name,
                                type = it.accountType,
                                currency = it.currency
                            )
                        }
                        _uiState.update { current ->
                            current.copy(
                                accounts = accounts,
                                selectedAccount = current.selectedAccount ?: accounts.firstOrNull(),
                                isLoadingAccounts = false
                            )
                        }
                    }
                    is VeltisResult.Failure -> {
                        _uiState.update {
                            it.copy(
                                isLoadingAccounts = false,
                                errorMessage = result.error.userFriendlyMessage()
                            )
                        }
                    }
                }
            } else {
                when (val result = repository.getAccounts(forceRefresh)) {
                    is VeltisResult.Success -> {
                        val accounts = result.data
                        _uiState.update { current ->
                            current.copy(
                                accounts = accounts,
                                selectedAccount = current.selectedAccount ?: accounts.firstOrNull(),
                                isLoadingAccounts = false
                            )
                        }
                    }
                    is VeltisResult.Failure -> {
                        _uiState.update {
                            it.copy(
                                isLoadingAccounts = false,
                                errorMessage = result.error.userFriendlyMessage()
                            )
                        }
                    }
                }
            }
        }
    }

    fun selectTransactionType(type: TransactionType) {
        _uiState.update { it.copy(selectedType = type, errorMessage = null) }
    }

    fun selectAccount(account: Account) {
        _uiState.update { it.copy(selectedAccount = account, errorMessage = null) }
    }

    fun onAmountChanged(input: String) {
        val filtered = input.filter { it.isDigit() || it == '.' }
        if (filtered.count { it == '.' } <= 1) {
            val parts = filtered.split('.')
            if (parts.size <= 1 || parts[1].length <= 2) {
                _uiState.update { it.copy(amountText = filtered, errorMessage = null) }
            }
        }
    }

    fun onDescriptionChanged(input: String) {
        _uiState.update { it.copy(descriptionText = input) }
    }

    fun submit() {
        val state = _uiState.value
        val amount = state.amountText.toDoubleOrNull()

        if (amount == null || amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Please enter a valid amount.") }
            return
        }

        val account = state.selectedAccount
        if (account == null) {
            _uiState.update { it.copy(errorMessage = "Please select an account.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }

            if (sessionManager?.isLoggedIn() == true && appRepository != null) {
                val typeStr = if (state.selectedType == TransactionType.INCOME) "income" else "expense"
                when (val result = appRepository.createTransaction(
                    type = typeStr,
                    amount = amount,
                    accountId = account.id,
                    description = state.descriptionText.trim().ifBlank { null }
                )) {
                    is VeltisResult.Success -> {
                        val txnResult = TransactionResult(
                            transactionId = result.data.id,
                            amount = result.data.amount,
                            currency = result.data.currency,
                            description = result.data.description ?: "",
                            date = result.data.transactionDate,
                            accountId = account.id
                        )
                        _uiState.update { it.copy(isSubmitting = false, successResult = txnResult) }
                    }
                    is VeltisResult.Failure -> {
                        _uiState.update {
                            it.copy(
                                isSubmitting = false,
                                errorMessage = result.error.userFriendlyMessage()
                            )
                        }
                    }
                }
            } else {
                val draft = TransactionDraft(
                    type = state.selectedType,
                    amount = amount,
                    accountId = account.id,
                    description = state.descriptionText.trim(),
                    currency = account.currency
                )

                val result = when (state.selectedType) {
                    TransactionType.EXPENSE -> repository.recordExpense(draft)
                    TransactionType.INCOME -> repository.recordIncome(draft)
                }

                when (result) {
                    is VeltisResult.Success -> {
                        _uiState.update { it.copy(isSubmitting = false, successResult = result.data) }
                    }
                    is VeltisResult.Failure -> {
                        _uiState.update {
                            it.copy(
                                isSubmitting = false,
                                errorMessage = result.error.userFriendlyMessage()
                            )
                        }
                    }
                }
            }
        }
    }

    fun submitTransaction() {
        submit()
    }

    fun resetAfterSuccess() {
        _uiState.update {
            it.copy(
                amountText = "",
                descriptionText = "",
                successResult = null,
                errorMessage = null
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
