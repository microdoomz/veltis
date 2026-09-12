package com.veltis.android.domain.model

data class Account(
    val id: String,
    val name: String,
    val type: String,
    val currency: String,
    val institution: String? = null
)
