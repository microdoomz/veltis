package com.veltis.android.presentation.exports

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportsScreen(
    viewModel: MoreViewModel,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    val formatOptions = listOf(
        Triple("xlsx", "Excel (.XLSX)", "Multi-tab workbook with accounts, categories, and transactions"),
        Triple("csv", "Spreadsheet (.CSV)", "Universal comma-separated format for tax and spreadsheet tools"),
        Triple("json", "Ledger Backup (.JSON)", "Full structured database backup including investment history"),
        Triple("pdf", "Audit Report (.PDF)", "Formatted financial statement for formal accounting reviews")
    )

    val timeRanges = listOf(
        "all" to "All Time",
        "last30" to "Last 30 Days",
        "this_month" to "This Month",
        "last_month" to "Last Month",
        "thisYear" to "This Year (YTD)",
        "lastYear" to "Last Year"
    )

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
                        text = "Data Export",
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
                Text(
                    text = "Export Configuration",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Choose your preferred export format and time filter. Files are generated directly from your authoritative verified ledger.",
                    fontSize = 13.sp,
                    color = TextMuted
                )
            }

            // Export Format Selection Cards
            item {
                Text(
                    text = "Select Format",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    formatOptions.forEach { (fmtKey, fmtTitle, fmtDesc) ->
                        val isSelected = state.exportFormat == fmtKey
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (isSelected) TealDark.copy(alpha = 0.4f) else VeltisCardBg)
                                .border(1.dp, if (isSelected) TealPrimary else VeltisCardBorder, RoundedCornerShape(12.dp))
                                .clickable { viewModel.setExportFormat(fmtKey) }
                                .padding(14.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    RadioButton(
                                        selected = isSelected,
                                        onClick = { viewModel.setExportFormat(fmtKey) },
                                        colors = RadioButtonDefaults.colors(selectedColor = TealPrimary)
                                    )
                                    Column {
                                        Text(text = fmtTitle, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        Text(text = fmtDesc, fontSize = 11.sp, color = TextMuted)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Time Filter Row
            item {
                Text(
                    text = "Time Period Filter",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(timeRanges) { (rKey, rLabel) ->
                        val isSelected = state.exportDateRange == rKey
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (isSelected) TealPrimary else VeltisCardBg)
                                .border(1.dp, if (isSelected) TealPrimary else VeltisCardBorder, RoundedCornerShape(20.dp))
                                .clickable { viewModel.setExportDateRange(rKey) }
                                .padding(horizontal = 14.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = rLabel,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color.Black else TextMuted
                            )
                        }
                    }
                }
            }

            // Primary Generate Button
            item {
                Button(
                    onClick = {
                        viewModel.exportDataWithFilters(
                            format = state.exportFormat,
                            dateRange = state.exportDateRange
                        ) {
                            Toast.makeText(context, "Export generated (${state.exportFormat.uppercase()})!", Toast.LENGTH_SHORT).show()
                        }
                    },
                    enabled = !state.isSubmitting,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TealPrimary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (state.isSubmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.Black, strokeWidth = 2.dp)
                    } else {
                        Icon(imageVector = Icons.Default.Download, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Generate & Download .${state.exportFormat.uppercase()}",
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }

            // Privacy & Portability Guarantee
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(14.dp))
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Shield, contentDescription = null, tint = TealLight, modifier = Modifier.size(18.dp))
                            Text(text = "Privacy & Portability Guarantee", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Text(
                            text = "Your financial data belongs exclusively to you. Export files are generated directly from verified double-entry database records with zero obfuscation or vendor lock-in.",
                            fontSize = 11.sp,
                            color = TextMuted,
                            lineHeight = 16.sp
                        )
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(60.dp)) }
        }
    }
}
