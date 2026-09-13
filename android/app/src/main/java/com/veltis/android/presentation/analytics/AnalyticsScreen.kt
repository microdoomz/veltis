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
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.TrendingUp
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
    onMenuClick: () -> Unit = {},
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
                navigationIcon = {
                    IconButton(onClick = onMenuClick) {
                        Icon(imageVector = Icons.Default.Menu, contentDescription = "Menu", tint = Color.White)
                    }
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
        if (state.isLoading && state.spendingCategories.isEmpty() && state.budgets.isEmpty() && state.investments == null) {
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
                // Main Analytics Tabs: Overview | Investments | Budgets
                item {
                    val tabs = listOf("overview" to "Overview", "investments" to "Investments", "budgets" to "Budgets")
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        items(tabs) { (tabKey, tabLabel) ->
                            val isSelected = state.selectedTab == tabKey
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(if (isSelected) TealPrimary else VeltisCardBg)
                                    .border(1.dp, if (isSelected) TealPrimary else VeltisCardBorder, RoundedCornerShape(20.dp))
                                    .clickable { viewModel.setTab(tabKey) }
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

                when (state.selectedTab) {
                    "overview" -> {
                        // Time Range Filter Pills
                        item {
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.padding(vertical = 2.dp)
                            ) {
                                items(AnalyticsTimeRange.values()) { range ->
                                    val isSelected = state.timeRange == range
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(16.dp))
                                            .background(if (isSelected) TealDark else Color(0xFF0F172A))
                                            .border(1.dp, if (isSelected) TealLight else VeltisCardBorder, RoundedCornerShape(16.dp))
                                            .clickable { viewModel.setTimeRange(range) }
                                            .padding(horizontal = 12.dp, vertical = 5.dp)
                                    ) {
                                        Text(
                                            text = range.label,
                                            fontSize = 11.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            color = if (isSelected) Color.White else TextMuted
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

                        // Spending by Category Header
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
                                            text = "No category spending recorded in this period",
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
                    }

                    "investments" -> {
                        val inv = state.investments
                        item {
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
                                    Text(text = "Investment Portfolio Analytics", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)
                                    val valuation = inv?.currentValuation ?: 0.0
                                    val invested = inv?.totalInvested ?: 0.0
                                    val gainLoss = inv?.totalGainLoss ?: 0.0
                                    val gainPct = if (invested > 0) ((gainLoss / invested) * 100) else 0.0

                                    Column {
                                        Text("Total Portfolio Valuation", fontSize = 12.sp, color = TextSubtle)
                                        Text(
                                            text = formatCurrency(valuation, currency),
                                            fontSize = 24.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Color.White
                                        )
                                    }

                                    HorizontalDivider(color = VeltisCardBorder)

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(Color(0xFF0F172A))
                                                .padding(10.dp)
                                        ) {
                                            Column {
                                                Text("Total Invested", fontSize = 11.sp, color = TextMuted)
                                                Text(formatCurrency(invested, currency), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            }
                                        }

                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(if (gainLoss >= 0) IncomeGreenBg else ExpenseRedBg)
                                                .padding(10.dp)
                                        ) {
                                            Column {
                                                Text("Unrealized Return", fontSize = 11.sp, color = if (gainLoss >= 0) IncomeGreen else ExpenseRed)
                                                Text(
                                                    text = "${if (gainLoss >= 0) "+" else ""}${formatCurrency(gainLoss, currency)} (${String.format(java.util.Locale.US, "%.1f", gainPct)}%)",
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (gainLoss >= 0) IncomeGreen else ExpenseRed
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        item {
                            Text(text = "Positions & Holdings", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        if (inv?.positions.isNullOrEmpty()) {
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
                                    Text("No investment holdings recorded yet.", fontSize = 13.sp, color = TextMuted)
                                }
                            }
                        } else {
                            items(inv!!.positions) { pos ->
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
                                        Column {
                                            Text(text = pos.name ?: pos.symbol, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            Text(text = "${pos.units} units @ ${formatCurrency(pos.averageBuyPrice, pos.currency)}", fontSize = 12.sp, color = TextMuted)
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(text = formatCurrency(pos.currentValuation, pos.currency), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            Text(
                                                text = "${if (pos.unrealizedGainLoss >= 0) "+" else ""}${formatCurrency(pos.unrealizedGainLoss, pos.currency)} (${String.format(java.util.Locale.US, "%.1f", pos.unrealizedGainLossPercent)}%)",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = if (pos.unrealizedGainLoss >= 0) IncomeGreen else ExpenseRed
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    "budgets" -> {
                        item {
                            val totalBudget = state.budgets.sumOf { it.amountMinor }
                            val totalSpent = state.budgets.sumOf { it.spentMinor }
                            val overallPct = if (totalBudget > 0) (totalSpent / totalBudget).coerceIn(0.0, 1.0).toFloat() else 0f

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
                                    Text(text = "Overall Budget Performance", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text("Total Spent", fontSize = 11.sp, color = TextSubtle)
                                            Text(formatCurrency(totalSpent, currency), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Total Limit", fontSize = 11.sp, color = TextSubtle)
                                            Text(formatCurrency(totalBudget, currency), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TealLight)
                                        }
                                    }

                                    LinearProgressIndicator(
                                        progress = { overallPct },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(8.dp)
                                            .clip(RoundedCornerShape(4.dp)),
                                        color = if (totalSpent > totalBudget) ExpenseRed else TealPrimary,
                                        trackColor = Color(0xFF0F172A)
                                    )
                                }
                            }
                        }

                        item {
                            Text(text = "Category Budget Breakdown", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        if (state.budgets.isEmpty()) {
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
                                    Text("No category budgets set for this period.", fontSize = 13.sp, color = TextMuted)
                                }
                            }
                        } else {
                            items(state.budgets) { b ->
                                val pct = if (b.amountMinor > 0) (b.spentMinor / b.amountMinor).coerceIn(0.0, 1.0).toFloat() else 0f
                                val isOver = b.spentMinor > b.amountMinor

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
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(text = b.categoryName ?: "Budget", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            Text(
                                                text = "${formatCurrency(b.spentMinor, b.currency)} / ${formatCurrency(b.amountMinor, b.currency)}",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = if (isOver) ExpenseRed else Color.White
                                            )
                                        }

                                        LinearProgressIndicator(
                                            progress = { pct },
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(6.dp)
                                                .clip(RoundedCornerShape(3.dp)),
                                            color = if (isOver) ExpenseRed else TealPrimary,
                                            trackColor = Color(0xFF0F172A)
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
