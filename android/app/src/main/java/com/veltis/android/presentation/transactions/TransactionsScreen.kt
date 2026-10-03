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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.CategoryDto
import com.veltis.android.data.model.TransactionSummaryDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.theme.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

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
    var selectedTxnForDetail by remember { mutableStateOf<TransactionSummaryDto?>(null) }

    // Filter Dialog States
    var showAccountFilterDialog by remember { mutableStateOf(false) }
    var showCategoryFilterDialog by remember { mutableStateOf(false) }
    var showSortFilterDialog by remember { mutableStateOf(false) }

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

    // Filter transactions by client-side search query
    val filteredTransactions = remember(state.transactions, state.searchQuery) {
        if (state.searchQuery.isBlank()) {
            state.transactions
        } else {
            val q = state.searchQuery.trim().lowercase()
            state.transactions.filter { txn ->
                (txn.description?.lowercase()?.contains(q) == true) ||
                (txn.merchantName?.lowercase()?.contains(q) == true) ||
                (txn.categoryName?.lowercase()?.contains(q) == true) ||
                (txn.accountName?.lowercase()?.contains(q) == true) ||
                (txn.type.lowercase().contains(q)) ||
                (txn.amount.toString().contains(q))
            }
        }
    }

    // Group transactions by date string (YYYY-MM-DD)
    val groupedTransactions = remember(filteredTransactions) {
        filteredTransactions.groupBy { txn ->
            if (txn.transactionDate.length >= 10) txn.transactionDate.take(10) else txn.transactionDate
        }
    }

    val isFilterActive = state.selectedAccountId != null ||
            state.selectedCategoryId != null ||
            state.selectedFilterType != "all" ||
            state.searchQuery.isNotBlank() ||
            state.selectedSort != "date_desc"

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Transactions",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 20.sp
                        )
                        Text(
                            text = "${filteredTransactions.size} transactions recorded",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                    }
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
            // Search Bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            ) {
                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = { viewModel.setSearchQuery(it) },
                    placeholder = {
                        Text("Search transactions, notes, merchants...", color = TextMuted, fontSize = 13.sp)
                    },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = TextMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    trailingIcon = {
                        if (state.searchQuery.isNotEmpty()) {
                            IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear",
                                    tint = TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = TealLight,
                        unfocusedBorderColor = VeltisCardBorder,
                        focusedContainerColor = VeltisCardBg,
                        unfocusedContainerColor = VeltisCardBg
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Flow Type Filter Pills
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
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
                            .padding(horizontal = 16.dp, vertical = 7.dp)
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

            // Secondary Filter & Sort Toolbar
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Account Filter Chip
                item {
                    val selectedAccount = state.accounts.firstOrNull { it.id == state.selectedAccountId }
                    val label = selectedAccount?.name ?: "All Accounts"
                    val isSelected = state.selectedAccountId != null
                    FilterChipButton(
                        icon = Icons.Default.AccountBalance,
                        label = label,
                        isSelected = isSelected,
                        onClick = { showAccountFilterDialog = true }
                    )
                }

                // Category Filter Chip
                item {
                    val selectedCategory = state.categories.firstOrNull { it.id == state.selectedCategoryId }
                    val label = selectedCategory?.name ?: "All Categories"
                    val isSelected = state.selectedCategoryId != null
                    FilterChipButton(
                        icon = Icons.Default.Sell,
                        label = label,
                        isSelected = isSelected,
                        onClick = { showCategoryFilterDialog = true }
                    )
                }

                // Sort Chip
                item {
                    val sortLabel = when (state.selectedSort) {
                        "date_asc" -> "Oldest"
                        "amount_desc" -> "High Amount"
                        "amount_asc" -> "Low Amount"
                        else -> "Newest"
                    }
                    FilterChipButton(
                        icon = Icons.Default.Tune,
                        label = sortLabel,
                        isSelected = state.selectedSort != "date_desc",
                        onClick = { showSortFilterDialog = true }
                    )
                }

                // Reset Filters Chip
                if (isFilterActive) {
                    item {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color(0x33EF4444))
                                .border(1.dp, Color(0x66EF4444), RoundedCornerShape(20.dp))
                                .clickable { viewModel.resetFilters() }
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = null,
                                    tint = ExpenseRed,
                                    modifier = Modifier.size(12.dp)
                                )
                                Text(
                                    text = "Reset",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = ExpenseRed
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Transaction List
            if (state.isLoading && state.transactions.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = TealLight)
                }
            } else if (filteredTransactions.isEmpty()) {
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
                            text = if (isFilterActive) "No matching transactions" else "No transactions found",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                        Text(
                            text = if (isFilterActive) "Try clearing search or filter criteria." else "Record an income, expense, or transfer to track your ledger.",
                            fontSize = 13.sp,
                            color = TextMuted,
                            textAlign = TextAlign.Center
                        )
                        if (isFilterActive) {
                            OutlinedButton(
                                onClick = { viewModel.resetFilters() },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = TealLight),
                                border = androidx.compose.foundation.BorderStroke(1.dp, TealLight)
                            ) {
                                Text("Clear Filters")
                            }
                        } else {
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
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item { Spacer(modifier = Modifier.height(4.dp)) }

                    groupedTransactions.forEach { (dateStr, txnsInDate) ->
                        val dateHeaderTitle = formatDateHeader(dateStr)
                        val dailyExpenses = txnsInDate.filter { it.type.equals("expense", ignoreCase = true) }.sumOf { it.amount }
                        val dailyIncome = txnsInDate.filter { it.type.equals("income", ignoreCase = true) }.sumOf { it.amount }
                        val currency = txnsInDate.firstOrNull()?.currency ?: "USD"

                        // Sticky Date Section Header with Daily Totals
                        item(key = "header_$dateStr") {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp, horizontal = 2.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = dateHeaderTitle,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextMuted
                                )

                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (dailyExpenses > 0) {
                                        Text(
                                            text = "-${formatCurrency(dailyExpenses, currency)}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = ExpenseRed
                                        )
                                    }
                                    if (dailyIncome > 0) {
                                        Text(
                                            text = "+${formatCurrency(dailyIncome, currency)}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = IncomeGreen
                                        )
                                    }
                                }
                            }
                        }

                        // Transaction Cards in this Date Group
                        items(txnsInDate, key = { it.id }) { txn ->
                            TransactionDetailCard(
                                transaction = txn,
                                isPrivacyMode = isPrivacyMode,
                                onClick = { selectedTxnForDetail = txn }
                            )
                        }
                    }

                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }

        // Account Filter Dialog
        if (showAccountFilterDialog) {
            AccountFilterDialog(
                accounts = state.accounts,
                selectedAccountId = state.selectedAccountId,
                onSelectAccount = {
                    viewModel.filterByAccount(it)
                    showAccountFilterDialog = false
                },
                onDismiss = { showAccountFilterDialog = false }
            )
        }

        // Category Filter Dialog
        if (showCategoryFilterDialog) {
            CategoryFilterDialog(
                categories = state.categories,
                selectedCategoryId = state.selectedCategoryId,
                onSelectCategory = {
                    viewModel.filterByCategory(it)
                    showCategoryFilterDialog = false
                },
                onDismiss = { showCategoryFilterDialog = false }
            )
        }

        // Sort Filter Dialog
        if (showSortFilterDialog) {
            SortFilterDialog(
                selectedSort = state.selectedSort,
                onSelectSort = {
                    viewModel.setSort(it)
                    showSortFilterDialog = false
                },
                onDismiss = { showSortFilterDialog = false }
            )
        }

        // Transaction Detail / Edit / Delete Modal
        selectedTxnForDetail?.let { txn ->
            TransactionDetailModal(
                transaction = txn,
                accounts = state.accounts,
                categories = state.categories,
                isSubmitting = state.isSubmitting,
                onDismiss = { selectedTxnForDetail = null },
                onUpdate = { desc, merchant, catId, date, amount, accId ->
                    viewModel.updateTransaction(
                        id = txn.id,
                        description = desc,
                        merchantName = merchant,
                        categoryId = catId,
                        date = date,
                        amount = amount,
                        accountId = accId
                    ) {
                        selectedTxnForDetail = null
                        onTransactionRecorded()
                    }
                },
                onDelete = {
                    viewModel.deleteTransaction(txn.id)
                    selectedTxnForDetail = null
                    onTransactionRecorded()
                }
            )
        }

        // Create Transaction Dialog
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
    }
}

@Composable
fun FilterChipButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (isSelected) TealContainer else VeltisCardBg)
            .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSelected) TealLight else TextMuted,
                modifier = Modifier.size(13.dp)
            )
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (isSelected) Color.White else TextMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Icon(
                imageVector = Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = if (isSelected) TealLight else TextSubtle,
                modifier = Modifier.size(13.dp)
            )
        }
    }
}

@Composable
fun TransactionDetailCard(
    transaction: TransactionSummaryDto,
    isPrivacyMode: Boolean,
    onClick: () -> Unit
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
            .clickable(onClick = onClick)
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
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = transaction.description?.takeIf { it.isNotBlank() }
                                ?: (transaction.merchantName?.takeIf { it.isNotBlank() }
                                ?: (transaction.categoryName ?: transaction.type.replaceFirstChar { it.uppercase() })),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (transaction.source == "offline_pending") {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(WarningAmberBg)
                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                            ) {
                                Text(
                                    text = "Offline",
                                    fontSize = 9.sp,
                                    color = WarningAmber,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        transaction.accountName?.let {
                            Text(text = it, fontSize = 11.sp, color = TextMuted)
                            Text(text = "•", fontSize = 11.sp, color = TextSubtle)
                        }
                        transaction.categoryName?.let {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(VeltisMutedBg)
                                    .padding(horizontal = 5.dp, vertical = 1.dp)
                            ) {
                                Text(
                                    text = it,
                                    fontSize = 10.sp,
                                    color = TextMuted,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            Text(text = "•", fontSize = 11.sp, color = TextSubtle)
                        }
                        Text(
                            text = if (transaction.transactionDate.length >= 10) transaction.transactionDate.take(10) else transaction.transactionDate,
                            fontSize = 11.sp,
                            color = TextSubtle
                        )
                    }
                }
            }

            Text(
                text = if (isPrivacyMode) "••••" else {
                    val prefix = if (isIncome) "+ " else if (isTransfer) "" else "- "
                    "$prefix${formatCurrency(transaction.amount, transaction.currency)}"
                },
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

/**
 * PWA Parity: 3-in-1 Transaction Modal (Details, Edit, and Double-Entry Delete Confirmation)
 */
@Composable
fun TransactionDetailModal(
    transaction: TransactionSummaryDto,
    accounts: List<AccountDetailDto>,
    categories: List<CategoryDto>,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onUpdate: (desc: String?, merchant: String?, catId: String?, date: String?, amount: Double?, accId: String?) -> Unit,
    onDelete: () -> Unit
) {
    var mode by remember { mutableStateOf("details") } // 'details' | 'edit' | 'delete'
    var deleteConfirmed by remember { mutableStateOf(false) }

    // Edit form states
    var editDescription by remember { mutableStateOf(transaction.description ?: "") }
    var editMerchant by remember { mutableStateOf(transaction.merchantName ?: "") }
    var editAmountText by remember { mutableStateOf(transaction.amount.toString()) }
    var editDate by remember {
        mutableStateOf(if (transaction.transactionDate.length >= 10) transaction.transactionDate.take(10) else transaction.transactionDate)
    }
    var editCategoryId by remember { mutableStateOf(transaction.categoryId) }
    var editAccountId by remember { mutableStateOf(transaction.accountId ?: accounts.firstOrNull()?.id ?: "") }

    val isIncome = transaction.type.equals("income", ignoreCase = true)
    val isTransfer = transaction.type.equals("transfer", ignoreCase = true)
    val color = when {
        isIncome -> IncomeGreen
        isTransfer -> Color(0xFF60A5FA)
        else -> ExpenseRed
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
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                // Modal Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(color.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = when (mode) {
                                    "delete" -> Icons.Default.Warning
                                    "edit" -> Icons.Default.Edit
                                    else -> if (isIncome) Icons.Default.ArrowDownward else if (isTransfer) Icons.Default.SwapHoriz else Icons.Default.ArrowUpward
                                },
                                contentDescription = null,
                                tint = if (mode == "delete") WarningAmber else color,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Text(
                            text = when (mode) {
                                "delete" -> "Delete Transaction"
                                "edit" -> "Edit Transaction"
                                else -> "Transaction Details"
                            },
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                    }
                }

                HorizontalDivider(color = VeltisCardBorder)

                when (mode) {
                    "details" -> {
                        // Details View
                        // Hero Amount Banner
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF020617))
                                .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                                .padding(14.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(text = "Amount", fontSize = 11.sp, color = TextMuted)
                                    val prefix = if (isIncome) "+ " else if (isTransfer) "" else "- "
                                    Text(
                                        text = "$prefix${formatCurrency(transaction.amount, transaction.currency)}",
                                        fontSize = 22.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = color
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(color.copy(alpha = 0.15f))
                                        .border(1.dp, color.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = transaction.type.uppercase(),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = color
                                    )
                                }
                            }
                        }

                        // Info Grid
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            DetailItem(label = "Description", value = transaction.description ?: "None")
                            DetailItem(label = "Date", value = transaction.transactionDate.take(10))
                            DetailItem(label = "Category", value = transaction.categoryName ?: "Uncategorized")
                            DetailItem(label = "Account", value = transaction.accountName ?: "Account")
                            if (!transaction.merchantName.isNullOrBlank()) {
                                DetailItem(label = "Merchant / Payee", value = transaction.merchantName)
                            }
                            DetailItem(label = "Source", value = transaction.source ?: "manual")
                        }

                        // Action Buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedButton(
                                onClick = { mode = "delete" },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = ExpenseRed),
                                border = androidx.compose.foundation.BorderStroke(1.dp, ExpenseRed.copy(alpha = 0.5f)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.DeleteOutline, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Delete", fontSize = 12.sp)
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { mode = "edit" },
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Edit", fontSize = 12.sp)
                                }
                                Button(
                                    onClick = onDismiss,
                                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Text("Close", color = Color.White, fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    "edit" -> {
                        // Edit View
                        OutlinedTextField(
                            value = editDescription,
                            onValueChange = { editDescription = it },
                            label = { Text("Description", color = TextMuted) },
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
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = editAmountText,
                                onValueChange = { editAmountText = it },
                                label = { Text("Amount", color = TextMuted) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = TealLight,
                                    unfocusedBorderColor = VeltisCardBorder
                                ),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = editDate,
                                onValueChange = { editDate = it },
                                label = { Text("Date (YYYY-MM-DD)", color = TextMuted) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = TealLight,
                                    unfocusedBorderColor = VeltisCardBorder
                                ),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        OutlinedTextField(
                            value = editMerchant,
                            onValueChange = { editMerchant = it },
                            label = { Text("Merchant / Payee", color = TextMuted) },
                            placeholder = { Text("e.g. Amazon, Uber, Grocery", color = TextSubtle) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = TealLight,
                                unfocusedBorderColor = VeltisCardBorder
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Category Picker
                        Text(text = "Category", fontSize = 11.sp, color = TextMuted)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            item {
                                val isSelected = editCategoryId == null
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                        .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                        .clickable { editCategoryId = null }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text("Uncategorized", fontSize = 11.sp, color = if (isSelected) Color.White else TextMuted)
                                }
                            }
                            items(categories) { cat ->
                                val isSelected = editCategoryId == cat.id
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                        .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                        .clickable { editCategoryId = cat.id }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(cat.name, fontSize = 11.sp, color = if (isSelected) Color.White else TextMuted)
                                }
                            }
                        }

                        // Account Picker
                        Text(text = "Account", fontSize = 11.sp, color = TextMuted)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(accounts) { acc ->
                                val isSelected = editAccountId == acc.id
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                        .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                        .clickable { editAccountId = acc.id }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(acc.name, fontSize = 11.sp, color = if (isSelected) Color.White else TextMuted)
                                }
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = { mode = "details" }) {
                                Text("Cancel", color = TextMuted)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Button(
                                onClick = {
                                    val amt = editAmountText.toDoubleOrNull()
                                    onUpdate(
                                        editDescription.takeIf { it.isNotBlank() },
                                        editMerchant.takeIf { it.isNotBlank() },
                                        editCategoryId,
                                        editDate.takeIf { it.isNotBlank() },
                                        amt,
                                        editAccountId.takeIf { it.isNotBlank() }
                                    )
                                },
                                enabled = !isSubmitting && (editAmountText.toDoubleOrNull() ?: 0.0) > 0,
                                colors = ButtonDefaults.buttonColors(containerColor = TealLight),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (isSubmitting) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.Black)
                                } else {
                                    Text("Save Changes", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    "delete" -> {
                        // Double-Entry Accounting Warning View (Exact PWA Parity)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(WarningAmberBg)
                                .border(1.dp, WarningAmber.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = WarningAmber,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "Double-Entry Accounting Reversal",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = WarningAmber
                                    )
                                }
                                Text(
                                    text = "Deleting this transaction will reverse its ledger balance impact on your account and exclude it from all reporting and budget calculations.",
                                    fontSize = 11.sp,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "In compliance with double-entry principles, the record is soft-deleted and preserved for audit trails.",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            }
                        }

                        // Checkbox Confirmation
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF0F172A))
                                .border(1.dp, VeltisCardBorder, RoundedCornerShape(10.dp))
                                .clickable { deleteConfirmed = !deleteConfirmed }
                                .padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Checkbox(
                                checked = deleteConfirmed,
                                onCheckedChange = { deleteConfirmed = it },
                                colors = CheckboxDefaults.colors(
                                    checkedColor = ExpenseRed,
                                    uncheckedColor = TextMuted
                                )
                            )
                            Text(
                                text = "I understand and want to delete this transaction (${transaction.description ?: "Transaction"}) of ${formatCurrency(transaction.amount, transaction.currency)}.",
                                fontSize = 11.sp,
                                color = Color.White
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = { mode = "details" }) {
                                Text("Cancel", color = TextMuted)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Button(
                                onClick = onDelete,
                                enabled = deleteConfirmed && !isSubmitting,
                                colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (isSubmitting) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                                } else {
                                    Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Confirm & Delete", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DetailItem(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, fontSize = 12.sp, color = TextMuted)
        Text(text = value, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
    }
}

@Composable
fun AccountFilterDialog(
    accounts: List<AccountDetailDto>,
    selectedAccountId: String?,
    onSelectAccount: (String?) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(VeltisCardBg)
                .border(1.dp, VeltisCardBorder, RoundedCornerShape(18.dp))
                .padding(18.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Filter by Account",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    item {
                        FilterOptionRow(
                            label = "All Accounts",
                            isSelected = selectedAccountId == null,
                            onClick = { onSelectAccount(null) }
                        )
                    }
                    items(accounts) { acc ->
                        FilterOptionRow(
                            label = "${acc.name} (${acc.currency})",
                            isSelected = selectedAccountId == acc.id,
                            onClick = { onSelectAccount(acc.id) }
                        )
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) {
                        Text("Close", color = TextMuted)
                    }
                }
            }
        }
    }
}

@Composable
fun CategoryFilterDialog(
    categories: List<CategoryDto>,
    selectedCategoryId: String?,
    onSelectCategory: (String?) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(VeltisCardBg)
                .border(1.dp, VeltisCardBorder, RoundedCornerShape(18.dp))
                .padding(18.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Filter by Category",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    item {
                        FilterOptionRow(
                            label = "All Categories",
                            isSelected = selectedCategoryId == null,
                            onClick = { onSelectCategory(null) }
                        )
                    }
                    items(categories) { cat ->
                        FilterOptionRow(
                            label = cat.name,
                            isSelected = selectedCategoryId == cat.id,
                            onClick = { onSelectCategory(cat.id) }
                        )
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) {
                        Text("Close", color = TextMuted)
                    }
                }
            }
        }
    }
}

@Composable
fun SortFilterDialog(
    selectedSort: String,
    onSelectSort: (String) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(VeltisCardBg)
                .border(1.dp, VeltisCardBorder, RoundedCornerShape(18.dp))
                .padding(18.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Sort Transactions",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                val sortOptions = listOf(
                    "date_desc" to "Newest First",
                    "date_asc" to "Oldest First",
                    "amount_desc" to "Amount: High to Low",
                    "amount_asc" to "Amount: Low to High"
                )

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    sortOptions.forEach { (key, label) ->
                        FilterOptionRow(
                            label = label,
                            isSelected = selectedSort == key,
                            onClick = { onSelectSort(key) }
                        )
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) {
                        Text("Close", color = TextMuted)
                    }
                }
            }
        }
    }
}

@Composable
fun FilterOptionRow(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) TealContainer else Color(0xFF0F172A))
            .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            color = if (isSelected) Color.White else TextPrimary
        )
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = TealLight,
                modifier = Modifier.size(16.dp)
            )
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
    var selectedCategoryId by remember { mutableStateOf<String?>(null) }
    var dateText by remember {
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

                // Category Selection (Optional)
                if (type != "transfer" && categories.isNotEmpty()) {
                    Text(text = "Category (Optional)", fontSize = 11.sp, color = TextMuted)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(categories) { cat ->
                            val isSelected = selectedCategoryId == cat.id
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                    .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                    .clickable {
                                        selectedCategoryId = if (isSelected) null else cat.id
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = cat.name,
                                    fontSize = 11.sp,
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

                // Date
                OutlinedTextField(
                    value = dateText,
                    onValueChange = { dateText = it },
                    label = { Text("Date (YYYY-MM-DD)", color = TextMuted) },
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
                            onCreate(type, amt, selectedAccountId, destAcc, description.takeIf { it.isNotBlank() }, selectedCategoryId, dateText.takeIf { it.isNotBlank() })
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

fun formatDateHeader(dateStr: String): String {
    return try {
        val cleanDate = if (dateStr.length >= 10) dateStr.take(10) else dateStr
        val today = LocalDate.now()
        val parsed = LocalDate.parse(cleanDate)
        val formatter = DateTimeFormatter.ofPattern("EEE, MMM d, yyyy")
        val formatted = parsed.format(formatter)
        when (parsed) {
            today -> "Today • $formatted"
            today.minusDays(1) -> "Yesterday • $formatted"
            else -> formatted
        }
    } catch (_: Exception) {
        dateStr
    }
}
