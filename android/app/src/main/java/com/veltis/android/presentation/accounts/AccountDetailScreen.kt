package com.veltis.android.presentation.accounts

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.AllocationDto
import com.veltis.android.data.model.TransactionSummaryDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountDetailScreen(
    account: AccountDetailDto,
    viewModel: AccountsViewModel,
    isPrivacyMode: Boolean = false,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showEditAccountDialog by remember { mutableStateOf(false) }
    var showReconcileDialog by remember { mutableStateOf(false) }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }

    var showAddAllocationDialog by remember { mutableStateOf(false) }
    var allocationToEdit by remember { mutableStateOf<AllocationDto?>(null) }
    var allocationToDelete by remember { mutableStateOf<AllocationDto?>(null) }

    LaunchedEffect(account.id) {
        viewModel.selectAccount(account)
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

    val currentAccount = state.selectedAccount ?: account
    val isInvestment = currentAccount.accountType.equals("investment", ignoreCase = true)
    val totalBalance = currentAccount.displayBalance
    val totalAllocated = state.totalAllocated
    val freeToSpend = (totalBalance - totalAllocated).coerceAtLeast(0.0)
    val allocatedPct = if (totalBalance > 0) ((totalAllocated / totalBalance) * 100).coerceIn(0.0, 100.0).toFloat() else 0f

    val accentColor = remember(currentAccount.color) {
        if (!currentAccount.color.isNullOrBlank()) {
            try {
                Color(android.graphics.Color.parseColor(currentAccount.color))
            } catch (_: Exception) {
                TealPrimary
            }
        } else {
            TealPrimary
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
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(accentColor)
                        )
                        Column {
                            Text(
                                text = currentAccount.name,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 18.sp,
                                maxLines = 1
                            )
                            Text(
                                text = "${currentAccount.accountType.replace('_', ' ').uppercase()} • ${currentAccount.institutionName ?: "Manual"}",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { showEditAccountDialog = true }) {
                        Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit Account", tint = Color.White)
                    }
                    IconButton(onClick = { showReconcileDialog = true }) {
                        Icon(imageVector = Icons.Default.AccountBalanceWallet, contentDescription = "Reconcile", tint = TealLight)
                    }
                    IconButton(onClick = { showDeleteAccountDialog = true }) {
                        Icon(imageVector = Icons.Default.DeleteOutline, contentDescription = "Delete", tint = ExpenseRed)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
            )
        },
        containerColor = VeltisDarkBg
    ) { padding ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(4.dp)) }

            // 1. Balance Hero Card
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "TOTAL BALANCE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 1.sp,
                                color = TextMuted
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = accentColor.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = currentAccount.currency,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = accentColor,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        Text(
                            text = if (isPrivacyMode) "••••••••" else formatCurrency(totalBalance, currentAccount.currency),
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            letterSpacing = (-0.5).sp
                        )

                        Text(
                            text = "${currentAccount.accountType.replace('_', ' ').replaceFirstChar { it.uppercase() }} account with ${currentAccount.institutionName ?: "manual ledger tracking"}.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                }
            }

            // 2. Set Aside Money (Allocations / Buckets) - Shown for non-investment accounts
            if (!isInvestment) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(VeltisCardBg)
                            .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                            .padding(18.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            // Section Header
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Savings,
                                        contentDescription = null,
                                        tint = WarningAmber,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Column {
                                        Text(
                                            text = "Set Aside Money",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                        Text(
                                            text = "Buckets & sub-allocations inside this account",
                                            fontSize = 11.sp,
                                            color = TextMuted
                                        )
                                    }
                                }

                                Button(
                                    onClick = { showAddAllocationDialog = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Set Aside", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                }
                            }

                            // Visual Progress Bar
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(8.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(IncomeGreen.copy(alpha = 0.3f))
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxHeight()
                                            .fillMaxWidth(fraction = (allocatedPct / 100f).coerceIn(0f, 1f))
                                            .background(WarningAmber)
                                    )
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(imageVector = Icons.Default.Shield, contentDescription = null, tint = IncomeGreen, modifier = Modifier.size(13.dp))
                                        Text(
                                            text = "Free to spend: ${if (isPrivacyMode) "••••" else formatCurrency(freeToSpend, currentAccount.currency)}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = IncomeGreen
                                        )
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(imageVector = Icons.Default.Lock, contentDescription = null, tint = WarningAmber, modifier = Modifier.size(13.dp))
                                        Text(
                                            text = "Allocated: ${if (isPrivacyMode) "••••" else formatCurrency(totalAllocated, currentAccount.currency)}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = WarningAmber
                                        )
                                    }
                                }
                            }

                            // Allocations List
                            if (state.allocations.isEmpty()) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = VeltisMutedBg,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "No allocations yet. Tap 'Set Aside' to reserve funds for upcoming bills, taxes, or specific goals without leaving this account.",
                                        fontSize = 12.sp,
                                        color = TextMuted,
                                        modifier = Modifier.padding(14.dp),
                                        textAlign = TextAlign.Center
                                    )
                                }
                            } else {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    state.allocations.forEach { alloc ->
                                        AllocationItemCard(
                                            allocation = alloc,
                                            currency = currentAccount.currency,
                                            totalAccountBalance = totalBalance,
                                            isPrivacyMode = isPrivacyMode,
                                            onEdit = { allocationToEdit = alloc },
                                            onDelete = { allocationToDelete = alloc }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 3. Recent Activity Section
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Activity",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "${state.accountTransactions.size} transactions",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
            }

            if (state.accountTransactions.isEmpty()) {
                item {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = VeltisCardBg,
                        border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "No recent transactions found for this account.",
                            fontSize = 13.sp,
                            color = TextMuted,
                            modifier = Modifier.padding(24.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                        border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                    ) {
                        Column {
                            state.accountTransactions.take(15).forEachIndexed { index, txn ->
                                val isIncome = txn.type.equals("income", ignoreCase = true)
                                val isTransfer = txn.type.equals("transfer", ignoreCase = true)
                                val amountColor = when {
                                    isIncome -> IncomeGreen
                                    isTransfer -> Color(0xFF60A5FA)
                                    else -> ExpenseRed
                                }

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = txn.description ?: if (isIncome) "Income" else if (isTransfer) "Transfer" else "Expense",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color.White,
                                            maxLines = 1
                                        )
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Text(
                                                text = if (txn.transactionDate.length >= 10) txn.transactionDate.take(10) else txn.transactionDate,
                                                fontSize = 11.sp,
                                                color = TextMuted
                                            )
                                            if (!txn.categoryName.isNullOrBlank()) {
                                                Text("•", fontSize = 11.sp, color = TextSubtle)
                                                Surface(
                                                    shape = RoundedCornerShape(4.dp),
                                                    color = VeltisMutedBg
                                                ) {
                                                    Text(
                                                        text = txn.categoryName.uppercase(),
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = TextMuted,
                                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            text = if (isPrivacyMode) "••••" else "${if (isIncome) "+" else if (isTransfer) "" else "-"}${formatCurrency(txn.amount, txn.currency)}",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = amountColor
                                        )
                                        Text(
                                            text = txn.type.uppercase(),
                                            fontSize = 9.sp,
                                            color = TextMuted
                                        )
                                    }
                                }

                                if (index < state.accountTransactions.take(15).size - 1) {
                                    HorizontalDivider(color = VeltisCardBorder, thickness = 0.5.dp)
                                }
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(60.dp)) }
        }
    }

    // Modal: Add Allocation
    if (showAddAllocationDialog) {
        AllocationFormDialog(
            title = "Set Aside Money",
            initialName = "",
            initialAmount = "",
            initialDescription = "",
            confirmLabel = "Set Aside",
            isSubmitting = state.isSubmitting,
            onDismiss = { showAddAllocationDialog = false },
            onConfirm = { name, amount, desc ->
                viewModel.createAllocation(currentAccount.id, name, amount, desc, null) {
                    showAddAllocationDialog = false
                }
            }
        )
    }

    // Modal: Edit Allocation
    allocationToEdit?.let { alloc ->
        AllocationFormDialog(
            title = "Edit Set-Aside Money",
            initialName = alloc.name,
            initialAmount = alloc.amount.toString(),
            initialDescription = alloc.description ?: "",
            confirmLabel = "Save Changes",
            isSubmitting = state.isSubmitting,
            onDismiss = { allocationToEdit = null },
            onConfirm = { name, amount, desc ->
                viewModel.updateAllocation(currentAccount.id, alloc.id, name, amount, desc, null) {
                    allocationToEdit = null
                }
            }
        )
    }

    // Modal: Delete Allocation Confirmation
    allocationToDelete?.let { alloc ->
        AlertDialog(
            onDismissRequest = { allocationToDelete = null },
            title = { Text("Delete Allocation", color = Color.White) },
            text = {
                Text(
                    "Are you sure you want to remove the '${alloc.name}' allocation of ${formatCurrency(alloc.amount, currentAccount.currency)}? This money will be returned to your free-to-spend balance.",
                    color = TextMuted
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteAllocation(currentAccount.id, alloc.id) {
                            allocationToDelete = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed)
                ) {
                    Text("Delete", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { allocationToDelete = null }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            containerColor = VeltisCardBg
        )
    }

    // Modal: Edit Account Details
    if (showEditAccountDialog) {
        EditAccountDetailsDialog(
            account = currentAccount,
            isSubmitting = state.isSubmitting,
            onDismiss = { showEditAccountDialog = false },
            onConfirm = { name, color, institution, type ->
                viewModel.updateAccountDetails(currentAccount.id, name, color, institution, type) {
                    showEditAccountDialog = false
                }
            }
        )
    }

    // Modal: Reconcile Account
    if (showReconcileDialog) {
        ReconcileDialog(
            account = currentAccount,
            isSubmitting = state.isSubmitting,
            onDismiss = { showReconcileDialog = false },
            onConfirm = { actualBalance ->
                viewModel.reconcileAccount(currentAccount.id, actualBalance) {
                    showReconcileDialog = false
                }
            }
        )
    }

    // Modal: Delete Account Confirmation
    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteAccountDialog = false },
            title = { Text("Delete Account", color = Color.White) },
            text = {
                Text(
                    "Are you sure you want to delete '${currentAccount.name}'? Its transactions will remain in ledger history.",
                    color = TextMuted
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteAccount(currentAccount.id) {
                            showDeleteAccountDialog = false
                            onNavigateBack()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed)
                ) {
                    Text("Delete", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAccountDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            containerColor = VeltisCardBg
        )
    }
}

@Composable
fun AllocationItemCard(
    allocation: AllocationDto,
    currency: String,
    totalAccountBalance: Double,
    isPrivacyMode: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val pct = if (totalAccountBalance > 0) ((allocation.amount / totalAccountBalance) * 100).toInt() else 0

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = VeltisMutedBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = allocation.name,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                if (!allocation.description.isNullOrBlank()) {
                    Text(
                        text = allocation.description,
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
                Text(
                    text = "$pct% of total balance",
                    fontSize = 10.sp,
                    color = WarningAmber
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = if (isPrivacyMode) "••••" else formatCurrency(allocation.amount, currency),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                IconButton(onClick = onEdit, modifier = Modifier.size(28.dp)) {
                    Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit", tint = TextMuted, modifier = Modifier.size(16.dp))
                }

                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(imageVector = Icons.Default.DeleteOutline, contentDescription = "Delete", tint = ExpenseRed, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
fun AllocationFormDialog(
    title: String,
    initialName: String,
    initialAmount: String,
    initialDescription: String,
    confirmLabel: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (name: String, amount: Double, description: String?) -> Unit
) {
    var name by remember { mutableStateOf(initialName) }
    var amount by remember { mutableStateOf(initialAmount) }
    var description by remember { mutableStateOf(initialDescription) }

    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(VeltisCardBg)
                .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    text = title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Allocation Name / Purpose") },
                    placeholder = { Text("e.g. Rent, Taxes, Emergency") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = TealPrimary,
                        unfocusedBorderColor = VeltisCardBorder,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount to Set Aside") },
                    placeholder = { Text("0.00") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = TealPrimary,
                        unfocusedBorderColor = VeltisCardBorder,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Notes (Optional)") },
                    placeholder = { Text("e.g. Due on 20th") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = TealPrimary,
                        unfocusedBorderColor = VeltisCardBorder,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

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
                            val parsedAmount = amount.toDoubleOrNull() ?: 0.0
                            if (name.isNotBlank() && parsedAmount > 0.0) {
                                onConfirm(name.trim(), parsedAmount, description.trim().ifBlank { null })
                            }
                        },
                        enabled = !isSubmitting && name.isNotBlank() && (amount.toDoubleOrNull() ?: 0.0) > 0.0,
                        colors = ButtonDefaults.buttonColors(containerColor = TealPrimary)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text(confirmLabel, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EditAccountDetailsDialog(
    account: AccountDetailDto,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (name: String, color: String?, institution: String?, type: String?) -> Unit
) {
    var name by remember { mutableStateOf(account.name) }
    var institution by remember { mutableStateOf(account.institutionName ?: "") }
    var selectedColor by remember { mutableStateOf(account.color ?: "#0D9488") }

    val presetColors = listOf(
        "#0D9488", // Teal
        "#3B82F6", // Blue
        "#10B981", // Emerald
        "#F59E0B", // Amber
        "#8B5CF6", // Purple
        "#EC4899", // Pink
        "#EF4444"  // Red
    )

    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(VeltisCardBg)
                .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    text = "Edit Account Details",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Account Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = TealPrimary,
                        unfocusedBorderColor = VeltisCardBorder,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

                OutlinedTextField(
                    value = institution,
                    onValueChange = { institution = it },
                    label = { Text("Bank / Institution Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = TealPrimary,
                        unfocusedBorderColor = VeltisCardBorder,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

                // Accent Color Selector
                Text("Account Accent Color", fontSize = 12.sp, color = TextMuted)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    presetColors.forEach { cHex ->
                        val isSelected = selectedColor.equals(cHex, ignoreCase = true)
                        val c = try { Color(android.graphics.Color.parseColor(cHex)) } catch (_: Exception) { TealPrimary }

                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(c)
                                .border(
                                    width = if (isSelected) 3.dp else 1.dp,
                                    color = if (isSelected) Color.White else Color.Transparent,
                                    shape = CircleShape
                                )
                                .clickable { selectedColor = cHex },
                            contentAlignment = Alignment.Center
                        ) {
                            if (isSelected) {
                                Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
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
                            if (name.isNotBlank()) {
                                onConfirm(name.trim(), selectedColor, institution.trim().ifBlank { null }, null)
                            }
                        },
                        enabled = !isSubmitting && name.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = TealPrimary)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text("Save Changes", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
