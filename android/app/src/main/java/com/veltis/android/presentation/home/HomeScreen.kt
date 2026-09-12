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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.TransactionSummaryDto
import com.veltis.android.presentation.theme.*
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
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
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "VELTIS",
                            fontWeight = FontWeight.Black,
                            letterSpacing = 2.sp,
                            color = Color.White,
                            fontSize = 20.sp
                        )
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(TealDark.copy(alpha = 0.5f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "NATIVE",
                                color = TealLight,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.togglePrivacyMode() }) {
                        Icon(
                            imageVector = if (state.isPrivacyMode) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = "Toggle Privacy",
                            tint = if (state.isPrivacyMode) TealLight else TextMuted
                        )
                    }
                    IconButton(onClick = {
                        viewModel.loadDashboard(forceRefresh = true)
                        viewModel.syncOffline()
                    }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
            )
        },
        containerColor = VeltisDarkBg
    ) { padding ->
        if (state.isLoading && state.dashboard == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = TealLight)
            }
        } else {
            val dash = state.dashboard
            val currency = dash?.baseCurrency ?: "USD"

            LazyColumn(
                modifier = modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                // Net Wealth Hero Card
                item {
                    val netWorth = dash?.netWorth ?: 0.0
                    val totalAssets = dash?.totalAssets ?: 0.0
                    val totalLiabilities = dash?.totalLiabilities ?: 0.0

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(
                                        Color(0xFF131F37),
                                        Color(0xFF0F172A),
                                        Color(0xFF0D1B2A)
                                    )
                                )
                            )
                            .border(1.dp, VeltisCardBorder, RoundedCornerShape(20.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "NET WEALTH",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    letterSpacing = 1.5.sp,
                                    color = TextMuted
                                )
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(TealDark.copy(alpha = 0.4f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = currency,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TealLight
                                    )
                                }
                            }

                            Text(
                                text = if (state.isPrivacyMode) "••••••••" else formatCurrency(netWorth, currency),
                                fontSize = 32.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White
                            )

                            // Assets vs Liabilities
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                MiniMetricBox(
                                    label = "Assets",
                                    value = if (state.isPrivacyMode) "••••" else formatCurrency(totalAssets, currency),
                                    color = IncomeGreen,
                                    modifier = Modifier.weight(1f)
                                )
                                MiniMetricBox(
                                    label = "Liabilities",
                                    value = if (state.isPrivacyMode) "••••" else formatCurrency(totalLiabilities, currency),
                                    color = ExpenseRed,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }

                // Liquid Free to spend
                item {
                    val liquidTotal = dash?.liquidFreeToSpend ?: 0.0
                    val bankLiquid = dash?.liquidBank ?: 0.0
                    val cashLiquid = dash?.liquidCash ?: 0.0

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(VeltisCardBg)
                            .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                            .padding(16.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Liquid / Free-to-Spend",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = if (state.isPrivacyMode) "••••" else formatCurrency(liquidTotal, currency),
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TealLight
                                )
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Online / Bank: ${if (state.isPrivacyMode) "••••" else formatCurrency(bankLiquid, currency)}",
                                    fontSize = 12.sp,
                                    color = TextMuted
                                )
                                Text(
                                    text = "Physical Cash: ${if (state.isPrivacyMode) "••••" else formatCurrency(cashLiquid, currency)}",
                                    fontSize = 12.sp,
                                    color = TextMuted
                                )
                            }
                        }
                    }
                }

                // Quick Add Action Buttons
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        QuickActionPill(
                            title = "+ Income",
                            containerColor = IncomeGreenBg,
                            contentColor = IncomeGreen,
                            onClick = { onQuickAdd("income") },
                            modifier = Modifier.weight(1f)
                        )
                        QuickActionPill(
                            title = "− Expense",
                            containerColor = ExpenseRedBg,
                            contentColor = ExpenseRed,
                            onClick = { onQuickAdd("expense") },
                            modifier = Modifier.weight(1f)
                        )
                        QuickActionPill(
                            title = "⇄ Transfer",
                            containerColor = Color(0x222563EB),
                            contentColor = Color(0xFF60A5FA),
                            onClick = { onQuickAdd("transfer") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Accounts Section Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Your Accounts",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Manage",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TealLight,
                            modifier = Modifier.clickable { onNavigateToAccounts() }
                        )
                    }
                }

                // Account items
                val accounts = dash?.accounts ?: emptyList()
                if (accounts.isEmpty()) {
                    item {
                        EmptyStateCard(
                            message = "No accounts yet. Add an account to track your money.",
                            actionLabel = "Create Account",
                            onAction = onNavigateToAccounts
                        )
                    }
                } else {
                    items(accounts.take(4)) { acc ->
                        AccountItemRow(
                            account = acc,
                            isPrivacyMode = state.isPrivacyMode,
                            onClick = onNavigateToAccounts
                        )
                    }
                }

                // Recent Transactions Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Recent Transactions",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "View All",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TealLight,
                            modifier = Modifier.clickable { onNavigateToTransactions() }
                        )
                    }
                }

                // Recent Transactions list
                val recentTxns = dash?.recentTransactions ?: emptyList()
                if (recentTxns.isEmpty()) {
                    item {
                        EmptyStateCard(
                            message = "No transactions yet. Tap Quick Add to record one.",
                            actionLabel = "Add Expense",
                            onAction = { onQuickAdd("expense") }
                        )
                    }
                } else {
                    items(recentTxns) { txn ->
                        TransactionItemRow(
                            transaction = txn,
                            isPrivacyMode = state.isPrivacyMode
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(24.dp)) }
            }
        }
    }
}

@Composable
fun MiniMetricBox(
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF0F172A))
            .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Column {
            Text(text = label, fontSize = 11.sp, color = TextMuted)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun QuickActionPill(
    title: String,
    containerColor: Color,
    contentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(containerColor)
            .border(1.dp, contentColor.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = contentColor
        )
    }
}

@Composable
fun AccountItemRow(
    account: AccountDetailDto,
    isPrivacyMode: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(VeltisCardBg)
            .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = account.name,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Text(
                    text = account.accountType.replace("_", " ").uppercase(Locale.getDefault()),
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }
            Text(
                text = if (isPrivacyMode) "••••" else formatCurrency(account.balance, account.currency),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = if (account.balance >= 0) Color.White else ExpenseRed
            )
        }
    }
}

@Composable
fun TransactionItemRow(
    transaction: TransactionSummaryDto,
    isPrivacyMode: Boolean
) {
    val isIncome = transaction.type.equals("income", ignoreCase = true)
    val isTransfer = transaction.type.equals("transfer", ignoreCase = true)

    val color = when {
        isIncome -> IncomeGreen
        isTransfer -> Color(0xFF60A5FA)
        else -> ExpenseRed
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(VeltisCardBg)
            .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(color.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when {
                            isIncome -> Icons.Default.ArrowDownward
                            isTransfer -> Icons.Default.SwapHoriz
                            else -> Icons.Default.ArrowUpward
                        },
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = transaction.description?.takeIf { it.isNotBlank() } ?: (transaction.categoryName ?: transaction.type.replaceFirstChar { it.uppercase() }),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                    Text(
                        text = transaction.accountName ?: transaction.transactionDate.take(10),
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
            }

            Text(
                text = if (isPrivacyMode) "••••" else {
                    val prefix = if (isIncome) "+ " else if (isTransfer) "" else "- "
                    "$prefix${formatCurrency(transaction.amount, transaction.currency)}"
                },
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun EmptyStateCard(
    message: String,
    actionLabel: String,
    onAction: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(VeltisCardBg)
            .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
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
                Text(text = actionLabel, fontSize = 13.sp, color = Color.White)
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
