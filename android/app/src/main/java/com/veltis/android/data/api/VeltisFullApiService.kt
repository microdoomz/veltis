package com.veltis.android.data.api

import com.veltis.android.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
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

    @POST("api/investments/snapshots")
    suspend fun syncInvestmentPrices(
        @Body body: Map<String, String> = emptyMap()
    ): Response<SyncPricesResponseDto>

    @DELETE("api/investments/transactions/{id}")
    suspend fun deleteInvestmentTransaction(
        @Path("id") id: String
    ): Response<Unit>

    @PATCH("api/accounts/{id}")
    suspend fun updateAccountDetails(
        @Path("id") id: String,
        @Body body: EditAccountPatchRequestDto
    ): Response<Unit>

    @GET("api/accounts/{id}/allocations")
    suspend fun getAccountAllocations(
        @Path("id") accountId: String
    ): Response<AllocationsResponseDto>

    @POST("api/accounts/{id}/allocations")
    suspend fun createAccountAllocation(
        @Path("id") accountId: String,
        @Body body: CreateAllocationRequestDto
    ): Response<Unit>

    @PATCH("api/accounts/{id}/allocations")
    suspend fun updateAccountAllocation(
        @Path("id") accountId: String,
        @Body body: UpdateAllocationRequestDto
    ): Response<Unit>

    @DELETE("api/accounts/{id}/allocations")
    suspend fun deleteAccountAllocation(
        @Path("id") accountId: String,
        @Query("allocationId") allocationId: String
    ): Response<Unit>

    @PATCH("api/transactions/{id}")
    suspend fun updateTransaction(
        @Path("id") transactionId: String,
        @Body body: EditTransactionPatchRequestDto
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

    @POST("api/receivables")
    suspend fun createReceivable(
        @Body body: CreateReceivableRequestDto
    ): Response<ReceivableDto>

    @POST("api/receivables/{id}/settle")
    suspend fun settleReceivable(
        @Path("id") id: String,
        @Body body: SettleReceivableRequestDto
    ): Response<Unit>

    @GET("api/liabilities")
    suspend fun getLiabilities(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<List<LiabilityDto>>

    @POST("api/liabilities")
    suspend fun createLiability(
        @Body body: CreateLiabilityRequestDto
    ): Response<LiabilityDto>

    @POST("api/liabilities/{id}/pay")
    suspend fun payLiability(
        @Path("id") id: String,
        @Body body: PayLiabilityRequestDto
    ): Response<Unit>

    @GET("api/recurring")
    suspend fun getRecurringItems(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<List<RecurringItemDto>>

    @POST("api/recurring")
    suspend fun createRecurringItem(
        @Body body: CreateRecurringRequestDto
    ): Response<Unit>

    @DELETE("api/recurring/{id}")
    suspend fun deleteRecurringItem(
        @Path("id") id: String,
        @Query("workspaceId") workspaceId: String? = null
    ): Response<Unit>

    @POST("api/recurring/{id}/confirm")
    suspend fun confirmRecurringOccurrence(
        @Path("id") id: String,
        @Body body: ConfirmOccurrenceRequestDto
    ): Response<Unit>

    @POST("api/recurring/{id}/skip")
    suspend fun skipRecurringOccurrence(
        @Path("id") id: String,
        @Body body: Map<String, String> = emptyMap()
    ): Response<Unit>

    @GET("api/taxonomy")
    suspend fun getTaxonomy(
        @Query("workspaceId") workspaceId: String? = null
    ): Response<TaxonomyResponseDto>

    @POST("api/taxonomy")
    suspend fun createCategory(
        @Body request: com.veltis.android.data.model.CreateCategoryRequestDto
    ): Response<CategoryDto>

    @DELETE("api/taxonomy")
    suspend fun deleteTaxonomyCategory(
        @Query("entity") entity: String = "category",
        @Query("id") id: String
    ): Response<Unit>

    @GET("api/workspace")
    suspend fun getWorkspace(): Response<WorkspaceInfoDto>

    @PATCH("api/workspace")
    suspend fun updateWorkspace(
        @Body request: com.veltis.android.data.model.UpdateWorkspaceRequestDto
    ): Response<Unit>

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

    @GET("api/analytics/income")
    suspend fun getIncomeAnalytics(
        @Query("workspaceId") workspaceId: String? = null,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<List<CategorySpendingDto>>

    @GET("api/analytics/wealth")
    suspend fun getWealthTrendAnalytics(
        @Query("workspaceId") workspaceId: String? = null,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<List<WealthTrendPointDto>>

    @GET("api/app/version")
    suspend fun getAppVersion(): Response<AppVersionDto>

    // Statement Imports
    @GET("api/imports")
    suspend fun getStatementImports(): Response<ImportsResponseDto>

    @DELETE("api/imports")
    suspend fun deleteStatementImport(
        @Query("importId") importId: String
    ): Response<Unit>

    @GET("api/imports/{id}")
    suspend fun getStatementImportDetails(
        @Path("id") id: String
    ): Response<ImportDetailResponseDto>

    @POST("api/imports/{id}/commit")
    suspend fun commitImportRows(
        @Path("id") id: String,
        @Body request: CommitImportRowsRequestDto
    ): Response<Unit>

    @Multipart
    @POST("api/imports/upload")
    suspend fun uploadStatement(
        @Part("workspaceId") workspaceId: RequestBody,
        @Part("accountId") accountId: RequestBody,
        @Part file: MultipartBody.Part,
        @Part("isReferenceOnly") isReferenceOnly: RequestBody
    ): Response<Map<String, String>>

    // Export with format and time filters
    @Streaming
    @GET("api/exports")
    suspend fun getExportDataWithFilters(
        @Query("format") format: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<ResponseBody>

    // Active Sessions (Better-Auth)
    @GET("api/auth/list-sessions")
    suspend fun getActiveSessions(): Response<List<ActiveSessionDto>>

    @POST("api/auth/revoke-other-sessions")
    suspend fun revokeOtherSessions(
        @Body body: Map<String, String> = emptyMap()
    ): Response<Unit>

    // Shortcut / Webhook API Tokens
    @GET("api/shortcuts/tokens")
    suspend fun getShortcutTokens(): Response<ShortcutTokensResponseDto>

    @POST("api/shortcuts/tokens")
    suspend fun createShortcutToken(
        @Body request: CreateShortcutTokenRequestDto
    ): Response<CreateShortcutTokenResponseDto>

    @DELETE("api/shortcuts/tokens")
    suspend fun revokeShortcutToken(
        @Query("tokenId") tokenId: String
    ): Response<Unit>
}

