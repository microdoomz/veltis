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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.veltis.android.data.model.InvestmentPositionDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvestmentsScreen(
    viewModel: InvestmentsViewModel,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showTradeDialog by remember { mutableStateOf(false) }
    var tradeAction by remember { mutableStateOf("buy") }
    var selectedPosition by remember { mutableStateOf<InvestmentPositionDto?>(null) }

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
                actions = {
                    IconButton(onClick = { viewModel.loadInvestments() }) {
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
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    selectedPosition = null
                    tradeAction = "buy"
                    showTradeDialog = true
                },
                containerColor = TealLight,
                contentColor = Color.Black,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Add Investment")
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
            val data = state.data
            val positions = data?.positions ?: emptyList()

            LazyColumn(
                modifier = modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                // Portfolio Summary Hero Card
                item {
                    val valuation = data?.currentValuation ?: 0.0
                    val invested = data?.totalInvested ?: 0.0
                    val gainLoss = data?.totalGainLoss ?: 0.0
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
                            Text(
                                text = "PORTFOLIO VALUE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 1.sp,
                                color = TextMuted
                            )

                            Text(
                                text = if (state.isPrivacyMode) "••••••••" else formatCurrency(valuation, "USD"),
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
                                        Text(text = "Invested", fontSize = 11.sp, color = TextMuted)
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = if (state.isPrivacyMode) "••••" else formatCurrency(invested, "USD"),
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
                                        Text(text = "Unrealized P&L", fontSize = 11.sp, color = if (isGain) IncomeGreen else ExpenseRed)
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = if (state.isPrivacyMode) "••••" else {
                                                val sign = if (isGain) "+" else ""
                                                "$sign${formatCurrency(gainLoss, "USD")}"
                                            },
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isGain) IncomeGreen else ExpenseRed
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Positions List Header
                item {
                    Text(
                        text = "Holdings (${positions.size})",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                if (positions.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(VeltisCardBg)
                                .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                                .padding(24.dp),
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
                                    text = "Record stocks, ETFs, mutual funds, or crypto to track market performance.",
                                    fontSize = 12.sp,
                                    color = TextMuted,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                                Button(
                                    onClick = {
                                        selectedPosition = null
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
                        InvestmentPositionCard(
                            position = pos,
                            isPrivacyMode = state.isPrivacyMode,
                            onTrade = { action ->
                                selectedPosition = pos
                                tradeAction = action
                                showTradeDialog = true
                            }
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }

        // Dialog: Trade
        if (showTradeDialog) {
            InvestmentTradeDialog(
                position = selectedPosition,
                initialAction = tradeAction,
                isSubmitting = state.isSubmitting,
                onDismiss = { showTradeDialog = false },
                onExecute = { action, posId, symbol, units, price ->
                    viewModel.executeTrade(action, posId, symbol, units, price) {
                        showTradeDialog = false
                    }
                }
            )
        }
    }
}

@Composable
fun InvestmentPositionCard(
    position: InvestmentPositionDto,
    isPrivacyMode: Boolean,
    onTrade: (action: String) -> Unit
) {
    val isGain = position.unrealizedGainLoss >= 0
    val pnlColor = if (isGain) IncomeGreen else ExpenseRed

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
                Column {
                    Text(
                        text = position.symbol,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    position.name?.let {
                        Text(text = it, fontSize = 12.sp, color = TextMuted)
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = if (isPrivacyMode) "••••" else formatCurrency(position.currentValuation, position.currency),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = if (isPrivacyMode) "••••" else {
                            val sign = if (isGain) "+" else ""
                            "$sign${String.format("%.2f", position.unrealizedGainLossPercent)}%"
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = pnlColor
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Units: ${position.units} @ ${formatCurrency(position.averageBuyPrice, position.currency)}",
                    fontSize = 11.sp,
                    color = TextMuted
                )
                Text(
                    text = "Current: ${formatCurrency(position.currentPrice, position.currency)}",
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }

            Divider(color = VeltisCardBorder, thickness = 0.5.dp)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = { onTrade("buy") }) {
                    Text("Buy More", fontSize = 12.sp, color = TealLight)
                }
                TextButton(onClick = { onTrade("sell") }) {
                    Text("Sell", fontSize = 12.sp, color = ExpenseRed)
                }
            }
        }
    }
}

@Composable
fun InvestmentTradeDialog(
    position: InvestmentPositionDto?,
    initialAction: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onExecute: (action: String, posId: String?, symbol: String?, units: Double, price: Double) -> Unit
) {
    var action by remember { mutableStateOf(initialAction) }
    var symbol by remember { mutableStateOf(position?.symbol ?: "") }
    var unitsText by remember { mutableStateOf("") }
    var priceText by remember { mutableStateOf(position?.currentPrice?.toString() ?: "") }

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
                    text = if (position != null) "Trade ${position.symbol}" else "New Investment",
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
                    label = { Text("Price Per Unit", color = TextMuted) },
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
                        text = "Total Value: ${formatCurrency(calculatedTotal, "USD")}",
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
