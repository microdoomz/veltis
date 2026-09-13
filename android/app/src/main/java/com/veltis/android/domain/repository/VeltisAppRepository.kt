package com.veltis.android.domain.repository

import com.veltis.android.data.model.*
import com.veltis.android.domain.model.VeltisResult

interface VeltisAppRepository {
    suspend fun getHomeDashboard(forceRefresh: Boolean = false): VeltisResult<HomeDashboardDto>
    suspend fun getAccounts(forceRefresh: Boolean = false): VeltisResult<List<AccountDetailDto>>
    suspend fun createAccount(name: String, type: String, currency: String, balance: Double): VeltisResult<AccountDetailDto>
    suspend fun deleteAccount(id: String): VeltisResult<Unit>
    suspend fun reconcileAccount(id: String, actualBalance: Double): VeltisResult<Unit>
    suspend fun getTransactions(type: String? = null, categoryId: String? = null, accountId: String? = null, sort: String? = null): VeltisResult<List<TransactionSummaryDto>>
    suspend fun createTransaction(type: String, amount: Double, accountId: String, destAccountId: String? = null, description: String? = null, categoryId: String? = null, date: String? = null): VeltisResult<TransactionSummaryDto>
    suspend fun deleteTransaction(id: String): VeltisResult<Unit>
    suspend fun syncOfflineQueue(): VeltisResult<Int>
    suspend fun getInvestments(): VeltisResult<InvestmentsResponseDto>
    suspend fun executeInvestmentAction(action: InvestmentActionRequestDto): VeltisResult<Unit>
    suspend fun getBudgets(): VeltisResult<List<BudgetDto>>
    suspend fun createBudget(categoryId: String, amount: Double, currency: String, start: String, end: String): VeltisResult<Unit>
    suspend fun deleteBudget(id: String): VeltisResult<Unit>
    suspend fun getReceivables(): VeltisResult<List<ReceivableDto>>
    suspend fun getLiabilities(): VeltisResult<List<LiabilityDto>>
    suspend fun getRecurringItems(): VeltisResult<List<RecurringItemDto>>
    suspend fun getCategories(): VeltisResult<List<CategoryDto>>
    suspend fun getAnalytics(startDate: String, endDate: String): VeltisResult<Pair<AnalyticsOverviewDto, List<CategorySpendingDto>>>
    suspend fun exportData(format: String): VeltisResult<String>
    suspend fun deleteUserAccount(): VeltisResult<Unit>
}
