package com.veltis.android.data

import com.veltis.android.data.model.ApiErrorDto
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test

class ApiErrorParsingTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun testParseApiErrorWithHint() {
        val errorJson = """
            {
              "error": "Validation failed",
              "hint": "Ensure amount is a positive number (e.g. 25.50) and body is valid JSON."
            }
        """.trimIndent()

        val parsed = json.decodeFromString<ApiErrorDto>(errorJson)
        assertEquals("Validation failed", parsed.error)
        assertEquals("Ensure amount is a positive number (e.g. 25.50) and body is valid JSON.", parsed.hint)
    }

    @Test
    fun testParseInvalidTokenError() {
        val errorJson = """
            {
              "error": "Invalid or revoked token"
            }
        """.trimIndent()

        val parsed = json.decodeFromString<ApiErrorDto>(errorJson)
        assertEquals("Invalid or revoked token", parsed.error)
    }
}
