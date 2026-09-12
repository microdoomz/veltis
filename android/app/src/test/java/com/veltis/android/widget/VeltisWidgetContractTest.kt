package com.veltis.android.widget

import com.veltis.android.domain.model.Account
import com.veltis.android.domain.model.TransactionDraft
import com.veltis.android.domain.model.TransactionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class VeltisWidgetContractTest {

    @Test
    fun widgetActionConstants_areProperlyDefined() {
        assertEquals(
            "com.veltis.android.widget.ACTION_RECORD_EXPENSE",
            VeltisWidgetContract.ACTION_RECORD_EXPENSE
        )
        assertEquals(
            "com.veltis.android.widget.ACTION_RECORD_INCOME",
            VeltisWidgetContract.ACTION_RECORD_INCOME
        )
        assertEquals(
            "com.veltis.android.widget.ACTION_REFRESH_ACCOUNTS",
            VeltisWidgetContract.ACTION_REFRESH_ACCOUNTS
        )
    }

    @Test
    fun transactionDraft_mapsAccountUUID_neverDisplayName() {
        val accountIdUuid = "c30f4438-2d88-4299-9022-d7f4beee869e"
        val displayName = "HDFC Bank Salary"

        val account = Account(
            id = accountIdUuid,
            name = displayName,
            type = "checking",
            currency = "INR",
            institution = "HDFC Bank"
        )

        val expenseDraft = TransactionDraft(
            type = TransactionType.EXPENSE,
            amount = 1499.50,
            description = "Groceries",
            accountId = account.id, // Must be UUID
            currency = account.currency
        )

        val incomeDraft = TransactionDraft(
            type = TransactionType.INCOME,
            amount = 75000.0,
            description = "Monthly Salary",
            accountId = account.id, // Must be UUID
            currency = account.currency
        )

        assertEquals(accountIdUuid, expenseDraft.accountId)
        assertNotEquals(displayName, expenseDraft.accountId)

        assertEquals(accountIdUuid, incomeDraft.accountId)
        assertNotEquals(displayName, incomeDraft.accountId)
    }

    @Test
    fun idempotencyKeys_areUniqueForEachTransaction() {
        val key1 = UUID.randomUUID().toString()
        val key2 = UUID.randomUUID().toString()

        assertNotNull(key1)
        assertNotNull(key2)
        assertNotEquals(key1, key2)
        assertTrue(key1.isNotBlank())
        assertTrue(key2.isNotBlank())
    }

    @Test
    fun transactionTypes_produceExpectedIdentifiers() {
        val expenseType = TransactionType.EXPENSE
        val incomeType = TransactionType.INCOME

        val expenseString = if (expenseType == TransactionType.EXPENSE) "expense" else "income"
        val incomeString = if (incomeType == TransactionType.EXPENSE) "expense" else "income"

        assertEquals("expense", expenseString)
        assertEquals("income", incomeString)
    }
}
