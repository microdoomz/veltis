package com.veltis.android.presentation.investments

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.InvestmentPositionDto
import com.veltis.android.data.model.InvestmentTransactionDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.theme.*
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvestmentsScreen(
    viewModel: InvestmentsViewModel,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Dialog & Action States
    var showTopUpDialog by remember { mutableStateOf(false) }
    var topUpTargetPosition by remember { mutableStateOf<InvestmentPositionDto?>(null) }

    var showTradeDialog by remember { mutableStateOf(false) }
    var tradeAction by remember { mutableStateOf("buy") }
    var selectedPositionForTrade by remember { mutableStateOf<InvestmentPositionDto?>(null) }

    var showCashActionDialog by remember { mutableStateOf(false) }
    var cashActionType by remember { mutableStateOf("contribution") }

    var positionToEdit by remember { mutableStateOf<InvestmentPositionDto?>(null) }
    var txToDelete by remember { mutableStateOf<InvestmentTransactionDto?>(null) }

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
        }
    }

    LaunchedEffect(state.successMessage) {
        state.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
        }
    }

    val data = state.data
    val positions = data?.positions ?: emptyList()
    val history = data?.history ?: emptyList()
    val activeCurrency = positions.firstOrNull()?.currency ?: state.baseCurrency

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Investments",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 20.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onMenuClick) {
                        Icon(imageVector = Icons.Default.Menu, contentDescription = "Menu", tint = Color.White)
                    }
                },
                actions = {
                    // Sync Prices in TopAppBar
                    IconButton(
                        onClick = { viewModel.syncPrices() },
                        enabled = !state.isSyncingPrices && !state.isRefreshing
                    ) {
                        if (state.isSyncingPrices) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = TealLight,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.CloudSync,
                                contentDescription = "Sync Live NAV Prices",
                                tint = TealLight
                            )
                        }
                    }

                    // Refresh
                    IconButton(
                        onClick = { viewModel.loadInvestments(forceRefresh = true) },
                        enabled = !state.isRefreshing && !state.isSyncingPrices
                    ) {
                        if (state.isRefreshing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = TealPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = Color.White
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    if (positions.isNotEmpty()) {
                        topUpTargetPosition = positions.first()
                        showTopUpDialog = true
                    } else {
                        selectedPositionForTrade = null
                        tradeAction = "buy"
                        showTradeDialog = true
                    }
                },
                containerColor = TealLight,
                contentColor = Color.Black,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Invest")
            }
        },
        containerColor = VeltisDarkBg
    ) { padding ->
        if (state.isLoading && state.data == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = TealLight)
            }
        } else {
            LazyColumn(
                modifier = modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                // 1. Portfolio Summary Hero Card
                item {
                    val valuation = data?.currentValuation ?: 0.0
                    val invested = data?.totalInvested ?: 0.0
                    val gainLoss = data?.totalGainLoss ?: 0.0
                    val gainLossPct = data?.totalGainLossPercent ?: (if (invested > 0) (gainLoss / invested) * 100 else 0.0)
                    val isGain = gainLoss >= 0

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(VeltisCardBg)
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
                                    text = "PORTFOLIO VALUE",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    letterSpacing = 1.sp,
                                    color = TextMuted
                                )

                                TextButton(
                                    onClick = { viewModel.syncPrices() },
                                    enabled = !state.isSyncingPrices
                                ) {
                                    if (state.isSyncingPrices) {
                                        CircularProgressIndicator(modifier = Modifier.size(12.dp), color = TealLight, strokeWidth = 1.5.dp)
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Syncing...", fontSize = 11.sp, color = TealLight)
                                    } else {
                                        Icon(imageVector = Icons.Default.Refresh, contentDescription = null, tint = TealLight, modifier = Modifier.size(13.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Sync Prices", fontSize = 11.sp, color = TealLight, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            Text(
                                text = if (state.isPrivacyMode) "••••••••" else formatCurrency(valuation, activeCurrency),
                                fontSize = 28.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFF0F172A))
                                        .padding(12.dp)
                                ) {
                                    Column {
                                        Text(text = "Total Invested", fontSize = 11.sp, color = TextMuted)
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = if (state.isPrivacyMode) "••••" else formatCurrency(invested, activeCurrency),
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }

                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(if (isGain) IncomeGreenBg else ExpenseRedBg)
                                        .padding(12.dp)
                                ) {
                                    Column {
                                        Text(text = "Total Returns", fontSize = 11.sp, color = if (isGain) IncomeGreen else ExpenseRed)
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = if (state.isPrivacyMode) "••••" else {
                                                val sign = if (isGain) "+" else ""
                                                "$sign${formatCurrency(gainLoss, activeCurrency)} (${String.format(Locale.US, "%.2f", gainLossPct)}%)"
                                            },
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isGain) IncomeGreen else ExpenseRed
                                        )
                                    }
                                }
                            }

                            Text(
                                text = "Market values reflect verified daily NAV price feeds.",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                    }
                }

                // 2. Action Buttons Row: One-Time Investment (Top Up) & Trade / Cash Actions
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                topUpTargetPosition = positions.firstOrNull()
                                showTopUpDialog = true
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = IncomeGreen),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(imageVector = Icons.Default.AddCircleOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("One-Time Investment", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = {
                                selectedPositionForTrade = positions.firstOrNull()
                                tradeAction = "buy"
                                showTradeDialog = true
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Icon(imageVector = Icons.Default.SwapHoriz, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Trade / Cash", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // 3. Holdings Section Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Holdings (${positions.size})",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                if (positions.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(VeltisCardBg)
                                .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                                .padding(28.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text(
                                    text = "No investment holdings yet",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.White
                                )
                                Text(
                                    text = "Record mutual funds, stocks, or ETFs to track market returns and unit allocations.",
                                    fontSize = 12.sp,
                                    color = TextMuted,
                                    textAlign = TextAlign.Center
                                )
                                Button(
                                    onClick = {
                                        selectedPositionForTrade = null
                                        tradeAction = "buy"
                                        showTradeDialog = true
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary)
                                ) {
                                    Text("Add Holding", color = Color.White)
                                }
                            }
                        }
                    }
                } else {
                    items(positions, key = { it.id }) { pos ->
                        InvestmentHoldingCard(
                            position = pos,
                            baseCurrency = activeCurrency,
                            isPrivacyMode = state.isPrivacyMode,
                            onTopUp = {
                                topUpTargetPosition = pos
                                showTopUpDialog = true
                            },
                            onEdit = {
                                positionToEdit = pos
                            },
                            onTrade = { action ->
                                selectedPositionForTrade = pos
                                tradeAction = action
                                showTradeDialog = true
                            }
                        )
                    }
                }

                // 4. Investment Activity & Transactions History Section
                item {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Investment Activity & Transactions (${history.size})",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "All contributions, top-ups, transfers, and trades recorded for your investment accounts.",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }

                if (history.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(VeltisCardBg)
                                .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                                .padding(20.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No investment transactions recorded yet.\nTop-ups, SIPs, and trades will appear here.",
                                fontSize = 12.sp,
                                color = TextMuted,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    items(history, key = { it.id }) { txItem ->
                        val isBuy = txItem.transactionType.equals("buy", ignoreCase = true)
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
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = txItem.positionName,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color.White,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )

                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(if (isBuy) IncomeGreenBg else ExpenseRedBg)
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = if (isBuy) "Buy / Add" else "Sell / Withdraw",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isBuy) IncomeGreen else ExpenseRed
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "${txItem.transactionDate} • ${if (isBuy) "+" else "-"}${String.format(Locale.US, "%.4f", txItem.units)} units @ ${formatCurrency(txItem.price, txItem.currency)}",
                                        fontSize = 11.sp,
                                        color = TextMuted
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        text = if (state.isPrivacyMode) "••••" else {
                                            val sign = if (isBuy) "+" else "-"
                                            "$sign${formatCurrency(txItem.amount, txItem.currency)}"
                                        },
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isBuy) IncomeGreen else ExpenseRed
                                    )

                                    IconButton(
                                        onClick = { txToDelete = txItem },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.DeleteOutline,
                                            contentDescription = "Delete",
                                            tint = ExpenseRed,
                                            modifier = Modifier.size(16.dp)
                                        )
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

    // Modal: Top-Up One-Time Investment
    if (showTopUpDialog) {
        TopUpInvestmentDialog(
            positions = positions,
            selectedPosition = topUpTargetPosition,
            accounts = state.accounts,
            baseCurrency = activeCurrency,
            isSubmitting = state.isSubmitting,
            onDismiss = { showTopUpDialog = false },
            onConfirm = { posId, amt, price, curr, srcAccId ->
                viewModel.topUpPosition(posId, amt, price, curr, srcAccId) {
                    showTopUpDialog = false
                }
            }
        )
    }

    // Modal: Trade (Buy / Sell)
    if (showTradeDialog) {
        InvestmentTradeDialog(
            position = selectedPositionForTrade,
            initialAction = tradeAction,
            baseCurrency = activeCurrency,
            isSubmitting = state.isSubmitting,
            onDismiss = { showTradeDialog = false },
            onExecute = { action, posId, symbol, units, price ->
                viewModel.executeTrade(action, posId, symbol, units, price) {
                    showTradeDialog = false
                }
            }
        )
    }

    // Modal: Edit Investment Position
    positionToEdit?.let { pos ->
        EditInvestmentPositionDialog(
            position = pos,
            isSubmitting = state.isSubmitting,
            onDismiss = { positionToEdit = null },
            onSave = { name, symbol, units, currentPrice, invested ->
                val fAccId = pos.financialAccountId ?: pos.id
                viewModel.updatePosition(fAccId, name, symbol, units, currentPrice, invested) {
                    positionToEdit = null
                }
            }
        )
    }

    // Modal: Delete Transaction Confirmation
    txToDelete?.let { txItem ->
        Dialog(onDismissRequest = { if (!state.isSubmitting) txToDelete = null }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(VeltisCardBg)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(20.dp))
                    .padding(20.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(ExpenseRedBg),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(imageVector = Icons.Default.Delete, contentDescription = null, tint = ExpenseRed)
                        }
                        Column {
                            Text(text = "Delete Transaction?", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text(text = "Reverses holding units and invested amount", fontSize = 11.sp, color = TextMuted)
                        }
                    }

                    Text(
                        text = "Are you sure you want to delete the transaction of ${formatCurrency(txItem.amount, txItem.currency)} on ${txItem.positionName}?\n\nThis will remove the transaction record and reverse the units and invested amount from your holdings.",
                        fontSize = 12.sp,
                        color = Color(0xFFCBD5E1),
                        lineHeight = 17.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = { txToDelete = null }, enabled = !state.isSubmitting) {
                            Text("Cancel", color = TextMuted)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                viewModel.deleteTransaction(txItem.id, txItem.transactionId)
                                txToDelete = null
                            },
                            enabled = !state.isSubmitting,
                            colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (state.isSubmitting) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                            } else {
                                Text("Delete & Reverse", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun InvestmentHoldingCard(
    position: InvestmentPositionDto,
    baseCurrency: String,
    isPrivacyMode: Boolean,
    onTopUp: () -> Unit,
    onEdit: () -> Unit,
    onTrade: (action: String) -> Unit
) {
    val isGain = position.unrealizedGainLoss >= 0
    val pnlColor = if (isGain) IncomeGreen else ExpenseRed
    val curr = position.currency.ifBlank { baseCurrency }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(VeltisCardBg)
            .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Header: Name & Symbol, Current Valuation & Total Returns
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = position.name ?: position.symbol,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        if (position.symbol.isNotBlank()) {
                            Text(text = position.symbol, fontSize = 11.sp, color = TextMuted)
                            Text(text = "•", fontSize = 11.sp, color = TextMuted)
                        }
                        Text(text = position.assetType.replace('_', ' '), fontSize = 11.sp, color = TextMuted)
                        if (position.isEstimated) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Color(0x2814B8A6))
                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                            ) {
                                Text("LIVE", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = TealLight)
                            }
                        }
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = if (isPrivacyMode) "••••" else formatCurrency(position.currentValuation, curr),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = if (isPrivacyMode) "••••" else {
                            val sign = if (isGain) "+" else ""
                            "$sign${formatCurrency(position.unrealizedGainLoss, curr)} (${String.format(Locale.US, "%.2f", position.unrealizedGainLossPercent)}%)"
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = pnlColor
                    )
                }
            }

            // Metrics Grid: Units, Invested, Avg NAV, Current NAV
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF0F172A))
                    .padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Units Held", fontSize = 10.sp, color = TextMuted)
                    Text(
                        String.format(Locale.US, "%.4f", position.units),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
                Column {
                    Text("Invested", fontSize = 10.sp, color = TextMuted)
                    Text(
                        if (isPrivacyMode) "••••" else formatCurrency(position.totalInvested, curr),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
                Column {
                    Text("Avg NAV", fontSize = 10.sp, color = TextMuted)
                    Text(
                        formatCurrency(position.averageBuyPrice, curr),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
                Column {
                    Text("Current NAV", fontSize = 10.sp, color = TextMuted)
                    Text(
                        formatCurrency(position.currentPrice, curr),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TealLight
                    )
                }
            }

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onEdit) {
                    Icon(imageVector = Icons.Default.Edit, contentDescription = null, tint = TextMuted, modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Edit", fontSize = 11.sp, color = TextMuted)
                }
                Spacer(modifier = Modifier.width(4.dp))
                Button(
                    onClick = onTopUp,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0x3010B981)),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("+ Top Up", fontSize = 11.sp, color = IncomeGreen, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.width(4.dp))
                Button(
                    onClick = { onTrade("buy") },
                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Buy", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.width(4.dp))
                Button(
                    onClick = { onTrade("sell") },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0x30EF4444)),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Sell", fontSize = 11.sp, color = ExpenseRed, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun TopUpInvestmentDialog(
    positions: List<InvestmentPositionDto>,
    selectedPosition: InvestmentPositionDto?,
    accounts: List<AccountDetailDto>,
    baseCurrency: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (positionId: String, amount: Double, price: Double, currency: String, sourceAccountId: String?) -> Unit
) {
    var chosenPosId by remember { mutableStateOf(selectedPosition?.id ?: positions.firstOrNull()?.id ?: "") }
    var amountText by remember { mutableStateOf("") }
    var sourceAccId by remember { mutableStateOf("") }

    val liquidAccounts = accounts.filter { !it.accountType.equals("investment", ignoreCase = true) }
    val currentPos = positions.find { it.id == chosenPosId } ?: positions.firstOrNull()
    val curr = currentPos?.currency?.ifBlank { baseCurrency } ?: baseCurrency
    val navPrice = currentPos?.let { if (it.currentPrice > 0) it.currentPrice else it.averageBuyPrice } ?: 1.0

    val amtNum = amountText.toDoubleOrNull() ?: 0.0
    val incUnits = if (navPrice > 0 && amtNum > 0) amtNum / navPrice else 0.0
    val newTotalUnits = (currentPos?.units ?: 0.0) + incUnits

    Dialog(onDismissRequest = { if (!isSubmitting) onDismiss() }) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(VeltisCardBg)
                .border(1.dp, VeltisCardBorder, RoundedCornerShape(20.dp))
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("One-Time Investment", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("Invest a lump sum into an existing holding.", fontSize = 11.sp, color = TextMuted)
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                    }
                }

                // Target Fund selector
                var showPosMenu by remember { mutableStateOf(false) }
                Box {
                    OutlinedTextField(
                        value = currentPos?.name ?: currentPos?.symbol ?: "Select Holding",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Target Holding / Fund", color = TextMuted) },
                        modifier = Modifier.fillMaxWidth().clickable { showPosMenu = true },
                        trailingIcon = {
                            IconButton(onClick = { showPosMenu = true }) {
                                Icon(imageVector = Icons.Default.ArrowDropDown, contentDescription = null, tint = TextMuted)
                            }
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )
                    DropdownMenu(expanded = showPosMenu, onDismissRequest = { showPosMenu = false }) {
                        positions.forEach { p ->
                            DropdownMenuItem(
                                text = { Text("${p.name ?: p.symbol} (${formatCurrency(p.currentPrice, p.currency)})") },
                                onClick = { chosenPosId = p.id; showPosMenu = false }
                            )
                        }
                    }
                }

                // Amount
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Investment Amount ($curr)", color = TextMuted) },
                    placeholder = { Text("e.g. 5000", color = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    )
                )

                // Source Bank Account
                var showAccMenu by remember { mutableStateOf(false) }
                val chosenAcc = liquidAccounts.find { it.id == sourceAccId }
                Box {
                    OutlinedTextField(
                        value = chosenAcc?.let { "${it.name} (${it.accountType})" } ?: "Direct Top-up (No bank deduction)",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Paid From (Bank / Wallet)", color = TextMuted) },
                        modifier = Modifier.fillMaxWidth().clickable { showAccMenu = true },
                        trailingIcon = {
                            IconButton(onClick = { showAccMenu = true }) {
                                Icon(imageVector = Icons.Default.ArrowDropDown, contentDescription = null, tint = TextMuted)
                            }
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )
                    DropdownMenu(expanded = showAccMenu, onDismissRequest = { showAccMenu = false }) {
                        DropdownMenuItem(
                            text = { Text("Direct Top-up (No bank deduction)") },
                            onClick = { sourceAccId = ""; showAccMenu = false }
                        )
                        liquidAccounts.forEach { a ->
                            DropdownMenuItem(
                                text = { Text("${a.name} (${a.accountType})") },
                                onClick = { sourceAccId = a.id; showAccMenu = false }
                            )
                        }
                    }
                }

                // Real-time Calculation Summary
                if (amtNum > 0 && currentPos != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0F172A))
                            .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Current Verified NAV:", fontSize = 11.sp, color = TextMuted)
                                Text(formatCurrency(navPrice, curr), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("New Units Purchased:", fontSize = 11.sp, color = TextMuted)
                                Text("+${String.format(Locale.US, "%.4f", incUnits)} units", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TealLight)
                            }
                            Divider(color = VeltisCardBorder, thickness = 0.5.dp)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Updated Total Holding:", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text("${String.format(Locale.US, "%.4f", newTotalUnits)} units", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                        Text("Cancel", color = TextMuted)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (currentPos != null && amtNum > 0) {
                                onConfirm(currentPos.id, amtNum, navPrice, curr, sourceAccId.ifBlank { null })
                            }
                        },
                        enabled = !isSubmitting && amtNum > 0 && currentPos != null,
                        colors = ButtonDefaults.buttonColors(containerColor = IncomeGreen),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                        } else {
                            Text("Confirm Top-Up", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EditInvestmentPositionDialog(
    position: InvestmentPositionDto,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSave: (name: String?, symbol: String?, units: Double?, currentPrice: Double?, investedAmount: Double?) -> Unit
) {
    var name by remember { mutableStateOf(position.name ?: "") }
    var symbol by remember { mutableStateOf(position.symbol) }
    var unitsText by remember { mutableStateOf(position.units.toString()) }
    var priceText by remember { mutableStateOf(position.currentPrice.toString()) }
    var investedText by remember { mutableStateOf(position.totalInvested.toString()) }

    Dialog(onDismissRequest = { if (!isSubmitting) onDismiss() }) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(VeltisCardBg)
                .border(1.dp, VeltisCardBorder, RoundedCornerShape(20.dp))
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Edit Investment Position",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Correct scheme name, symbol code, live NAV, units held, or invested amount.",
                    fontSize = 11.sp,
                    color = TextMuted
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Asset / Scheme Name", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    )
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = symbol,
                        onValueChange = { symbol = it },
                        label = { Text("Scheme Code / Symbol", color = TextMuted) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )

                    OutlinedTextField(
                        value = priceText,
                        onValueChange = { priceText = it },
                        label = { Text("Current NAV", color = TextMuted) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = unitsText,
                        onValueChange = { unitsText = it },
                        label = { Text("Units Held", color = TextMuted) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )

                    OutlinedTextField(
                        value = investedText,
                        onValueChange = { investedText = it },
                        label = { Text("Invested Amount", color = TextMuted) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                        Text("Cancel", color = TextMuted)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val u = unitsText.toDoubleOrNull()
                            val p = priceText.toDoubleOrNull()
                            val inv = investedText.toDoubleOrNull()
                            onSave(name.ifBlank { null }, symbol.ifBlank { null }, u, p, inv)
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                        } else {
                            Text("Save Changes", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun InvestmentTradeDialog(
    position: InvestmentPositionDto?,
    initialAction: String,
    baseCurrency: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onExecute: (action: String, posId: String?, symbol: String?, units: Double, price: Double) -> Unit
) {
    var action by remember { mutableStateOf(initialAction) }
    var symbol by remember { mutableStateOf(position?.symbol ?: "") }
    var unitsText by remember { mutableStateOf("") }
    var priceText by remember { mutableStateOf(position?.currentPrice?.toString() ?: "") }
    val curr = position?.currency?.ifBlank { baseCurrency } ?: baseCurrency

    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(VeltisCardBg)
                .border(1.dp, VeltisCardBorder, RoundedCornerShape(20.dp))
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = if (position != null) "Trade ${position.symbol.ifBlank { position.name }}" else "New Investment",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                // Buy / Sell toggles
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (action == "buy") IncomeGreenBg else Color(0xFF0F172A))
                            .border(1.dp, if (action == "buy") IncomeGreen else VeltisCardBorder, RoundedCornerShape(8.dp))
                            .clickable { action = "buy" }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Buy",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (action == "buy") IncomeGreen else TextMuted
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (action == "sell") ExpenseRedBg else Color(0xFF0F172A))
                            .border(1.dp, if (action == "sell") ExpenseRed else VeltisCardBorder, RoundedCornerShape(8.dp))
                            .clickable { action = "sell" }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Sell",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (action == "sell") ExpenseRed else TextMuted
                        )
                    }
                }

                if (position == null) {
                    OutlinedTextField(
                        value = symbol,
                        onValueChange = { symbol = it.uppercase() },
                        label = { Text("Ticker / Symbol", color = TextMuted) },
                        placeholder = { Text("e.g. AAPL, BTC, VOO", color = TextMuted) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )
                }

                OutlinedTextField(
                    value = unitsText,
                    onValueChange = { unitsText = it },
                    label = { Text("Units / Shares", color = TextMuted) },
                    placeholder = { Text("e.g. 10", color = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    )
                )

                OutlinedTextField(
                    value = priceText,
                    onValueChange = { priceText = it },
                    label = { Text("Price Per Unit ($curr)", color = TextMuted) },
                    placeholder = { Text("e.g. 150.00", color = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    )
                )

                val calculatedTotal = (unitsText.toDoubleOrNull() ?: 0.0) * (priceText.toDoubleOrNull() ?: 0.0)
                if (calculatedTotal > 0) {
                    Text(
                        text = "Total Value: ${formatCurrency(calculatedTotal, curr)}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TealLight
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = TextMuted)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val u = unitsText.toDoubleOrNull() ?: 0.0
                            val p = priceText.toDoubleOrNull() ?: 0.0
                            onExecute(action, position?.id, symbol, u, p)
                        },
                        enabled = !isSubmitting && (unitsText.toDoubleOrNull() ?: 0.0) > 0 && (priceText.toDoubleOrNull() ?: 0.0) > 0,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (action == "buy") IncomeGreen else ExpenseRed
                        )
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                        } else {
                            Text(if (action == "buy") "Execute Buy" else "Execute Sell", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
