package com.veltis.android.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ApiErrorDto(
    val error: String? = null,
    val hint: String? = null,
    val message: String? = null
)
