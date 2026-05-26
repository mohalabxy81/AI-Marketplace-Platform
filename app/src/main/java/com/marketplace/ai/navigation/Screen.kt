package com.marketplace.ai.navigation

sealed class Screen(val route: String) {
    // Auth
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object ForgotPassword : Screen("forgot_password")

    // Main
    data object Home : Screen("home")
    data object Explore : Screen("explore")
    data object Search : Screen("search")
    data object Saved : Screen("saved")
    data object Notifications : Screen("notifications")
    data object Profile : Screen("profile")

    // Detail
    data object ListingDetail : Screen("listing/{listingId}") {
        fun createRoute(listingId: String) = "listing/$listingId"
    }
    
    data object Chat : Screen("chat/{listingId}") {
        fun createRoute(listingId: String) = "chat/$listingId"
    }
    
    data object Map : Screen("map")
}
