package com.marketplace.ai.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import com.marketplace.ai.R

data class BottomNavItem(
    val route: String,
    val labelResId: Int,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
)

@Composable
fun MarketplaceBottomBar(
    currentRoute: String?,
    isLoggedIn: Boolean,
    onNavigate: (String) -> Unit,
) {
    val items = if (isLoggedIn) {
        listOf(
            BottomNavItem(Screen.Home.route, R.string.nav_home, Icons.Filled.Home, Icons.Outlined.Home),
            BottomNavItem(Screen.Explore.route, R.string.nav_explore, Icons.Filled.Explore, Icons.Outlined.Explore),
            BottomNavItem(Screen.Map.route, R.string.nav_map, Icons.Filled.Map, Icons.Outlined.Map),
            BottomNavItem(Screen.Saved.route, R.string.nav_saved, Icons.Filled.Bookmark, Icons.Outlined.BookmarkBorder),
            BottomNavItem(Screen.Notifications.route, R.string.nav_notifications, Icons.Filled.Notifications, Icons.Outlined.Notifications),
            BottomNavItem(Screen.Profile.route, R.string.nav_profile, Icons.Filled.Person, Icons.Outlined.Person),
        )
    } else {
        listOf(
            BottomNavItem(Screen.Home.route, R.string.nav_home, Icons.Filled.Home, Icons.Outlined.Home),
            BottomNavItem(Screen.Explore.route, R.string.nav_explore, Icons.Filled.Explore, Icons.Outlined.Explore),
            BottomNavItem(Screen.Search.route, R.string.nav_search, Icons.Filled.Search, Icons.Outlined.Search),
            BottomNavItem(Screen.Map.route, R.string.nav_map, Icons.Filled.Map, Icons.Outlined.Map),
            BottomNavItem(Screen.Notifications.route, R.string.nav_notifications, Icons.Filled.Notifications, Icons.Outlined.Notifications),
            BottomNavItem(Screen.Login.route, R.string.nav_login, Icons.Filled.Login, Icons.Outlined.Login),
        )
    }

    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = {
                    Icon(
                        imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                        contentDescription = stringResource(item.labelResId),
                    )
                },
                label = {
                    Text(
                        text = stringResource(item.labelResId),
                        style = MaterialTheme.typography.labelSmall,
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            )
        }
    }
}
