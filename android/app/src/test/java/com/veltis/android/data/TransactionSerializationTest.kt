package com.veltis.android.data

import com.veltis.android.data.model.TransactionRequestDto
import com.veltis.android.data.model.TransactionResponseDto
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TransactionSerializationTest {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = false
        explicitNulls = false
    }

    @Test
    fun testExpenseRequestSerialization() {
        val request = TransactionRequestDto(
            amount = 250.50,
            accountId = "c138f6ee-7c60-4965-bbd4-5390e1f7c5e2",
            description = "Groceries",
            currency = "INR",
            idempotencyKey = "and_exp_12345"
        )

        val serialized = json.encodeToString(TransactionRequestDto.serializer(), request)
        assertTrue(serialized.contains("\"amount\":250.5"))
        assertTrue(serialized.contains("\"accountId\":\"c138f6ee-7c60-4965-bbd4-5390e1f7c5e2\""))
        assertTrue(serialized.contains("\"description\":\"Groceries\""))
        assertTrue(serialized.contains("\"idempotencyKey\":\"and_exp_12345\""))
        // Null/default fields MUST be omitted completely so strict Zod servers don't fail
        assertFalse(serialized.contains("\"categoryId\""))
        assertFalse(serialized.contains("\"date\""))
    }

    @Test
    fun testTransactionResponseParsing() {
        val sampleResponseJson = """
            {
              "success": true,
              "transactionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
              "amount": 250.5,
              "currency": "INR",
              "description": "Groceries",
              "date": "2026-09-12"
            }
        """.trimIndent()

        val response = json.decodeFromString<TransactionResponseDto>(sampleResponseJson)
        assertTrue(response.success)
        assertEquals("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", response.transactionId)
        assertEquals(250.5, response.amount, 0.001)
        assertEquals("INR", response.currency)
        assertEquals("Groceries", response.description)
        assertEquals("2026-09-12", response.date)

        val domain = response.toDomain()
        assertEquals("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", domain.transactionId)
    }
}
