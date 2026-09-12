package com.veltis.android.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.veltis.android.data.storage.TokenManager
import com.veltis.android.presentation.MainActivity
import com.veltis.android.presentation.quickadd.QuickAddActivity

private val transactionTypeParamKey = ActionParameters.Key<String>(QuickAddActivity.EXTRA_TRANSACTION_TYPE)

/**
 * Native Jetpack Glance Home-Screen Widget for Veltis.
 *
 * Provides instant 1-tap entry points to record Expense or Income without opening the web browser.
 * When the user has not configured their API token, displays a graceful Setup State guiding them
 * to the companion Setup Activity.
 */
class VeltisGlanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val tokenManager = TokenManager(context)
        val isConfigured = tokenManager.isTokenConfigured()

        provideContent {
            GlanceWidgetContent(
                isConfigured = isConfigured
            )
        }
    }
}

@Composable
private fun GlanceWidgetContent(
    isConfigured: Boolean
) {
    val widgetBgColor = Color(0xFF0F172A)     // SlateDark
    val tealLight = Color(0xFF14B8A6)         // TealLight
    val textMuted = Color(0xFF94A3B8)         // TextMuted

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .cornerRadius(16.dp)
            .background(widgetBgColor)
            .padding(12.dp)
    ) {
        if (!isConfigured) {
            // UNCONFIGURED / SETUP STATE
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .clickable(actionStartActivity<MainActivity>()),
                verticalAlignment = Alignment.CenterVertically,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Veltis",
                    style = TextStyle(
                        color = ColorProvider(tealLight),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                )

                Spacer(modifier = GlanceModifier.height(4.dp))

                Text(
                    text = "Setup Required",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFFF59E0B)), // Amber
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                )

                Spacer(modifier = GlanceModifier.height(6.dp))

                Box(
                    modifier = GlanceModifier
                        .cornerRadius(8.dp)
                        .background(Color(0xFF1E293B))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Tap to connect account →",
                        style = TextStyle(
                            color = ColorProvider(Color.White),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Normal
                        )
                    )
                }
            }
        } else {
            // CONFIGURED / READY STATE
            Column(
                modifier = GlanceModifier.fillMaxSize(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Header row: Brand & Quick Add badge
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Veltis",
                        style = TextStyle(
                            color = ColorProvider(tealLight),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )

                    Spacer(modifier = GlanceModifier.defaultWeight())

                    Text(
                        text = "Quick Add",
                        style = TextStyle(
                            color = ColorProvider(textMuted),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Normal
                        )
                    )
                }

                Spacer(modifier = GlanceModifier.height(8.dp))

                // Action row: [ − Expense ] and [ + Income ]
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // [ − Expense ] Action Button
                    Box(
                        modifier = GlanceModifier
                            .defaultWeight()
                            .height(42.dp)
                            .cornerRadius(10.dp)
                            .background(Color(0xFF2E1518)) // Dark red tint
                            .clickable(actionStartActivity<QuickAddActivity>(actionParametersOf(transactionTypeParamKey to "expense"))),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "− Expense",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFFEF4444)), // ExpenseRed
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }

                    Spacer(modifier = GlanceModifier.width(8.dp))

                    // [ + Income ] Action Button
                    Box(
                        modifier = GlanceModifier
                            .defaultWeight()
                            .height(42.dp)
                            .cornerRadius(10.dp)
                            .background(Color(0xFF0D2821)) // Dark green tint
                            .clickable(actionStartActivity<QuickAddActivity>(actionParametersOf(transactionTypeParamKey to "income"))),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "+ Income",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFF10B981)), // IncomeGreen
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
            }
        }
    }
}
