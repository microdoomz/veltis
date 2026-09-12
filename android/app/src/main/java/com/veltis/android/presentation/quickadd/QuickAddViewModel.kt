package com.veltis.android.presentation.quickadd

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.domain.model.Account
import com.veltis.android.domain.model.TransactionDraft
import com.veltis.android.domain.model.TransactionResult
import com.veltis.android.domain.model.TransactionType
import com.veltis.android.domain.model.VeltisResult
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
    private val repository: VeltisRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(QuickAddUiState())
    val uiState: StateFlow<QuickAddUiState> = _uiState.asStateFlow()

    init {
        loadAccounts()
    }

    fun loadAccounts(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingAccounts = true, errorMessage = null) }

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

    fun selectTransactionType(type: TransactionType) {
        _uiState.update { it.copy(selectedType = type, errorMessage = null) }
    }

    fun selectAccount(account: Account) {
        _uiState.update { it.copy(selectedAccount = account, errorMessage = null) }
    }

    fun onAmountChanged(input: String) {
        // Allow digits and a single decimal dot with up to 2 decimal places
        val filtered = input.filter { it.isDigit() || it == '.' }
        if (filtered.count { it == '.' } <= 1) {
            val parts = filtered.split('.')
            if (parts.size <= 1 || parts[1].length <= 2) {
                _uiState.update { it.copy(amountText = filtered, errorMessage = null) }
            }
        }
    }

    fun onDescriptionChanged(description: String) {
        _uiState.update { it.copy(descriptionText = description, errorMessage = null) }
    }

    fun submitTransaction() {
        val state = _uiState.value
        val amount = state.amountText.toDoubleOrNull()

        if (amount == null || amount <= 0.0) {
            _uiState.update { it.copy(errorMessage = "Please enter an amount greater than 0.") }
            return
        }

        val account = state.selectedAccount
        if (account == null) {
            _uiState.update { it.copy(errorMessage = "Please select an account.") }
            return
        }

        // CRITICAL REQUIREMENT: Send internal accountId UUID, never the display name
        val internalAccountId = account.id

        val draft = TransactionDraft(
            type = state.selectedType,
            amount = amount,
            description = state.descriptionText.trim(),
            accountId = internalAccountId,
            currency = account.currency
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }

            val result = if (state.selectedType == TransactionType.EXPENSE) {
                repository.recordExpense(draft)
            } else {
                repository.recordIncome(draft)
            }

            when (result) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successResult = result.data,
                            errorMessage = null
                        )
                    }
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
}
