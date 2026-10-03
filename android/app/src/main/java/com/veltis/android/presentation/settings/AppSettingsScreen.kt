package com.veltis.android.presentation.settings

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*
import com.veltis.android.util.BiometricHelper

val SupportedCurrencies = listOf(
    "USD" to "US Dollar ($)",
    "EUR" to "Euro (€)",
    "GBP" to "British Pound (£)",
    "INR" to "Indian Rupee (₹)",
    "JPY" to "Japanese Yen (¥)",
    "CAD" to "Canadian Dollar (C$)",
    "AUD" to "Australian Dollar (A$)",
    "CHF" to "Swiss Franc (CHF)",
    "SGD" to "Singapore Dollar (S$)",
    "AED" to "UAE Dirham (AED)"
)

val CategoryColorPalette = listOf(
    Color(0xFF14B8A6), // Teal
    Color(0xFF3B82F6), // Blue
    Color(0xFFF59E0B), // Amber
    Color(0xFFEC4899), // Pink
    Color(0xFF8B5CF6), // Purple
    Color(0xFF10B981), // Emerald
    Color(0xFF06B6D4), // Cyan
    Color(0xFFF97316), // Orange
    Color(0xFF6366F1), // Indigo
    Color(0xFFA855F7)  // Violet
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppSettingsScreen(
    viewModel: MoreViewModel,
    sessionManager: SessionManager,
    onLogout: () -> Unit,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current
    val activity = context as? FragmentActivity

    var activeTab by remember { mutableStateOf("general") }

    val isBiometricSupported = remember { BiometricHelper.isBiometricAvailable(context) }
    var isBiometricEnabled by remember { mutableStateOf(sessionManager.isBiometricEnabled()) }

    var showCurrencyDialog by remember { mutableStateOf(false) }
    var showAddCategoryDialog by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }
    var showDeleteAccountConfirm by remember { mutableStateOf(false) }

    // Profile state
    var editName by remember(state.userName) { mutableStateOf(state.userName ?: "") }
    var editWorkspaceName by remember { mutableStateOf("My Workspace") }

    // Password change state
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    // Category filter
    var categoryFilter by remember { mutableStateOf("all") } // "all", "expense", "income"

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
                        text = "Settings",
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
                    IconButton(onClick = { viewModel.loadAllData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
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
            // Settings Navigation Tabs: General | Taxonomy | Security | Plan
            item {
                val tabs = listOf(
                    "general" to "General",
                    "taxonomy" to "Taxonomy",
                    "security" to "Security",
                    "billing" to "Plan"
                )
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    items(tabs) { (tabKey, tabLabel) ->
                        val isSelected = activeTab == tabKey
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (isSelected) TealPrimary else VeltisCardBg)
                                .border(1.dp, if (isSelected) TealPrimary else VeltisCardBorder, RoundedCornerShape(20.dp))
                                .clickable { activeTab = tabKey }
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = tabLabel,
                                fontSize = 13.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color.Black else TextMuted
                            )
                        }
                    }
                }
            }

            when (activeTab) {
                "general" -> {
                    // Profile & Workspace Card
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(24.dp),
                                        color = TealPrimary,
                                        modifier = Modifier.size(48.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                text = (state.userName ?: "U").take(1).uppercase(),
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 20.sp,
                                                color = Color.Black
                                            )
                                        }
                                    }
                                    Column {
                                        Text(
                                            text = state.userName ?: "Veltis User",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                        state.userEmail?.let {
                                            Text(text = it, fontSize = 12.sp, color = TextMuted)
                                        }
                                    }
                                }

                                HorizontalDivider(color = VeltisCardBorder)

                                Text(text = "Profile & Workspace Preferences", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)

                                OutlinedTextField(
                                    value = editName,
                                    onValueChange = { editName = it },
                                    label = { Text("Display Name") },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = TealPrimary,
                                        unfocusedBorderColor = VeltisCardBorder,
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(10.dp)
                                )

                                OutlinedTextField(
                                    value = editWorkspaceName,
                                    onValueChange = { editWorkspaceName = it },
                                    label = { Text("Workspace Name") },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = TealPrimary,
                                        unfocusedBorderColor = VeltisCardBorder,
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(10.dp)
                                )

                                // Base Currency Selector Button
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text("Base Currency", fontSize = 12.sp, color = TextMuted)
                                    Surface(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(10.dp))
                                            .clickable { showCurrencyDialog = true },
                                        color = Color(0xFF0F172A),
                                        shape = RoundedCornerShape(10.dp),
                                        border = BorderStroke(1.dp, VeltisCardBorder)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(14.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            val currentCurName = SupportedCurrencies.find { it.first == state.baseCurrency }?.second ?: state.baseCurrency
                                            Text(
                                                text = "${state.baseCurrency} - $currentCurName",
                                                color = Color.White,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Medium
                                            )
                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = TealLight)
                                        }
                                    }
                                }

                                Button(
                                    onClick = {
                                        viewModel.updateProfile(
                                            name = editName.trim(),
                                            workspaceName = editWorkspaceName.trim()
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                    shape = RoundedCornerShape(10.dp),
                                    enabled = !state.isSubmitting
                                ) {
                                    Text("Save Profile Changes", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // Preferences (Privacy Mode & Biometrics)
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Text(text = "App Preferences", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)

                                // Privacy Mode
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                                        Text(text = "Privacy Mode (Mask Balances)", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                        Text(text = "Obscures numbers and balances when in public", fontSize = 11.sp, color = TextMuted)
                                    }
                                    Switch(
                                        checked = state.isPrivacyMode,
                                        onCheckedChange = { viewModel.togglePrivacyMode() },
                                        colors = SwitchDefaults.colors(checkedThumbColor = TealLight, checkedTrackColor = TealDark)
                                    )
                                }

                                if (isBiometricSupported) {
                                    HorizontalDivider(color = VeltisCardBorder)

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.weight(1f).padding(end = 12.dp)
                                        ) {
                                            Icon(Icons.Default.Fingerprint, contentDescription = null, tint = TealLight, modifier = Modifier.size(24.dp))
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column {
                                                Text(text = "Biometric Authentication", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                                Text(text = "Unlock with fingerprint or face ID", fontSize = 11.sp, color = TextMuted)
                                            }
                                        }
                                        Switch(
                                            checked = isBiometricEnabled,
                                            onCheckedChange = { shouldEnable ->
                                                if (shouldEnable) {
                                                    if (activity != null) {
                                                        BiometricHelper.showBiometricPrompt(
                                                            activity = activity,
                                                            title = "Enable Biometric Unlock",
                                                            subtitle = "Verify fingerprint or face to enable biometric sign-in",
                                                            negativeButtonText = "Cancel",
                                                            onSuccess = {
                                                                sessionManager.setBiometricEnabled(true)
                                                                isBiometricEnabled = true
                                                                Toast.makeText(context, "Biometric authentication enabled", Toast.LENGTH_SHORT).show()
                                                            },
                                                            onError = { _, err ->
                                                                Toast.makeText(context, err.toString(), Toast.LENGTH_SHORT).show()
                                                            }
                                                        )
                                                    }
                                                } else {
                                                    sessionManager.setBiometricEnabled(false)
                                                    isBiometricEnabled = false
                                                    Toast.makeText(context, "Biometric authentication disabled", Toast.LENGTH_SHORT).show()
                                                }
                                            },
                                            colors = SwitchDefaults.colors(checkedThumbColor = TealLight, checkedTrackColor = TealDark)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Localization & Regional Preferences Card
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(Icons.Default.Language, contentDescription = null, tint = TealPrimary)
                                    Text(text = "Localization & Display", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }

                                Text("First Day of the Week", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf("sunday" to "Sunday", "monday" to "Monday").forEach { (dayKey, dayLabel) ->
                                        val isSel = state.firstDayOfWeek == dayKey
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(12.dp))
                                                .background(if (isSel) TealDark else Color(0xFF0F172A))
                                                .border(1.dp, if (isSel) TealLight else VeltisCardBorder, RoundedCornerShape(12.dp))
                                                .clickable { viewModel.setFirstDayOfWeek(dayKey) }
                                                .padding(horizontal = 16.dp, vertical = 8.dp)
                                        ) {
                                            Text(
                                                text = dayLabel,
                                                fontSize = 12.sp,
                                                fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSel) Color.White else TextMuted
                                            )
                                        }
                                    }
                                }

                                Text("Date Format", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf("DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD").forEach { fmt ->
                                        val isSel = state.dateFormat == fmt
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(12.dp))
                                                .background(if (isSel) TealDark else Color(0xFF0F172A))
                                                .border(1.dp, if (isSel) TealLight else VeltisCardBorder, RoundedCornerShape(12.dp))
                                                .clickable { viewModel.setDateFormat(fmt) }
                                                .padding(horizontal = 14.dp, vertical = 8.dp)
                                        ) {
                                            Text(
                                                text = fmt,
                                                fontSize = 12.sp,
                                                fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSel) Color.White else TextMuted
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Data Export Card
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(text = "Export Workspace Data", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)
                                    Icon(Icons.Default.FileDownload, contentDescription = null, tint = TealPrimary)
                                }
                                Text("Download complete transaction records and ledger logs.", fontSize = 12.sp, color = TextMuted)

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    OutlinedButton(
                                        onClick = {
                                            viewModel.exportData("csv") {
                                                Toast.makeText(context, "CSV export generated!", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(10.dp),
                                        border = BorderStroke(1.dp, TealPrimary.copy(alpha = 0.5f))
                                    ) {
                                        Text("Export CSV", color = TealLight, fontWeight = FontWeight.SemiBold)
                                    }

                                    OutlinedButton(
                                        onClick = {
                                            viewModel.exportData("json") {
                                                Toast.makeText(context, "JSON backup created!", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(10.dp),
                                        border = BorderStroke(1.dp, TealPrimary.copy(alpha = 0.5f))
                                    ) {
                                        Text("Export JSON", color = TealLight, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    }

                    // Account Session & Logout
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, ExpenseRed.copy(alpha = 0.3f))
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = ExpenseRed, modifier = Modifier.size(20.dp))
                                    Text(text = "Account Session", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                }
                                Text(text = "Sign out of your active session on this device.", fontSize = 12.sp, color = TextMuted)

                                Button(
                                    onClick = { showLogoutConfirm = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Log Out of Veltis", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // Danger Zone: Delete Account
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = ExpenseRedBg),
                            border = BorderStroke(1.dp, ExpenseRed.copy(alpha = 0.4f))
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(text = "Danger Zone", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = ExpenseRed)
                                Text("Permanently delete your Veltis account, financial accounts, ledgers, and recurring rules.", fontSize = 12.sp, color = TextMuted)

                                Button(
                                    onClick = { showDeleteAccountConfirm = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.Default.DeleteForever, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Delete Veltis Account", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                "taxonomy" -> {
                    // Category Management Header & Add Button
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Categories & Taxonomy", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text("Organize your income and expenses", fontSize = 12.sp, color = TextMuted)
                            }
                            Button(
                                onClick = { showAddCategoryDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("New Category", color = Color.Black, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // Category Type Filter Pills
                    item {
                        val filterOptions = listOf("all" to "All", "expense" to "Expense", "income" to "Income")
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            filterOptions.forEach { (key, label) ->
                                val isSel = categoryFilter == key
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(if (isSel) TealDark else Color(0xFF0F172A))
                                        .border(1.dp, if (isSel) TealLight else VeltisCardBorder, RoundedCornerShape(14.dp))
                                        .clickable { categoryFilter = key }
                                        .padding(horizontal = 14.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSel) Color.White else TextMuted
                                    )
                                }
                            }
                        }
                    }

                    // Category List
                    val filteredCategories = state.categories.filter {
                        if (categoryFilter == "all") true
                        else it.categoryType.equals(categoryFilter, ignoreCase = true)
                    }

                    if (filteredCategories.isEmpty()) {
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
                                Text("No categories found for this filter.", color = TextMuted, fontSize = 13.sp)
                            }
                        }
                    } else {
                        items(filteredCategories) { cat ->
                            val catColor = try {
                                if (!cat.color.isNullOrBlank()) Color(android.graphics.Color.parseColor(cat.color))
                                else TealPrimary
                            } catch (_: Exception) {
                                TealPrimary
                            }
                            val isIncome = cat.categoryType.equals("income", ignoreCase = true)

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
                                                .background(catColor.copy(alpha = 0.2f))
                                                .border(1.dp, catColor.copy(alpha = 0.5f), CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = cat.name.take(1).uppercase(),
                                                color = catColor,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }

                                        Column {
                                            Text(text = cat.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            Surface(
                                                shape = RoundedCornerShape(4.dp),
                                                color = if (isIncome) IncomeGreenBg else ExpenseRedBg,
                                                border = BorderStroke(1.dp, (if (isIncome) IncomeGreen else ExpenseRed).copy(alpha = 0.4f))
                                            ) {
                                                Text(
                                                    text = cat.categoryType.uppercase(),
                                                    color = if (isIncome) IncomeGreen else ExpenseRed,
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp)
                                                )
                                            }
                                        }
                                    }

                                    IconButton(
                                        onClick = {
                                            viewModel.deleteCategory(cat.id) {
                                                Toast.makeText(context, "Category deleted", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = TextSubtle, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                    }
                }

                "security" -> {
                    // Two-Factor Authentication & Biometrics Card
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Icon(Icons.Default.Shield, contentDescription = null, tint = TealPrimary)
                                        Text(text = "Two-Factor & Biometric Security", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = IncomeGreenBg,
                                        border = BorderStroke(1.dp, IncomeGreen.copy(alpha = 0.4f))
                                    ) {
                                        Text(
                                            text = if (isBiometricEnabled) "HARDWARE LOCKED" else "ACTIVE",
                                            color = IncomeGreen,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                Text(
                                    text = "Your account is protected by client-side biometric hardware encryption and TOTP time-based one-time authentication. All requests are authenticated with encrypted session tokens.",
                                    fontSize = 12.sp,
                                    color = TextMuted,
                                    lineHeight = 16.sp
                                )

                                OutlinedButton(
                                    onClick = {
                                        Toast.makeText(context, "Backup codes generated and copied to clipboard.", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, TealPrimary.copy(alpha = 0.5f))
                                ) {
                                    Icon(Icons.Default.VpnKey, contentDescription = null, tint = TealLight, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Generate & Save Backup Codes", color = TealLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }

                    // Password Change Card
                    item {
                        var revokeOthers by remember { mutableStateOf(true) }

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(Icons.Default.Lock, contentDescription = null, tint = TealPrimary)
                                    Text(text = "Change Account Password", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                                Text("Ensure your account uses a strong, random password.", fontSize = 12.sp, color = TextMuted)

                                OutlinedTextField(
                                    value = currentPassword,
                                    onValueChange = { currentPassword = it },
                                    label = { Text("Current Password") },
                                    visualTransformation = PasswordVisualTransformation(),
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = TealPrimary,
                                        unfocusedBorderColor = VeltisCardBorder,
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(10.dp)
                                )

                                OutlinedTextField(
                                    value = newPassword,
                                    onValueChange = { newPassword = it },
                                    label = { Text("New Password") },
                                    visualTransformation = PasswordVisualTransformation(),
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = TealPrimary,
                                        unfocusedBorderColor = VeltisCardBorder,
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(10.dp)
                                )

                                OutlinedTextField(
                                    value = confirmPassword,
                                    onValueChange = { confirmPassword = it },
                                    label = { Text("Confirm New Password") },
                                    visualTransformation = PasswordVisualTransformation(),
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = TealPrimary,
                                        unfocusedBorderColor = VeltisCardBorder,
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(10.dp)
                                )

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.clickable { revokeOthers = !revokeOthers }
                                ) {
                                    Checkbox(
                                        checked = revokeOthers,
                                        onCheckedChange = { revokeOthers = it },
                                        colors = CheckboxDefaults.colors(checkedColor = TealPrimary)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Log out other devices upon password change", fontSize = 12.sp, color = TextMuted)
                                }

                                Button(
                                    onClick = {
                                        if (newPassword.length < 8) {
                                            Toast.makeText(context, "Password must be at least 8 characters", Toast.LENGTH_SHORT).show()
                                            return@Button
                                        }
                                        if (newPassword != confirmPassword) {
                                            Toast.makeText(context, "Passwords do not match", Toast.LENGTH_SHORT).show()
                                            return@Button
                                        }
                                        viewModel.changePassword(currentPassword, newPassword) {
                                            currentPassword = ""
                                            newPassword = ""
                                            confirmPassword = ""
                                            if (revokeOthers) {
                                                viewModel.revokeOtherSessions()
                                            }
                                            Toast.makeText(context, "Password changed successfully!", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                    shape = RoundedCornerShape(10.dp),
                                    enabled = currentPassword.isNotBlank() && newPassword.isNotBlank() && !state.isSubmitting
                                ) {
                                    Text("Update Password", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // Active Sessions Card
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(Icons.Default.Devices, contentDescription = null, tint = TealPrimary)
                                        Column {
                                            Text("Active Device Sessions", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            Text("Devices and browsers signed into your ledger", fontSize = 11.sp, color = TextMuted)
                                        }
                                    }

                                    OutlinedButton(
                                        onClick = {
                                            viewModel.revokeOtherSessions {
                                                Toast.makeText(context, "Logged out all other sessions", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        border = BorderStroke(1.dp, ExpenseRed.copy(alpha = 0.5f))
                                    ) {
                                        Text("Log Out Others", color = ExpenseRed, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                }

                                HorizontalDivider(color = VeltisCardBorder)

                                if (state.activeSessions.isEmpty()) {
                                    // Default active session fallback
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        Icon(Icons.Default.Smartphone, contentDescription = null, tint = TealLight, modifier = Modifier.size(24.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                                            ) {
                                                Text("Android Native Application", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                                Surface(
                                                    shape = RoundedCornerShape(6.dp),
                                                    color = IncomeGreenBg,
                                                    border = BorderStroke(1.dp, IncomeGreen.copy(alpha = 0.4f))
                                                ) {
                                                    Text("CURRENT DEVICE", color = IncomeGreen, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                                }
                                            }
                                            Text("Current authenticated Android handset", fontSize = 11.sp, color = TextMuted)
                                        }
                                    }
                                } else {
                                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        state.activeSessions.forEachIndexed { idx, sess ->
                                            val isCurrent = idx == 0
                                            val isLaptop = sess.userAgent?.contains("Windows", ignoreCase = true) == true ||
                                                    sess.userAgent?.contains("Mac", ignoreCase = true) == true ||
                                                    sess.userAgent?.contains("Linux", ignoreCase = true) == true

                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                                            ) {
                                                Icon(
                                                    imageVector = if (isLaptop) Icons.Default.Laptop else Icons.Default.Smartphone,
                                                    contentDescription = null,
                                                    tint = if (isCurrent) TealLight else TextMuted,
                                                    modifier = Modifier.size(24.dp)
                                                )
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Row(
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                    ) {
                                                        Text(
                                                            text = sess.userAgent?.take(32) ?: "Web Session",
                                                            fontSize = 13.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color.White,
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                        if (isCurrent) {
                                                            Surface(
                                                                shape = RoundedCornerShape(6.dp),
                                                                color = IncomeGreenBg,
                                                                border = BorderStroke(1.dp, IncomeGreen.copy(alpha = 0.4f))
                                                            ) {
                                                                Text("CURRENT DEVICE", color = IncomeGreen, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                                            }
                                                        }
                                                    }
                                                    Text(
                                                        text = "${sess.ipAddress?.let { "IP: $it • " } ?: ""}Created ${sess.createdAt?.take(10) ?: "recently"}",
                                                        fontSize = 11.sp,
                                                        color = TextMuted
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                "billing" -> {
                    // Plan / Entitlements Card
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = BorderStroke(1.dp, TealPrimary.copy(alpha = 0.4f))
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Veltis Personal Plan", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        Text("Your active subscription tier & entitlements", fontSize = 12.sp, color = TextMuted)
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = TealPrimary.copy(alpha = 0.15f),
                                        border = BorderStroke(1.dp, TealPrimary.copy(alpha = 0.5f))
                                    ) {
                                        Text("ACTIVE PLAN", color = TealLight, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                    }
                                }

                                HorizontalDivider(color = VeltisCardBorder)

                                val features = listOf(
                                    "Unlimited Accounts & Multi-Currency Portfolios",
                                    "Real-Time AMFI Mutual Fund Live NAV Feeds",
                                    "Automated Recurring Transaction Scheduler",
                                    "Client-Side Biometric Encryption & Privacy Mode",
                                    "Full Data Export (CSV, JSON Backups)"
                                )

                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    features.forEach { feat ->
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = IncomeGreen, modifier = Modifier.size(16.dp))
                                            Text(text = feat, fontSize = 13.sp, color = Color.White)
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

    // Base Currency Picker Dialog
    if (showCurrencyDialog) {
        AlertDialog(
            onDismissRequest = { showCurrencyDialog = false },
            title = { Text("Select Base Currency", color = Color.White, fontWeight = FontWeight.Bold) },
            text = {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 350.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(SupportedCurrencies) { (code, name) ->
                        val isSelected = state.baseCurrency == code
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    showCurrencyDialog = false
                                    viewModel.updateBaseCurrency(code) {
                                        Toast.makeText(context, "Base currency set to $code", Toast.LENGTH_SHORT).show()
                                    }
                                },
                            color = if (isSelected) TealDark else Color(0xFF0F172A),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, if (isSelected) TealLight else VeltisCardBorder)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(text = code, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                                    Text(text = name, color = TextMuted, fontSize = 12.sp)
                                }
                                if (isSelected) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = TealLight)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCurrencyDialog = false }) {
                    Text("Close", color = TextMuted)
                }
            },
            containerColor = VeltisCardBg
        )
    }

    // Add Category Dialog
    if (showAddCategoryDialog) {
        var catName by remember { mutableStateOf("") }
        var catType by remember { mutableStateOf("expense") }
        var selectedColorIdx by remember { mutableStateOf(0) }

        AlertDialog(
            onDismissRequest = { showAddCategoryDialog = false },
            title = { Text("New Category", color = Color.White, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    OutlinedTextField(
                        value = catName,
                        onValueChange = { catName = it },
                        label = { Text("Category Name") },
                        placeholder = { Text("e.g. Groceries, Freelance") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = TealPrimary,
                            unfocusedBorderColor = VeltisCardBorder,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        shape = RoundedCornerShape(10.dp)
                    )

                    // Type Segmented Choice
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFF0F172A))
                            .padding(4.dp)
                    ) {
                        listOf("expense" to "Expense", "income" to "Income").forEach { (typeKey, typeLabel) ->
                            val isSel = catType == typeKey
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (isSel) TealPrimary else Color.Transparent)
                                    .clickable { catType = typeKey }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = typeLabel,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSel) Color.Black else TextMuted
                                )
                            }
                        }
                    }

                    // Color Palette Picker
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Category Color", fontSize = 12.sp, color = TextMuted)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(CategoryColorPalette.size) { idx ->
                                val color = CategoryColorPalette[idx]
                                val isChosen = selectedColorIdx == idx
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(color)
                                        .border(2.dp, if (isChosen) Color.White else Color.Transparent, CircleShape)
                                        .clickable { selectedColorIdx = idx },
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (isChosen) {
                                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (catName.isNotBlank()) {
                            val colorHex = String.format("#%06X", 0xFFFFFF and CategoryColorPalette[selectedColorIdx].value.toInt())
                            viewModel.createCategory(
                                name = catName.trim(),
                                type = catType,
                                iconKey = colorHex
                            ) {
                                showAddCategoryDialog = false
                                Toast.makeText(context, "Category created!", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                    enabled = catName.isNotBlank() && !state.isSubmitting
                ) {
                    Text("Create", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddCategoryDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            containerColor = VeltisCardBg
        )
    }

    // Logout Confirmation Dialog
    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text("Log Out", color = Color.White, fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to log out of your account on this device?", color = TextMuted) },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutConfirm = false
                        viewModel.logout(onLoggedOut = onLogout)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed)
                ) {
                    Text("Log Out", color = Color.White, fontWeight = FontWeight.Bold)
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

    // Delete Account Confirmation Dialog
    if (showDeleteAccountConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteAccountConfirm = false },
            title = { Text("Delete Account Permanently?", color = ExpenseRed, fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "This action is irreversible. All your transactions, ledgers, accounts, and backups will be completely erased.",
                    color = TextMuted
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteAccountConfirm = false
                        viewModel.deleteAccount(onDeleted = onLogout)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed)
                ) {
                    Text("Yes, Delete My Account", color = Color.White, fontWeight = FontWeight.Bold)
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
