package com.veltis.android.domain.repository

import com.veltis.android.domain.model.Account
import com.veltis.android.domain.model.TransactionDraft
import com.veltis.android.domain.model.TransactionResult
import com.veltis.android.domain.model.VeltisResult

interface VeltisRepository {
    suspend fun getAccounts(forceRefresh: Boolean = false): VeltisResult<List<Account>>
    suspend fun recordExpense(draft: TransactionDraft): VeltisResult<TransactionResult>
    suspend fun recordIncome(draft: TransactionDraft): VeltisResult<TransactionResult>
    suspend fun testConnection(): VeltisResult<List<Account>>
    fun isTokenConfigured(): Boolean
}
