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
    suspend fun createReceivable(
        counterpartyName: String,
        amount: Double,
        currency: String = "USD",
        createdDate: String? = null,
        expectedDate: String? = null,
        sourceAccountId: String? = null,
        note: String? = null
    ): VeltisResult<Unit>
    suspend fun settleReceivable(
        id: String,
        accountId: String,
        amount: Double,
        settledAt: String? = null
    ): VeltisResult<Unit>
    suspend fun getLiabilities(): VeltisResult<List<LiabilityDto>>
    suspend fun createLiability(
        counterpartyName: String,
        liabilityType: String = "person",
        amount: Double,
        currency: String = "USD",
        createdDate: String? = null,
        dueDate: String? = null,
        destAccountId: String? = null,
        note: String? = null
    ): VeltisResult<Unit>
    suspend fun payLiability(
        id: String,
        accountId: String,
        amount: Double,
        paidAt: String? = null
    ): VeltisResult<Unit>
    suspend fun getRecurringItems(): VeltisResult<List<RecurringItemDto>>
    suspend fun createRecurringItem(
        type: String,
        name: String,
        amount: Double,
        currency: String,
        customDay: Int,
        categoryId: String? = null,
        defaultAccountId: String? = null,
        destinationAccountId: String? = null
    ): VeltisResult<Unit>
    suspend fun deleteRecurringItem(id: String): VeltisResult<Unit>
    suspend fun confirmRecurringOccurrence(
        occurrenceId: String,
        accountId: String,
        actualDateStr: String? = null,
        actualAmount: Double? = null,
        destinationAccountId: String? = null
    ): VeltisResult<Unit>
    suspend fun skipRecurringOccurrence(occurrenceId: String): VeltisResult<Unit>
    suspend fun syncInvestmentPrices(): VeltisResult<SyncPricesResponseDto>
    suspend fun deleteInvestmentTransaction(id: String, transactionId: String? = null): VeltisResult<Unit>
    suspend fun updateInvestmentPosition(
        financialAccountId: String,
        name: String? = null,
        symbol: String? = null,
        units: Double? = null,
        currentPrice: Double? = null,
        investedAmount: Double? = null
    ): VeltisResult<Unit>
    suspend fun getCategories(): VeltisResult<List<CategoryDto>>
    suspend fun createCategory(name: String, type: String = "expense", iconKey: String? = null): VeltisResult<CategoryDto>
    suspend fun deleteCategory(id: String): VeltisResult<Unit>
    suspend fun updateWorkspaceProfile(name: String? = null, baseCurrency: String? = null): VeltisResult<Unit>
    suspend fun changePassword(currentPassword: String, newPassword: String): VeltisResult<Unit>
    suspend fun getAnalytics(startDate: String, endDate: String): VeltisResult<Pair<AnalyticsOverviewDto, List<CategorySpendingDto>>>
    suspend fun getIncomeAnalytics(startDate: String, endDate: String): VeltisResult<List<CategorySpendingDto>>
    suspend fun getWealthTrend(startDate: String, endDate: String): VeltisResult<List<com.veltis.android.data.model.WealthTrendPointDto>>
    suspend fun getAccountAllocations(accountId: String): VeltisResult<AllocationsResponseDto>
    suspend fun createAccountAllocation(accountId: String, name: String, amount: Double, description: String? = null, color: String? = null): VeltisResult<Unit>
    suspend fun updateAccountAllocation(accountId: String, allocationId: String, name: String? = null, amount: Double? = null, description: String? = null, color: String? = null): VeltisResult<Unit>
    suspend fun deleteAccountAllocation(accountId: String, allocationId: String): VeltisResult<Unit>
    suspend fun updateAccount(accountId: String, name: String? = null, color: String? = null, institutionName: String? = null, accountType: String? = null): VeltisResult<Unit>
    suspend fun updateTransaction(transactionId: String, description: String? = null, merchantName: String? = null, categoryId: String? = null, date: String? = null, amount: Double? = null, accountId: String? = null): VeltisResult<Unit>
    suspend fun exportData(format: String): VeltisResult<String>
    suspend fun deleteUserAccount(): VeltisResult<Unit>
}
