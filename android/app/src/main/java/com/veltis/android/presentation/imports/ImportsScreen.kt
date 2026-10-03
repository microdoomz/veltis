package com.veltis.android.presentation.imports

import android.net.Uri
import android.provider.OpenableColumns
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.veltis.android.data.model.AccountDetailDto
import com.veltis.android.data.model.ImportDetailDto
import com.veltis.android.data.model.StatementImportDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImportsScreen(
    viewModel: MoreViewModel,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    var selectedAccountId by remember(state.accounts) {
        mutableStateOf(state.accounts.firstOrNull()?.id ?: "")
    }
    var selectedFileName by remember { mutableStateOf<String?>(null) }
    var selectedFileBytes by remember { mutableStateOf<ByteArray?>(null) }
    var isReferenceOnly by remember { mutableStateOf(false) }

    var importToReview by remember { mutableStateOf<StatementImportDto?>(null) }
    var importToDelete by remember { mutableStateOf<StatementImportDto?>(null) }

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

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            try {
                context.contentResolver.openInputStream(it)?.use { stream ->
                    selectedFileBytes = stream.readBytes()
                }
                var fileName = "statement.csv"
                context.contentResolver.query(it, null, null, null, null)?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex != -1 && cursor.moveToFirst()) {
                        fileName = cursor.getString(nameIndex)
                    }
                }
                selectedFileName = fileName
            } catch (e: Exception) {
                Toast.makeText(context, "Could not read file: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Statement Imports",
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
                    IconButton(onClick = { viewModel.loadStatementImports() }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
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
                Text(
                    text = "Reconcile Bank Statements",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Upload bank statements (CSV, OFX, PDF) to automatically parse, categorize, and commit transactions to your verified double-entry ledger.",
                    fontSize = 13.sp,
                    color = TextMuted
                )
            }

            // Upload Form Card
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
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = TealPrimary.copy(alpha = 0.15f),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(imageVector = Icons.Default.UploadFile, contentDescription = null, tint = TealLight)
                                }
                            }
                            Column {
                                Text("Upload New Statement", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text("Choose target account and statement file", fontSize = 11.sp, color = TextMuted)
                            }
                        }

                        HorizontalDivider(color = VeltisCardBorder)

                        // Destination Account Selector
                        Text("Destination Bank / Card Account", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)
                        var accountDropdownExpanded by remember { mutableStateOf(false) }
                        val currentAccount = state.accounts.find { it.id == selectedAccountId } ?: state.accounts.firstOrNull()

                        Box(modifier = Modifier.fillMaxWidth()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFF0F172A))
                                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(10.dp))
                                    .clickable { accountDropdownExpanded = true }
                                    .padding(horizontal = 14.dp, vertical = 12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = currentAccount?.let { "${it.name} (${it.currency})" } ?: "Select Account",
                                        color = Color.White,
                                        fontSize = 14.sp
                                    )
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = TextMuted)
                                }
                            }

                            DropdownMenu(
                                expanded = accountDropdownExpanded,
                                onDismissRequest = { accountDropdownExpanded = false },
                                modifier = Modifier.background(VeltisCardBg)
                            ) {
                                state.accounts.forEach { acc ->
                                    DropdownMenuItem(
                                        text = { Text("${acc.name} (${acc.currency})", color = Color.White) },
                                        onClick = {
                                            selectedAccountId = acc.id
                                            accountDropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        // File Selector
                        Text("Statement File", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)
                        if (selectedFileName == null) {
                            Button(
                                onClick = { filePickerLauncher.launch("*/*") },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.AttachFile, contentDescription = null, tint = TealLight, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Choose Statement File (.csv, .ofx, .pdf)", color = Color.White, fontSize = 13.sp)
                            }
                        } else {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFF0F172A))
                                    .border(1.dp, TealPrimary.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Description, contentDescription = null, tint = TealPrimary, modifier = Modifier.size(20.dp))
                                    Text(
                                        text = selectedFileName ?: "",
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                IconButton(
                                    onClick = {
                                        selectedFileName = null
                                        selectedFileBytes = null
                                    },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "Clear", tint = TextMuted, modifier = Modifier.size(16.dp))
                                }
                            }
                        }

                        // Reference Only Checkbox
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable { isReferenceOnly = !isReferenceOnly }
                        ) {
                            Checkbox(
                                checked = isReferenceOnly,
                                onCheckedChange = { isReferenceOnly = it },
                                colors = CheckboxDefaults.colors(checkedColor = TealPrimary)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Column {
                                Text("Reference only", fontSize = 13.sp, color = Color.White, fontWeight = FontWeight.Medium)
                                Text("Imports transactions for tracking without mutating account balance", fontSize = 11.sp, color = TextMuted)
                            }
                        }

                        // Submit Button
                        Button(
                            onClick = {
                                val bytes = selectedFileBytes
                                val name = selectedFileName
                                val accId = selectedAccountId.ifBlank { currentAccount?.id ?: "" }
                                if (bytes == null || name == null || accId.isBlank()) {
                                    Toast.makeText(context, "Please select an account and statement file", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                viewModel.uploadStatement(
                                    accountId = accId,
                                    fileBytes = bytes,
                                    filename = name,
                                    isReferenceOnly = isReferenceOnly
                                ) {
                                    selectedFileName = null
                                    selectedFileBytes = null
                                    Toast.makeText(context, "Statement uploaded successfully!", Toast.LENGTH_SHORT).show()
                                }
                            },
                            enabled = selectedFileName != null && !state.isSubmitting,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (state.isSubmitting) {
                                CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.Black, strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.CloudUpload, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Upload & Parse Statement", color = Color.Black, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Previous Imports Section
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Previous Imports (${state.statementImports.size})",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            if (state.statementImports.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(VeltisCardBg)
                            .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                            .padding(28.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No statements imported yet.\nUpload your first statement above to begin ledger reconciliation.",
                            color = TextMuted,
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )
                    }
                }
            } else {
                items(state.statementImports, key = { it.id }) { imp ->
                    val statusColor = when (imp.status.lowercase()) {
                        "completed" -> IncomeGreen
                        "review" -> Color(0xFF38BDF8)
                        "processing" -> Color(0xFFF59E0B)
                        else -> ExpenseRed
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                        border = BorderStroke(1.dp, VeltisCardBorder)
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.FilePresent, contentDescription = null, tint = TealLight, modifier = Modifier.size(20.dp))
                                    Column {
                                        Text(
                                            text = imp.originalFilename,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 14.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = imp.createdAt.take(10),
                                            color = TextMuted,
                                            fontSize = 11.sp
                                        )
                                    }
                                }

                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = statusColor.copy(alpha = 0.15f),
                                    border = BorderStroke(1.dp, statusColor.copy(alpha = 0.4f))
                                ) {
                                    Text(
                                        text = imp.status.uppercase(),
                                        color = statusColor,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (imp.totalRows > 0) "${imp.totalRows} parsed rows (${imp.acceptedRows} accepted)" else "Statement file stored",
                                    fontSize = 12.sp,
                                    color = TextMuted
                                )

                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Button(
                                        onClick = {
                                            viewModel.loadStatementImportDetails(imp.id) {
                                                importToReview = imp
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Icon(Icons.Default.Visibility, contentDescription = null, tint = TealLight, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Review", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                    }

                                    IconButton(
                                        onClick = { importToDelete = imp },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = TextSubtle, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(60.dp)) }
        }
    }

    // Review Statement Rows Modal
    importToReview?.let { imp ->
        val detail = state.selectedImportDetail
        Dialog(onDismissRequest = { importToReview = null }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(VeltisCardBg)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                    .padding(18.dp)
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(imp.originalFilename, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                            Text("${detail?.rows?.size ?: 0} statement rows parsed", color = TextMuted, fontSize = 12.sp)
                        }
                        IconButton(onClick = { importToReview = null }) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                        }
                    }

                    HorizontalDivider(color = VeltisCardBorder)

                    if (detail == null || detail.rows.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No pending rows to review.", color = TextMuted, fontSize = 13.sp)
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 280.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(detail.rows) { row ->
                                val isCredit = row.direction.equals("credit", ignoreCase = true)
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFF0F172A))
                                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(8.dp))
                                        .padding(10.dp)
                                ) {
                                    StrangeRowLayout(row = row, isCredit = isCredit)
                                }
                            }
                        }
                    }

                    // Bulk Commit Actions
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                viewModel.commitImportRows(imp.id, action = "reject") {
                                    importToReview = null
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Reject All", color = ExpenseRed, fontSize = 12.sp)
                        }

                        Button(
                            onClick = {
                                viewModel.commitImportRows(imp.id, action = "accept") {
                                    importToReview = null
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Commit to Ledger", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    importToDelete?.let { imp ->
        Dialog(onDismissRequest = { importToDelete = null }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(VeltisCardBg)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                    .padding(20.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Delete Import Batch?", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                    Text(
                        "Are you sure you want to delete '${imp.originalFilename}'? This will remove all parsed rows associated with this batch.",
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = { importToDelete = null }) {
                            Text("Cancel", color = TextMuted)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                viewModel.deleteStatementImport(imp.id) {
                                    importToDelete = null
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = ExpenseRed),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StrangeRowLayout(row: com.veltis.android.data.model.StatementImportRowDto, isCredit: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = row.description.ifBlank { "Statement Entry" },
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = row.transactionDate,
                color = TextMuted,
                fontSize = 11.sp
            )
        }

        Text(
            text = "${if (isCredit) "+" else "-"}${formatCurrency(row.amount, row.currency)}",
            color = if (isCredit) IncomeGreen else ExpenseRed,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
