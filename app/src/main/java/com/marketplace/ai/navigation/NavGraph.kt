package com.marketplace.ai.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.marketplace.ai.presentation.auth.AuthViewModel
import com.marketplace.ai.presentation.auth.ForgotPasswordScreen
import com.marketplace.ai.presentation.auth.LoginScreen
import com.marketplace.ai.presentation.auth.RegisterScreen
import com.marketplace.ai.presentation.explore.ExploreScreen
import com.marketplace.ai.presentation.home.HomeScreen
import com.marketplace.ai.presentation.listing.ListingDetailScreen
import com.marketplace.ai.presentation.notifications.NotificationsScreen
import com.marketplace.ai.presentation.profile.ProfileScreen
import com.marketplace.ai.presentation.saved.SavedScreen
import com.marketplace.ai.presentation.search.SearchScreen
import com.marketplace.ai.presentation.map.MapScreen
import com.marketplace.ai.presentation.chat.ChatScreen
@Composable
fun MarketplaceNavHost(
    windowSizeClass: WindowSizeClass,
    navController: NavHostController = rememberNavController(),
) {
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.authState.collectAsState()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val isCompact = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Compact

    val showBottomBar = currentRoute in listOf(
        Screen.Home.route, Screen.Explore.route, Screen.Search.route,
        Screen.Saved.route, Screen.Notifications.route, Screen.Profile.route, Screen.Map.route
    )

    Scaffold(
        bottomBar = {
            if (showBottomBar && isCompact) {
                MarketplaceBottomBar(
                    currentRoute = currentRoute,
                    isLoggedIn = authState.isLoggedIn,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding),
            enterTransition = { fadeIn(tween(300)) + slideInHorizontally(tween(300)) { it / 4 } },
            exitTransition = { fadeOut(tween(200)) },
            popEnterTransition = { fadeIn(tween(300)) + slideInHorizontally(tween(300)) { -it / 4 } },
            popExitTransition = { fadeOut(tween(200)) },
        ) {
            // Main tabs
            composable(Screen.Home.route) {
                HomeScreen(
                    onListingClick = { id -> navController.navigate(Screen.ListingDetail.createRoute(id)) },
                    onSearchClick = { navController.navigate(Screen.Search.route) },
                    windowSizeClass = windowSizeClass,
                )
            }
            composable(Screen.Explore.route) {
                ExploreScreen(
                    onListingClick = { id -> navController.navigate(Screen.ListingDetail.createRoute(id)) },
                    windowSizeClass = windowSizeClass,
                )
            }
            composable(Screen.Search.route) {
                SearchScreen(
                    onListingClick = { id -> navController.navigate(Screen.ListingDetail.createRoute(id)) },
                    onBack = { navController.popBackStack() },
                    windowSizeClass = windowSizeClass,
                )
            }
            composable(Screen.Saved.route) {
                SavedScreen(
                    onListingClick = { id -> navController.navigate(Screen.ListingDetail.createRoute(id)) },
                    windowSizeClass = windowSizeClass,
                )
            }
            composable(Screen.Notifications.route) {
                NotificationsScreen()
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onLogout = {
                        authViewModel.logout()
                        navController.navigate(Screen.Home.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateToLogin = { navController.navigate(Screen.Login.route) },
                )
            }

            // Auth
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                    onNavigateToForgotPassword = { navController.navigate(Screen.ForgotPassword.route) },
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Screen.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateToLogin = { navController.popBackStack() },
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Screen.ForgotPassword.route) {
                ForgotPasswordScreen(
                    onBack = { navController.popBackStack() },
                    onNavigateToLogin = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                )
            }

            // Detail
            composable(
                route = Screen.ListingDetail.route,
                arguments = listOf(navArgument("listingId") { type = NavType.StringType }),
            ) { backStackEntry ->
                val listingId = backStackEntry.arguments?.getString("listingId") ?: ""
                ListingDetailScreen(
                    listingId = listingId,
                    onBack = { navController.popBackStack() },
                    onChatClick = { id -> navController.navigate(Screen.Chat.createRoute(id)) },
                    windowSizeClass = windowSizeClass,
                )
            }
            
            composable(Screen.Map.route) {
                MapScreen(
                    onListingClick = { id -> navController.navigate(Screen.ListingDetail.createRoute(id)) }
                )
            }
            
            composable(
                route = Screen.Chat.route,
                arguments = listOf(navArgument("listingId") { type = NavType.StringType }),
            ) {
                ChatScreen(
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
