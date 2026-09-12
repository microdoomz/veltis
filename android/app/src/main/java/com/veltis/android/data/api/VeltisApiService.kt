package com.veltis.android.data.api

import com.veltis.android.data.model.AccountsResponseDto
import com.veltis.android.data.model.TransactionRequestDto
import com.veltis.android.data.model.TransactionResponseDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface VeltisApiService {

    @GET("api/shortcuts/accounts")
    suspend fun getAccounts(): Response<AccountsResponseDto>

    @POST("api/shortcuts/expense")
    suspend fun recordExpense(
        @Body request: TransactionRequestDto
    ): Response<TransactionResponseDto>

    @POST("api/shortcuts/income")
    suspend fun recordIncome(
        @Body request: TransactionRequestDto
    ): Response<TransactionResponseDto>
}
