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
    val symbol: String,
    val name: String? = null,
    val units: Double = 0.0,
    val averageBuyPrice: Double = 0.0,
    val currentPrice: Double = 0.0,
    val currentValuation: Double = 0.0,
    val totalInvested: Double = 0.0,
    val unrealizedGainLoss: Double = 0.0,
    val unrealizedGainLossPercent: Double = 0.0,
    val currency: String = "USD"
)

@Serializable
data class InvestmentsResponseDto(
    val positions: List<InvestmentPositionDto> = emptyList(),
    val totalInvested: Double = 0.0,
    val currentValuation: Double = 0.0,
    val totalGainLoss: Double = 0.0
)

@Serializable
data class InvestmentActionRequestDto(
    val action: String, // 'buy', 'sell', 'contribution', 'withdrawal', 'top_up'
    val positionId: String? = null,
    val accountId: String? = null,
    val units: Double? = null,
    val price: Double? = null,
    val amount: Double? = null,
    val symbol: String? = null,
    val notes: String? = null
)

@Serializable
data class ReceivableDto(
    val id: String,
    val counterpartyName: String,
    val amountMinor: Double = 0.0,
    val settledAmountMinor: Double = 0.0,
    val outstandingAmountMinor: Double = 0.0,
    val currency: String = "USD",
    val dueDate: String? = null,
    val status: String = "open",
    val notes: String? = null
)

@Serializable
data class LiabilityDto(
    val id: String,
    val lenderName: String,
    val liabilityType: String = "loan",
    val totalAmountMinor: Double = 0.0,
    val remainingAmountMinor: Double = 0.0,
    val currency: String = "USD",
    val dueDate: String? = null,
    val status: String = "active"
)

@Serializable
data class RecurringItemDto(
    val id: String,
    val name: String,
    val type: String, // 'expense', 'income', 'sip'
    val amountMinor: Double = 0.0,
    val currency: String = "USD",
    val cadence: String = "monthly",
    val nextOccurrence: String? = null,
    val status: String = "active"
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
data class AppVersionDto(
    val versionCode: Int = 1,
    val versionName: String = "0.1.0",
    val apkUrl: String = "",
    val changelog: String = ""
)


