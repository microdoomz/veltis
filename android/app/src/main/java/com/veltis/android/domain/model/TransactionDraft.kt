package com.veltis.android.domain.model

data class TransactionDraft(
    val type: TransactionType,
    val amount: Double,
    val description: String,
    val accountId: String,
    val currency: String? = null,
    val categoryId: String? = null,
    val idempotencyKey: String? = null
) {
    fun isValid(): Boolean = amount > 0.0 && accountId.isNotBlank()
}
