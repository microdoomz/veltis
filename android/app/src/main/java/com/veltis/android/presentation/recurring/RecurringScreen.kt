package com.veltis.android.presentation.recurring

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
import com.veltis.android.data.model.CategoryDto
import com.veltis.android.data.model.RecurringItemDto
import com.veltis.android.data.model.RecurringOccurrenceDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecurringScreen(
    viewModel: MoreViewModel,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Dialog States
    var itemToDelete by remember { mutableStateOf<RecurringItemDto?>(null) }
    var reviewingOccurrence by remember { mutableStateOf<Pair<RecurringItemDto, RecurringOccurrenceDto>?>(null) }
    var showAddDialog by remember { mutableStateOf(false) }

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
                    Column {
                        Text(
                            text = "Recurring Items & SIPs",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 18.sp
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
                Icon(imageVector = Icons.Default.Add, contentDescription = "Add Recurring Item")
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
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Automate recurring bills, subscriptions, transfers, and review your monthly SIP investments.",
                    fontSize = 12.sp,
                    color = TextMuted,
                    lineHeight = 16.sp
                )
            }

            // Section Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recurring Schedules (${state.recurringItems.size})",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    TextButton(onClick = { showAddDialog = true }) {
                        Icon(imageVector = Icons.Default.Add, contentDescription = null, tint = TealLight, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Add Item", fontSize = 13.sp, color = TealLight, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            if (state.recurringItems.isEmpty()) {
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
                            Icon(
                                imageVector = Icons.Default.Repeat,
                                contentDescription = null,
                                tint = TextMuted,
                                modifier = Modifier.size(36.dp)
                            )
                            Text(
                                text = "No recurring items or SIPs set up yet",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Create your first subscription, monthly bill, transfer rule, or SIP investment using the Add button below.",
                                fontSize = 12.sp,
                                color = TextMuted,
                                textAlign = TextAlign.Center
                            )
                            Button(
                                onClick = { showAddDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = TealPrimary)
                            ) {
                                Text("Add Recurring Item", color = Color.White)
                            }
                        }
                    }
                }
            } else {
                items(state.recurringItems, key = { it.id }) { item ->
                    val isInvestment = item.type.equals("investment", ignoreCase = true) || item.type.equals("sip", ignoreCase = true)
                    val isTransfer = item.type.equals("transfer", ignoreCase = true)
                    val isIncome = item.type.equals("income", ignoreCase = true)
                    val isExpense = !isInvestment && !isTransfer && !isIncome

                    val sourceAcc = state.accounts.find { it.id == item.defaultAccountId }
                    val destAcc = state.accounts.find { it.id == item.destinationAccountId }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(18.dp))
                            .background(VeltisCardBg)
                            .border(1.dp, VeltisCardBorder, RoundedCornerShape(18.dp))
                            .padding(16.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            // Header Row: Name, Type Badge, Amount, and Delete Button
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(
                                            text = item.name,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )

                                        // Badge
                                        val badgeBg = when {
                                            isInvestment -> Color(0x289333EA)
                                            isTransfer -> Color(0x283B82F6)
                                            isIncome -> IncomeGreenBg
                                            else -> ExpenseRedBg
                                        }
                                        val badgeColor = when {
                                            isInvestment -> Color(0xFFC084FC)
                                            isTransfer -> Color(0xFF60A5FA)
                                            isIncome -> IncomeGreen
                                            else -> ExpenseRed
                                        }
                                        val badgeText = when {
                                            isInvestment -> "SIP / Investment"
                                            isTransfer -> "Transfer"
                                            isIncome -> "Income"
                                            else -> "Expense"
                                        }

                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(badgeBg)
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = badgeText,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = badgeColor
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.CalendarToday,
                                            contentDescription = null,
                                            tint = TextMuted,
                                            modifier = Modifier.size(12.dp)
                                        )
                                        Text(
                                            text = "Monthly • Day ${item.customDay ?: 1}",
                                            fontSize = 11.sp,
                                            color = TextMuted
                                        )
                                        if ((isTransfer || isInvestment) && (sourceAcc != null || destAcc != null)) {
                                            Text(
                                                text = "• ${sourceAcc?.name ?: "Bank"} → ${destAcc?.name ?: "Investment"}",
                                                fontSize = 11.sp,
                                                color = TextMuted,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    val effectiveAmount = item.displayAmountMinor / 100.0
                                    val amountText = if (state.isPrivacyMode) "••••" else formatCurrency(effectiveAmount, item.currency.ifBlank { state.baseCurrency })
                                    val amountColor = when {
                                        isIncome -> IncomeGreen
                                        isExpense -> ExpenseRed
                                        else -> Color.White
                                    }

                                    Text(
                                        text = amountText,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = amountColor
                                    )

                                    IconButton(
                                        onClick = { itemToDelete = item },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.DeleteOutline,
                                            contentDescription = "Delete",
                                            tint = Color(0xFFEF4444),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }

                            // Upcoming Reviews & Occurrences Section
                            if (item.pendingOccurrences.isNotEmpty()) {
                                Divider(color = VeltisCardBorder, thickness = 0.5.dp)

                                Text(
                                    text = "UPCOMING REVIEW (${item.pendingOccurrences.size})",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.8.sp,
                                    color = TextMuted
                                )

                                item.pendingOccurrences.forEach { occ ->
                                    val diffDays = calculateDaysDiff(occ.expectedDate)
                                    val isDueForReview = diffDays <= 0
                                    val formattedDate = formatIsoDate(occ.expectedDate)

                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(if (isDueForReview) Color(0x18F59E0B) else Color(0xFF0F172A))
                                            .border(
                                                1.dp,
                                                if (isDueForReview) Color(0x40F59E0B) else VeltisCardBorder,
                                                RoundedCornerShape(12.dp)
                                            )
                                            .padding(12.dp)
                                    ) {
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.CalendarToday,
                                                        contentDescription = null,
                                                        tint = TealLight,
                                                        modifier = Modifier.size(14.dp)
                                                    )
                                                    Text(
                                                        text = formattedDate,
                                                        fontSize = 13.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = Color.White
                                                    )
                                                }

                                                if (isDueForReview) {
                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(6.dp))
                                                            .background(Color(0x30F59E0B))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = "Due for Review",
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFFFBBF24)
                                                        )
                                                    }
                                                } else {
                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(6.dp))
                                                            .background(Color(0x280284C7))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = "Due in $diffDays days",
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFF38BDF8)
                                                        )
                                                    }
                                                }
                                            }

                                            // Account summary leg
                                            Text(
                                                text = if (isTransfer || isInvestment) {
                                                    "Account: ${sourceAcc?.name ?: "Bank"} → ${destAcc?.name ?: "Investment"}"
                                                } else {
                                                    "Account: ${sourceAcc?.name ?: "Default Account"}"
                                                },
                                                fontSize = 11.sp,
                                                color = TextMuted
                                            )

                                            // Footer action
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = if (isDueForReview) "Ready for review. Confirm or customize." else "Confirm available on $formattedDate",
                                                    fontSize = 10.sp,
                                                    color = if (isDueForReview) Color(0xFFFBBF24) else TextMuted
                                                )

                                                Button(
                                                    onClick = { reviewingOccurrence = Pair(item, occ) },
                                                    enabled = isDueForReview,
                                                    colors = ButtonDefaults.buttonColors(
                                                        containerColor = if (isDueForReview) TealPrimary else Color.DarkGray,
                                                        disabledContainerColor = Color(0xFF222A38)
                                                    ),
                                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                                    modifier = Modifier.height(30.dp),
                                                    shape = RoundedCornerShape(8.dp)
                                                ) {
                                                    Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(13.dp))
                                                    Spacer(modifier = Modifier.width(4.dp))
                                                    Text(text = "Confirm", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }

    // 1. Custom Delete Confirmation Dialog (matching PWA modal)
    itemToDelete?.let { item ->
        Dialog(onDismissRequest = { if (!state.isSubmitting) itemToDelete = null }) {
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
                            Text(text = "Delete Recurring Schedule", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text(text = "This action cannot be undone", fontSize = 11.sp, color = TextMuted)
                        }
                    }

                    Text(
                        text = "Are you sure you want to delete the recurring schedule for \"${item.name}\"? All pending monthly reviews and reminders will also be deleted.",
                        fontSize = 13.sp,
                        color = Color(0xFFCBD5E1),
                        lineHeight = 18.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(
                            onClick = { itemToDelete = null },
                            enabled = !state.isSubmitting
                        ) {
                            Text("Cancel", color = TextMuted)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                viewModel.deleteRecurringItem(item.id)
                                itemToDelete = null
                            },
                            enabled = !state.isSubmitting,
                            colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (state.isSubmitting) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                            } else {
                                Text("Delete Schedule", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. 3-Option Review Occurrence Popup Modal (Confirm, Edit, Skip)
    reviewingOccurrence?.let { (item, occ) ->
        ReviewOccurrenceDialog(
            item = item,
            occurrence = occ,
            accounts = state.accounts,
            baseCurrency = state.baseCurrency,
            isSubmitting = state.isSubmitting,
            onDismiss = { reviewingOccurrence = null },
            onConfirmQuick = {
                viewModel.confirmRecurringOccurrence(
                    occurrenceId = occ.id,
                    accountId = item.defaultAccountId ?: state.accounts.firstOrNull { it.accountType != "investment" }?.id ?: "",
                    actualDateStr = occ.expectedDate,
                    actualAmount = item.displayAmountMinor / 100.0,
                    destinationAccountId = item.destinationAccountId,
                    onSuccess = { reviewingOccurrence = null }
                )
            },
            onConfirmWithEdits = { amt, date, srcAccId, destAccId ->
                viewModel.confirmRecurringOccurrence(
                    occurrenceId = occ.id,
                    accountId = srcAccId,
                    actualDateStr = date,
                    actualAmount = amt,
                    destinationAccountId = destAccId,
                    onSuccess = { reviewingOccurrence = null }
                )
            },
            onSkip = {
                viewModel.skipRecurringOccurrence(occ.id, onSuccess = { reviewingOccurrence = null })
            }
        )
    }

    // 3. Add Recurring Item Dialog
    if (showAddDialog) {
        AddRecurringDialog(
            accounts = state.accounts,
            categories = state.categories,
            baseCurrency = state.baseCurrency,
            isSubmitting = state.isSubmitting,
            onDismiss = { showAddDialog = false },
            onSubmit = { type, name, amount, customDay, srcId, destId, catId ->
                viewModel.createRecurringItem(
                    type = type,
                    name = name,
                    amount = amount,
                    currency = state.baseCurrency,
                    customDay = customDay,
                    categoryId = catId,
                    defaultAccountId = srcId,
                    destinationAccountId = destId,
                    onSuccess = { showAddDialog = false }
                )
            }
        )
    }
}

@Composable
fun ReviewOccurrenceDialog(
    item: RecurringItemDto,
    occurrence: RecurringOccurrenceDto,
    accounts: List<AccountDetailDto>,
    baseCurrency: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirmQuick: () -> Unit,
    onConfirmWithEdits: (amount: Double, date: String, sourceAccountId: String, destAccountId: String?) -> Unit,
    onSkip: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) } // 0: Confirm, 1: Edit, 2: Skip

    val isInvestment = item.type.equals("investment", ignoreCase = true) || item.type.equals("sip", ignoreCase = true)
    val isTransfer = item.type.equals("transfer", ignoreCase = true)

    val nonInvestmentAccounts = accounts.filter { !it.accountType.equals("investment", ignoreCase = true) }
    val investmentAccounts = accounts.filter { it.accountType.equals("investment", ignoreCase = true) }

    // Edit tab fields
    var editAmountText by remember { mutableStateOf(String.format(Locale.US, "%.2f", item.displayAmountMinor / 100.0)) }
    var editDateText by remember { mutableStateOf(occurrence.expectedDate) }
    var editSourceAccId by remember {
        mutableStateOf(item.defaultAccountId ?: nonInvestmentAccounts.firstOrNull()?.id ?: "")
    }
    var editDestAccId by remember {
        mutableStateOf(
            item.destinationAccountId ?: if (isInvestment) investmentAccounts.firstOrNull()?.id ?: "" else nonInvestmentAccounts.getOrNull(1)?.id ?: ""
        )
    }

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
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Review Recurring Occurrence",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "${item.name} • ${formatIsoDate(occurrence.expectedDate)}",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                    }
                }

                // 3 Options Tab Bar (Confirm, Edit, Skip)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF0F172A))
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(10.dp))
                        .padding(3.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Tab 0: Confirm
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (selectedTab == 0) VeltisCardBg else Color.Transparent)
                            .clickable { selectedTab = 0 }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "1. Confirm",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (selectedTab == 0) IncomeGreen else TextMuted
                        )
                    }

                    // Tab 1: Edit
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (selectedTab == 1) VeltisCardBg else Color.Transparent)
                            .clickable { selectedTab = 1 }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "2. Edit",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (selectedTab == 1) Color(0xFF60A5FA) else TextMuted
                        )
                    }

                    // Tab 2: Skip
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (selectedTab == 2) VeltisCardBg else Color.Transparent)
                            .clickable { selectedTab = 2 }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "3. Skip",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (selectedTab == 2) Color(0xFFFBBF24) else TextMuted
                        )
                    }
                }

                // Tab Content
                when (selectedTab) {
                    0 -> {
                        // 1. Confirm Tab
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF0F172A))
                                .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
                                .padding(14.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Amount:", fontSize = 12.sp, color = TextMuted)
                                    Text(
                                        formatCurrency(item.displayAmountMinor / 100.0, item.currency.ifBlank { baseCurrency }),
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Date:", fontSize = 12.sp, color = TextMuted)
                                    Text(formatIsoDate(occurrence.expectedDate), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Source Account:", fontSize = 12.sp, color = TextMuted)
                                    Text(
                                        accounts.find { it.id == item.defaultAccountId }?.name ?: "Default Account",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color.White
                                    )
                                }
                                if (isTransfer || isInvestment) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Destination Account:", fontSize = 12.sp, color = TextMuted)
                                        Text(
                                            accounts.find { it.id == item.destinationAccountId }?.name ?: "Destination Account",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }

                        Text(
                            text = "Directly apply this transaction with the standard scheduled details. The transaction will be recorded and the schedule will advance to next month.",
                            fontSize = 11.sp,
                            color = TextMuted,
                            lineHeight = 15.sp
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
                                onClick = onConfirmQuick,
                                enabled = !isSubmitting,
                                colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (isSubmitting) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                                } else {
                                    Text("Confirm & Apply", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    1 -> {
                        // 2. Edit Tab
                        OutlinedTextField(
                            value = editAmountText,
                            onValueChange = { editAmountText = it },
                            label = { Text("Amount (${item.currency.ifBlank { baseCurrency }})", color = TextMuted) },
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
                            value = editDateText,
                            onValueChange = { editDateText = it },
                            label = { Text("Transaction Date (YYYY-MM-DD)", color = TextMuted) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = TealLight,
                                unfocusedBorderColor = VeltisCardBorder
                            )
                        )

                        // Source Account Selector
                        var showSourceDropdown by remember { mutableStateOf(false) }
                        val selectedSrc = accounts.find { it.id == editSourceAccId }
                        Box {
                            OutlinedTextField(
                                value = selectedSrc?.let { "${it.name} (${it.accountType})" } ?: "Select Source Account",
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Source Account", color = TextMuted) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { showSourceDropdown = true },
                                trailingIcon = {
                                    IconButton(onClick = { showSourceDropdown = true }) {
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
                            DropdownMenu(
                                expanded = showSourceDropdown,
                                onDismissRequest = { showSourceDropdown = false }
                            ) {
                                nonInvestmentAccounts.forEach { a ->
                                    DropdownMenuItem(
                                        text = { Text("${a.name} (${a.accountType})") },
                                        onClick = {
                                            editSourceAccId = a.id
                                            showSourceDropdown = false
                                        }
                                    )
                                }
                            }
                        }

                        // Destination Account Selector (if transfer or investment)
                        if (isTransfer || isInvestment) {
                            var showDestDropdown by remember { mutableStateOf(false) }
                            val selectedDest = accounts.find { it.id == editDestAccId }
                            val destCandidates = if (isInvestment) investmentAccounts else nonInvestmentAccounts.filter { it.id != editSourceAccId }

                            Box {
                                OutlinedTextField(
                                    value = selectedDest?.let { "${it.name} (${it.accountType})" } ?: "Select Destination Account",
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text(if (isInvestment) "Destination Investment Fund" else "Destination Account", color = TextMuted) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { showDestDropdown = true },
                                    trailingIcon = {
                                        IconButton(onClick = { showDestDropdown = true }) {
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
                                DropdownMenu(
                                    expanded = showDestDropdown,
                                    onDismissRequest = { showDestDropdown = false }
                                ) {
                                    destCandidates.forEach { a ->
                                        DropdownMenuItem(
                                            text = { Text("${a.name} (${a.accountType})") },
                                            onClick = {
                                                editDestAccId = a.id
                                                showDestDropdown = false
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        Text(
                            text = "Modify the amount or change the accounts for this month's occurrence. The transaction will apply your custom values and advance to next month.",
                            fontSize = 11.sp,
                            color = TextMuted,
                            lineHeight = 15.sp
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
                                    val amt = editAmountText.toDoubleOrNull() ?: 0.0
                                    if (amt > 0) {
                                        onConfirmWithEdits(amt, editDateText, editSourceAccId, if (isTransfer || isInvestment) editDestAccId else null)
                                    }
                                },
                                enabled = !isSubmitting && (editAmountText.toDoubleOrNull() ?: 0.0) > 0,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (isSubmitting) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                                } else {
                                    Text("Confirm with Edits", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    2 -> {
                        // 3. Skip Tab
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0x20F59E0B))
                                .border(1.dp, Color(0x50F59E0B), RoundedCornerShape(12.dp))
                                .padding(14.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.Warning, contentDescription = null, tint = Color(0xFFFBBF24))
                                    Text("Skip this month's occurrence?", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFDE68A))
                                }
                                Text(
                                    text = "Skipping will not deduct, transfer, or invest any money for \"${item.name}\". This month's review will be marked as skipped, and the schedule will advance to next month automatically.",
                                    fontSize = 11.sp,
                                    color = Color(0xFFFEF3C7),
                                    lineHeight = 16.sp
                                )
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
                                onClick = onSkip,
                                enabled = !isSubmitting,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (isSubmitting) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                                } else {
                                    Text("Skip Occurrence", color = Color.White, fontWeight = FontWeight.Bold)
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
fun AddRecurringDialog(
    accounts: List<AccountDetailDto>,
    categories: List<CategoryDto>,
    baseCurrency: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (type: String, name: String, amount: Double, customDay: Int, sourceAccountId: String?, destAccountId: String?, categoryId: String?) -> Unit
) {
    var type by remember { mutableStateOf("expense") } // 'expense', 'income', 'transfer', 'investment'
    var name by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("") }
    var dayText by remember { mutableStateOf("1") }
    var sourceAccId by remember { mutableStateOf("") }
    var destAccId by remember { mutableStateOf("") }
    var categoryId by remember { mutableStateOf("") }

    val nonInvestmentAccounts = accounts.filter { !it.accountType.equals("investment", ignoreCase = true) }
    val investmentAccounts = accounts.filter { it.accountType.equals("investment", ignoreCase = true) }

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
                    text = "Add Recurring Item",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Automate expenses, incomes, transfers, and recurring SIP investments.",
                    fontSize = 11.sp,
                    color = TextMuted
                )

                // Type Selector Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    listOf("expense" to "Expense", "income" to "Income", "transfer" to "Transfer", "investment" to "SIP").forEach { (tKey, tLabel) ->
                        val isSel = type == tKey
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSel) TealPrimary else Color(0xFF0F172A))
                                .border(1.dp, if (isSel) TealLight else VeltisCardBorder, RoundedCornerShape(8.dp))
                                .clickable {
                                    type = tKey
                                    sourceAccId = ""
                                    destAccId = ""
                                }
                                .padding(vertical = 6.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = tLabel,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSel) Color.White else TextMuted
                            )
                        }
                    }
                }

                // Name
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = {
                        Text(
                            when (type) {
                                "investment" -> "Investment / SIP Name"
                                "transfer" -> "Transfer Description"
                                else -> "Name / Merchant"
                            },
                            color = TextMuted
                        )
                    },
                    placeholder = {
                        Text(
                            when (type) {
                                "investment" -> "e.g. Parag Parikh Flexi Cap Fund"
                                "transfer" -> "e.g. Monthly Savings Transfer"
                                else -> "e.g. Netflix, Rent, Salary"
                            },
                            color = TextMuted
                        )
                    },
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
                        value = amountText,
                        onValueChange = { amountText = it },
                        label = { Text("Amount ($baseCurrency)", color = TextMuted) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1.3f),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )

                    OutlinedTextField(
                        value = dayText,
                        onValueChange = { dayText = it },
                        label = { Text("Day (1-31)", color = TextMuted) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(0.9f),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = TealLight,
                            unfocusedBorderColor = VeltisCardBorder
                        )
                    )
                }

                // Accounts & Categories based on Type
                when (type) {
                    "transfer" -> {
                        // Source
                        var showSrc by remember { mutableStateOf(false) }
                        val srcAcc = accounts.find { it.id == sourceAccId }
                        Box {
                            OutlinedTextField(
                                value = srcAcc?.name ?: "Select Source Bank",
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Source Account (Debit)", color = TextMuted) },
                                modifier = Modifier.fillMaxWidth().clickable { showSrc = true },
                                trailingIcon = {
                                    IconButton(onClick = { showSrc = true }) {
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
                            DropdownMenu(expanded = showSrc, onDismissRequest = { showSrc = false }) {
                                nonInvestmentAccounts.forEach { a ->
                                    DropdownMenuItem(
                                        text = { Text("${a.name} (${a.accountType})") },
                                        onClick = { sourceAccId = a.id; showSrc = false }
                                    )
                                }
                            }
                        }

                        // Dest
                        var showDst by remember { mutableStateOf(false) }
                        val dstAcc = accounts.find { it.id == destAccId }
                        Box {
                            OutlinedTextField(
                                value = dstAcc?.name ?: "Select Destination Bank",
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Destination Account (Credit)", color = TextMuted) },
                                modifier = Modifier.fillMaxWidth().clickable { showDst = true },
                                trailingIcon = {
                                    IconButton(onClick = { showDst = true }) {
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
                            DropdownMenu(expanded = showDst, onDismissRequest = { showDst = false }) {
                                nonInvestmentAccounts.filter { it.id != sourceAccId }.forEach { a ->
                                    DropdownMenuItem(
                                        text = { Text("${a.name} (${a.accountType})") },
                                        onClick = { destAccId = a.id; showDst = false }
                                    )
                                }
                            }
                        }
                    }

                    "investment" -> {
                        // Funding Source Bank
                        var showSrc by remember { mutableStateOf(false) }
                        val srcAcc = accounts.find { it.id == sourceAccId }
                        Box {
                            OutlinedTextField(
                                value = srcAcc?.name ?: "Select Funding Bank",
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Funding Account (Source Bank)", color = TextMuted) },
                                modifier = Modifier.fillMaxWidth().clickable { showSrc = true },
                                trailingIcon = {
                                    IconButton(onClick = { showSrc = true }) {
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
                            DropdownMenu(expanded = showSrc, onDismissRequest = { showSrc = false }) {
                                nonInvestmentAccounts.forEach { a ->
                                    DropdownMenuItem(
                                        text = { Text("${a.name} (${a.accountType})") },
                                        onClick = { sourceAccId = a.id; showSrc = false }
                                    )
                                }
                            }
                        }

                        // Destination Investment Account
                        var showDst by remember { mutableStateOf(false) }
                        val dstAcc = accounts.find { it.id == destAccId }
                        Box {
                            OutlinedTextField(
                                value = dstAcc?.name ?: "Select Investment Account",
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Destination Investment Account", color = TextMuted) },
                                modifier = Modifier.fillMaxWidth().clickable { showDst = true },
                                trailingIcon = {
                                    IconButton(onClick = { showDst = true }) {
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
                            DropdownMenu(expanded = showDst, onDismissRequest = { showDst = false }) {
                                investmentAccounts.forEach { a ->
                                    DropdownMenuItem(
                                        text = { Text("${a.name} (Investment)") },
                                        onClick = { destAccId = a.id; showDst = false }
                                    )
                                }
                            }
                        }
                    }

                    else -> {
                        // Expense or Income: Account & Category
                        var showSrc by remember { mutableStateOf(false) }
                        val srcAcc = accounts.find { it.id == sourceAccId }
                        Box {
                            OutlinedTextField(
                                value = srcAcc?.name ?: "Select Account (Optional)",
                                onValueChange = {},
                                readOnly = true,
                                label = { Text(if (type == "income") "Deposit Account" else "Payment Account", color = TextMuted) },
                                modifier = Modifier.fillMaxWidth().clickable { showSrc = true },
                                trailingIcon = {
                                    IconButton(onClick = { showSrc = true }) {
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
                            DropdownMenu(expanded = showSrc, onDismissRequest = { showSrc = false }) {
                                nonInvestmentAccounts.forEach { a ->
                                    DropdownMenuItem(
                                        text = { Text("${a.name} (${a.accountType})") },
                                        onClick = { sourceAccId = a.id; showSrc = false }
                                    )
                                }
                            }
                        }

                        // Category
                        var showCat by remember { mutableStateOf(false) }
                        val cat = categories.find { it.id == categoryId }
                        Box {
                            OutlinedTextField(
                                value = cat?.name ?: "Select Category (Optional)",
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Category", color = TextMuted) },
                                modifier = Modifier.fillMaxWidth().clickable { showCat = true },
                                trailingIcon = {
                                    IconButton(onClick = { showCat = true }) {
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
                            DropdownMenu(expanded = showCat, onDismissRequest = { showCat = false }) {
                                categories.forEach { c ->
                                    DropdownMenuItem(
                                        text = { Text(c.name) },
                                        onClick = { categoryId = c.id; showCat = false }
                                    )
                                }
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
                            val amt = amountText.toDoubleOrNull() ?: 0.0
                            val cDay = dayText.toIntOrNull()?.coerceIn(1, 31) ?: 1
                            if (name.isNotBlank() && amt > 0) {
                                onSubmit(
                                    type,
                                    name.trim(),
                                    amt,
                                    cDay,
                                    sourceAccId.ifBlank { null },
                                    destAccId.ifBlank { null },
                                    categoryId.ifBlank { null }
                                )
                            }
                        },
                        enabled = !isSubmitting && name.isNotBlank() && (amountText.toDoubleOrNull() ?: 0.0) > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                        } else {
                            Text("Create Recurring Item", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

private fun calculateDaysDiff(targetDateStr: String): Long {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("Asia/Kolkata")
        val target = sdf.parse(targetDateStr) ?: return 0
        val nowCal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata")).apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val diffMs = target.time - nowCal.timeInMillis
        TimeUnit.MILLISECONDS.toDays(diffMs)
    } catch (_: Exception) {
        0
    }
}

private fun formatIsoDate(dateStr: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val d = sdf.parse(dateStr) ?: return dateStr
        val outSdf = SimpleDateFormat("d MMM yyyy", Locale.US)
        outSdf.format(d)
    } catch (_: Exception) {
        dateStr
    }
}
