package com.veltis.android.data.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {

    companion object {
        private const val PREFS_FILE_NAME = "veltis_secure_prefs"
        private const val KEY_API_TOKEN = "key_veltis_api_token"
        private const val KEY_BASE_URL = "key_veltis_base_url"
        private const val KEY_CACHED_ACCOUNTS_JSON = "key_cached_accounts"

        // Default URLs - central configuration point
        const val DEFAULT_PRODUCTION_URL = "https://veltismoney.vercel.app/"
        const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:3000/"
    }

    private val sharedPreferences: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        // Fallback for edge cases where Android Keystore encounters corrupted state
        context.getSharedPreferences(PREFS_FILE_NAME, Context.MODE_PRIVATE)
    }

    fun saveToken(token: String) {
        sharedPreferences.edit()
            .putString(KEY_API_TOKEN, token.trim())
            .apply()
    }

    fun getToken(): String? {
        val token = sharedPreferences.getString(KEY_API_TOKEN, null)?.trim()
        return if (token.isNullOrEmpty()) null else token
    }

    fun clearToken() {
        sharedPreferences.edit()
            .remove(KEY_API_TOKEN)
            .apply()
    }

    fun isTokenConfigured(): Boolean = !getToken().isNullOrBlank()

    fun saveBaseUrl(url: String) {
        var cleanUrl = url.trim()
        if (!cleanUrl.endsWith("/")) {
            cleanUrl += "/"
        }
        sharedPreferences.edit()
            .putString(KEY_BASE_URL, cleanUrl)
            .apply()
    }

    fun getBaseUrl(): String {
        val saved = sharedPreferences.getString(KEY_BASE_URL, null)?.trim()
        return if (!saved.isNullOrEmpty()) {
            if (!saved.endsWith("/")) "$saved/" else saved
        } else {
            DEFAULT_PRODUCTION_URL
        }
    }

    fun saveCachedAccountsJson(json: String) {
        sharedPreferences.edit()
            .putString(KEY_CACHED_ACCOUNTS_JSON, json)
            .apply()
    }

    fun getCachedAccountsJson(): String? {
        return sharedPreferences.getString(KEY_CACHED_ACCOUNTS_JSON, null)
    }
}
