package com.veltis.android.presentation.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.veltis.android.VeltisApplication
import com.veltis.android.presentation.accounts.AccountsScreen
import com.veltis.android.presentation.accounts.AccountsViewModel
import com.veltis.android.presentation.analytics.AnalyticsScreen
import com.veltis.android.presentation.analytics.AnalyticsViewModel
import com.veltis.android.presentation.auth.*
import com.veltis.android.presentation.home.HomeScreen
import com.veltis.android.presentation.home.HomeViewModel
import com.veltis.android.presentation.investments.InvestmentsScreen
import com.veltis.android.presentation.investments.InvestmentsViewModel
import com.veltis.android.presentation.more.MoreScreen
import com.veltis.android.presentation.more.MoreViewModel
import com.veltis.android.presentation.theme.*
import com.veltis.android.presentation.transactions.TransactionsScreen
import com.veltis.android.presentation.transactions.TransactionsViewModel
import kotlinx.coroutines.launch

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Signup : Screen("signup")
    object ForgotPassword : Screen("forgot_password")
    object Main : Screen("main")
}

sealed class BottomNavItem(val route: String, val title: String, val icon: ImageVector) {
    object Home : BottomNavItem("bottom_home", "Home", Icons.Default.Home)
    object Transactions : BottomNavItem("bottom_transactions", "Txns", Icons.Default.ReceiptLong)
    object Accounts : BottomNavItem("bottom_accounts", "Accounts", Icons.Default.AccountBalance)
    object Analytics : BottomNavItem("bottom_analytics", "Analytics", Icons.Default.QueryStats)
}

data class DrawerItem(val route: String, val title: String, val icon: ImageVector)

@Composable
fun AppNavigation(
    app: VeltisApplication,
    modifier: Modifier = Modifier
) {
    val rootNavController = rememberNavController()
    val isInitiallyLoggedIn = remember { app.sessionManager.isLoggedIn() }
    val isLoggedIn by app.sessionManager.isLoggedInFlow.collectAsState()
    val startDest = if (isInitiallyLoggedIn) Screen.Main.route else Screen.Login.route

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            val currentRoute = rootNavController.currentBackStackEntry?.destination?.route
            if (currentRoute == Screen.Login.route || currentRoute == Screen.Signup.route || currentRoute == Screen.ForgotPassword.route || currentRoute == null) {
                rootNavController.navigate(Screen.Main.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
        }
    }

    val authViewModel = remember {
        AuthViewModel(app.authRepository)
    }

    NavHost(
        navController = rootNavController,
        startDestination = startDest,
        modifier = modifier
    ) {
        composable(
            route = Screen.Login.route,
            enterTransition = { fadeIn(animationSpec = tween(300)) },
            exitTransition = { fadeOut(animationSpec = tween(300)) }
        ) {
            LoginScreen(
                viewModel = authViewModel,
                sessionManager = app.sessionManager,
                onNavigateToSignup = { rootNavController.navigate(Screen.Signup.route) },
                onNavigateToForgotPassword = { rootNavController.navigate(Screen.ForgotPassword.route) },
                onLoginSuccess = {
                    rootNavController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onOpenCompanionSettings = {
                    rootNavController.navigate(Screen.Main.route)
                }
            )
        }

        composable(
            route = Screen.Signup.route,
            enterTransition = { slideInHorizontally(initialOffsetX = { it }, animationSpec = tween(300)) },
            exitTransition = { slideOutHorizontally(targetOffsetX = { it }, animationSpec = tween(300)) }
        ) {
            SignupScreen(
                viewModel = authViewModel,
                onNavigateToLogin = { rootNavController.popBackStack() },
                onSignupSuccess = {
                    rootNavController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.ForgotPassword.route,
            enterTransition = { slideInHorizontally(initialOffsetX = { it }, animationSpec = tween(300)) },
            exitTransition = { slideOutHorizontally(targetOffsetX = { it }, animationSpec = tween(300)) }
        ) {
            ForgotPasswordScreen(
                viewModel = authViewModel,
                onNavigateBack = { rootNavController.popBackStack() }
            )
        }

        composable(
            route = Screen.Main.route,
            enterTransition = { fadeIn(animationSpec = tween(300)) },
            exitTransition = { fadeOut(animationSpec = tween(300)) }
        ) {
            MainDashboardShell(
                app = app,
                onSignOut = {
                    rootNavController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainDashboardShell(
    app: VeltisApplication,
    onSignOut: () -> Unit
) {
    val bottomNavController = rememberNavController()
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()

    val homeViewModel = remember { HomeViewModel(app.appRepository, app.sessionManager) }
    val accountsViewModel = remember { AccountsViewModel(app.appRepository) }
    val transactionsViewModel = remember { TransactionsViewModel(app.appRepository) }
    val investmentsViewModel = remember { InvestmentsViewModel(app.appRepository, app.sessionManager) }
    val analyticsViewModel = remember { AnalyticsViewModel(app.appRepository, app.sessionManager) }
    val moreViewModel = remember { MoreViewModel(app.appRepository, app.authRepository, app.sessionManager) }

    var quickAddTypeForTxn by remember { mutableStateOf<String?>(null) }
    var showQuickAddSheet by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    val privacyMode by app.sessionManager.privacyMode.collectAsState()

    LaunchedEffect(currentRoute) {
        when (currentRoute) {
            BottomNavItem.Home.route -> homeViewModel.loadDashboard(forceRefresh = true)
            BottomNavItem.Accounts.route -> accountsViewModel.loadAccounts(forceRefresh = true)
            BottomNavItem.Transactions.route -> {
                transactionsViewModel.loadTransactions()
                transactionsViewModel.loadData()
            }
            BottomNavItem.Analytics.route -> analyticsViewModel.loadAnalytics()
        }
    }

    val drawerNavItems = listOf(
        DrawerItem("bottom_home", "Dashboard", Icons.Default.Home),
        DrawerItem("bottom_accounts", "Accounts", Icons.Default.AccountBalance),
        DrawerItem("bottom_transactions", "Transactions", Icons.Default.ReceiptLong),
        DrawerItem("drawer_investments", "Investments", Icons.Default.TrendingUp),
        DrawerItem("drawer_receivables", "Receivables", Icons.Default.ArrowDownward),
        DrawerItem("drawer_liabilities", "Liabilities", Icons.Default.ArrowUpward),
        DrawerItem("bottom_analytics", "Analytics", Icons.Default.QueryStats),
        DrawerItem("drawer_budgets", "Budgets", Icons.Default.AttachMoney),
        DrawerItem("drawer_recurring", "Recurring", Icons.Default.Repeat),
        DrawerItem("drawer_settings", "Settings", Icons.Default.Settings)
    )

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = VeltisCardBg,
                drawerContentColor = TextPrimary,
                modifier = Modifier
                    .width(300.dp)
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(topEnd = 16.dp, bottomEnd = 16.dp))
            ) {
                // Drawer Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 24.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = TealPrimary,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("V", color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                            }
                        }
                        Column {
                            Text(
                                text = "Veltis",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = TealPrimary,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "Personal Ledger",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                    }
                }

                HorizontalDivider(color = VeltisCardBorder)

                Spacer(modifier = Modifier.height(8.dp))

                // Drawer Navigation Items
                drawerNavItems.forEach { item ->
                    val isSelected = currentRoute == item.route
                    NavigationDrawerItem(
                        icon = {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.title,
                                tint = if (isSelected) TealPrimary else TextMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        },
                        label = {
                            Text(
                                text = item.title,
                                fontSize = 14.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) TealPrimary else TextPrimary
                            )
                        },
                        selected = isSelected,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            if (currentRoute != item.route) {
                                bottomNavController.navigate(item.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        },
                        colors = NavigationDrawerItemDefaults.colors(
                            selectedContainerColor = TealContainer,
                            unselectedContainerColor = Color.Transparent
                        ),
                        modifier = Modifier
                            .padding(horizontal = 12.dp, vertical = 2.dp)
                            .clip(RoundedCornerShape(10.dp))
                    )
                }

                Spacer(modifier = Modifier.weight(1f))

                HorizontalDivider(color = VeltisCardBorder)

                // Logout Button
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showLogoutDialog = true }
                        .padding(horizontal = 20.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = "Log out",
                        tint = ExpenseRedSolid,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Log out",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ExpenseRedSolid
                    )
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    navigationIcon = {
                        IconButton(onClick = { coroutineScope.launch { drawerState.open() } }) {
                            Icon(
                                imageVector = Icons.Default.Menu,
                                contentDescription = "Open Menu",
                                tint = TextPrimary
                            )
                        }
                    },
                    title = {
                        Text(
                            text = "Veltis",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = TealPrimary,
                            letterSpacing = 0.5.sp
                        )
                    },
                    actions = {
                        // Privacy Mode Toggle
                        IconButton(onClick = { app.sessionManager.setPrivacyMode(!privacyMode) }) {
                            Icon(
                                imageVector = if (privacyMode) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = "Privacy Mode",
                                tint = if (privacyMode) TealPrimary else TextMuted
                            )
                        }

                        // Cloud Sync Indicator
                        Surface(
                            shape = CircleShape,
                            color = IncomeGreenBg,
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .size(28.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.CloudDone,
                                    contentDescription = "Synced",
                                    tint = IncomeGreen,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
                )
            },
            bottomBar = {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                ) {
                    // Navigation Bar
                    NavigationBar(
                        containerColor = VeltisCardBg,
                        tonalElevation = 8.dp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .border(1.dp, VeltisCardBorder)
                    ) {
                        // 1. Home
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    Icons.Default.Home,
                                    contentDescription = "Home",
                                    tint = if (currentRoute == BottomNavItem.Home.route) TealPrimary else TextMuted
                                )
                            },
                            label = {
                                Text(
                                    "Home",
                                    fontSize = 10.sp,
                                    fontWeight = if (currentRoute == BottomNavItem.Home.route) FontWeight.Bold else FontWeight.Medium,
                                    color = if (currentRoute == BottomNavItem.Home.route) TealPrimary else TextMuted
                                )
                            },
                            selected = currentRoute == BottomNavItem.Home.route,
                            onClick = {
                                bottomNavController.navigate(BottomNavItem.Home.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = TealContainer
                            )
                        )

                        // 2. Txns
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    Icons.Default.ReceiptLong,
                                    contentDescription = "Txns",
                                    tint = if (currentRoute == BottomNavItem.Transactions.route) TealPrimary else TextMuted
                                )
                            },
                            label = {
                                Text(
                                    "Txns",
                                    fontSize = 10.sp,
                                    fontWeight = if (currentRoute == BottomNavItem.Transactions.route) FontWeight.Bold else FontWeight.Medium,
                                    color = if (currentRoute == BottomNavItem.Transactions.route) TealPrimary else TextMuted
                                )
                            },
                            selected = currentRoute == BottomNavItem.Transactions.route,
                            onClick = {
                                bottomNavController.navigate(BottomNavItem.Transactions.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = TealContainer
                            )
                        )

                        // Placeholder for Center FAB
                        Spacer(modifier = Modifier.weight(1f))

                        // 3. Accounts
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    Icons.Default.AccountBalance,
                                    contentDescription = "Accounts",
                                    tint = if (currentRoute == BottomNavItem.Accounts.route) TealPrimary else TextMuted
                                )
                            },
                            label = {
                                Text(
                                    "Accounts",
                                    fontSize = 10.sp,
                                    fontWeight = if (currentRoute == BottomNavItem.Accounts.route) FontWeight.Bold else FontWeight.Medium,
                                    color = if (currentRoute == BottomNavItem.Accounts.route) TealPrimary else TextMuted
                                )
                            },
                            selected = currentRoute == BottomNavItem.Accounts.route,
                            onClick = {
                                bottomNavController.navigate(BottomNavItem.Accounts.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = TealContainer
                            )
                        )

                        // 4. Analytics
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    Icons.Default.QueryStats,
                                    contentDescription = "Analytics",
                                    tint = if (currentRoute == BottomNavItem.Analytics.route) TealPrimary else TextMuted
                                )
                            },
                            label = {
                                Text(
                                    "Analytics",
                                    fontSize = 10.sp,
                                    fontWeight = if (currentRoute == BottomNavItem.Analytics.route) FontWeight.Bold else FontWeight.Medium,
                                    color = if (currentRoute == BottomNavItem.Analytics.route) TealPrimary else TextMuted
                                )
                            },
                            selected = currentRoute == BottomNavItem.Analytics.route,
                            onClick = {
                                bottomNavController.navigate(BottomNavItem.Analytics.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = TealContainer
                            )
                        )
                    }

                    // Floating Circular Center QuickAdd FAB Button
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .offset(y = (-20).dp)
                    ) {
                        FloatingActionButton(
                            onClick = { showQuickAddSheet = true },
                            containerColor = TealPrimary,
                            contentColor = Color(0xFF020617),
                            shape = CircleShape,
                            modifier = Modifier
                                .size(54.dp)
                                .border(3.dp, VeltisDarkBg, CircleShape),
                            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = "Quick Add",
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                }
            },
            containerColor = VeltisDarkBg
        ) { innerPadding ->
            NavHost(
                navController = bottomNavController,
                startDestination = BottomNavItem.Home.route,
                modifier = Modifier.padding(innerPadding)
            ) {
                // Home Dashboard
                composable(
                    route = BottomNavItem.Home.route,
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    HomeScreen(
                        viewModel = homeViewModel,
                        app = app,
                        onNavigateToTransactions = {
                            bottomNavController.navigate(BottomNavItem.Transactions.route) {
                                popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        onNavigateToAccounts = {
                            bottomNavController.navigate(BottomNavItem.Accounts.route) {
                                popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        onQuickAdd = { type ->
                            quickAddTypeForTxn = type
                            bottomNavController.navigate(BottomNavItem.Transactions.route) {
                                popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }

                // Accounts
                composable(
                    route = BottomNavItem.Accounts.route,
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    AccountsScreen(
                        viewModel = accountsViewModel,
                        isPrivacyMode = privacyMode,
                        onAccountChanged = {
                            homeViewModel.loadDashboard(forceRefresh = true)
                        }
                    )
                }

                // Transactions
                composable(
                    route = BottomNavItem.Transactions.route,
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    TransactionsScreen(
                        viewModel = transactionsViewModel,
                        isPrivacyMode = privacyMode,
                        initialQuickAddType = quickAddTypeForTxn,
                        onResetQuickAddType = { quickAddTypeForTxn = null },
                        onTransactionRecorded = {
                            homeViewModel.loadDashboard(forceRefresh = true)
                            accountsViewModel.loadAccounts(forceRefresh = true)
                        }
                    )
                }

                // Analytics
                composable(
                    route = BottomNavItem.Analytics.route,
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    AnalyticsScreen(
                        viewModel = analyticsViewModel
                    )
                }

                // Investments (Drawer)
                composable(
                    route = "drawer_investments",
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    InvestmentsScreen(
                        viewModel = investmentsViewModel
                    )
                }

                // Budgets (Drawer)
                composable(
                    route = "drawer_budgets",
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    MoreScreen(
                        viewModel = moreViewModel,
                        sessionManager = app.sessionManager,
                        onLogout = onSignOut
                    )
                }

                // Receivables (Drawer)
                composable(
                    route = "drawer_receivables",
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    MoreScreen(
                        viewModel = moreViewModel,
                        sessionManager = app.sessionManager,
                        onLogout = onSignOut
                    )
                }

                // Liabilities (Drawer)
                composable(
                    route = "drawer_liabilities",
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    MoreScreen(
                        viewModel = moreViewModel,
                        sessionManager = app.sessionManager,
                        onLogout = onSignOut
                    )
                }

                // Recurring (Drawer)
                composable(
                    route = "drawer_recurring",
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    MoreScreen(
                        viewModel = moreViewModel,
                        sessionManager = app.sessionManager,
                        onLogout = onSignOut
                    )
                }

                // Settings (Drawer)
                composable(
                    route = "drawer_settings",
                    enterTransition = { fadeIn(animationSpec = tween(200)) },
                    exitTransition = { fadeOut(animationSpec = tween(200)) }
                ) {
                    MoreScreen(
                        viewModel = moreViewModel,
                        sessionManager = app.sessionManager,
                        onLogout = onSignOut
                    )
                }
            }
        }

        // PWA-Identical Quick Add Bottom Sheet
        if (showQuickAddSheet) {
            ModalBottomSheet(
                onDismissRequest = { showQuickAddSheet = false },
                containerColor = VeltisCardBg,
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                dragHandle = {
                    Box(
                        modifier = Modifier
                            .padding(vertical = 10.dp)
                            .size(width = 36.dp, height = 4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(VeltisCardBorder)
                    )
                }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                        .padding(bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Quick Add",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextMuted
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        // Expense (Red arrow up)
                        QuickAddActionCircle(
                            label = "Expense",
                            icon = Icons.Default.ArrowUpward,
                            iconColor = ExpenseRed,
                            containerColor = ExpenseRedBg,
                            onClick = {
                                showQuickAddSheet = false
                                quickAddTypeForTxn = "expense"
                                bottomNavController.navigate(BottomNavItem.Transactions.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )

                        // Income (Green arrow down)
                        QuickAddActionCircle(
                            label = "Income",
                            icon = Icons.Default.ArrowDownward,
                            iconColor = IncomeGreen,
                            containerColor = IncomeGreenBg,
                            onClick = {
                                showQuickAddSheet = false
                                quickAddTypeForTxn = "income"
                                bottomNavController.navigate(BottomNavItem.Transactions.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )

                        // Transfer (Teal arrow right/left)
                        QuickAddActionCircle(
                            label = "Transfer",
                            icon = Icons.Default.SwapHoriz,
                            iconColor = TealPrimary,
                            containerColor = TealContainer,
                            onClick = {
                                showQuickAddSheet = false
                                quickAddTypeForTxn = "transfer"
                                bottomNavController.navigate(BottomNavItem.Transactions.route) {
                                    popUpTo(bottomNavController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }

        // Logout Confirmation Dialog
        if (showLogoutDialog) {
            AlertDialog(
                onDismissRequest = { showLogoutDialog = false },
                title = { Text("Log Out", color = Color.White, fontWeight = FontWeight.Bold) },
                text = { Text("Are you sure you want to log out of Veltis?", color = TextMuted, fontSize = 14.sp) },
                confirmButton = {
                    Button(
                        onClick = {
                            showLogoutDialog = false
                            app.sessionManager.clearSession()
                            onSignOut()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = ExpenseRedSolid)
                    ) {
                        Text("Log Out", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutDialog = false }) {
                        Text("Cancel", color = TextMuted)
                    }
                },
                containerColor = VeltisCardBg
            )
        }
    }
}

@Composable
fun QuickAddActionCircle(
    label: String,
    icon: ImageVector,
    iconColor: Color,
    containerColor: Color,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(12.dp)
    ) {
        Surface(
            shape = CircleShape,
            color = containerColor,
            modifier = Modifier.size(56.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = iconColor,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = TextPrimary
        )
    }
}
