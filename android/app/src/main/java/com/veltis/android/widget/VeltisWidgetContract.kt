package com.veltis.android.widget

import android.content.Context
import android.content.Intent
import com.veltis.android.domain.model.TransactionType
import com.veltis.android.presentation.quickadd.QuickAddActivity

/**
 * Contract and Intent helper for the future Veltis Home-Screen Glance Widget.
 *
 * Prepared for Phase 2 implementation. The widget will trigger these intents
 * or directly invoke VeltisRepository to perform one-tap transactions.
 */
object VeltisWidgetContract {

    const val ACTION_RECORD_EXPENSE = "com.veltis.android.widget.ACTION_RECORD_EXPENSE"
    const val ACTION_RECORD_INCOME = "com.veltis.android.widget.ACTION_RECORD_INCOME"
    const val ACTION_REFRESH_ACCOUNTS = "com.veltis.android.widget.ACTION_REFRESH_ACCOUNTS"

    fun createQuickAddIntent(context: Context, type: TransactionType): Intent {
        return Intent(context, QuickAddActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(QuickAddActivity.EXTRA_TRANSACTION_TYPE, if (type == TransactionType.EXPENSE) "expense" else "income")
        }
    }
}
