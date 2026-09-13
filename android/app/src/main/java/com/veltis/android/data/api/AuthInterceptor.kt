package com.veltis.android.data.api

import com.veltis.android.data.storage.SessionManager
import com.veltis.android.data.storage.TokenManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(
    private val tokenManager: TokenManager,
    private val sessionManager: SessionManager? = null
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()
            .header("Accept", "application/json")

        val sessionToken = sessionManager?.getSessionToken()
        val shortcutToken = tokenManager.getToken()

        if (!sessionToken.isNullOrBlank()) {
            val authValue = if (sessionToken.startsWith("Bearer ", ignoreCase = true)) {
                sessionToken
            } else {
                "Bearer $sessionToken"
            }
            requestBuilder.header("Authorization", authValue)
            requestBuilder.header("x-session-token", sessionToken)
            requestBuilder.header("Cookie", "better-auth.session_token=$sessionToken; __Secure-better-auth.session_token=$sessionToken")
        } else if (!shortcutToken.isNullOrBlank()) {
            val authValue = if (shortcutToken.startsWith("Bearer ", ignoreCase = true)) {
                shortcutToken
            } else {
                "Bearer $shortcutToken"
            }
            requestBuilder.header("Authorization", authValue)
            requestBuilder.header("x-session-token", shortcutToken)
        }

        return chain.proceed(requestBuilder.build())
    }
}
