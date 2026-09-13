package com.veltis.android.presentation.investments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.model.InvestmentActionRequestDto
import com.veltis.android.data.model.InvestmentPositionDto
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
    val data: InvestmentsResponseDto? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val isPrivacyMode: Boolean = false
)

class InvestmentsViewModel(
    private val repository: VeltisAppRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        InvestmentsUiState(isPrivacyMode = sessionManager.getPrivacyMode())
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
                    errorMessage = null
                ) 
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
                positionId = positionId,
                symbol = symbol,
                units = units,
                price = price,
                amount = units * price
            )
            when (val res = repository.executeInvestmentAction(req)) {
                is VeltisResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Order executed successfully!"
                        )
                    }
                    loadInvestments()
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

    fun clearMessages() = _uiState.update { it.copy(errorMessage = null, successMessage = null) }
}
