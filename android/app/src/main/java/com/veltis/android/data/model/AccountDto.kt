package com.veltis.android.data.model

import com.veltis.android.domain.model.Account
import kotlinx.serialization.Serializable

@Serializable
data class AccountsResponseDto(
    val accounts: List<AccountDto> = emptyList()
)

@Serializable
data class AccountDto(
    val id: String,
    val name: String,
    val type: String,
    val currency: String,
    val institution: String? = null
) {
    fun toDomain(): Account = Account(
        id = id,
        name = name,
        type = type,
        currency = currency,
        institution = institution
    )
}
