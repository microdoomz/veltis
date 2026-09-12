package com.veltis.android.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class TransactionsResponseDto(
    val transactions: List<TransactionSummaryDto> = emptyList()
)

@Serializable
data class CreateTransactionRequestDto(
    val workspaceId: String? = null,
    val type: String, // 'expense', 'income', 'transfer'
    val amount: Double,
    val accountId: String? = null,
    val sourceAccountId: String? = null,
    val destAccountId: String? = null,
    val description: String? = null,
    val merchantName: String? = null,
    val categoryId: String? = null,
    val date: String? = null,
    val currency: String? = null,
    val idempotencyKey: String? = null
)

@Serializable
data class CreateTransactionResponseDto(
    val success: Boolean = false,
    val transaction: TransactionSummaryDto? = null
)

@Serializable
data class BatchSyncRequestDto(
    val transactions: List<SyncItemDto>
)

@Serializable
data class SyncItemDto(
    val id: String,
    val type: String, // 'expense', 'income', 'transfer'
    val payload: JsonObject
)

@Serializable
data class BatchSyncResponseDto(
    val results: List<SyncResultItemDto> = emptyList()
)

@Serializable
data class SyncResultItemDto(
    val id: String,
    val status: String, // 'success', 'permanent_error'
    val error: String? = null
)
