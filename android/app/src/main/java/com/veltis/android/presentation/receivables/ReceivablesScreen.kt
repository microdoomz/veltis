package com.veltis.android.presentation.receivables

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.veltis.android.data.model.ReceivableDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceivablesScreen(
    viewModel: MoreViewModel,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showAddDialog by remember { mutableStateOf(false) }
    var settleTarget by remember { mutableStateOf<ReceivableDto?>(null) }

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

    val openReceivables = remember(state.receivables) {
        state.receivables.filter { it.status.lowercase() != "received" && it.status.lowercase() != "cancelled" }
    }

    val totalExpectedMinor = remember(state.receivables) {
        openReceivables.sumOf { it.displayAmount }
    }

    val currency = state.baseCurrency

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Receivables",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 20.sp
                        )
                        Text(
                            text = "${openReceivables.size} pending collections",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onMenuClick) {
                        Icon(imageVector = Icons.Default.Menu, contentDescription = "Menu", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadAllData() }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = TealLight,
                contentColor = Color.Black,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Add Receivable")
            }
        },
        containerColor = VeltisDarkBg
    ) { padding ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item { Spacer(modifier = Modifier.height(4.dp)) }

            // 1. Top Summary Metric Cards (Exact PWA Parity)
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Total Expected Receivables Card
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                        border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Total Expected",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextMuted
                                )
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(IncomeGreenBg),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowDownward,
                                        contentDescription = null,
                                        tint = IncomeGreen,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            Text(
                                text = if (state.isPrivacyMode) "••••" else formatCurrency(totalExpectedMinor, currency),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = IncomeGreen
                            )
                            Text(
                                text = "Pending to receive",
                                fontSize = 10.sp,
                                color = TextSubtle
                            )
                        }
                    }

                    // Pending Collections Count Card
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                        border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Pending Count",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextMuted
                                )
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(VeltisMutedBg),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ReceiptLong,
                                        contentDescription = null,
                                        tint = TextMuted,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            Text(
                                text = "${openReceivables.size}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Open debtors",
                                fontSize = 10.sp,
                                color = TextSubtle
                            )
                        }
                    }
                }
            }

            // 2. Section Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Money Owed To You (${state.receivables.size})",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            // 3. Receivables Feed
            if (state.isLoading && state.receivables.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = TealLight)
                    }
                }
            } else if (state.receivables.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(VeltisCardBg)
                            .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ReceiptLong,
                                contentDescription = null,
                                tint = TextMuted,
                                modifier = Modifier.size(48.dp)
                            )
                            Text(
                                text = "No receivables recorded",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Money lent or owed to you by others will appear here.",
                                fontSize = 13.sp,
                                color = TextMuted,
                                textAlign = TextAlign.Center
                            )
                            Button(
                                onClick = { showAddDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Add First Receivable", color = Color.White)
                            }
                        }
                    }
                }
            } else {
                items(state.receivables, key = { it.id }) { receivable ->
                    ReceivableCard(
                        receivable = receivable,
                        isPrivacyMode = state.isPrivacyMode,
                        onSettle = { settleTarget = receivable }
                    )
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }

        // Add Receivable Dialog
        if (showAddDialog) {
            AddReceivableDialog(
                accounts = state.accounts,
                baseCurrency = state.baseCurrency,
                isSubmitting = state.isSubmitting,
                onDismiss = { showAddDialog = false },
                onCreate = { counterparty, amt, curr, createdDate, expectedDate, srcAcc, note ->
                    viewModel.createReceivable(
                        counterpartyName = counterparty,
                        amount = amt,
                        currency = curr,
                        createdDate = createdDate,
                        expectedDate = expectedDate,
                        sourceAccountId = srcAcc,
                        note = note
                    ) {
                        showAddDialog = false
                    }
                }
            )
        }

        // Settle Receivable Dialog
        settleTarget?.let { target ->
            SettleReceivableDialog(
                receivable = target,
                accounts = state.accounts,
                isSubmitting = state.isSubmitting,
                onDismiss = { settleTarget = null },
                onSettle = { accId, amt, date ->
                    viewModel.settleReceivable(
                        id = target.id,
                        accountId = accId,
                        amount = amt,
                        settledAt = date
                    ) {
                        settleTarget = null
                    }
                }
            )
        }
    }
}

@Composable
fun ReceivableCard(
    receivable: ReceivableDto,
    isPrivacyMode: Boolean,
    onSettle: () -> Unit
) {
    val isReceived = receivable.status.equals("received", ignoreCase = true)
    val isPartial = receivable.status.equals("partially_received", ignoreCase = true)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(VeltisCardBg)
            .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = receivable.counterpartyName,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    // Metadata Row
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        receivable.createdDate?.let {
                            Text(text = "Created: ${it.take(10)}", fontSize = 11.sp, color = TextSubtle)
                        }
                        (receivable.expectedDate ?: receivable.dueDate)?.let {
                            Text(text = "•", fontSize = 11.sp, color = TextSubtle)
                            Text(text = "Expected: ${it.take(10)}", fontSize = 11.sp, color = TealLight)
                        }
                    }

                    val noteText = receivable.note ?: receivable.notes
                    if (!noteText.isNullOrBlank()) {
                        Text(text = "Note: $noteText", fontSize = 11.sp, color = TextMuted, maxLines = 1)
                    }
                }

                // Amount
                Text(
                    text = if (isPrivacyMode) "••••" else formatCurrency(receivable.displayAmount, receivable.currency),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = IncomeGreen
                )
            }

            HorizontalDivider(color = VeltisCardBorder.copy(alpha = 0.6f))

            // Status and Settle Button Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Status Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            when {
                                isReceived -> IncomeGreenBg
                                isPartial -> Color(0x332563EB)
                                else -> WarningAmberBg
                            }
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = when {
                            isReceived -> "Fully Received"
                            isPartial -> "Partially Received"
                            else -> "Pending Collection"
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            isReceived -> IncomeGreen
                            isPartial -> Color(0xFF60A5FA)
                            else -> WarningAmber
                        }
                    )
                }

                if (!isReceived) {
                    Button(
                        onClick = onSettle,
                        colors = ButtonDefaults.buttonColors(containerColor = TealLight),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Settle", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun AddReceivableDialog(
    accounts: List<AccountDetailDto>,
    baseCurrency: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onCreate: (counterparty: String, amount: Double, currency: String, createdDate: String?, expectedDate: String?, srcAccount: String?, note: String?) -> Unit
) {
    var counterpartyName by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("") }
    var expectedDate by remember { mutableStateOf("") }
    var selectedSourceAccountId by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf("") }
    val today = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) }

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
                    text = "Add Receivable",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                // Debtor / Counterparty Name
                OutlinedTextField(
                    value = counterpartyName,
                    onValueChange = { counterpartyName = it },
                    label = { Text("Debtor / Counterparty Name *", color = TextMuted) },
                    placeholder = { Text("e.g. Alice Smith, Freelance Client", color = TextSubtle) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Amount
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Amount ($baseCurrency) *", color = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Expected Date
                OutlinedTextField(
                    value = expectedDate,
                    onValueChange = { expectedDate = it },
                    label = { Text("Expected Date (Optional, YYYY-MM-DD)", color = TextMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Disbursed Account (Optional)
                if (accounts.isNotEmpty()) {
                    Text(text = "Disbursed / Source Account (Optional)", fontSize = 11.sp, color = TextMuted)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        item {
                            val isSelected = selectedSourceAccountId == null
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                    .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                    .clickable { selectedSourceAccountId = null }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text("None", fontSize = 11.sp, color = if (isSelected) Color.White else TextMuted)
                            }
                        }
                        items(accounts) { acc ->
                            val isSelected = selectedSourceAccountId == acc.id
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                    .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                    .clickable { selectedSourceAccountId = acc.id }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(acc.name, fontSize = 11.sp, color = if (isSelected) Color.White else TextMuted)
                            }
                        }
                    }
                }

                // Note
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Note (Optional)", color = TextMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

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
                            val amt = amountText.toDoubleOrNull() ?: 0.0
                            onCreate(
                                counterpartyName.trim(),
                                amt,
                                baseCurrency,
                                today,
                                expectedDate.takeIf { it.isNotBlank() },
                                selectedSourceAccountId,
                                note.takeIf { it.isNotBlank() }
                            )
                        },
                        enabled = !isSubmitting && counterpartyName.isNotBlank() && (amountText.toDoubleOrNull() ?: 0.0) > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = TealLight),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.Black)
                        } else {
                            Text("Save", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SettleReceivableDialog(
    receivable: ReceivableDto,
    accounts: List<AccountDetailDto>,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSettle: (accountId: String, amount: Double, date: String) -> Unit
) {
    var selectedAccountId by remember { mutableStateOf(accounts.firstOrNull()?.id ?: "") }
    var settleAmountText by remember { mutableStateOf(receivable.displayAmount.toString()) }
    var settleDate by remember {
        mutableStateOf(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
    }

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
                    text = "Settle Receivable",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                // Receivable Info Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF020617))
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Receiving from:", fontSize = 11.sp, color = TextMuted)
                            Text(receivable.counterpartyName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Expected:", fontSize = 11.sp, color = TextMuted)
                            Text(formatCurrency(receivable.displayAmount, receivable.currency), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = IncomeGreen)
                        }
                    }
                }

                // Deposit Account Picker
                Text(text = "Deposit Destination Account *", fontSize = 11.sp, color = TextMuted)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(accounts) { acc ->
                        val isSelected = selectedAccountId == acc.id
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                .clickable { selectedAccountId = acc.id }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(acc.name, fontSize = 11.sp, color = if (isSelected) Color.White else TextMuted)
                        }
                    }
                }

                // Settle Amount
                OutlinedTextField(
                    value = settleAmountText,
                    onValueChange = { settleAmountText = it },
                    label = { Text("Received Amount (${receivable.currency}) *", color = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Settlement Date
                OutlinedTextField(
                    value = settleDate,
                    onValueChange = { settleDate = it },
                    label = { Text("Settlement Date (YYYY-MM-DD) *", color = TextMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

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
                            val amt = settleAmountText.toDoubleOrNull() ?: 0.0
                            onSettle(selectedAccountId, amt, settleDate)
                        },
                        enabled = !isSubmitting && selectedAccountId.isNotBlank() && (settleAmountText.toDoubleOrNull() ?: 0.0) > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = TealLight),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.Black)
                        } else {
                            Text("Confirm Collection", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
