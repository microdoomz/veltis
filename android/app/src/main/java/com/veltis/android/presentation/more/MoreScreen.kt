package com.veltis.android.presentation.more

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
import com.veltis.android.data.model.*
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(
    viewModel: MoreViewModel,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var selectedSection by remember { mutableStateOf("budgets") } // 'budgets', 'debt', 'recurring', 'settings'
    var showCreateBudgetDialog by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }
    var showDeleteAccountConfirm by remember { mutableStateOf(false) }

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
                        text = "More Features",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 20.sp
                    )
                },
                actions = {
                    IconButton(onClick = { viewModel.loadAllData() }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
            )
        },
        containerColor = VeltisDarkBg
    ) { padding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Profile & Privacy Bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(VeltisCardBg)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp)
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
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(TealDark),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = state.userName?.take(1)?.uppercase() ?: "V",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        Column {
                            Text(
                                text = state.userName ?: "User",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = state.userEmail ?: "Base: ${state.baseCurrency}",
                                fontSize = 12.sp,
                                color = TextMuted
                            )
                        }
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { viewModel.togglePrivacyMode() }) {
                            Icon(
                                imageVector = if (state.isPrivacyMode) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = "Toggle Privacy",
                                tint = if (state.isPrivacyMode) TealLight else TextMuted
                            )
                        }
                    }
                }
            }

            // Section Selector Pills
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val sections = listOf(
                    "budgets" to "Budgets",
                    "analytics" to "Analytics",
                    "debt" to "Receivables & Debt",
                    "recurring" to "Recurring",
                    "exports" to "Export & Data",
                    "settings" to "Settings & Account"
                )
                items(sections) { (secKey, label) ->
                    val isSelected = selectedSection == secKey
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(if (isSelected) TealPrimary else VeltisCardBg)
                            .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(20.dp))
                            .clickable { selectedSection = secKey }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
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

            // Section Content
            when (selectedSection) {
                "budgets" -> BudgetsSection(
                    budgets = state.budgets,
                    categories = state.categories,
                    isPrivacyMode = state.isPrivacyMode,
                    onCreateClick = { showCreateBudgetDialog = true },
                    onDeleteClick = { viewModel.deleteBudget(it) }
                )
                "analytics" -> AnalyticsSection(
                    income = state.totalIncome,
                    expenses = state.totalExpenses,
                    netCashflow = state.netCashflow,
                    breakdown = state.categoryBreakdown,
                    isPrivacyMode = state.isPrivacyMode
                )
                "debt" -> ReceivablesLiabilitiesSection(
                    receivables = state.receivables,
                    liabilities = state.liabilities,
                    isPrivacyMode = state.isPrivacyMode
                )
                "recurring" -> RecurringSection(
                    recurringItems = state.recurringItems,
                    isPrivacyMode = state.isPrivacyMode
                )
                "exports" -> ExportsImportsSection(
                    isSubmitting = state.isSubmitting,
                    onExport = { format ->
                        viewModel.exportData(format) {}
                    }
                )
                "settings" -> SettingsSection(
                    isPrivacyMode = state.isPrivacyMode,
                    onTogglePrivacy = { viewModel.togglePrivacyMode() },
                    onLogoutClick = { showLogoutConfirm = true },
                    onDeleteAccountClick = { showDeleteAccountConfirm = true }
                )
            }
        }

        // Dialog: Create Budget
        if (showCreateBudgetDialog) {
            CreateBudgetDialog(
                categories = state.categories,
                isSubmitting = state.isSubmitting,
                onDismiss = { showCreateBudgetDialog = false },
                onCreate = { catId, amount, currency, start, end ->
                    viewModel.createBudget(catId, amount, currency, start, end) {
                        showCreateBudgetDialog = false
                    }
                }
            )
        }

        // Dialog: Logout confirmation
        if (showLogoutConfirm) {
            AlertDialog(
                onDismissRequest = { showLogoutConfirm = false },
                title = { Text("Sign Out", color = Color.White) },
                text = { Text("Are you sure you want to sign out from Veltis on this device?", color = TextMuted) },
                confirmButton = {
                    Button(
                        onClick = {
                            showLogoutConfirm = false
                            viewModel.logout(onLogout)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = TealLight)
                    ) {
                        Text("Sign Out", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutConfirm = false }) {
                        Text("Cancel", color = TextMuted)
                    }
                },
                containerColor = VeltisCardBg
            )
        }

        // Dialog: Delete Account confirmation
        if (showDeleteAccountConfirm) {
            AlertDialog(
                onDismissRequest = { showDeleteAccountConfirm = false },
                title = { Text("Delete Account", color = ExpenseRed) },
                text = {
                    Text(
                        "WARNING: This will permanently delete your Veltis account and all ledger history. This action cannot be undone.",
                        color = Color.White
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            showDeleteAccountConfirm = false
                            viewModel.deleteAccount(onLogout)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed)
                    ) {
                        Text("Delete Everything", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteAccountConfirm = false }) {
                        Text("Cancel", color = TextMuted)
                    }
                },
                containerColor = VeltisCardBg
            )
        }
    }
}

@Composable
fun BudgetsSection(
    budgets: List<BudgetDto>,
    categories: List<CategoryDto>,
    isPrivacyMode: Boolean,
    onCreateClick: () -> Unit,
    onDeleteClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "Category Budgets (${budgets.size})", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Button(
                    onClick = onCreateClick,
                    colors = ButtonDefaults.buttonColors(containerColor = TealLight),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("+ New Budget", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        if (budgets.isEmpty()) {
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
                    Text(
                        text = "No budgets set for this period.\nCreate a budget limit to track monthly spending.",
                        fontSize = 13.sp,
                        color = TextMuted,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
        } else {
            items(budgets, key = { it.id }) { b ->
                val spent = b.spentMinor
                val total = b.amountMinor
                val percent = if (total > 0) (spent / total).coerceIn(0.0, 1.0).toFloat() else 0f
                val isOver = spent > total

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                        .padding(14.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = b.categoryName ?: "Category Budget",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            IconButton(onClick = { onDeleteClick(b.id) }, modifier = Modifier.size(28.dp)) {
                                Icon(imageVector = Icons.Default.DeleteOutline, contentDescription = "Delete", tint = TextSubtle, modifier = Modifier.size(16.dp))
                            }
                        }

                        LinearProgressIndicator(
                            progress = { percent },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = if (isOver) ExpenseRed else TealLight,
                            trackColor = Color(0xFF0F172A)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Spent: ${if (isPrivacyMode) "••••" else formatCurrency(spent, b.currency)}",
                                fontSize = 11.sp,
                                color = if (isOver) ExpenseRed else TextMuted
                            )
                            Text(
                                text = "Limit: ${if (isPrivacyMode) "••••" else formatCurrency(total, b.currency)}",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
fun ReceivablesLiabilitiesSection(
    receivables: List<ReceivableDto>,
    liabilities: List<LiabilityDto>,
    isPrivacyMode: Boolean
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(text = "Money Owed To You (Receivables)", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        if (receivables.isEmpty()) {
            item {
                Text(text = "No pending receivables recorded.", fontSize = 12.sp, color = TextMuted)
            }
        } else {
            items(receivables) { r ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = r.counterpartyName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                            r.dueDate?.let { Text(text = "Due: $it", fontSize = 11.sp, color = TextMuted) }
                        }
                        Text(
                            text = if (isPrivacyMode) "••••" else formatCurrency(r.outstandingAmountMinor, r.currency),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = IncomeGreen
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = "Debts & Loans (Liabilities)", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        if (liabilities.isEmpty()) {
            item {
                Text(text = "No active loans or debt liabilities recorded.", fontSize = 12.sp, color = TextMuted)
            }
        } else {
            items(liabilities) { l ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = l.lenderName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text(text = l.liabilityType.uppercase(), fontSize = 11.sp, color = TextMuted)
                        }
                        Text(
                            text = if (isPrivacyMode) "••••" else formatCurrency(l.remainingAmountMinor, l.currency),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = ExpenseRed
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
fun RecurringSection(
    recurringItems: List<RecurringItemDto>,
    isPrivacyMode: Boolean
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(text = "Subscriptions & Recurring Items", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        if (recurringItems.isEmpty()) {
            item {
                Text(text = "No recurring bills or incomes configured.", fontSize = 12.sp, color = TextMuted)
            }
        } else {
            items(recurringItems) { r ->
                val isIncome = r.type.equals("income", ignoreCase = true)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = r.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text(text = "${r.cadence.replaceFirstChar { it.uppercase() }} cadence", fontSize = 11.sp, color = TextMuted)
                        }
                        Text(
                            text = if (isPrivacyMode) "••••" else formatCurrency(r.amountMinor, r.currency),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isIncome) IncomeGreen else ExpenseRed
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
fun SettingsSection(
    isPrivacyMode: Boolean,
    onTogglePrivacy: () -> Unit,
    onLogoutClick: () -> Unit,
    onDeleteAccountClick: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(text = "Preferences", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(VeltisCardBg)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = "Privacy Mode (Mask Balances)", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                        Text(text = "Obscures money numbers when viewing in public", fontSize = 11.sp, color = TextMuted)
                    }
                    Switch(
                        checked = isPrivacyMode,
                        onCheckedChange = { onTogglePrivacy() },
                        colors = SwitchDefaults.colors(checkedThumbColor = TealLight, checkedTrackColor = TealDark)
                    )
                }
            }
        }

        item {
            Text(text = "Account Security", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        item {
            Button(
                onClick = onLogoutClick,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(imageVector = Icons.Default.Logout, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out", color = Color.White, fontWeight = FontWeight.SemiBold)
            }
        }

        item {
            Text(text = "Danger Zone", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = ExpenseRed)
        }

        item {
            Button(
                onClick = onDeleteAccountClick,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = ExpenseRedBg),
                border = androidx.compose.foundation.BorderStroke(1.dp, ExpenseRed.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(imageVector = Icons.Default.DeleteForever, contentDescription = null, tint = ExpenseRed, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Delete Veltis Account", color = ExpenseRed, fontWeight = FontWeight.Bold)
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
fun CreateBudgetDialog(
    categories: List<CategoryDto>,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onCreate: (catId: String, amount: Double, currency: String, start: String, end: String) -> Unit
) {
    var selectedCatId by remember { mutableStateOf(categories.firstOrNull()?.id ?: "") }
    var amountText by remember { mutableStateOf("") }
    val currency = "USD"

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
                Text(text = "Create Budget", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)

                Text(text = "Category", fontSize = 12.sp, color = TextMuted)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(categories) { cat ->
                        val isSelected = selectedCatId == cat.id
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) TealPrimary else Color(0xFF0F172A))
                                .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                            .clickable { selectedCatId = cat.id }
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(text = cat.name, fontSize = 12.sp, color = if (isSelected) Color.White else TextMuted)
                        }
                    }
                }

                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Monthly Budget Limit", color = TextMuted) },
                    placeholder = { Text("e.g. 500.00", color = TextMuted) },
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
                            val now = java.time.LocalDate.now()
                            val start = now.withDayOfMonth(1).toString()
                            val end = now.withDayOfMonth(now.lengthOfMonth()).toString()
                            onCreate(selectedCatId, amt, currency, start, end)
                        },
                        enabled = !isSubmitting && (amountText.toDoubleOrNull() ?: 0.0) > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = TealLight)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.Black)
                        } else {
                            Text("Save Budget", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AnalyticsSection(
    income: Double,
    expenses: Double,
    netCashflow: Double,
    breakdown: Map<String, Double>,
    isPrivacyMode: Boolean
) {
    val isPositive = netCashflow >= 0

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(text = "Cashflow & Spending Trends", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(VeltisCardBg)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(text = "NET CASHFLOW", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp, color = TextMuted)
                    Text(
                        text = if (isPrivacyMode) "••••" else {
                            val sign = if (isPositive) "+" else ""
                            "$sign${formatCurrency(netCashflow, "USD")}"
                        },
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (isPositive) IncomeGreen else ExpenseRed
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(IncomeGreenBg)
                                .padding(10.dp)
                        ) {
                            Column {
                                Text(text = "Total Inflow", fontSize = 11.sp, color = IncomeGreen)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = if (isPrivacyMode) "••••" else formatCurrency(income, "USD"),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = IncomeGreen
                                )
                            }
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(ExpenseRedBg)
                                .padding(10.dp)
                        ) {
                            Column {
                                Text(text = "Total Outflow", fontSize = 11.sp, color = ExpenseRed)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = if (isPrivacyMode) "••••" else formatCurrency(expenses, "USD"),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ExpenseRed
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            Text(text = "Spending by Category", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        if (breakdown.isEmpty()) {
            item {
                Text(text = "No category expense data available yet.", fontSize = 12.sp, color = TextMuted)
            }
        } else {
            val totalExpense = breakdown.values.sum().coerceAtLeast(1.0)
            items(breakdown.toList()) { (category, amount) ->
                val ratio = (amount / totalExpense).toFloat()
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = category, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text(
                                text = if (isPrivacyMode) "••••" else formatCurrency(amount, "USD"),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        LinearProgressIndicator(
                            progress = { ratio },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = TealLight,
                            trackColor = Color(0xFF0F172A)
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
fun ExportsImportsSection(
    isSubmitting: Boolean,
    onExport: (format: String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(text = "Zero Lock-In Exports", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Download complete authoritative ledger data in open formats directly from your device.",
                fontSize = 12.sp,
                color = TextMuted
            )
        }

        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(VeltisCardBg)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = { onExport("csv") },
                        enabled = !isSubmitting,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = TealDark),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Export Transactions (.CSV)", color = Color.White)
                    }

                    Button(
                        onClick = { onExport("xlsx") },
                        enabled = !isSubmitting,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Export Excel Workbook (.XLSX)", color = Color.White)
                    }

                    Button(
                        onClick = { onExport("json") },
                        enabled = !isSubmitting,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Export Full Ledger Backup (.JSON)", color = Color.White)
                    }
                }
            }
        }

        item {
            Text(text = "Bank Statement Imports", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Veltis statement parsers extract transactions from PDF, CSV, and Excel statements with zero floating-point loss.",
                fontSize = 12.sp,
                color = TextMuted
            )
        }

        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(VeltisCardBg)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                    .padding(14.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Statement parser is optimized for desktop & mobile web browser upload at /imports.",
                        fontSize = 13.sp,
                        color = Color.White
                    )
                    Text(
                        text = "All imported transactions automatically sync to your native Android app.",
                        fontSize = 11.sp,
                        color = TealLight
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}
