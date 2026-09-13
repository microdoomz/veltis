package com.veltis.android.presentation.home

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.TransactionSummaryDto
import com.veltis.android.presentation.theme.*
import java.text.NumberFormat
import java.util.Locale

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onNavigateToTransactions: () -> Unit,
    onNavigateToAccounts: () -> Unit,
    onQuickAdd: (type: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    LaunchedEffect(state.offlineSyncedCount) {
        if (state.offlineSyncedCount > 0) {
            snackbarHostState.showSnackbar("Synced ${state.offlineSyncedCount} offline items to cloud!")
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = VeltisDarkBg
    ) { padding ->
        if (state.isLoading && state.dashboard == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = TealPrimary)
            }
        } else {
            val dash = state.dashboard
            val currency = dash?.baseCurrency ?: "USD"
            val netWorth = dash?.netWorth ?: 0.0
            val liquidTotal = dash?.liquidFreeToSpend ?: 0.0
            val bankLiquid = dash?.liquidBank ?: 0.0
            val cashLiquid = dash?.liquidCash ?: 0.0
            val accounts = dash?.accounts ?: emptyList()
            val recentTxns = dash?.recentTransactions ?: emptyList()

            LazyColumn(
                modifier = modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { Spacer(modifier = Modifier.height(8.dp)) }

                // PWA Header: "Overview" with Refresh button and subtitle
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "Overview",
                                    fontSize = 26.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TealPrimary,
                                    letterSpacing = (-0.5).sp
                                )
                                IconButton(
                                    onClick = {
                                        viewModel.loadDashboard(forceRefresh = true)
                                        viewModel.syncOffline()
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Refresh,
                                        contentDescription = "Refresh",
                                        tint = TextMuted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                            Text(
                                text = "Here is where you stand financially.",
                                fontSize = 13.sp,
                                color = TextMuted
                            )
                        }
                    }
                }

                // 1. Total Wealth Hero Card (Exact PWA Teal Gradient Card)
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = TealHero),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "Total Wealth",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.White.copy(alpha = 0.85f)
                            )

                            Text(
                                text = if (state.isPrivacyMode) "••••••••" else formatCurrency(netWorth, currency),
                                fontSize = 34.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White,
                                letterSpacing = (-0.5).sp
                            )

                            Text(
                                text = "Net balance across all accounts & investments",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    }
                }

                // 2. Liquid Balance Card (Exact PWA Slate-900 Card)
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                        border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Liquid Balance",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextMuted
                                )

                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = VeltisMutedBg,
                                    modifier = Modifier.padding(horizontal = 2.dp)
                                ) {
                                    Text(
                                        text = "Bank & Cash",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = TextMuted,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            Text(
                                text = if (state.isPrivacyMode) "••••••••" else formatCurrency(liquidTotal, currency),
                                fontSize = 30.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary,
                                letterSpacing = (-0.5).sp
                            )

                            HorizontalDivider(color = VeltisCardBorder)

                            // Sub-metrics: Free to spend & Allocated money
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                // Free to spend
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Shield,
                                            contentDescription = null,
                                            tint = IncomeGreen,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Text("Free to spend", fontSize = 11.sp, color = TextMuted)
                                    }

                                    Text(
                                        text = if (state.isPrivacyMode) "••••" else formatCurrency(liquidTotal, currency),
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = IncomeGreen
                                    )

                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Online: ${if (state.isPrivacyMode) "••••" else formatCurrency(bankLiquid, currency)}",
                                            fontSize = 10.sp,
                                            color = TextMuted
                                        )
                                        Text("•", fontSize = 10.sp, color = TextSubtle)
                                        Text(
                                            text = "Cash: ${if (state.isPrivacyMode) "••••" else formatCurrency(cashLiquid, currency)}",
                                            fontSize = 10.sp,
                                            color = TextMuted
                                        )
                                    }
                                }

                                // Allocated Money
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Lock,
                                            contentDescription = null,
                                            tint = WarningAmber,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Text("Allocated money", fontSize = 11.sp, color = TextMuted)
                                    }

                                    Text(
                                        text = if (state.isPrivacyMode) "••••" else formatCurrency(0.0, currency),
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = WarningAmber
                                    )
                                }
                            }
                        }
                    }
                }

                // 3. Your Accounts Section
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Your Accounts",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )

                        Text(
                            text = "View all accounts \u2192",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TealPrimary,
                            modifier = Modifier.clickable { onNavigateToAccounts() }
                        )
                    }
                }

                if (accounts.isEmpty()) {
                    item {
                        EmptyStateCard(
                            message = "No accounts yet. Add an account to start tracking.",
                            actionLabel = "Create Account",
                            onAction = onNavigateToAccounts
                        )
                    }
                } else {
                    items(accounts.take(4)) { acc ->
                        AccountCardPwa(
                            account = acc,
                            isPrivacyMode = state.isPrivacyMode,
                            onClick = onNavigateToAccounts
                        )
                    }
                }

                // 4. Recent Activity Section
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Recent Activity",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )

                        Text(
                            text = "View all transactions \u2192",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TealPrimary,
                            modifier = Modifier.clickable { onNavigateToTransactions() }
                        )
                    }
                }

                if (recentTxns.isEmpty()) {
                    item {
                        EmptyStateCard(
                            message = "No transactions yet. Tap Quick Add to record one.",
                            actionLabel = "Add Expense",
                            onAction = { onQuickAdd("expense") }
                        )
                    }
                } else {
                    item {
                        // Enclosed in a single card with dividers just like PWA
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column {
                                recentTxns.take(5).forEachIndexed { index, txn ->
                                    TransactionRowPwa(
                                        transaction = txn,
                                        isPrivacyMode = state.isPrivacyMode
                                    )
                                    if (index < recentTxns.take(5).size - 1) {
                                        HorizontalDivider(color = VeltisCardBorder)
                                    }
                                }
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
fun AccountCardPwa(
    account: AccountDetailDto,
    isPrivacyMode: Boolean,
    onClick: () -> Unit
) {
    val isLiability = account.accountType.equals("credit_card", ignoreCase = true)
    val accentColor = try {
        if (!account.color.isNullOrBlank()) Color(android.graphics.Color.parseColor(account.color)) else TealPrimary
    } catch (_: Exception) {
        if (isLiability) ExpenseRed else TealPrimary
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (isLiability) ExpenseRed.copy(alpha = 0.3f) else VeltisCardBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Colored left pill / dot container
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(accentColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when {
                            isLiability -> Icons.Default.CreditCard
                            account.accountType.contains("cash", ignoreCase = true) -> Icons.Default.Wallet
                            account.accountType.contains("invest", ignoreCase = true) -> Icons.Default.TrendingUp
                            else -> Icons.Default.AccountBalance
                        },
                        contentDescription = null,
                        tint = accentColor,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = account.name,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(accentColor)
                        )
                    }
                    Text(
                        text = account.accountType.replace("_", " ").uppercase(Locale.getDefault()),
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = if (isPrivacyMode) "••••" else formatCurrency(account.balance, account.currency),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isLiability) ExpenseRed else TextPrimary
                )
                Text(
                    text = if (isLiability) "Current Debt" else "Total Balance",
                    fontSize = 10.sp,
                    color = TextSubtle
                )
            }
        }
    }
}

@Composable
fun TransactionRowPwa(
    transaction: TransactionSummaryDto,
    isPrivacyMode: Boolean
) {
    val isIncome = transaction.type.equals("income", ignoreCase = true)
    val isTransfer = transaction.type.equals("transfer", ignoreCase = true)

    val color = when {
        isIncome -> IncomeGreen
        isTransfer -> VeltisBlue
        else -> ExpenseRed
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 13.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = transaction.description?.takeIf { it.isNotBlank() }
                    ?: (transaction.categoryName ?: transaction.type.replaceFirstChar { it.uppercase() }),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
                maxLines = 1
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = transaction.transactionDate.take(10),
                    fontSize = 11.sp,
                    color = TextMuted
                )
                if (!transaction.categoryName.isNullOrBlank()) {
                    Text("\u2022", fontSize = 11.sp, color = TextSubtle)
                    Text(
                        text = transaction.categoryName,
                        fontSize = 11.sp,
                        color = TextMuted,
                        maxLines = 1
                    )
                }
            }
        }

        Text(
            text = if (isPrivacyMode) "••••" else {
                val prefix = if (isIncome) "+ " else if (isTransfer) "" else "- "
                "$prefix${formatCurrency(transaction.amount, transaction.currency)}"
            },
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = color
        )
    }
}

@Composable
fun EmptyStateCard(
    message: String,
    actionLabel: String,
    onAction: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
        border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = message,
                fontSize = 13.sp,
                color = TextMuted,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Button(
                onClick = onAction,
                colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text(text = actionLabel, fontSize = 13.sp, color = Color(0xFF020617), fontWeight = FontWeight.Bold)
            }
        }
    }
}

fun formatCurrency(amount: Double, currency: String = "USD"): String {
    return try {
        val format = NumberFormat.getCurrencyInstance(Locale.US)
        format.currency = java.util.Currency.getInstance(currency.uppercase())
        format.format(amount)
    } catch (_: Exception) {
        String.format(Locale.US, "%s %.2f", currency, amount)
    }
}
