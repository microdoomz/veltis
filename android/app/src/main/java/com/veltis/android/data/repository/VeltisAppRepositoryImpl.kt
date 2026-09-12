package com.veltis.android.data.repository

import com.veltis.android.data.api.NetworkClient
import com.veltis.android.data.api.VeltisFullApiService
import com.veltis.android.data.model.*
import com.veltis.android.data.storage.OfflineTransactionEntity
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.data.storage.VeltisDatabaseHelper
import com.veltis.android.domain.model.VeltisError
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.VeltisAppRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.*
import retrofit2.Response
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class VeltisAppRepositoryImpl(
    private val networkClient: NetworkClient,
    private val sessionManager: SessionManager,
    private val dbHelper: VeltisDatabaseHelper
) : VeltisAppRepository {

    private val api: VeltisFullApiService by lazy {
        networkClient.createService(VeltisFullApiService::class.java)
    }

    override suspend fun getHomeDashboard(forceRefresh: Boolean): VeltisResult<HomeDashboardDto> = withContext(Dispatchers.IO) {
        if (!forceRefresh) {
            val cached = dbHelper.getCache("home_dashboard")
            if (!cached.isNullOrBlank()) {
                try {
                    val dto = networkClient.json.decodeFromString<HomeDashboardDto>(cached)
                    return@withContext VeltisResult.Success(dto)
                } catch (_: Exception) {}
            }
        }

        try {
            val response = api.getHomeDashboard()
            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                data.workspace?.let {
                    sessionManager.saveWorkspaceId(it.id)
                    sessionManager.saveBaseCurrency(it.baseCurrency)
                }
                try {
                    dbHelper.saveCache("home_dashboard", networkClient.json.encodeToString(HomeDashboardDto.serializer(), data))
                } catch (_: Exception) {}
                VeltisResult.Success(data)
            } else {
                VeltisResult.Failure(parseError(response))
            }
        } catch (e: IOException) {
            // Fallback to cache
            val cached = dbHelper.getCache("home_dashboard")
            if (!cached.isNullOrBlank()) {
                try {
                    val dto = networkClient.json.decodeFromString<HomeDashboardDto>(cached)
                    return@withContext VeltisResult.Success(dto)
                } catch (_: Exception) {}
            }
            VeltisResult.Failure(VeltisError.Network("Offline. Showing cached data if available."))
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load dashboard."))
        }
    }

    override suspend fun getAccounts(forceRefresh: Boolean): VeltisResult<List<AccountDetailDto>> = withContext(Dispatchers.IO) {
        if (!forceRefresh) {
            val cached = dbHelper.getCache("accounts_list")
            if (!cached.isNullOrBlank()) {
                try {
                    val list = networkClient.json.decodeFromString(ListSerializer(AccountDetailDto.serializer()), cached)
                    return@withContext VeltisResult.Success(list)
                } catch (_: Exception) {}
            }
        }

        try {
            val response = api.getAccounts()
            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                try {
                    dbHelper.saveCache("accounts_list", networkClient.json.encodeToString(ListSerializer(AccountDetailDto.serializer()), data))
                } catch (_: Exception) {}
                VeltisResult.Success(data)
            } else {
                VeltisResult.Failure(parseError(response))
            }
        } catch (e: IOException) {
            val cached = dbHelper.getCache("accounts_list")
            if (!cached.isNullOrBlank()) {
                try {
                    return@withContext VeltisResult.Success(networkClient.json.decodeFromString(ListSerializer(AccountDetailDto.serializer()), cached))
                } catch (_: Exception) {}
            }
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load accounts."))
        }
    }

    override suspend fun createAccount(
        name: String,
        type: String,
        currency: String,
        balance: Double
    ): VeltisResult<AccountDetailDto> = withContext(Dispatchers.IO) {
        try {
            val body = mapOf(
                "name" to name.trim(),
                "accountType" to type,
                "currency" to currency.uppercase(),
                "balance" to balance.toString()
            )
            val response = api.createAccount(body)
            if (response.isSuccessful && response.body() != null) {
                VeltisResult.Success(response.body()!!)
            } else {
                VeltisResult.Failure(parseError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to create account."))
        }
    }

    override suspend fun deleteAccount(id: String): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteAccount(id)
            if (response.isSuccessful) VeltisResult.Success(Unit) else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to delete account."))
        }
    }

    override suspend fun reconcileAccount(id: String, actualBalance: Double): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val body = mapOf("actualBalance" to actualBalance.toString())
            val response = api.reconcileAccount(id, body)
            if (response.isSuccessful) VeltisResult.Success(Unit) else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to reconcile account."))
        }
    }

    override suspend fun getTransactions(
        type: String?,
        categoryId: String?,
        accountId: String?,
        sort: String?
    ): VeltisResult<List<TransactionSummaryDto>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getTransactions(type = type, categoryId = categoryId, accountId = accountId, sort = sort)
            if (response.isSuccessful && response.body() != null) {
                VeltisResult.Success(response.body()!!.transactions)
            } else {
                VeltisResult.Failure(parseError(response))
            }
        } catch (e: IOException) {
            // Include offline pending transactions
            val offline = dbHelper.getAllOfflineTransactions().map {
                TransactionSummaryDto(
                    id = it.id,
                    transactionType = it.type,
                    amountMinor = it.amount * 100,
                    currency = it.currency ?: "USD",
                    transactionDate = it.transactionDate,
                    description = it.description ?: if (it.type == "expense") "Expense" else "Income",
                    accountId = it.accountId,
                    source = "offline_pending"
                )
            }
            VeltisResult.Success(offline)
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load transactions."))
        }
    }

    override suspend fun createTransaction(
        type: String,
        amount: Double,
        accountId: String,
        destAccountId: String?,
        description: String?,
        categoryId: String?,
        date: String?
    ): VeltisResult<TransactionSummaryDto> = withContext(Dispatchers.IO) {
        val todayStr = date ?: SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val idempotencyKey = UUID.randomUUID().toString()

        val request = CreateTransactionRequestDto(
            type = type,
            amount = amount,
            accountId = accountId,
            destAccountId = destAccountId,
            description = description?.trim()?.ifBlank { null },
            categoryId = categoryId?.trim()?.ifBlank { null },
            date = todayStr,
            idempotencyKey = idempotencyKey
        )

        try {
            val response = api.createTransaction(request)
            if (response.isSuccessful && response.body()?.transaction != null) {
                return@withContext VeltisResult.Success(response.body()!!.transaction!!)
            } else {
                return@withContext VeltisResult.Failure(parseError(response))
            }
        } catch (e: IOException) {
            // Offline queue fallback
            val offlineEntity = OfflineTransactionEntity(
                id = idempotencyKey,
                type = type,
                amount = amount,
                accountId = accountId,
                destAccountId = destAccountId,
                description = description,
                categoryId = categoryId,
                currency = sessionManager.getBaseCurrency(),
                transactionDate = todayStr,
                syncStatus = "pending"
            )
            dbHelper.insertOfflineTransaction(offlineEntity)

            val optimistic = TransactionSummaryDto(
                id = idempotencyKey,
                transactionType = type,
                amountMinor = amount * 100,
                currency = sessionManager.getBaseCurrency(),
                transactionDate = todayStr,
                description = description ?: if (type == "expense") "Quick Expense" else "Quick Income",
                accountId = accountId,
                source = "offline_pending"
            )
            return@withContext VeltisResult.Success(optimistic)
        } catch (e: Exception) {
            return@withContext VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to create transaction."))
        }
    }

    override suspend fun deleteTransaction(id: String): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteTransaction(id)
            if (response.isSuccessful) VeltisResult.Success(Unit) else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to delete transaction."))
        }
    }

    override suspend fun syncOfflineQueue(): VeltisResult<Int> = withContext(Dispatchers.IO) {
        val pending = dbHelper.getPendingTransactions()
        if (pending.isEmpty()) return@withContext VeltisResult.Success(0)

        val workspaceId = sessionManager.getWorkspaceId()
            ?: return@withContext VeltisResult.Failure(VeltisError.Unknown("No active workspace found to sync."))

        val syncItems = pending.map { item ->
            val payload = buildJsonObject {
                put("workspaceId", workspaceId)
                put("amountMajor", item.amount)
                put("accountId", item.accountId)
                item.sourceAccountId?.let { put("sourceAccountId", it) }
                item.destAccountId?.let { put("destAccountId", it) }
                item.currency?.let { put("currency", it) }
                put("transactionDate", item.transactionDate)
                item.description?.let { put("description", it) }
                item.categoryId?.let { put("categoryId", it) }
            }
            SyncItemDto(id = item.id, type = item.type, payload = payload)
        }

        try {
            val response = api.syncBatchTransactions(BatchSyncRequestDto(syncItems))
            if (response.isSuccessful && response.body() != null) {
                val results = response.body()!!.results
                var syncedCount = 0
                for (res in results) {
                    if (res.status == "success") {
                        dbHelper.updateSyncStatus(res.id, "synced")
                        syncedCount++
                    } else {
                        dbHelper.updateSyncStatus(res.id, "failed", res.error)
                    }
                }
                VeltisResult.Success(syncedCount)
            } else {
                VeltisResult.Failure(parseError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network("Offline. Will retry when connected."))
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Sync failed."))
        }
    }

    override suspend fun getInvestments(): VeltisResult<InvestmentsResponseDto> = withContext(Dispatchers.IO) {
        try {
            val response = api.getInvestments()
            if (response.isSuccessful && response.body() != null) VeltisResult.Success(response.body()!!)
            else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load investments."))
        }
    }

    override suspend fun executeInvestmentAction(action: InvestmentActionRequestDto): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.executeInvestmentAction(body = action)
            if (response.isSuccessful) VeltisResult.Success(Unit) else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Action failed."))
        }
    }

    override suspend fun getBudgets(): VeltisResult<List<BudgetDto>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getBudgets()
            if (response.isSuccessful && response.body() != null) VeltisResult.Success(response.body()!!.budgets)
            else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load budgets."))
        }
    }

    override suspend fun createBudget(
        categoryId: String,
        amount: Double,
        currency: String,
        start: String,
        end: String
    ): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val req = CreateBudgetRequestDto(
                categoryId = categoryId,
                amount = amount,
                currency = currency,
                periodStartDate = start,
                periodEndDate = end
            )
            val response = api.createBudget(req)
            if (response.isSuccessful) VeltisResult.Success(Unit) else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to create budget."))
        }
    }

    override suspend fun deleteBudget(id: String): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteBudget(id)
            if (response.isSuccessful) VeltisResult.Success(Unit) else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to delete budget."))
        }
    }

    override suspend fun getReceivables(): VeltisResult<List<ReceivableDto>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getReceivables()
            if (response.isSuccessful && response.body() != null) VeltisResult.Success(response.body()!!)
            else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load receivables."))
        }
    }

    override suspend fun getLiabilities(): VeltisResult<List<LiabilityDto>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getLiabilities()
            if (response.isSuccessful && response.body() != null) VeltisResult.Success(response.body()!!)
            else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load liabilities."))
        }
    }

    override suspend fun getRecurringItems(): VeltisResult<List<RecurringItemDto>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getRecurringItems()
            if (response.isSuccessful && response.body() != null) VeltisResult.Success(response.body()!!)
            else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load recurring items."))
        }
    }

    override suspend fun getCategories(): VeltisResult<List<CategoryDto>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getTaxonomy()
            if (response.isSuccessful && response.body() != null) VeltisResult.Success(response.body()!!.categories)
            else VeltisResult.Failure(parseError(response))
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to load categories."))
        }
    }

    override suspend fun exportData(format: String): VeltisResult<String> = withContext(Dispatchers.IO) {
        try {
            val response = api.exportData(mapOf("format" to format))
            if (response.isSuccessful && response.body() != null) {
                val content = response.body()!!.string()
                VeltisResult.Success(content)
            } else {
                VeltisResult.Failure(parseError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to export data."))
        }
    }

    override suspend fun deleteUserAccount(): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteAccountUser()
            if (response.isSuccessful) {
                sessionManager.clearSession()
                VeltisResult.Success(Unit)
            } else {
                VeltisResult.Failure(parseError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network())
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to delete account."))
        }
    }

    private fun <T> parseError(response: Response<T>): VeltisError {
        val code = response.code()
        val rawBody = try { response.errorBody()?.string() } catch (_: Exception) { null }
        val message = if (!rawBody.isNullOrBlank()) {
            try {
                val errDto = networkClient.json.decodeFromString<ApiErrorDto>(rawBody)
                errDto.error ?: errDto.message ?: errDto.hint
            } catch (_: Exception) {
                null
            }
        } else null

        return when (code) {
            400 -> VeltisError.Validation(message ?: "Validation error.")
            401 -> {
                sessionManager.clearSession()
                VeltisError.Authentication(message ?: "Session expired. Please log in again.")
            }
            403 -> VeltisError.Authentication(message ?: "Access forbidden.")
            404 -> VeltisError.NotFound(message ?: "Resource not found.")
            429 -> VeltisError.RateLimited(message ?: "Too many requests.")
            else -> VeltisError.Server(message ?: "Server error ($code).")
        }
    }
}
