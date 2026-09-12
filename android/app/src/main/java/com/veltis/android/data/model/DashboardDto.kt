package com.veltis.android.data.model

import kotlinx.serialization.Serializable

@Serializable
data class HomeDashboardDto(
    val workspace: WorkspaceInfoDto? = null,
    val netWealth: Double = 0.0,
    val liquidSummary: LiquidSummaryDto = LiquidSummaryDto(),
    val accounts: List<AccountDetailDto> = emptyList(),
    val recentTransactions: List<TransactionSummaryDto> = emptyList()
) {
    val netWorth: Double get() = netWealth / 100.0
    val totalAssets: Double get() = liquidSummary.totalLiquid / 100.0
    val totalLiabilities: Double get() = 0.0
    val baseCurrency: String get() = workspace?.baseCurrency ?: "USD"
    val liquidFreeToSpend: Double get() = liquidSummary.freeToSpend / 100.0
    val liquidBank: Double get() = liquidSummary.freeToSpendOnline / 100.0
    val liquidCash: Double get() = liquidSummary.freeToSpendCash / 100.0
}

@Serializable
data class WorkspaceInfoDto(
    val id: String,
    val name: String,
    val baseCurrency: String = "USD",
    val accountTypeOrder: List<String> = emptyList()
)

@Serializable
data class LiquidSummaryDto(
    val totalLiquid: Double = 0.0,
    val freeToSpend: Double = 0.0,
    val freeToSpendOnline: Double = 0.0,
    val freeToSpendCash: Double = 0.0,
    val totalAllocated: Double = 0.0
)

@Serializable
data class AccountDetailDto(
    val id: String,
    val name: String,
    val accountType: String,
    val currency: String = "USD",
    val institutionName: String? = null,
    val balanceMinor: Double = 0.0,
    val color: String? = null,
    val iconKey: String? = null,
    val displayOrder: Int = 0
) {
    val balance: Double get() = balanceMinor / 100.0
}

@Serializable
data class TransactionSummaryDto(
    val id: String,
    val transactionType: String = "expense",
    val amountMinor: Double = 0.0,
    val currency: String = "USD",
    val transactionDate: String = "",
    val description: String? = null,
    val merchantName: String? = null,
    val categoryId: String? = null,
    val categoryName: String? = null,
    val categoryColor: String? = null,
    val accountId: String? = null,
    val accountName: String? = null,
    val source: String? = "manual"
) {
    val type: String get() = transactionType
    val amount: Double get() = amountMinor / 100.0
}
