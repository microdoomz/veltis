package com.veltis.android.presentation.investments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.InvestmentActionRequestDto
import com.veltis.android.data.model.InvestmentsResponseDto
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class InvestmentsUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val isSyncingPrices: Boolean = false,
    val data: InvestmentsResponseDto? = null,
    val accounts: List<AccountDetailDto> = emptyList(),
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val isPrivacyMode: Boolean = false,
    val baseCurrency: String = "USD"
)

class InvestmentsViewModel(
    private val repository: VeltisAppRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        InvestmentsUiState(
            isPrivacyMode = sessionManager.getPrivacyMode(),
            baseCurrency = sessionManager.getBaseCurrency()
        )
    )
    val uiState: StateFlow<InvestmentsUiState> = _uiState.asStateFlow()

    init {
        loadInvestments()
    }

    fun loadInvestments(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { 
                it.copy(
                    isLoading = if (forceRefresh) false else it.data == null,
                    isRefreshing = forceRefresh,
                    isPrivacyMode = sessionManager.getPrivacyMode(),
                    baseCurrency = sessionManager.getBaseCurrency(),
                    errorMessage = null
                ) 
            }

            launch {
                when (val accRes = repository.getAccounts(forceRefresh)) {
                    is VeltisResult.Success -> _uiState.update { it.copy(accounts = accRes.data) }
                    is VeltisResult.Failure -> {}
                }
            }

            when (val res = repository.getInvestments()) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isLoading = false, isRefreshing = false, data = res.data, errorMessage = null) }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isLoading = false, isRefreshing = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun syncPrices() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncingPrices = true, errorMessage = null) }
            when (val res = repository.syncInvestmentPrices()) {
                is VeltisResult.Success -> {
                    val count = res.data.syncedCount ?: 0
                    val msg = res.data.message ?: "Successfully synced latest NAV/prices for $count position(s)."
                    _uiState.update { it.copy(isSyncingPrices = false, successMessage = msg) }
                    loadInvestments(forceRefresh = true)
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSyncingPrices = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun topUpPosition(
        positionId: String,
        amount: Double,
        price: Double,
        currency: String,
        sourceAccountId: String? = null,
        onSuccess: () -> Unit = {}
    ) {
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Investment amount must be positive.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            val req = InvestmentActionRequestDto(
                type = "topup",
                action = "topup",
                positionId = positionId,
                amount = amount,
                amountMinor = Math.round(amount * 100),
                price = price,
                priceMinor = Math.round(price * 100),
                currency = currency,
                sourceAccountId = sourceAccountId?.ifBlank { null }
            )
            when (val res = repository.executeInvestmentAction(req)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "One-time investment recorded successfully!") }
                    loadInvestments(forceRefresh = true)
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun executeTrade(
        action: String, // 'buy' or 'sell'
        positionId: String? = null,
        symbol: String? = null,
        units: Double,
        price: Double,
        onSuccess: () -> Unit
    ) {
        if (units <= 0 || price <= 0) {
            _uiState.update { it.copy(errorMessage = "Units and price must be greater than zero.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            val req = InvestmentActionRequestDto(
                action = action,
                type = action,
                positionId = positionId,
                symbol = symbol,
                units = units,
                price = price,
                priceMinor = Math.round(price * 100),
                amount = units * price,
                amountMinor = Math.round(units * price * 100)
            )
            when (val res = repository.executeInvestmentAction(req)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Order executed successfully!"
                        )
                    }
                    loadInvestments(forceRefresh = true)
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

    fun contributeOrWithdrawCash(
        type: String, // 'contribution' or 'withdrawal'
        investmentAccountId: String,
        bankAccountId: String,
        amount: Double,
        currency: String,
        onSuccess: () -> Unit
    ) {
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Amount must be positive.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            val req = InvestmentActionRequestDto(
                action = type,
                type = type,
                investmentAccountId = investmentAccountId,
                sourceAccountId = if (type == "contribution") bankAccountId else null,
                destinationAccountId = if (type == "withdrawal") bankAccountId else null,
                amount = amount,
                amountMinor = Math.round(amount * 100),
                currency = currency
            )
            when (val res = repository.executeInvestmentAction(req)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "${type.replaceFirstChar { c -> c.uppercase() }} recorded successfully!"
                        )
                    }
                    loadInvestments(forceRefresh = true)
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

    fun deleteTransaction(id: String, transactionId: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.deleteInvestmentTransaction(id, transactionId)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Transaction deleted and holding units/amount reversed."
                        )
                    }
                    loadInvestments(forceRefresh = true)
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage())
                    }
                }
            }
        }
    }

    fun updatePosition(
        financialAccountId: String,
        name: String? = null,
        symbol: String? = null,
        units: Double? = null,
        currentPrice: Double? = null,
        investedAmount: Double? = null,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.updateInvestmentPosition(financialAccountId, name, symbol, units, currentPrice, investedAmount)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, successMessage = "Position updated successfully!")
                    }
                    loadInvestments(forceRefresh = true)
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

    fun clearMessages() {
        _uiState.update { it.copy(errorMessage = null, successMessage = null) }
    }
}
