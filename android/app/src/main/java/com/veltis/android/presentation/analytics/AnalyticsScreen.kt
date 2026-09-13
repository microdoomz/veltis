package com.veltis.android.presentation.analytics

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsScreen(
    viewModel: AnalyticsViewModel,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val currency = state.baseCurrency

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Analytics",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 20.sp
                    )
                },
                actions = {
                    IconButton(onClick = { viewModel.loadAnalytics(forceRefresh = true) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
            )
        },
        containerColor = VeltisDarkBg
    ) { padding ->
        if (state.isLoading && state.spendingCategories.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = TealPrimary)
            }
        } else {
            LazyColumn(
                modifier = modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Time Range Filter Pills
                item {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        items(AnalyticsTimeRange.values()) { range ->
                            val isSelected = state.timeRange == range
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(if (isSelected) TealPrimary else VeltisCardBg)
                                    .border(1.dp, if (isSelected) TealPrimary else VeltisCardBorder, RoundedCornerShape(20.dp))
                                    .clickable { viewModel.setTimeRange(range) }
                                    .padding(horizontal = 14.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = range.label,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.Black else TextMuted
                                )
                            }
                        }
                    }
                }

                // Overview Hero Card
                item {
                    val spendingMinor = state.overview.totalSpending.toDoubleOrNull() ?: 0.0
                    val incomeMinor = state.overview.totalIncome.toDoubleOrNull() ?: 0.0
                    val netMinor = state.overview.netDifference.toDoubleOrNull() ?: 0.0

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                        border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                    ) {
                        Column(
                            modifier = Modifier.padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Text(
                                text = "Cash Flow Summary",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextMuted
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Net Savings", fontSize = 12.sp, color = TextSubtle)
                                    Text(
                                        text = formatCurrency(netMinor / 100.0, currency),
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (netMinor >= 0) IncomeGreen else ExpenseRed
                                    )
                                }
                            }

                            HorizontalDivider(color = VeltisCardBorder)

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                // Income
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = IncomeGreenBg,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(Icons.Default.ArrowDownward, contentDescription = null, tint = IncomeGreen, modifier = Modifier.size(20.dp))
                                        Column {
                                            Text("Income", fontSize = 11.sp, color = TextMuted)
                                            Text(
                                                text = formatCurrency(incomeMinor / 100.0, currency),
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = IncomeGreen
                                            )
                                        }
                                    }
                                }

                                // Expenses
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = ExpenseRedBg,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(Icons.Default.ArrowUpward, contentDescription = null, tint = ExpenseRed, modifier = Modifier.size(20.dp))
                                        Column {
                                            Text("Spent", fontSize = 11.sp, color = TextMuted)
                                            Text(
                                                text = formatCurrency(spendingMinor / 100.0, currency),
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
                }

                // Spending by Category
                item {
                    Text(
                        text = "Spending by Category",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                if (state.spendingCategories.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No category spending in this period",
                                    color = TextMuted,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }
                } else {
                    val totalSpending = state.spendingCategories.sumOf { it.totalAmountMinor.toDoubleOrNull() ?: 0.0 }

                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                            border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                state.spendingCategories.forEach { cat ->
                                    val catAmount = cat.totalAmountMinor.toDoubleOrNull() ?: 0.0
                                    val pct = if (totalSpending > 0) (catAmount / totalSpending).toFloat() else 0f
                                    val catColor = try {
                                        if (!cat.color.isNullOrBlank()) Color(android.graphics.Color.parseColor(cat.color)) else TealPrimary
                                    } catch (_: Exception) {
                                        TealPrimary
                                    }

                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
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
                                                        .size(10.dp)
                                                        .clip(CircleShape)
                                                        .background(catColor)
                                                )
                                                Text(
                                                    text = cat.categoryName,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Medium,
                                                    color = Color.White
                                                )
                                                Text(
                                                    text = "(${cat.count})",
                                                    fontSize = 11.sp,
                                                    color = TextSubtle
                                                )
                                            }

                                            Text(
                                                text = formatCurrency(catAmount / 100.0, currency),
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = Color.White
                                            )
                                        }

                                        // Progress bar
                                        LinearProgressIndicator(
                                            progress = { pct },
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(6.dp)
                                                .clip(RoundedCornerShape(3.dp)),
                                            color = catColor,
                                            trackColor = VeltisCardBorder
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}
