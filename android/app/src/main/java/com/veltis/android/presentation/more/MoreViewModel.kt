package com.veltis.android.presentation.more

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.model.*
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.AuthRepository
import com.veltis.android.domain.repository.VeltisAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MoreUiState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val budgets: List<BudgetDto> = emptyList(),
    val receivables: List<ReceivableDto> = emptyList(),
    val liabilities: List<LiabilityDto> = emptyList(),
    val recurringItems: List<RecurringItemDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val totalIncome: Double = 0.0,
    val totalExpenses: Double = 0.0,
    val netCashflow: Double = 0.0,
    val categoryBreakdown: Map<String, Double> = emptyMap(),
    val exportedData: String? = null,
    val isPrivacyMode: Boolean = false,
    val baseCurrency: String = "USD",
    val userName: String? = null,
    val userEmail: String? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class MoreViewModel(
    private val repository: VeltisAppRepository,
    private val authRepository: AuthRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        MoreUiState(
            isPrivacyMode = sessionManager.getPrivacyMode(),
            baseCurrency = sessionManager.getBaseCurrency(),
            userName = sessionManager.getUser()?.name ?: "Veltis User",
            userEmail = sessionManager.getUser()?.email
        )
    )
    val uiState: StateFlow<MoreUiState> = _uiState.asStateFlow()

    init {
        loadAllData()
    }

    fun loadAllData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            launch {
                when (val res = repository.getBudgets()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(budgets = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getReceivables()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(receivables = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getLiabilities()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(liabilities = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getRecurringItems()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(recurringItems = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getCategories()) {
                    is VeltisResult.Success -> _uiState.update { it.copy(categories = res.data) }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val res = repository.getTransactions()) {
                    is VeltisResult.Success -> {
                        val txns = res.data
                        val inc = txns.filter { it.type.equals("income", ignoreCase = true) }.sumOf { it.amount }
                        val exp = txns.filter { it.type.equals("expense", ignoreCase = true) }.sumOf { it.amount }
                        val breakdown = txns
                            .filter { it.type.equals("expense", ignoreCase = true) }
                            .groupBy { it.categoryName ?: "General" }
                            .mapValues { entry -> entry.value.sumOf { it.amount } }

                        _uiState.update {
                            it.copy(
                                totalIncome = inc,
                                totalExpenses = exp,
                                netCashflow = inc - exp,
                                categoryBreakdown = breakdown
                            )
                        }
                    }
                    is VeltisResult.Failure -> {}
                }
            }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun togglePrivacyMode() {
        val next = !_uiState.value.isPrivacyMode
        sessionManager.setPrivacyMode(next)
        _uiState.update { it.copy(isPrivacyMode = next) }
    }

    fun createBudget(
        categoryId: String,
        amount: Double,
        currency: String,
        start: String,
        end: String,
        onSuccess: () -> Unit
    ) {
        if (amount <= 0) {
            _uiState.update { it.copy(errorMessage = "Budget amount must be positive.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.createBudget(categoryId, amount, currency, start, end)) {
                is VeltisResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, successMessage = "Budget created successfully!") }
                    when (val bRes = repository.getBudgets()) {
                        is VeltisResult.Success -> _uiState.update { it.copy(budgets = bRes.data) }
                        is VeltisResult.Failure -> {}
                    }
                    onSuccess()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun deleteBudget(id: String) {
        viewModelScope.launch {
            when (val res = repository.deleteBudget(id)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            budgets = it.budgets.filter { b -> b.id != id },
                            successMessage = "Budget removed."
                        )
                    }
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun exportData(format: String, onDone: (String) -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            when (val res = repository.exportData(format)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Export generated successfully (${format.uppercase()})!",
                            exportedData = res.data
                        )
                    }
                    onDone(res.data)
                }
                is VeltisResult.Failure -> {
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage())
                    }
                }
            }
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            authRepository.signOut()
            sessionManager.clearSession()
            onLoggedOut()
        }
    }

    fun deleteAccount(onDeleted: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.deleteUserAccount()) {
                is VeltisResult.Success -> {
                    authRepository.signOut()
                    sessionManager.clearSession()
                    onDeleted()
                }
                is VeltisResult.Failure -> {
                    _uiState.update { it.copy(isSubmitting = false, errorMessage = res.error.userFriendlyMessage()) }
                }
            }
        }
    }

    fun clearMessages() = _uiState.update { it.copy(errorMessage = null, successMessage = null) }
}
