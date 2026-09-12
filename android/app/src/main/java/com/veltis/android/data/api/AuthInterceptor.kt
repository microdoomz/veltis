package com.veltis.android.data.api

import com.veltis.android.data.storage.TokenManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()
            .header("Accept", "application/json")

        val token = tokenManager.getToken()
        if (!token.isNullOrBlank()) {
            val authValue = if (token.startsWith("Bearer ", ignoreCase = true)) {
                token
            } else {
                "Bearer $token"
            }
            requestBuilder.header("Authorization", authValue)
        }

        return chain.proceed(requestBuilder.build())
    }
}
