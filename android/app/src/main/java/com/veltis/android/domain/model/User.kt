package com.veltis.android.domain.model

data class User(
    val id: String,
    val email: String,
    val name: String? = null,
    val image: String? = null
)

data class AuthSession(
    val token: String,
    val user: User
)
