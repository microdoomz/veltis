package com.veltis.android.data.api

import com.veltis.android.data.model.*
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface VeltisFullApiService {

    @GET("api/home")
    suspend fun getHomeDashboard(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<HomeDashboardDto>

    @GET("api/accounts")
    suspend fun getAccounts(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<List<AccountDetailDto>>

    @POST("api/accounts")
    suspend fun createAccount(
        @Body request: Map<String, String>
    ): Response<AccountDetailDto>

    @DELETE("api/accounts/{id}")
    suspend fun deleteAccount(
        @Path("id") id: String
    ): Response<Unit>

    @POST("api/accounts/{id}/reconcile")
    suspend fun reconcileAccount(
        @Path("id") id: String,
        @Body body: Map<String, String>
    ): Response<Unit>

    @GET("api/transactions")
    suspend fun getTransactions(
        @Query("limit") limit: Int = 100,
        @Query("type") type: String? = null,
        @Query("categoryId") categoryId: String? = null,
        @Query("accountId") accountId: String? = null,
        @Query("sort") sort: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<TransactionsResponseDto>

    @POST("api/transactions")
    suspend fun createTransaction(
        @Body request: CreateTransactionRequestDto
    ): Response<CreateTransactionResponseDto>

    @DELETE("api/transactions/{id}")
    suspend fun deleteTransaction(
        @Path("id") id: String
    ): Response<Unit>

    @POST("api/sync/transactions")
    suspend fun syncBatchTransactions(
        @Body request: BatchSyncRequestDto
    ): Response<BatchSyncResponseDto>

    @GET("api/investments")
    suspend fun getInvestments(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<InvestmentsResponseDto>

    @POST("api/investments")
    suspend fun executeInvestmentAction(
        @Query("workspaceId") workspaceId: String? = null,
        @Body body: InvestmentActionRequestDto
    ): Response<Unit>

    @GET("api/budgets")
    suspend fun getBudgets(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<BudgetsResponseDto>

    @POST("api/budgets")
    suspend fun createBudget(
        @Body body: CreateBudgetRequestDto
    ): Response<Unit>

    @DELETE("api/budgets/{id}")
    suspend fun deleteBudget(
        @Path("id") id: String
    ): Response<Unit>

    @GET("api/receivables")
    suspend fun getReceivables(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<List<ReceivableDto>>

    @GET("api/liabilities")
    suspend fun getLiabilities(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<List<LiabilityDto>>

    @GET("api/recurring")
    suspend fun getRecurringItems(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<List<RecurringItemDto>>

    @GET("api/taxonomy")
    suspend fun getTaxonomy(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<TaxonomyResponseDto>

    @GET("api/workspace")
    suspend fun getWorkspace(): Response<WorkspaceInfoDto>

    @Streaming
    @POST("api/exports")
    suspend fun exportData(
        @Body body: Map<String, String>
    ): Response<ResponseBody>

    @POST("api/user/delete-account")
    suspend fun deleteAccountUser(): Response<Unit>

    @GET("api/analytics/overview")
    suspend fun getAnalyticsOverview(
        @Query("workspaceId") workspaceId: String? = null,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<AnalyticsOverviewDto>

    @GET("api/analytics/spending")
    suspend fun getSpendingAnalytics(
        @Query("workspaceId") workspaceId: String? = null,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<List<CategorySpendingDto>>
}
