package com.veltis.android.data

import com.veltis.android.data.model.AccountsResponseDto
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class AccountParsingTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun testParseAccountsResponse() {
        val sampleJson = """
            {
              "accounts": [
                {
                  "id": "c138f6ee-7c60-4965-bbd4-5390e1f7c5e2",
                  "name": "HDFC Bank",
                  "type": "bank",
                  "currency": "INR",
                  "institution": "HDFC Bank"
                },
                {
                  "id": "d259f7aa-8d71-4876-cca5-6491e2f8d6f3",
                  "name": "Cash Wallet",
                  "type": "cash_wallet",
                  "currency": "INR",
                  "institution": null
                }
              ]
            }
        """.trimIndent()

        val response = json.decodeFromString<AccountsResponseDto>(sampleJson)
        assertEquals(2, response.accounts.size)

        val firstAccount = response.accounts[0].toDomain()
        assertEquals("c138f6ee-7c60-4965-bbd4-5390e1f7c5e2", firstAccount.id)
        assertEquals("HDFC Bank", firstAccount.name)
        assertEquals("bank", firstAccount.type)
        assertEquals("INR", firstAccount.currency)
        assertEquals("HDFC Bank", firstAccount.institution)

        val secondAccount = response.accounts[1].toDomain()
        assertEquals("d259f7aa-8d71-4876-cca5-6491e2f8d6f3", secondAccount.id)
        assertEquals("Cash Wallet", secondAccount.name)
        assertEquals(null, secondAccount.institution)
    }
}
