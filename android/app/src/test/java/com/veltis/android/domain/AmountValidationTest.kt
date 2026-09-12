package com.veltis.android.domain

import com.veltis.android.domain.model.TransactionDraft
import com.veltis.android.domain.model.TransactionType
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AmountValidationTest {

    @Test
    fun testValidAmountAndAccount() {
        val draft = TransactionDraft(
            type = TransactionType.EXPENSE,
            amount = 150.0,
            description = "Lunch",
            accountId = "c138f6ee-7c60-4965-bbd4-5390e1f7c5e2"
        )
        assertTrue(draft.isValid())
    }

    @Test
    fun testZeroAmountIsInvalid() {
        val draft = TransactionDraft(
            type = TransactionType.EXPENSE,
            amount = 0.0,
            description = "Invalid",
            accountId = "c138f6ee-7c60-4965-bbd4-5390e1f7c5e2"
        )
        assertFalse(draft.isValid())
    }

    @Test
    fun testNegativeAmountIsInvalid() {
        val draft = TransactionDraft(
            type = TransactionType.INCOME,
            amount = -50.0,
            description = "Negative",
            accountId = "c138f6ee-7c60-4965-bbd4-5390e1f7c5e2"
        )
        assertFalse(draft.isValid())
    }

    @Test
    fun testBlankAccountIsInvalid() {
        val draft = TransactionDraft(
            type = TransactionType.EXPENSE,
            amount = 100.0,
            description = "No account",
            accountId = "   "
        )
        assertFalse(draft.isValid())
    }
}
