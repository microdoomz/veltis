package com.veltis.android.domain.repository

import com.veltis.android.domain.model.User
import com.veltis.android.domain.model.VeltisResult

interface AuthRepository {
    fun isLoggedIn(): Boolean
    fun getCurrentUser(): User?
    suspend fun signIn(email: String, password: String): VeltisResult<User>
    suspend fun signUp(name: String, email: String, password: String): VeltisResult<User>
    suspend fun signOut(): VeltisResult<Unit>
    suspend fun restoreSession(): VeltisResult<User?>
    suspend fun sendPasswordReset(email: String): VeltisResult<Unit>
}
