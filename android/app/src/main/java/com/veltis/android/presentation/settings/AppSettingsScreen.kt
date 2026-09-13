package com.veltis.android.presentation.settings

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.veltis.android.data.storage.SessionManager
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*
import com.veltis.android.util.BiometricHelper

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

    val isBiometricSupported = remember { BiometricHelper.isBiometricAvailable(context) }
    var isBiometricEnabled by remember { mutableStateOf(sessionManager.isBiometricEnabled()) }

    var showLogoutConfirm by remember { mutableStateOf(false) }
    var showDeleteAccountConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let {
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
            item {
                Spacer(modifier = Modifier.height(4.dp))
                // User Profile Summary Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                        .padding(16.dp)
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
                            Text(
                                text = "Base Currency: ${state.baseCurrency}",
                                fontSize = 12.sp,
                                color = TealLight,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

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
                        Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                            Text(text = "Privacy Mode (Mask Balances)", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text(text = "Obscures money numbers when viewing in public", fontSize = 11.sp, color = TextMuted)
                        }
                        Switch(
                            checked = state.isPrivacyMode,
                            onCheckedChange = { viewModel.togglePrivacyMode() },
                            colors = SwitchDefaults.colors(checkedThumbColor = TealLight, checkedTrackColor = TealDark)
                        )
                    }
                }
            }

            if (isBiometricSupported) {
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
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f).padding(end = 12.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Fingerprint,
                                    contentDescription = "Biometrics",
                                    tint = TealLight,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(text = "Biometric Authentication", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                    Text(text = "Sign in & unlock with fingerprint or face ID", fontSize = 11.sp, color = TextMuted)
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

            item {
                Text(text = "Account Session", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }

            item {
                Button(
                    onClick = { showLogoutConfirm = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed.copy(alpha = 0.15f)),
                    border = BorderStroke(1.dp, ExpenseRed.copy(alpha = 0.4f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.Logout, contentDescription = null, tint = ExpenseRed, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Log Out of Account", color = ExpenseRed, fontWeight = FontWeight.Bold)
                }
            }

            item {
                Text(text = "Danger Zone", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = ExpenseRed)
            }

            item {
                Button(
                    onClick = { showDeleteAccountConfirm = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = ExpenseRedBg),
                    border = BorderStroke(1.dp, ExpenseRed.copy(alpha = 0.5f)),
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

    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text("Log Out", color = Color.White, fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to log out of your account?", color = TextMuted) },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutConfirm = false
                        onLogout()
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
