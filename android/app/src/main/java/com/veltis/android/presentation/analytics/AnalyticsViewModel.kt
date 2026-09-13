package com.veltis.android.presentation.analytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.veltis.android.data.model.AnalyticsOverviewDto
import com.veltis.android.data.model.CategorySpendingDto
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

enum class AnalyticsTimeRange(val label: String) {
    THIS_MONTH("This Month"),
    LAST_MONTH("Last Month"),
    YTD("YTD"),
    ALL_TIME("All Time")
}

data class AnalyticsUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val timeRange: AnalyticsTimeRange = AnalyticsTimeRange.THIS_MONTH,
    val selectedTab: String = "overview", // "overview", "investments", "budgets"
    val overview: AnalyticsOverviewDto = AnalyticsOverviewDto(),
    val spendingCategories: List<CategorySpendingDto> = emptyList(),
    val budgets: List<com.veltis.android.data.model.BudgetDto> = emptyList(),
    val investments: com.veltis.android.data.model.InvestmentsResponseDto? = null,
    val baseCurrency: String = "USD",
    val errorMessage: String? = null
)

class AnalyticsViewModel(
    private val repository: VeltisAppRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        AnalyticsUiState(baseCurrency = sessionManager.getBaseCurrency())
    )
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    init {
        loadAnalytics()
    }

    fun setTab(tab: String) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun setTimeRange(range: AnalyticsTimeRange) {
        _uiState.update { it.copy(timeRange = range) }
        loadAnalytics()
    }

    fun loadAnalytics(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = !forceRefresh, isRefreshing = forceRefresh) }

            val (start, end) = computeDateRange(_uiState.value.timeRange)
            launch {
                when (val result = repository.getAnalytics(start, end)) {
                    is VeltisResult.Success -> {
                        _uiState.update {
                            it.copy(
                                overview = result.data.first,
                                spendingCategories = result.data.second,
                                baseCurrency = sessionManager.getBaseCurrency()
                            )
                        }
                    }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val result = repository.getBudgets()) {
                    is VeltisResult.Success -> {
                        _uiState.update { it.copy(budgets = result.data) }
                    }
                    is VeltisResult.Failure -> {}
                }
            }
            launch {
                when (val result = repository.getInvestments()) {
                    is VeltisResult.Success -> {
                        _uiState.update { it.copy(investments = result.data) }
                    }
                    is VeltisResult.Failure -> {}
                }
            }
            _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
        }
    }

    private fun computeDateRange(range: AnalyticsTimeRange): Pair<String, String> {
        val cal = Calendar.getInstance()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        val endDate = isoFormat.format(cal.time)

        val startDate = when (range) {
            AnalyticsTimeRange.THIS_MONTH -> {
                cal.set(Calendar.DAY_OF_MONTH, 1)
                cal.set(Calendar.HOUR_OF_DAY, 0)
                cal.set(Calendar.MINUTE, 0)
                cal.set(Calendar.SECOND, 0)
                cal.set(Calendar.MILLISECOND, 0)
                isoFormat.format(cal.time)
            }
            AnalyticsTimeRange.LAST_MONTH -> {
                cal.add(Calendar.MONTH, -1)
                cal.set(Calendar.DAY_OF_MONTH, 1)
                cal.set(Calendar.HOUR_OF_DAY, 0)
                cal.set(Calendar.MINUTE, 0)
                cal.set(Calendar.SECOND, 0)
                isoFormat.format(cal.time)
            }
            AnalyticsTimeRange.YTD -> {
                cal.set(Calendar.DAY_OF_YEAR, 1)
                cal.set(Calendar.HOUR_OF_DAY, 0)
                cal.set(Calendar.MINUTE, 0)
                cal.set(Calendar.SECOND, 0)
                isoFormat.format(cal.time)
            }
            AnalyticsTimeRange.ALL_TIME -> {
                "2000-01-01T00:00:00.000Z"
            }
        }

        return Pair(startDate, endDate)
    }
}
