package com.veltis.android.domain.model

sealed interface VeltisResult<out T> {
    data class Success<T>(val data: T) : VeltisResult<T>
    data class Failure(val error: VeltisError) : VeltisResult<Nothing>

    fun isSuccess(): Boolean = this is Success
    fun getOrNull(): T? = (this as? Success)?.data
    fun errorOrNull(): VeltisError? = (this as? Failure)?.error
}

sealed interface VeltisError {
    data class Authentication(val message: String = "Authentication failed. Check your Veltis token.") : VeltisError
    data class Validation(val message: String = "Invalid transaction details. Please check the amount.") : VeltisError
    data class NotFound(val message: String = "Requested account not found in your workspace.") : VeltisError
    data class RateLimited(val message: String = "Too many requests. Try again in a few moments.") : VeltisError
    data class Server(val message: String = "Server error. Try again.") : VeltisError
    data class Network(val message: String = "Unable to connect to Veltis. Check your internet connection or server URL.") : VeltisError
    data class NotConfigured(val message: String = "Veltis token is not configured. Please enter your token first.") : VeltisError
    data class Unknown(val message: String) : VeltisError

    fun userFriendlyMessage(): String = when (this) {
        is Authentication -> message
        is Validation -> message
        is NotFound -> message
        is RateLimited -> message
        is Server -> message
        is Network -> message
        is NotConfigured -> message
        is Unknown -> message
    }
}
