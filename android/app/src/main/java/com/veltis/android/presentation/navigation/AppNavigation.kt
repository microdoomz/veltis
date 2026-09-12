package com.veltis.android.presentation.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Signup : Screen("signup")
    object ForgotPassword : Screen("forgot_password")
    object Main : Screen("main")
}

sealed class BottomNavItem(val route: String, val title: String, val icon: ImageVector) {
    object Home : BottomNavItem("bottom_home", "Home", Icons.Default.Home)
    object Accounts : BottomNavItem("bottom_accounts", "Accounts", Icons.Default.AccountBalance)
    object Transactions : BottomNavItem("bottom_transactions", "Transactions", Icons.Default.ReceiptLong)
    object Investments : BottomNavItem("bottom_investments", "Investments", Icons.Default.TrendingUp)
    object More : BottomNavItem("bottom_more", "More", Icons.Default.MoreHoriz)
}

@Composable
fun AppNavigation(
    app: VeltisApplication,
    modifier: Modifier = Modifier
) {
    val rootNavController = rememberNavController()
    val isInitiallyLoggedIn = remember { app.sessionManager.isLoggedIn() }
    val startDest = if (isInitiallyLoggedIn) Screen.Main.route else Screen.Login.route

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

@Composable
fun MainDashboardShell(
    app: VeltisApplication,
    onSignOut: () -> Unit
) {
    val bottomNavController = rememberNavController()
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val homeViewModel = remember { HomeViewModel(app.appRepository, app.sessionManager) }
    val accountsViewModel = remember { AccountsViewModel(app.appRepository) }
    val transactionsViewModel = remember { TransactionsViewModel(app.appRepository) }
    val investmentsViewModel = remember { InvestmentsViewModel(app.appRepository, app.sessionManager) }
    val moreViewModel = remember { MoreViewModel(app.appRepository, app.authRepository, app.sessionManager) }

    var quickAddTypeForTxn by remember { mutableStateOf<String?>(null) }
    val privacyMode by app.sessionManager.privacyMode.collectAsState()

    val navItems = listOf(
        BottomNavItem.Home,
        BottomNavItem.Accounts,
        BottomNavItem.Transactions,
        BottomNavItem.Investments,
        BottomNavItem.More
    )

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = VeltisDarkBg,
                tonalElevation = 8.dp,
                modifier = Modifier
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                    .border(1.dp, VeltisCardBorder, RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
            ) {
                navItems.forEach { item ->
                    val isSelected = currentRoute == item.route
                    NavigationBarItem(
                        icon = {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.title,
                                tint = if (isSelected) TealLight else TextMuted
                            )
                        },
                        label = {
                            Text(
                                text = item.title,
                                fontSize = 11.sp,
                                color = if (isSelected) TealLight else TextMuted
                            )
                        },
                        selected = isSelected,
                        onClick = {
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
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = TealLight,
                            unselectedIconColor = TextMuted,
                            indicatorColor = TealDark.copy(alpha = 0.35f)
                        )
                    )
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
            composable(
                route = BottomNavItem.Home.route,
                enterTransition = { fadeIn(animationSpec = tween(200)) },
                exitTransition = { fadeOut(animationSpec = tween(200)) }
            ) {
                HomeScreen(
                    viewModel = homeViewModel,
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

            composable(
                route = BottomNavItem.Accounts.route,
                enterTransition = { fadeIn(animationSpec = tween(200)) },
                exitTransition = { fadeOut(animationSpec = tween(200)) }
            ) {
                AccountsScreen(
                    viewModel = accountsViewModel,
                    isPrivacyMode = privacyMode
                )
            }

            composable(
                route = BottomNavItem.Transactions.route,
                enterTransition = { fadeIn(animationSpec = tween(200)) },
                exitTransition = { fadeOut(animationSpec = tween(200)) }
            ) {
                TransactionsScreen(
                    viewModel = transactionsViewModel,
                    isPrivacyMode = privacyMode,
                    initialQuickAddType = quickAddTypeForTxn,
                    onResetQuickAddType = { quickAddTypeForTxn = null }
                )
            }

            composable(
                route = BottomNavItem.Investments.route,
                enterTransition = { fadeIn(animationSpec = tween(200)) },
                exitTransition = { fadeOut(animationSpec = tween(200)) }
            ) {
                InvestmentsScreen(
                    viewModel = investmentsViewModel
                )
            }

            composable(
                route = BottomNavItem.More.route,
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
}
