package com.veltis.android.presentation.liabilities

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
import com.veltis.android.data.model.LiabilityDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiabilitiesScreen(
    viewModel: MoreViewModel,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showAddDialog by remember { mutableStateOf(false) }
    var payTarget by remember { mutableStateOf<LiabilityDto?>(null) }

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

    val openLiabilities = remember(state.liabilities) {
        state.liabilities.filter { it.status.lowercase() != "paid" && it.status.lowercase() != "cancelled" }
    }

    val totalDebtMinor = remember(state.liabilities) {
        openLiabilities.sumOf { it.displayAmount }
    }

    val currency = state.baseCurrency

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Liabilities",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 20.sp
                        )
                        Text(
                            text = "${openLiabilities.size} active obligations",
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
                Icon(imageVector = Icons.Default.Add, contentDescription = "Add Liability")
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
                    // Total Outstanding Debt Card
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
                                    text = "Total Debt",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextMuted
                                )
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(ExpenseRedBg),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowUpward,
                                        contentDescription = null,
                                        tint = ExpenseRed,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            Text(
                                text = if (state.isPrivacyMode) "••••" else formatCurrency(totalDebtMinor, currency),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = ExpenseRed
                            )
                            Text(
                                text = "Outstanding obligations",
                                fontSize = 10.sp,
                                color = TextSubtle
                            )
                        }
                    }

                    // Active Obligations Count Card
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
                                    text = "Active Count",
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
                                text = "${openLiabilities.size}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Debts to settle",
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
                        text = "All Obligations (${state.liabilities.size})",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            // 3. Liabilities Feed
            if (state.isLoading && state.liabilities.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = TealLight)
                    }
                }
            } else if (state.liabilities.isEmpty()) {
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
                                imageVector = Icons.Default.CreditCard,
                                contentDescription = null,
                                tint = TextMuted,
                                modifier = Modifier.size(48.dp)
                            )
                            Text(
                                text = "No liabilities recorded",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Keep track of money you owe to persons, banks, or lenders.",
                                fontSize = 13.sp,
                                color = TextMuted,
                                textAlign = TextAlign.Center
                            )
                            Button(
                                onClick = { showAddDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Add First Liability", color = Color.White)
                            }
                        }
                    }
                }
            } else {
                items(state.liabilities, key = { it.id }) { liability ->
                    LiabilityCard(
                        liability = liability,
                        isPrivacyMode = state.isPrivacyMode,
                        onPay = { payTarget = liability }
                    )
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }

        // Add Liability Dialog
        if (showAddDialog) {
            AddLiabilityDialog(
                accounts = state.accounts,
                baseCurrency = state.baseCurrency,
                isSubmitting = state.isSubmitting,
                onDismiss = { showAddDialog = false },
                onCreate = { counterparty, type, amt, curr, createdDate, dueDate, destAcc, note ->
                    viewModel.createLiability(
                        counterpartyName = counterparty,
                        liabilityType = type,
                        amount = amt,
                        currency = curr,
                        createdDate = createdDate,
                        dueDate = dueDate,
                        destAccountId = destAcc,
                        note = note
                    ) {
                        showAddDialog = false
                    }
                }
            )
        }

        // Pay Liability Dialog
        payTarget?.let { target ->
            PayLiabilityDialog(
                liability = target,
                accounts = state.accounts,
                isSubmitting = state.isSubmitting,
                onDismiss = { payTarget = null },
                onPay = { accId, amt, date ->
                    viewModel.payLiability(
                        id = target.id,
                        accountId = accId,
                        amount = amt,
                        paidAt = date
                    ) {
                        payTarget = null
                    }
                }
            )
        }
    }
}

@Composable
fun LiabilityCard(
    liability: LiabilityDto,
    isPrivacyMode: Boolean,
    onPay: () -> Unit
) {
    val isPaid = liability.status.equals("paid", ignoreCase = true)
    val isPartial = liability.status.equals("partially_paid", ignoreCase = true)

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
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = liability.displayName,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        // Type Badge
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(VeltisMutedBg)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = liability.liabilityType.uppercase(),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextMuted
                            )
                        }
                    }

                    // Metadata Row
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        liability.createdDate?.let {
                            Text(text = "Created: ${it.take(10)}", fontSize = 11.sp, color = TextSubtle)
                        }
                        liability.dueDate?.let {
                            Text(text = "•", fontSize = 11.sp, color = TextSubtle)
                            Text(text = "Due: ${it.take(10)}", fontSize = 11.sp, color = WarningAmber)
                        }
                    }

                    if (!liability.note.isNullOrBlank()) {
                        Text(text = "Note: ${liability.note}", fontSize = 11.sp, color = TextMuted, maxLines = 1)
                    }
                }

                // Amount
                Text(
                    text = if (isPrivacyMode) "••••" else formatCurrency(liability.displayAmount, liability.currency),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isPaid) IncomeGreen else ExpenseRed
                )
            }

            HorizontalDivider(color = VeltisCardBorder.copy(alpha = 0.6f))

            // Status and Pay Button Row
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
                                isPaid -> IncomeGreenBg
                                isPartial -> WarningAmberBg
                                else -> ExpenseRedBg
                            }
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = when {
                            isPaid -> "Paid / Settled"
                            isPartial -> "Partially Paid"
                            else -> "Open Obligation"
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            isPaid -> IncomeGreen
                            isPartial -> WarningAmber
                            else -> ExpenseRed
                        }
                    )
                }

                if (!isPaid) {
                    Button(
                        onClick = onPay,
                        colors = ButtonDefaults.buttonColors(containerColor = TealLight),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.CreditCard, contentDescription = null, tint = Color.Black, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Pay", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun AddLiabilityDialog(
    accounts: List<AccountDetailDto>,
    baseCurrency: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onCreate: (counterparty: String, type: String, amount: Double, currency: String, createdDate: String?, dueDate: String?, destAccount: String?, note: String?) -> Unit
) {
    var counterpartyName by remember { mutableStateOf("") }
    var liabilityType by remember { mutableStateOf("person") }
    var amountText by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf("") }
    var selectedDestAccountId by remember { mutableStateOf<String?>(null) }
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
                    text = "Add Liability",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                // Counterparty / Creditor Name
                OutlinedTextField(
                    value = counterpartyName,
                    onValueChange = { counterpartyName = it },
                    label = { Text("Lender / Counterparty Name *", color = TextMuted) },
                    placeholder = { Text("e.g. John Doe, HDFC Bank", color = TextSubtle) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Liability Type Segmented Row
                Text(text = "Liability Type", fontSize = 11.sp, color = TextMuted)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    val types = listOf(
                        "person" to "Person",
                        "bank" to "Bank",
                        "credit_card" to "Credit Card",
                        "other" to "Other"
                    )
                    items(types) { (key, label) ->
                        val isSelected = liabilityType == key
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                .clickable { liabilityType = key }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = label,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = if (isSelected) Color.White else TextMuted
                            )
                        }
                    }
                }

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

                // Due Date
                OutlinedTextField(
                    value = dueDate,
                    onValueChange = { dueDate = it },
                    label = { Text("Due Date (Optional, YYYY-MM-DD)", color = TextMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Deposited Account (Optional)
                if (accounts.isNotEmpty()) {
                    Text(text = "Deposited Account (Optional)", fontSize = 11.sp, color = TextMuted)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        item {
                            val isSelected = selectedDestAccountId == null
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                    .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                    .clickable { selectedDestAccountId = null }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text("None", fontSize = 11.sp, color = if (isSelected) Color.White else TextMuted)
                            }
                        }
                        items(accounts) { acc ->
                            val isSelected = selectedDestAccountId == acc.id
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                    .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                    .clickable { selectedDestAccountId = acc.id }
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
                                liabilityType,
                                amt,
                                baseCurrency,
                                today,
                                dueDate.takeIf { it.isNotBlank() },
                                selectedDestAccountId,
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
fun PayLiabilityDialog(
    liability: LiabilityDto,
    accounts: List<AccountDetailDto>,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onPay: (accountId: String, amount: Double, date: String) -> Unit
) {
    var selectedAccountId by remember { mutableStateOf(accounts.firstOrNull()?.id ?: "") }
    var payAmountText by remember { mutableStateOf(liability.displayAmount.toString()) }
    var payDate by remember {
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
                    text = "Pay Liability",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                // Liability Info Card
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
                            Text("Paying to:", fontSize = 11.sp, color = TextMuted)
                            Text(liability.displayName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Outstanding:", fontSize = 11.sp, color = TextMuted)
                            Text(formatCurrency(liability.displayAmount, liability.currency), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = ExpenseRed)
                        }
                    }
                }

                // Payment Account Picker
                Text(text = "Payment Source Account *", fontSize = 11.sp, color = TextMuted)
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

                // Payment Amount
                OutlinedTextField(
                    value = payAmountText,
                    onValueChange = { payAmountText = it },
                    label = { Text("Payment Amount (${liability.currency}) *", color = TextMuted) },
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

                // Payment Date
                OutlinedTextField(
                    value = payDate,
                    onValueChange = { payDate = it },
                    label = { Text("Payment Date (YYYY-MM-DD) *", color = TextMuted) },
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
                            val amt = payAmountText.toDoubleOrNull() ?: 0.0
                            onPay(selectedAccountId, amt, payDate)
                        },
                        enabled = !isSubmitting && selectedAccountId.isNotBlank() && (payAmountText.toDoubleOrNull() ?: 0.0) > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = TealLight),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.Black)
                        } else {
                            Text("Confirm Repayment", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
