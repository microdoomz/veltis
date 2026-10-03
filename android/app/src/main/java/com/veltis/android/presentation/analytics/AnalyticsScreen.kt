package com.veltis.android.presentation.analytics

import androidx.compose.animation.*
import androidx.compose.foundation.Canvas
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
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.veltis.android.data.model.WealthTrendPointDto
import com.veltis.android.presentation.home.formatCurrency
import com.veltis.android.presentation.theme.*

val ModernChartPalette = listOf(
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
                // Main Analytics Tabs matching PWA: Overview | Spending | Income | Net Wealth | Investments | Budgets
                item {
                    val tabs = listOf(
                        "overview" to "Overview",
                        "spending" to "Spending",
                        "income" to "Income",
                        "wealth" to "Net Wealth",
                        "investments" to "Investments",
                        "budgets" to "Budgets"
                    )
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

                // Time Range Filter Bar (applies across overview, spending, income, wealth)
                if (state.selectedTab != "investments") {
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
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
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
                }

                when (state.selectedTab) {
                    "overview" -> {
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

                        // Donut Chart & Spending Breakdown
                        item {
                            val spendingMinor = state.overview.totalSpending.toDoubleOrNull() ?: 0.0
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                                border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                            ) {
                                Column(
                                    modifier = Modifier.padding(18.dp),
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    Text(
                                        text = "Spending by Category",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )

                                    if (state.spendingCategories.isEmpty()) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(24.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "No category spending recorded in this period",
                                                color = TextMuted,
                                                fontSize = 13.sp
                                            )
                                        }
                                    } else {
                                        val chartItems = state.spendingCategories.mapIndexed { index, cat ->
                                            val amt = cat.totalAmountMinor.toDoubleOrNull() ?: 0.0
                                            val color = try {
                                                if (!cat.color.isNullOrBlank()) Color(android.graphics.Color.parseColor(cat.color))
                                                else ModernChartPalette[index % ModernChartPalette.size]
                                            } catch (_: Exception) {
                                                ModernChartPalette[index % ModernChartPalette.size]
                                            }
                                            Triple(cat.categoryName, amt, color)
                                        }

                                        NativeDonutChart(
                                            items = chartItems,
                                            currency = currency,
                                            centerTitle = "Total Spent",
                                            modifier = Modifier.fillMaxWidth()
                                        )

                                        HorizontalDivider(color = VeltisCardBorder)

                                        CategoryProgressList(
                                            categories = state.spendingCategories,
                                            totalAmount = spendingMinor,
                                            currency = currency
                                        )
                                    }
                                }
                            }
                        }
                    }

                    "spending" -> {
                        item {
                            val totalSpending = state.spendingCategories.sumOf { it.totalAmountMinor.toDoubleOrNull() ?: 0.0 }
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                                border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                            ) {
                                Column(
                                    modifier = Modifier.padding(18.dp),
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Spending by Category",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                        Text(
                                            text = formatCurrency(totalSpending / 100.0, currency),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = ExpenseRed
                                        )
                                    }

                                    if (state.spendingCategories.isEmpty()) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(32.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text("No spending records found for this period.", color = TextMuted, fontSize = 13.sp)
                                        }
                                    } else {
                                        val chartItems = state.spendingCategories.mapIndexed { index, cat ->
                                            val amt = cat.totalAmountMinor.toDoubleOrNull() ?: 0.0
                                            val color = try {
                                                if (!cat.color.isNullOrBlank()) Color(android.graphics.Color.parseColor(cat.color))
                                                else ModernChartPalette[index % ModernChartPalette.size]
                                            } catch (_: Exception) {
                                                ModernChartPalette[index % ModernChartPalette.size]
                                            }
                                            Triple(cat.categoryName, amt, color)
                                        }

                                        NativeDonutChart(
                                            items = chartItems,
                                            currency = currency,
                                            centerTitle = "Total Outflow",
                                            modifier = Modifier.fillMaxWidth()
                                        )

                                        HorizontalDivider(color = VeltisCardBorder)

                                        CategoryProgressList(
                                            categories = state.spendingCategories,
                                            totalAmount = totalSpending,
                                            currency = currency
                                        )
                                    }
                                }
                            }
                        }
                    }

                    "income" -> {
                        item {
                            val totalIncome = state.incomeCategories.sumOf { it.totalAmountMinor.toDoubleOrNull() ?: 0.0 }
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                                border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                            ) {
                                Column(
                                    modifier = Modifier.padding(18.dp),
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Income by Source",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                        Text(
                                            text = formatCurrency(totalIncome / 100.0, currency),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = IncomeGreen
                                        )
                                    }

                                    if (state.incomeCategories.isEmpty()) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(32.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text("No income records found for this period.", color = TextMuted, fontSize = 13.sp)
                                        }
                                    } else {
                                        val chartItems = state.incomeCategories.mapIndexed { index, cat ->
                                            val amt = cat.totalAmountMinor.toDoubleOrNull() ?: 0.0
                                            val color = try {
                                                if (!cat.color.isNullOrBlank()) Color(android.graphics.Color.parseColor(cat.color))
                                                else ModernChartPalette[(index + 3) % ModernChartPalette.size]
                                            } catch (_: Exception) {
                                                ModernChartPalette[(index + 3) % ModernChartPalette.size]
                                            }
                                            Triple(cat.categoryName, amt, color)
                                        }

                                        NativeDonutChart(
                                            items = chartItems,
                                            currency = currency,
                                            centerTitle = "Total Inflow",
                                            modifier = Modifier.fillMaxWidth()
                                        )

                                        HorizontalDivider(color = VeltisCardBorder)

                                        CategoryProgressList(
                                            categories = state.incomeCategories,
                                            totalAmount = totalIncome,
                                            currency = currency
                                        )
                                    }
                                }
                            }
                        }
                    }

                    "wealth" -> {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = VeltisCardBg),
                                border = androidx.compose.foundation.BorderStroke(1.dp, VeltisCardBorder)
                            ) {
                                Column(
                                    modifier = Modifier.padding(18.dp),
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Net Wealth Trend",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                        Icon(Icons.Default.ShowChart, contentDescription = null, tint = TealPrimary)
                                    }

                                    if (state.wealthTrend.isEmpty()) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(32.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text("No trend records found for this period.", color = TextMuted, fontSize = 13.sp)
                                        }
                                    } else {
                                        NativeWealthTrendChart(
                                            points = state.wealthTrend,
                                            currency = currency,
                                            modifier = Modifier.fillMaxWidth()
                                        )
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
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text(text = pos.name ?: pos.symbol, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                                if (pos.isEstimated) {
                                                    Surface(
                                                        shape = RoundedCornerShape(4.dp),
                                                        color = TealPrimary.copy(alpha = 0.15f),
                                                        border = androidx.compose.foundation.BorderStroke(1.dp, TealPrimary.copy(alpha = 0.4f))
                                                    ) {
                                                        Text("LIVE", color = TealLight, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                                    }
                                                }
                                            }
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

@Composable
fun NativeDonutChart(
    items: List<Triple<String, Double, Color>>, // label, amountMinor, color
    currency: String,
    centerTitle: String,
    modifier: Modifier = Modifier
) {
    val total = items.sumOf { it.second }
    val displayTotal = total / 100.0

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Box(
            modifier = Modifier.size(200.dp),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.size(190.dp)) {
                val strokeWidth = 24.dp.toPx()
                val radius = (size.minDimension - strokeWidth) / 2
                val topLeft = Offset((size.width - radius * 2) / 2, (size.height - radius * 2) / 2)
                val arcSize = Size(radius * 2, radius * 2)

                if (total <= 0.0) {
                    drawArc(
                        color = Color(0xFF1E293B),
                        startAngle = 0f,
                        sweepAngle = 360f,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = strokeWidth)
                    )
                } else {
                    var currentAngle = -90f
                    items.forEach { (_, amt, color) ->
                        val sweep = if (total > 0) ((amt / total) * 360f).toFloat() else 0f
                        if (sweep > 0f) {
                            drawArc(
                                color = color,
                                startAngle = currentAngle,
                                sweepAngle = sweep,
                                useCenter = false,
                                topLeft = topLeft,
                                size = arcSize,
                                style = Stroke(width = strokeWidth)
                            )
                            currentAngle += sweep
                        }
                    }
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = centerTitle,
                    fontSize = 11.sp,
                    color = TextSubtle,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = formatCurrency(displayTotal, currency),
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }

        // Legend chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val topItems = items.sortedByDescending { it.second }.take(4)
            topItems.forEachIndexed { idx, (label, amt, color) ->
                val pct = if (total > 0) (amt / total * 100).toInt() else 0
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.padding(horizontal = 6.dp)
                ) {
                    Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))
                    Text(
                        text = "$label $pct%",
                        fontSize = 11.sp,
                        color = TextMuted,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
fun CategoryProgressList(
    categories: List<com.veltis.android.data.model.CategorySpendingDto>,
    totalAmount: Double,
    currency: String,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(14.dp)) {
        categories.forEachIndexed { index, cat ->
            val catAmount = cat.totalAmountMinor.toDoubleOrNull() ?: 0.0
            val pct = if (totalAmount > 0) (catAmount / totalAmount).toFloat() else 0f
            val catColor = try {
                if (!cat.color.isNullOrBlank()) Color(android.graphics.Color.parseColor(cat.color))
                else ModernChartPalette[index % ModernChartPalette.size]
            } catch (_: Exception) {
                ModernChartPalette[index % ModernChartPalette.size]
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
                        if (cat.count > 0) {
                            Text(
                                text = "(${cat.count})",
                                fontSize = 11.sp,
                                color = TextSubtle
                            )
                        }
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

@Composable
fun NativeWealthTrendChart(
    points: List<WealthTrendPointDto>,
    currency: String,
    modifier: Modifier = Modifier
) {
    if (points.isEmpty()) return

    val values = points.map { (it.net.toDoubleOrNull() ?: 0.0) / 100.0 }
    val minVal = values.minOrNull() ?: 0.0
    val maxVal = values.maxOrNull() ?: 0.0
    val range = (maxVal - minVal).coerceAtLeast(1.0)
    val latest = values.lastOrNull() ?: 0.0

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Current Net Position", fontSize = 11.sp, color = TextSubtle)
                Text(
                    text = formatCurrency(latest, currency),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (latest >= 0) IncomeGreen else ExpenseRed
                )
            }
            Text(
                text = "${points.size} data points",
                fontSize = 11.sp,
                color = TextMuted
            )
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp)
        ) {
            val width = size.width
            val height = size.height
            val padY = 16f
            val chartH = height - padY * 2

            val stepX = if (values.size > 1) width / (values.size - 1) else width

            val path = Path()
            val fillPath = Path()

            values.forEachIndexed { i, v ->
                val x = i * stepX
                val normalizedY = ((v - minVal) / range).toFloat()
                val y = height - padY - (normalizedY * chartH)

                if (i == 0) {
                    path.moveTo(x, y)
                    fillPath.moveTo(x, height)
                    fillPath.lineTo(x, y)
                } else {
                    path.lineTo(x, y)
                    fillPath.lineTo(x, y)
                }
            }

            fillPath.lineTo(width, height)
            fillPath.close()

            // Draw area gradient fill
            drawPath(
                path = fillPath,
                brush = Brush.verticalGradient(
                    colors = listOf(TealPrimary.copy(alpha = 0.35f), Color.Transparent)
                )
            )

            // Draw line
            drawPath(
                path = path,
                color = TealLight,
                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
            )

            // Draw point dots
            values.forEachIndexed { i, v ->
                val x = i * stepX
                val normalizedY = ((v - minVal) / range).toFloat()
                val y = height - padY - (normalizedY * chartH)
                drawCircle(color = Color(0xFF0F172A), radius = 5.dp.toPx(), center = Offset(x, y))
                drawCircle(color = TealLight, radius = 3.dp.toPx(), center = Offset(x, y))
            }
        }

        // Date bounds
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = points.firstOrNull()?.date?.take(10) ?: "",
                fontSize = 10.sp,
                color = TextSubtle
            )
            Text(
                text = points.lastOrNull()?.date?.take(10) ?: "",
                fontSize = 10.sp,
                color = TextSubtle
            )
        }
    }
}
