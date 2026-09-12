package com.veltis.android.data.api

import com.veltis.android.data.model.AuthResponseDto
import com.veltis.android.data.model.ForgetPasswordRequestDto
import com.veltis.android.data.model.SessionResponseDto
import com.veltis.android.data.model.SignInEmailRequestDto
import com.veltis.android.data.model.SignUpEmailRequestDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApiService {

    @POST("api/auth/sign-in/email")
    suspend fun signIn(
        @Body request: SignInEmailRequestDto
    ): Response<AuthResponseDto>

    @POST("api/auth/sign-up/email")
    suspend fun signUp(
        @Body request: SignUpEmailRequestDto
    ): Response<AuthResponseDto>

    @POST("api/auth/sign-out")
    suspend fun signOut(): Response<Unit>

    @GET("api/auth/get-session")
    suspend fun getSession(): Response<SessionResponseDto>

    @POST("api/auth/forget-password")
    suspend fun forgetPassword(
        @Body request: ForgetPasswordRequestDto
    ): Response<Unit>
}
