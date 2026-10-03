package com.veltis.android.data.model

import kotlinx.serialization.Serializable

@Serializable
data class BudgetDto(
    val id: String,
    val categoryId: String,
    val categoryName: String? = null,
    val amountMinor: Double = 0.0,
    val spentMinor: Double = 0.0,
    val remainingMinor: Double = 0.0,
    val currency: String = "USD",
    val periodStartDate: String,
    val periodEndDate: String
)

@Serializable
data class BudgetsResponseDto(
    val budgets: List<BudgetDto> = emptyList()
)

@Serializable
data class CreateBudgetRequestDto(
    val categoryId: String,
    val amount: Double,
    val currency: String = "USD",
    val periodStartDate: String,
    val periodEndDate: String
)

@Serializable
data class InvestmentPositionDto(
    val id: String,
    val symbol: String = "",
    val name: String? = null,
    val financialAccountId: String? = null,
    val assetType: String = "equity",
    val units: Double = 0.0,
    val averageBuyPrice: Double = 0.0,
    val currentPrice: Double = 0.0,
    val currentValuation: Double = 0.0,
    val totalInvested: Double = 0.0,
    val unrealizedGainLoss: Double = 0.0,
    val unrealizedGainLossPercent: Double = 0.0,
    val currency: String = "USD",
    val isEstimated: Boolean = false
)

@Serializable
data class InvestmentTransactionDto(
    val id: String,
    val transactionId: String? = null,
    val positionId: String = "",
    val positionName: String = "Investment Asset",
    val positionSymbol: String = "",
    val transactionType: String = "buy", // 'buy' | 'sell'
    val units: Double = 0.0,
    val price: Double = 0.0,
    val amount: Double = 0.0,
    val amountMinor: String? = null,
    val currency: String = "USD",
    val transactionDate: String = "",
    val description: String? = null
)

@Serializable
data class InvestmentsResponseDto(
    val positions: List<InvestmentPositionDto> = emptyList(),
    val accounts: List<AccountDetailDto> = emptyList(),
    val history: List<InvestmentTransactionDto> = emptyList(),
    val totalInvested: Double = 0.0,
    val currentValuation: Double = 0.0,
    val totalGainLoss: Double = 0.0,
    val totalGainLossPercent: Double = 0.0
)

@Serializable
data class InvestmentActionRequestDto(
    val action: String? = null, // 'buy', 'sell', 'contribution', 'withdrawal', 'topup', 'top_up'
    val type: String? = null,
    val positionId: String? = null,
    val accountId: String? = null,
    val investmentAccountId: String? = null,
    val sourceAccountId: String? = null,
    val destinationAccountId: String? = null,
    val units: Double? = null,
    val price: Double? = null,
    val priceMinor: Long? = null,
    val amount: Double? = null,
    val amountMinor: Long? = null,
    val currency: String? = null,
    val symbol: String? = null,
    val name: String? = null,
    val transactionDate: String? = null,
    val notes: String? = null
)

@Serializable
data class EditAccountPatchRequestDto(
    val name: String? = null,
    val color: String? = null,
    val institutionName: String? = null,
    val accountType: String? = null,
    val symbol: String? = null,
    val units: Double? = null,
    val currentPrice: Double? = null,
    val investedAmount: Double? = null
)

@Serializable
data class EditTransactionPatchRequestDto(
    val description: String? = null,
    val merchantName: String? = null,
    val categoryId: String? = null,
    val date: String? = null,
    val amount: Double? = null,
    val accountId: String? = null
)

@Serializable
data class AllocationDto(
    val id: String,
    val financialAccountId: String? = null,
    val name: String,
    val description: String? = null,
    val amountMinor: String = "0",
    val color: String? = null
) {
    val amount: Double get() = (amountMinor.toDoubleOrNull() ?: 0.0) / 100.0
}

@Serializable
data class AllocationsResponseDto(
    val allocations: List<AllocationDto> = emptyList(),
    val totalAllocatedMinor: String = "0"
) {
    val totalAllocated: Double get() = (totalAllocatedMinor.toDoubleOrNull() ?: 0.0) / 100.0
}

@Serializable
data class CreateAllocationRequestDto(
    val name: String,
    val amount: Double,
    val description: String? = null,
    val color: String? = null
)

@Serializable
data class UpdateAllocationRequestDto(
    val allocationId: String,
    val name: String? = null,
    val amount: Double? = null,
    val description: String? = null,
    val color: String? = null
)

@Serializable
data class SyncPricesResponseDto(
    val success: Boolean = true,
    val syncedCount: Int? = null,
    val failedCount: Int? = null,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class ReceivableDto(
    val id: String,
    val counterpartyName: String = "",
    val amountMinor: Double = 0.0,
    val settledAmountMinor: Double = 0.0,
    val outstandingAmountMinor: Double = 0.0,
    val currency: String = "USD",
    val createdDate: String? = null,
    val expectedDate: String? = null,
    val dueDate: String? = null,
    val status: String = "open",
    val note: String? = null,
    val notes: String? = null
) {
    val amount: Double get() = amountMinor / 100.0
    val displayAmount: Double get() = if (outstandingAmountMinor > 0.0) outstandingAmountMinor / 100.0 else amount
}

@Serializable
data class CreateReceivableRequestDto(
    val workspaceId: String? = null,
    val counterpartyName: String,
    val amountMinor: Long,
    val currency: String = "USD",
    val createdDate: String? = null,
    val expectedDate: String? = null,
    val sourceAccountId: String? = null,
    val note: String? = null
)

@Serializable
data class SettleReceivableRequestDto(
    val workspaceId: String? = null,
    val accountId: String,
    val amountMinor: Long,
    val settledAt: String? = null
)

@Serializable
data class LiabilityDto(
    val id: String,
    val counterpartyName: String? = null,
    val lenderName: String? = null,
    val liabilityType: String = "person",
    val amountMinor: Double = 0.0,
    val totalAmountMinor: Double = 0.0,
    val remainingAmountMinor: Double = 0.0,
    val currency: String = "USD",
    val createdDate: String? = null,
    val dueDate: String? = null,
    val status: String = "open",
    val note: String? = null
) {
    val displayName: String get() = counterpartyName?.takeIf { it.isNotBlank() } ?: lenderName ?: "Liability"
    val amount: Double get() = (if (amountMinor > 0.0) amountMinor else if (remainingAmountMinor > 0.0) remainingAmountMinor else totalAmountMinor) / 100.0
    val displayAmount: Double get() = amount
}

@Serializable
data class CreateLiabilityRequestDto(
    val workspaceId: String? = null,
    val counterpartyName: String,
    val liabilityType: String = "person",
    val amountMinor: Long,
    val currency: String = "USD",
    val createdDate: String? = null,
    val dueDate: String? = null,
    val destAccountId: String? = null,
    val note: String? = null
)

@Serializable
data class PayLiabilityRequestDto(
    val workspaceId: String? = null,
    val accountId: String,
    val amountMinor: Long,
    val paidAt: String? = null
)

@Serializable
data class RecurringOccurrenceDto(
    val id: String,
    val expectedDate: String,
    val status: String,
    val actualDate: String? = null,
    val actualAmountMinor: Double? = null
)

@Serializable
data class RecurringItemDto(
    val id: String,
    val name: String,
    val type: String = "expense", // 'expense', 'income', 'transfer', 'investment' (or 'sip')
    val expectedAmountMinor: Double = 0.0,
    val amountMinor: Double = 0.0,
    val currency: String = "USD",
    val frequency: String = "monthly",
    val cadence: String = "monthly",
    val customDay: Int? = 1,
    val defaultAccountId: String? = null,
    val destinationAccountId: String? = null,
    val categoryId: String? = null,
    val status: String = "active",
    val pendingOccurrences: List<RecurringOccurrenceDto> = emptyList()
) {
    // Convenience helper to get effective amount
    val displayAmountMinor: Double get() = if (expectedAmountMinor > 0.0) expectedAmountMinor else amountMinor
}

@Serializable
data class CreateRecurringRequestDto(
    val type: String,
    val name: String,
    val expectedAmountMinor: Long,
    val currency: String,
    val customDay: Int = 1,
    val frequency: String = "monthly",
    val dayRule: String = "custom_day",
    val categoryId: String? = null,
    val defaultAccountId: String? = null,
    val destinationAccountId: String? = null
)

@Serializable
data class ConfirmOccurrenceRequestDto(
    val accountId: String,
    val actualDateStr: String? = null,
    val actualAmountMinor: Long? = null,
    val destinationAccountId: String? = null
)

@Serializable
data class CategoryDto(
    val id: String,
    val name: String,
    val categoryType: String = "expense",
    val color: String? = null,
    val iconKey: String? = null
)

@Serializable
data class TaxonomyResponseDto(
    val categories: List<CategoryDto> = emptyList()
)

@Serializable
data class AnalyticsOverviewDto(
    val totalSpending: String = "0",
    val totalIncome: String = "0",
    val netDifference: String = "0"
)

@Serializable
data class CategorySpendingDto(
    val categoryId: String? = null,
    val categoryName: String = "Uncategorized",
    val color: String? = null,
    val totalAmountMinor: String = "0",
    val count: Int = 0
)

@Serializable
data class WealthTrendPointDto(
    val date: String = "",
    val income: String = "0",
    val expense: String = "0",
    val net: String = "0"
)

@Serializable
data class AppVersionDto(
    val versionCode: Int = 1,
    val versionName: String = "0.1.0",
    val apkUrl: String = "",
    val changelog: String = ""
)

@Serializable
data class UpdateWorkspaceRequestDto(
    val name: String? = null,
    val baseCurrency: String? = null
)

@Serializable
data class CreateCategoryRequestDto(
    val entity: String = "category",
    val name: String,
    val categoryType: String = "expense",
    val iconKey: String? = null
)

@Serializable
data class ChangePasswordRequestDto(
    val currentPassword: String,
    val newPassword: String,
    val revokeOtherSessions: Boolean = true
)



