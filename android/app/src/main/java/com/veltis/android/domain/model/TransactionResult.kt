package com.veltis.android.domain.model

data class TransactionResult(
    val transactionId: String,
    val amount: Double,
    val currency: String,
    val description: String,
    val date: String,
    val accountId: String? = null
)
