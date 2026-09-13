package com.veltis.android.presentation.transactions

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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.CategoryDto
import com.veltis.android.data.model.TransactionSummaryDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    viewModel: TransactionsViewModel,
    isPrivacyMode: Boolean = false,
    initialQuickAddType: String? = null,
    onResetQuickAddType: () -> Unit = {},
    onTransactionRecorded: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showCreateDialog by remember { mutableStateOf(initialQuickAddType != null) }
    var preselectedType by remember { mutableStateOf(initialQuickAddType ?: "expense") }
    var txnToDelete by remember { mutableStateOf<TransactionSummaryDto?>(null) }

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    LaunchedEffect(initialQuickAddType) {
        if (initialQuickAddType != null) {
            preselectedType = initialQuickAddType
            showCreateDialog = true
            onResetQuickAddType()
        }
    }

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
                        text = "Transactions",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 20.sp
                    )
                },
                actions = {
                    IconButton(
                        onClick = {
                            viewModel.syncQueue()
                            viewModel.loadTransactions()
                        },
                        enabled = !state.isLoading
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = TealPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Sync,
                                contentDescription = "Sync",
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
                    preselectedType = "expense"
                    showCreateDialog = true
                },
                containerColor = TealLight,
                contentColor = Color.Black,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Add Transaction")
            }
        },
        containerColor = VeltisDarkBg
    ) { padding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Filter Pills Row
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val filters = listOf(
                    "all" to "All",
                    "expense" to "Expenses",
                    "income" to "Income",
                    "transfer" to "Transfers"
                )
                items(filters) { (key, label) ->
                    val isSelected = state.selectedFilterType == key
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(if (isSelected) TealPrimary else VeltisCardBg)
                            .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(20.dp))
                            .clickable { viewModel.filterByType(key) }
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = label,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Color.White else TextMuted
                        )
                    }
                }
            }

            if (state.isLoading && state.transactions.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = TealLight)
                }
            } else if (state.transactions.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ReceiptLong,
                            contentDescription = null,
                            tint = TextMuted,
                            modifier = Modifier.size(56.dp)
                        )
                        Text(
                            text = "No transactions found",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                        Text(
                            text = "Record an income, expense, or transfer to track your ledger.",
                            fontSize = 13.sp,
                            color = TextMuted,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Button(
                            onClick = {
                                preselectedType = "expense"
                                showCreateDialog = true
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = TealPrimary)
                        ) {
                            Text("Record Transaction", color = Color.White)
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item { Spacer(modifier = Modifier.height(4.dp)) }

                    items(state.transactions, key = { it.id }) { txn ->
                        TransactionDetailCard(
                            transaction = txn,
                            isPrivacyMode = isPrivacyMode,
                            onDelete = { txnToDelete = txn }
                        )
                    }

                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }

        // Dialog: Create Transaction
        if (showCreateDialog) {
            CreateTransactionDialog(
                accounts = state.accounts,
                categories = state.categories,
                initialType = preselectedType,
                isSubmitting = state.isSubmitting,
                onDismiss = { showCreateDialog = false },
                onCreate = { type, amount, accountId, destAccountId, desc, catId, date ->
                    viewModel.createTransaction(
                        type = type,
                        amount = amount,
                        accountId = accountId,
                        destAccountId = destAccountId,
                        description = desc,
                        categoryId = catId,
                        date = date
                    ) {
                        showCreateDialog = false
                        onTransactionRecorded()
                    }
                }
            )
        }

        // Dialog: Delete confirmation
        txnToDelete?.let { txn ->
            AlertDialog(
                onDismissRequest = { txnToDelete = null },
                title = { Text("Delete Transaction", color = Color.White) },
                text = {
                    Text(
                        "Are you sure you want to delete this transaction of ${formatCurrency(txn.amount, txn.currency)}?",
                        color = TextMuted
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            viewModel.deleteTransaction(txn.id)
                            txnToDelete = null
                            onTransactionRecorded()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed)
                    ) {
                        Text("Delete", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { txnToDelete = null }) {
                        Text("Cancel", color = TextMuted)
                    }
                },
                containerColor = VeltisCardBg
            )
        }
    }
}

@Composable
fun TransactionDetailCard(
    transaction: TransactionSummaryDto,
    isPrivacyMode: Boolean,
    onDelete: () -> Unit
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
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
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
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = transaction.description?.takeIf { it.isNotBlank() }
                                ?: (transaction.categoryName ?: transaction.type.replaceFirstChar { it.uppercase() }),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                        if (transaction.source == "offline_pending") {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(WarningAmberBg)
                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                            ) {
                                Text(text = "Offline", fontSize = 9.sp, color = WarningAmber, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        transaction.accountName?.let {
                            Text(text = it, fontSize = 11.sp, color = TextMuted)
                        }
                        Text(text = "•", fontSize = 11.sp, color = TextSubtle)
                        Text(text = transaction.transactionDate.take(10), fontSize = 11.sp, color = TextMuted)
                    }
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (isPrivacyMode) "••••" else {
                        val prefix = if (isIncome) "+ " else if (isTransfer) "" else "- "
                        "$prefix${formatCurrency(transaction.amount, transaction.currency)}"
                    },
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = color
                )

                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.DeleteOutline,
                        contentDescription = "Delete",
                        tint = TextSubtle,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun CreateTransactionDialog(
    accounts: List<AccountDetailDto>,
    categories: List<CategoryDto>,
    initialType: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onCreate: (type: String, amount: Double, accountId: String, destAccountId: String?, desc: String?, catId: String?, date: String?) -> Unit
) {
    var type by remember { mutableStateOf(initialType) }
    var amountText by remember { mutableStateOf("") }
    var selectedAccountId by remember { mutableStateOf(accounts.firstOrNull()?.id ?: "") }
    var selectedDestAccountId by remember { mutableStateOf(accounts.getOrNull(1)?.id ?: "") }
    var description by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf(categories.firstOrNull()?.id) }

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
                    text = "Record Transaction",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                // Type Segmented Control
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("expense" to "Expense", "income" to "Income", "transfer" to "Transfer").forEach { (key, label) ->
                        val isSelected = type == key
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (isSelected) {
                                        when (key) {
                                            "income" -> IncomeGreenBg
                                            "transfer" -> Color(0x332563EB)
                                            else -> ExpenseRedBg
                                        }
                                    } else Color(0xFF0F172A)
                                )
                                .border(
                                    1.dp,
                                    if (isSelected) {
                                        when (key) {
                                            "income" -> IncomeGreen
                                            "transfer" -> Color(0xFF60A5FA)
                                            else -> ExpenseRed
                                        }
                                    } else VeltisCardBorder,
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { type = key }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                fontSize = 12.sp,
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
                    label = { Text("Amount", color = TextMuted) },
                    placeholder = { Text("0.00", color = TextMuted) },
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

                // Account Selection
                Text(text = if (type == "transfer") "Source Account" else "Account", fontSize = 11.sp, color = TextMuted)
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
                            Text(
                                text = acc.name,
                                fontSize = 12.sp,
                                color = if (isSelected) Color.White else TextMuted
                            )
                        }
                    }
                }

                // Transfer Destination Account
                if (type == "transfer") {
                    Text(text = "Destination Account", fontSize = 11.sp, color = TextMuted)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(accounts.filter { it.id != selectedAccountId }) { acc ->
                            val isSelected = selectedDestAccountId == acc.id
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                    .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                    .clickable { selectedDestAccountId = acc.id }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = acc.name,
                                    fontSize = 12.sp,
                                    color = if (isSelected) Color.White else TextMuted
                                )
                            }
                        }
                    }
                }

                // Description
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (Optional)", color = TextMuted) },
                    placeholder = { Text("e.g. Groceries or Salary", color = TextMuted) },
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
                            val destAcc = if (type == "transfer") selectedDestAccountId else null
                            onCreate(type, amt, selectedAccountId, destAcc, description.takeIf { it.isNotBlank() }, selectedCategoryId, null)
                        },
                        enabled = !isSubmitting && (amountText.toDoubleOrNull() ?: 0.0) > 0 && selectedAccountId.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = TealLight)
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
