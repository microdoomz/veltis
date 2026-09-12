package com.veltis.android.data.model

import com.veltis.android.domain.model.TransactionResult
import kotlinx.serialization.Serializable

@Serializable
data class TransactionResponseDto(
    val success: Boolean,
    val transactionId: String,
    val amount: Double,
    val currency: String,
    val description: String,
    val date: String,
    val accountId: String? = null
) {
    fun toDomain(): TransactionResult = TransactionResult(
        transactionId = transactionId,
        amount = amount,
        currency = currency,
        description = description,
        date = date,
        accountId = accountId
    )
}
