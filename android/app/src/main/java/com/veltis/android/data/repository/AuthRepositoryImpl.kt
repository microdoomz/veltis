package com.veltis.android.data.repository

import com.veltis.android.data.api.AuthApiService
import com.veltis.android.data.api.NetworkClient
import com.veltis.android.data.model.ApiErrorDto
import com.veltis.android.data.model.ForgetPasswordRequestDto
import com.veltis.android.data.model.SignInEmailRequestDto
import com.veltis.android.data.model.SignUpEmailRequestDto
import com.veltis.android.data.model.SocialSignInRequestDto
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.domain.model.User
import com.veltis.android.domain.model.VeltisError
import com.veltis.android.domain.model.VeltisResult
import com.veltis.android.domain.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response
import java.io.IOException

class AuthRepositoryImpl(
    private val networkClient: NetworkClient,
    private val sessionManager: SessionManager
) : AuthRepository {

    private val api: AuthApiService by lazy {
        networkClient.createService(AuthApiService::class.java)
    }

    override fun isLoggedIn(): Boolean = sessionManager.isLoggedIn()

    override fun getCurrentUser(): User? = sessionManager.getUser()

    override suspend fun signIn(email: String, password: String): VeltisResult<User> = withContext(Dispatchers.IO) {
        if (email.isBlank() || !email.contains("@")) {
            return@withContext VeltisResult.Failure(VeltisError.Validation("Please enter a valid email address."))
        }
        if (password.isBlank()) {
            return@withContext VeltisResult.Failure(VeltisError.Validation("Please enter your password."))
        }

        try {
            val response = api.signIn(SignInEmailRequestDto(email = email.trim(), password = password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val userDto = body.user
                    ?: return@withContext VeltisResult.Failure(VeltisError.Unknown("User data missing in login response."))

                val token = body.token ?: extractTokenFromHeaders(response)
                    ?: return@withContext VeltisResult.Failure(VeltisError.Unknown("Session token missing in login response."))

                val user = User(
                    id = userDto.id,
                    email = userDto.email,
                    name = userDto.name,
                    image = userDto.image
                )

                sessionManager.saveSession(token = token, user = user)
                sessionManager.saveBiometricSessionToken(token)
                VeltisResult.Success(user)
            } else {
                VeltisResult.Failure(parseAuthError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network("Unable to connect to Veltis server. Please check your network."))
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Authentication failed."))
        }
    }

    override suspend fun signUp(name: String, email: String, password: String): VeltisResult<User> = withContext(Dispatchers.IO) {
        if (name.isBlank()) {
            return@withContext VeltisResult.Failure(VeltisError.Validation("Please enter your name."))
        }
        if (email.isBlank() || !email.contains("@")) {
            return@withContext VeltisResult.Failure(VeltisError.Validation("Please enter a valid email address."))
        }
        if (password.length < 8) {
            return@withContext VeltisResult.Failure(VeltisError.Validation("Password must be at least 8 characters."))
        }

        try {
            val response = api.signUp(SignUpEmailRequestDto(name = name.trim(), email = email.trim(), password = password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val userDto = body.user
                    ?: return@withContext VeltisResult.Failure(VeltisError.Unknown("User data missing in signup response."))

                val token = body.token ?: extractTokenFromHeaders(response)
                    ?: return@withContext VeltisResult.Failure(VeltisError.Unknown("Session token missing in signup response."))

                val user = User(
                    id = userDto.id,
                    email = userDto.email,
                    name = userDto.name,
                    image = userDto.image
                )

                sessionManager.saveSession(token = token, user = user)
                sessionManager.saveBiometricSessionToken(token)
                VeltisResult.Success(user)
            } else {
                VeltisResult.Failure(parseAuthError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network("Unable to connect to Veltis server."))
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to create account."))
        }
    }

    override suspend fun signOut(): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        try {
            api.signOut()
        } catch (_: Exception) {
            // Best effort server sign out
        } finally {
            sessionManager.clearSession()
        }
        VeltisResult.Success(Unit)
    }

    override suspend fun restoreSession(): VeltisResult<User?> = withContext(Dispatchers.IO) {
        if (!sessionManager.isLoggedIn()) {
            return@withContext VeltisResult.Success(null)
        }

        try {
            val response = api.getSession()
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val userDto = body.user
                if (userDto != null) {
                    val user = User(id = userDto.id, email = userDto.email, name = userDto.name, image = userDto.image)
                    return@withContext VeltisResult.Success(user)
                }
            }
            // If getSession fails with 401, clear local session
            if (response.code() == 401) {
                sessionManager.clearSession()
                return@withContext VeltisResult.Success(null)
            }

            // If offline, return cached user
            VeltisResult.Success(sessionManager.getUser())
        } catch (e: IOException) {
            // Offline: trust persisted valid session
            VeltisResult.Success(sessionManager.getUser())
        } catch (_: Exception) {
            VeltisResult.Success(sessionManager.getUser())
        }
    }

    override suspend fun sendPasswordReset(email: String): VeltisResult<Unit> = withContext(Dispatchers.IO) {
        if (email.isBlank() || !email.contains("@")) {
            return@withContext VeltisResult.Failure(VeltisError.Validation("Please enter a valid email address."))
        }

        try {
            val response = api.forgetPassword(ForgetPasswordRequestDto(email = email.trim()))
            if (response.isSuccessful) {
                VeltisResult.Success(Unit)
            } else {
                VeltisResult.Failure(parseAuthError(response))
            }
        } catch (e: IOException) {
            VeltisResult.Failure(VeltisError.Network("Unable to connect to server."))
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to send password reset."))
        }
    }

    override suspend fun getGoogleSignInUrl(): VeltisResult<String> = withContext(Dispatchers.IO) {
        try {
            val callbackUrl = "${networkClient.baseUrl}api/auth/mobile-callback"
            val response = api.signInSocial(
                SocialSignInRequestDto(
                    provider = "google",
                    callbackURL = callbackUrl,
                    disableRedirect = true
                )
            )
            val authUrl = response.body()?.url
            if (response.isSuccessful && !authUrl.isNullOrBlank()) {
                VeltisResult.Success(authUrl)
            } else {
                VeltisResult.Success("${networkClient.baseUrl}api/auth/sign-in/social?provider=google&callbackURL=${callbackUrl}")
            }
        } catch (_: Exception) {
            val callbackUrl = "${networkClient.baseUrl}api/auth/mobile-callback"
            VeltisResult.Success("${networkClient.baseUrl}api/auth/sign-in/social?provider=google&callbackURL=${callbackUrl}")
        }
    }

    override suspend fun handleOAuthCallback(token: String): VeltisResult<User> = withContext(Dispatchers.IO) {
        try {
            val initialUser = User(id = "google_user", email = "google_user@veltis", name = "Google Account")
            sessionManager.saveSession(token = token, user = initialUser)
            sessionManager.saveBiometricSessionToken(token)

            val sessionResult = restoreSession()
            if (sessionResult is VeltisResult.Success && sessionResult.data != null) {
                sessionManager.saveSession(token = token, user = sessionResult.data)
                VeltisResult.Success(sessionResult.data)
            } else {
                VeltisResult.Success(sessionManager.getUser() ?: initialUser)
            }
        } catch (e: Exception) {
            VeltisResult.Failure(VeltisError.Unknown(e.message ?: "Failed to process Google sign-in."))
        }
    }

    private fun <T> extractTokenFromHeaders(response: Response<T>): String? {
        val cookies = response.headers().values("Set-Cookie")
        for (cookie in cookies) {
            if (cookie.startsWith("better-auth.session_token=")) {
                return cookie.substringAfter("better-auth.session_token=").substringBefore(";")
            }
        }
        return null
    }

    private fun <T> parseAuthError(response: Response<T>): VeltisError {
        val code = response.code()
        val rawBody = try { response.errorBody()?.string() } catch (_: Exception) { null }
        val message = if (!rawBody.isNullOrBlank()) {
            try {
                val errDto = networkClient.json.decodeFromString<ApiErrorDto>(rawBody)
                errDto.error ?: errDto.message ?: errDto.hint
            } catch (_: Exception) {
                null
            }
        } else null

        return when (code) {
            400 -> VeltisError.Validation(message ?: "Invalid request. Please verify your details.")
            401 -> VeltisError.Authentication(message ?: "Invalid email or password.")
            403 -> VeltisError.Authentication(message ?: "Access forbidden.")
            429 -> VeltisError.RateLimited(message ?: "Too many attempts. Please wait a few moments.")
            else -> VeltisError.Server(message ?: "Server error ($code). Please try again later.")
        }
    }
}
