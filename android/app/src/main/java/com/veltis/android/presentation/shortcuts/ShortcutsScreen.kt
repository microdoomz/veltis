package com.veltis.android.presentation.shortcuts

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.CreatedShortcutTokenDto
import com.veltis.android.data.model.ShortcutTokenDto
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShortcutsScreen(
    viewModel: MoreViewModel,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    var newTokenName by remember { mutableStateOf("") }
    var revealedToken by remember { mutableStateOf<String?>(null) }
    var tokenToRevoke by remember { mutableStateOf<ShortcutTokenDto?>(null) }
    var copiedAccountId by remember { mutableStateOf<String?>(null) }
    var showCreateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadShortcutTokens()
        if (state.accounts.isEmpty()) {
            viewModel.loadAccounts()
        }
    }

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearMessages()
        }
    }

    LaunchedEffect(state.successMessage) {
        state.successMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearMessages()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = TealPrimary.copy(alpha = 0.15f),
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Bolt,
                                    contentDescription = null,
                                    tint = TealPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                        Column {
                            Text(
                                text = "Shortcuts & Webhooks",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Quick log from Siri, Widgets, or API",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onMenuClick) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Open Drawer",
                            tint = TextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
            )
        },
        containerColor = VeltisDarkBg
    ) { paddingValues ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 12.dp, bottom = 40.dp)
        ) {
            // 1. Android Glance Home Widget Banner
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = TealPrimary.copy(alpha = 0.08f)),
                    border = BorderStroke(1.dp, TealPrimary.copy(alpha = 0.35f))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = TealPrimary,
                            modifier = Modifier.size(42.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Widgets,
                                    contentDescription = null,
                                    tint = Color(0xFF020617),
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "Android Home Widget",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = TealPrimary.copy(alpha = 0.2f)
                                ) {
                                    Text(
                                        text = "Active",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TealPrimary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Long-press your phone's home screen to add the Veltis Quick Log widget. One-tap expense capture with offline queueing.",
                                fontSize = 12.sp,
                                color = TextMuted,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }

            // 2. Secret Token Newly Created Banner (One-time view)
            if (revealedToken != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = IncomeGreenBg),
                        border = BorderStroke(1.dp, IncomeGreen.copy(alpha = 0.5f))
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = IncomeGreen,
                                    modifier = Modifier.size(20.dp)
                                )
                                Text(
                                    text = "Token Created Successfully!",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.weight(1f))
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = IncomeGreen.copy(alpha = 0.25f)
                                ) {
                                    Text(
                                        text = "One-time view",
                                        fontSize = 10.sp,
                                        color = IncomeGreen,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text(
                                text = "Copy this secret token now. For security, it will never be displayed again after closing this card.",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF0F172A),
                                border = BorderStroke(1.dp, IncomeGreen.copy(alpha = 0.3f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        text = revealedToken ?: "",
                                        fontSize = 12.sp,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Medium,
                                        color = IncomeGreen,
                                        modifier = Modifier.weight(1f)
                                    )
                                    IconButton(
                                        onClick = {
                                            revealedToken?.let {
                                                clipboardManager.setText(AnnotatedString(it))
                                                Toast.makeText(context, "Token copied to clipboard!", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.ContentCopy,
                                            contentDescription = "Copy Token",
                                            tint = Color.White,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }
                            Button(
                                onClick = { revealedToken = null },
                                colors = ButtonDefaults.buttonColors(containerColor = IncomeGreen),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.align(Alignment.End)
                            ) {
                                Text("Done", color = Color(0xFF020617), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // 3. Webhook Access Tokens Management
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                    border = BorderStroke(1.dp, VeltisCardBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = "Access Tokens",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "Bearer tokens for Siri & HTTP automation",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            }
                            Button(
                                onClick = { showCreateDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Add,
                                    contentDescription = null,
                                    tint = Color(0xFF020617),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "New Token",
                                    color = Color(0xFF020617),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        if (state.shortcutTokens.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(12.dp))
                                    .background(VeltisDarkBg.copy(alpha = 0.5f))
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        imageVector = Icons.Default.VpnKey,
                                        contentDescription = null,
                                        tint = TextMuted,
                                        modifier = Modifier.size(28.dp)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "No webhook tokens created yet",
                                        fontSize = 12.sp,
                                        color = TextMuted
                                    )
                                    Text(
                                        text = "Generate a token to integrate with iOS Shortcuts or curl",
                                        fontSize = 11.sp,
                                        color = TextMuted.copy(alpha = 0.7f)
                                    )
                                }
                            }
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                state.shortcutTokens.forEach { token ->
                                    ShortcutTokenRow(
                                        token = token,
                                        onRevokeClick = { tokenToRevoke = token }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 4. Account IDs Reference (Matches PWA AccountShortcutsTable)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                    border = BorderStroke(1.dp, VeltisCardBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AccountBalanceWallet,
                                contentDescription = null,
                                tint = TealPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = "Account IDs for Shortcuts",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                        Text(
                            text = "Copy an Account UUID below to paste into your Shortcut dictionary or API payload:",
                            fontSize = 11.sp,
                            color = TextMuted
                        )

                        val spendingAccounts = state.accounts.filter { it.accountType != "investment" }
                        if (spendingAccounts.isEmpty()) {
                            Text(
                                text = "No active bank or cash accounts found.",
                                fontSize = 12.sp,
                                color = TextMuted,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                spendingAccounts.forEach { acc ->
                                    val isCopied = copiedAccountId == acc.id
                                    Surface(
                                        shape = RoundedCornerShape(10.dp),
                                        color = VeltisDarkBg,
                                        border = BorderStroke(1.dp, VeltisCardBorder),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .padding(horizontal = 12.dp, vertical = 10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            Surface(
                                                shape = CircleShape,
                                                color = TealPrimary,
                                                modifier = Modifier.size(10.dp)
                                            ) {}
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = acc.name,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = TextPrimary
                                                )
                                                Text(
                                                    text = "${acc.accountType.replace('_', ' ').replaceFirstChar { it.uppercase() }} • ${acc.currency} • ${acc.id.take(8)}...",
                                                    fontSize = 10.sp,
                                                    color = TextMuted
                                                )
                                            }
                                            IconButton(
                                                onClick = {
                                                    clipboardManager.setText(AnnotatedString(acc.id))
                                                    copiedAccountId = acc.id
                                                    Toast.makeText(context, "Copied ID for ${acc.name}!", Toast.LENGTH_SHORT).show()
                                                },
                                                modifier = Modifier.size(30.dp)
                                            ) {
                                                Icon(
                                                    imageVector = if (isCopied) Icons.Default.Check else Icons.Default.ContentCopy,
                                                    contentDescription = "Copy Account ID",
                                                    tint = if (isCopied) IncomeGreen else TextMuted,
                                                    modifier = Modifier.size(16.dp)
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

            // 5. API Endpoints Quick Reference (Matches PWA)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                    border = BorderStroke(1.dp, VeltisCardBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Code,
                                contentDescription = null,
                                tint = TealPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = "Webhook API Reference",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }

                        ApiEndpointCard(
                            method = "POST",
                            path = "/api/shortcuts/expense",
                            description = "Record an expense from iOS Shortcut or webhook",
                            sampleBody = """
                            {
                              "amount": 25.50,
                              "accountId": "your-account-uuid",
                              "category": "Food & Dining",
                              "description": "Lunch at cafe",
                              "date": "2026-10-03"
                            }
                            """.trimIndent()
                        )

                        ApiEndpointCard(
                            method = "POST",
                            path = "/api/shortcuts/income",
                            description = "Record an income transaction directly",
                            sampleBody = """
                            {
                              "amount": 1200.00,
                              "accountId": "your-account-uuid",
                              "category": "Salary & Wages",
                              "description": "Consulting payout",
                              "date": "2026-10-03"
                            }
                            """.trimIndent()
                        )
                    }
                }
            }
        }
    }

    // Create Token Dialog
    if (showCreateDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!state.isSubmitting) showCreateDialog = false
            },
            containerColor = VeltisCardBg,
            title = {
                Text(
                    text = "Generate Webhook Token",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Enter a friendly name for this shortcut integration (e.g. \"Siri iPhone 16\" or \"Home Automation\"):",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                    OutlinedTextField(
                        value = newTokenName,
                        onValueChange = { newTokenName = it },
                        placeholder = { Text("Token Name", color = TextMuted, fontSize = 13.sp) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = TealPrimary,
                            unfocusedBorderColor = VeltisCardBorder,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = TealPrimary
                        ),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newTokenName.isNotBlank()) {
                            viewModel.createShortcutToken(newTokenName.trim()) { created ->
                                showCreateDialog = false
                                newTokenName = ""
                                revealedToken = created.rawToken
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                    enabled = newTokenName.isNotBlank() && !state.isSubmitting
                ) {
                    if (state.isSubmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color(0xFF020617), strokeWidth = 2.dp)
                    } else {
                        Text("Create Token", color = Color(0xFF020617), fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showCreateDialog = false },
                    enabled = !state.isSubmitting
                ) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }

    // Revoke Confirmation Dialog
    if (tokenToRevoke != null) {
        val target = tokenToRevoke!!
        AlertDialog(
            onDismissRequest = {
                if (!state.isSubmitting) tokenToRevoke = null
            },
            containerColor = VeltisCardBg,
            title = {
                Text(
                    text = "Revoke Shortcut Token?",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to revoke \"${target.name}\"? Any Apple Shortcuts or API clients using this token will immediately stop working.",
                    fontSize = 13.sp,
                    color = TextMuted
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.revokeShortcutToken(target.id) {
                            tokenToRevoke = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRedSolid),
                    enabled = !state.isSubmitting
                ) {
                    if (state.isSubmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Revoke Token", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { tokenToRevoke = null },
                    enabled = !state.isSubmitting
                ) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}

@Composable
fun ShortcutTokenRow(
    token: ShortcutTokenDto,
    onRevokeClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = VeltisDarkBg,
        border = BorderStroke(1.dp, VeltisCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 14.dp, vertical = 12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = token.name,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = IncomeGreen.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = "Active",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = IncomeGreen,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Created ${token.createdAt.take(10)}${if (token.lastUsedAt != null) " • Last used ${token.lastUsedAt.take(10)}" else ""}",
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }

            IconButton(
                onClick = onRevokeClick,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.DeleteOutline,
                    contentDescription = "Revoke Token",
                    tint = ExpenseRedSolid,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
fun ApiEndpointCard(
    method: String,
    path: String,
    description: String,
    sampleBody: String
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = VeltisDarkBg,
        border = BorderStroke(1.dp, VeltisCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = TealPrimary.copy(alpha = 0.2f)
                ) {
                    Text(
                        text = method,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = TealPrimary,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Text(
                    text = path,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FontFamily.Monospace,
                    color = TextPrimary
                )
            }
            Text(
                text = description,
                fontSize = 11.sp,
                color = TextMuted
            )
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = Color(0xFF0F172A),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = sampleBody,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFF94A3B8),
                    modifier = Modifier.padding(8.dp)
                )
            }
        }
    }
}
