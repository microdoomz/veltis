package com.veltis.android.data.api

import com.veltis.android.data.storage.SessionManager
import com.veltis.android.data.storage.TokenManager
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

class NetworkClient(
    private val tokenManager: TokenManager,
    private val sessionManager: SessionManager? = null
) {

    val json: Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
        encodeDefaults = false
        explicitNulls = false
    }

    val baseUrl: String
        get() = tokenManager.getBaseUrl()

    private val authInterceptor = AuthInterceptor(tokenManager, sessionManager)

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
        // Critical: never log sensitive headers
        redactHeader("Authorization")
        redactHeader("Cookie")
        redactHeader("Set-Cookie")
    }

    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    fun <T> createService(serviceClass: Class<T>): T {
        val baseUrl = tokenManager.getBaseUrl()
        val contentType = "application/json".toMediaType()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
            .create(serviceClass)
    }

    fun createApiService(): VeltisApiService {
        return createService(VeltisApiService::class.java)
    }

    fun createFullApiService(): VeltisFullApiService {
        return createService(VeltisFullApiService::class.java)
    }
}
