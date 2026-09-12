package com.veltis.android.data.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.veltis.android.domain.model.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SessionManager(context: Context) {

    private val prefs: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (_: Exception) {
        // Fallback to standard private mode if keystore hardware is temporarily unavailable
        context.getSharedPreferences(FALLBACK_PREFS_NAME, Context.MODE_PRIVATE)
    }

    private val _privacyMode = MutableStateFlow(getPrivacyMode())
    val privacyMode: StateFlow<Boolean> = _privacyMode.asStateFlow()

    fun saveSession(token: String, user: User, workspaceId: String? = null) {
        prefs.edit()
            .putString(KEY_SESSION_TOKEN, token.trim())
            .putString(KEY_USER_ID, user.id)
            .putString(KEY_USER_EMAIL, user.email)
            .putString(KEY_USER_NAME, user.name)
            .apply()

        if (!workspaceId.isNullOrBlank()) {
            saveWorkspaceId(workspaceId)
        }
    }

    fun getSessionToken(): String? = prefs.getString(KEY_SESSION_TOKEN, null)?.takeIf { it.isNotBlank() }

    fun getUser(): User? {
        val id = prefs.getString(KEY_USER_ID, null) ?: return null
        val email = prefs.getString(KEY_USER_EMAIL, null) ?: return null
        val name = prefs.getString(KEY_USER_NAME, null)
        return User(id = id, email = email, name = name)
    }

    fun isLoggedIn(): Boolean = !getSessionToken().isNullOrBlank()

    fun saveWorkspaceId(workspaceId: String) {
        prefs.edit().putString(KEY_WORKSPACE_ID, workspaceId.trim()).apply()
    }

    fun getWorkspaceId(): String? = prefs.getString(KEY_WORKSPACE_ID, null)?.takeIf { it.isNotBlank() }

    fun saveBaseCurrency(currency: String) {
        prefs.edit().putString(KEY_BASE_CURRENCY, currency.trim().uppercase()).apply()
    }

    fun getBaseCurrency(): String = prefs.getString(KEY_BASE_CURRENCY, "USD") ?: "USD"

    fun setPrivacyMode(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_PRIVACY_MODE, enabled).apply()
        _privacyMode.value = enabled
    }

    fun getPrivacyMode(): Boolean = prefs.getBoolean(KEY_PRIVACY_MODE, false)

    fun clearSession() {
        prefs.edit()
            .remove(KEY_SESSION_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_USER_EMAIL)
            .remove(KEY_USER_NAME)
            .remove(KEY_WORKSPACE_ID)
            .apply()
    }

    companion object {
        private const val PREFS_NAME = "veltis_secure_session_prefs"
        private const val FALLBACK_PREFS_NAME = "veltis_session_fallback_prefs"
        private const val KEY_SESSION_TOKEN = "key_session_token"
        private const val KEY_USER_ID = "key_user_id"
        private const val KEY_USER_EMAIL = "key_user_email"
        private const val KEY_USER_NAME = "key_user_name"
        private const val KEY_WORKSPACE_ID = "key_workspace_id"
        private const val KEY_BASE_CURRENCY = "key_base_currency"
        private const val KEY_PRIVACY_MODE = "key_privacy_mode"
    }
}
