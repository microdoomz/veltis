package com.veltis.android.widget

import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.updateAll
import com.veltis.android.domain.model.TransactionType
import com.veltis.android.presentation.MainActivity
import com.veltis.android.presentation.quickadd.QuickAddActivity

/**
 * Contract and Intent helper for the Veltis Home-Screen Glance Widget.
 *
 * Provides standardized intents for launching QuickAdd (with pre-selected
 * Expense or Income) and navigating to Setup when unconfigured.
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

    fun createSetupIntent(context: Context): Intent {
        return Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
    }

    suspend fun updateWidget(context: Context) {
        try {
            VeltisGlanceWidget().updateAll(context)
        } catch (_: Exception) {
            // Silently ignore if widget is not placed on the home screen
        }
    }
}
