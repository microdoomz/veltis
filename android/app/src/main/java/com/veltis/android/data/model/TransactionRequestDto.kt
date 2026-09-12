package com.veltis.android.data.model

import kotlinx.serialization.Serializable

@Serializable
data class TransactionRequestDto(
    val amount: Double,
    val accountId: String,
    val description: String? = null,
    val categoryId: String? = null,
    val currency: String? = null,
    val date: String? = null,
    val idempotencyKey: String? = null
)
