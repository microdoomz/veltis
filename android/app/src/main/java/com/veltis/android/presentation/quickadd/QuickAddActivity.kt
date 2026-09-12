package com.veltis.android.presentation.quickadd

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.veltis.android.VeltisApplication
import com.veltis.android.domain.model.TransactionType
import com.veltis.android.presentation.theme.VeltisTheme

class QuickAddActivity : ComponentActivity() {

    companion object {
        const val EXTRA_TRANSACTION_TYPE = "extra_transaction_type"
    }

    private val viewModel: QuickAddViewModel by lazy {
        val app = application as VeltisApplication
        QuickAddViewModel(app.repository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleTransactionType(intent)

        setContent {
            VeltisTheme {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.5f))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            finish()
                        },
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Box(modifier = Modifier.clickable(enabled = false) {}) {
                        QuickAddScreen(
                            viewModel = viewModel,
                            onDismiss = { finish() }
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleTransactionType(intent)
    }

    private fun handleTransactionType(intent: android.content.Intent?) {
        val initialType = intent?.getStringExtra(EXTRA_TRANSACTION_TYPE)
        if (initialType.equals("income", ignoreCase = true)) {
            viewModel.selectTransactionType(TransactionType.INCOME)
        } else if (initialType.equals("expense", ignoreCase = true)) {
            viewModel.selectTransactionType(TransactionType.EXPENSE)
        }
    }
}
