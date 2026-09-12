package com.veltis.android.data.model

import kotlinx.serialization.Serializable

@Serializable
data class SignInEmailRequestDto(
    val email: String,
    val password: String
)

@Serializable
data class SignUpEmailRequestDto(
    val email: String,
    val password: String,
    val name: String
)

@Serializable
data class ForgetPasswordRequestDto(
    val email: String
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String? = null,
    val image: String? = null
)

@Serializable
data class SessionDto(
    val id: String,
    val userId: String,
    val token: String? = null,
    val expiresAt: String? = null
)

@Serializable
data class AuthResponseDto(
    val token: String? = null,
    val user: UserDto? = null
)

@Serializable
data class SessionResponseDto(
    val session: SessionDto? = null,
    val user: UserDto? = null
)
