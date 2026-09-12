package com.veltis.android.data.repository

import com.veltis.android.data.api.NetworkClient
import com.veltis.android.data.model.AccountDto
import com.veltis.android.data.model.AccountsResponseDto
import com.veltis.android.data.model.ApiErrorDto
import com.veltis.android.data.model.TransactionRequestDto
import com.veltis.android.data.storage.TokenManager
import com.veltis.android.domain.model.Account
import com.veltis.android.domain.model.TransactionDraft
import com.veltis.android.domain.model.TransactionResult
import com.veltis.android.domain.model.TransactionType
import com.veltis.android.domain.model.VeltisError
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response
import java.io.IOException
import java.util.UUID

class VeltisRepositoryImpl(
    private val networkClient: NetworkClient,
    private val tokenManager: TokenManager
) : VeltisRepository {

    override fun isTokenConfigured(): Boolean = tokenManager.isTokenConfigured()

    override suspend fun getAccounts(forceRefresh: Boolean): VeltisResult<List<Account>> = withContext(Dispatchers.IO) {
        if (!tokenManager.isTokenConfigured()) {
            return@withContext VeltisResult.Failure(VeltisError.NotConfigured())
        }

        // Return cached accounts if available and not forcing refresh
        if (!forceRefresh) {
            val cachedJson = tokenManager.getCachedAccountsJson()
            if (!cachedJson.isNullOrBlank()) {
                try {
                    val cachedDto = networkClient.json.decodeFromString<AccountsResponseDto>(cachedJson)
                    if (cachedDto.accounts.isNotEmpty()) {
                        return@withContext VeltisResult.Success(cachedDto.accounts.map { it.toDomain() })
                    }
                } catch (_: Exception) {
                    // Cache decoding failed; proceed to network fetch
                }
            }
        }

        try {
            val api = networkClient.createApiService()
            val response = api.getAccounts()

            if (response.isSuccessful) {
                val body = response.body() ?: AccountsResponseDto()
                val domainAccounts = body.accounts.map { it.toDomain() }

                // Cache for fast widget/companion app lookup
                try {
                    tokenManager.saveCachedAccountsJson(networkClient.json.encodeToString(AccountsResponseDto.serializer(), body))
                } catch (_: Exception) { }

                VeltisResult.Success(domainAccounts)
            } else {
                VeltisResult.Failure(parseHttpError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "An unexpected error occurred."))
        }
    }

    override suspend fun recordExpense(draft: TransactionDraft): VeltisResult<TransactionResult> = withContext(Dispatchers.IO) {
        submitTransaction(draft, TransactionType.EXPENSE)
    }

    override suspend fun recordIncome(draft: TransactionDraft): VeltisResult<TransactionResult> = withContext(Dispatchers.IO) {
        submitTransaction(draft, TransactionType.INCOME)
    }

    override suspend fun testConnection(): VeltisResult<List<Account>> {
        return getAccounts(forceRefresh = true)
    }

    private suspend fun submitTransaction(
        draft: TransactionDraft,
        type: TransactionType
    ): VeltisResult<TransactionResult> = withContext(Dispatchers.IO) {
        if (!tokenManager.isTokenConfigured()) {
            return@withContext VeltisResult.Failure(VeltisError.NotConfigured())
        }

        if (draft.amount <= 0) {
            return@withContext VeltisResult.Failure(VeltisError.Validation("Amount must be greater than zero."))
        }

        if (draft.accountId.isBlank()) {
            return@withContext VeltisResult.Failure(VeltisError.Validation("Please select an account."))
        }

        val idempotencyKey = draft.idempotencyKey ?: generateIdempotencyKey(type)

        val requestDto = TransactionRequestDto(
            amount = draft.amount,
            accountId = draft.accountId,
            description = draft.description.ifBlank { null },
            categoryId = draft.categoryId,
            currency = draft.currency,
            idempotencyKey = idempotencyKey
        )

        try {
            val api = networkClient.createApiService()
            val response = if (type == TransactionType.EXPENSE) {
                api.recordExpense(requestDto)
            } else {
                api.recordIncome(requestDto)
            }

            if (response.isSuccessful && response.body() != null) {
                VeltisResult.Success(response.body()!!.toDomain())
            } else {
                VeltisResult.Failure(parseHttpError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to record transaction."))
        }
    }

    private fun generateIdempotencyKey(type: TransactionType): String {
        val prefix = if (type == TransactionType.EXPENSE) "and_exp" else "and_inc"
        return "${prefix}_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(8)}"
    }

    private fun <T> parseHttpError(response: Response<T>): VeltisError {
        val code = response.code()
        val rawErrorBody = try {
            response.errorBody()?.string()
        } catch (_: Exception) {
            null
        }

        val serverMessage = if (!rawErrorBody.isNullOrBlank()) {
            try {
                networkClient.json.decodeFromString<ApiErrorDto>(rawErrorBody).error
            } catch (_: Exception) {
                null
            }
        } else null

        return when (code) {
            401 -> VeltisError.Authentication(serverMessage ?: "Authentication failed. Check your Veltis token.")
            400 -> VeltisError.Validation(serverMessage ?: "Invalid transaction. Please check your inputs.")
            404 -> VeltisError.NotFound(serverMessage ?: "Account not found in your workspace.")
            429 -> VeltisError.RateLimited(serverMessage ?: "Too many requests. Try again in a few moments.")
            500, 502, 503 -> VeltisError.Server(serverMessage ?: "Server error. Try again later.")
            else -> VeltisError.Unknown(serverMessage ?: "Request failed with HTTP status $code.")
        }
    }
}
