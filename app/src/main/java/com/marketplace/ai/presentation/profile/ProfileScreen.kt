package com.marketplace.ai.presentation.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.marketplace.ai.R
import com.marketplace.ai.data.remote.mock.MockDataProvider
import com.marketplace.ai.presentation.auth.AuthViewModel

@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    onNavigateToLogin: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val authState by viewModel.authState.collectAsState()

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
    ) {
        Text(
            stringResource(R.string.profile_title),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp).padding(top = 8.dp),
        )

        if (authState.isLoggedIn) {
            val user = MockDataProvider.getUser()
            // Profile card
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                shape = MaterialTheme.shapes.large,
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (user.avatarUrl != null) {
                        AsyncImage(user.avatarUrl, stringResource(R.string.cd_profile_picture), Modifier.size(56.dp))
                    } else {
                        Icon(Icons.Filled.AccountCircle, null, Modifier.size(56.dp))
                    }
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text(user.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(user.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Settings
            Text(
                stringResource(R.string.profile_settings),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )

            SettingsItem(Icons.Filled.Language, stringResource(R.string.profile_language), "English")
            SettingsItem(Icons.Filled.DarkMode, stringResource(R.string.profile_theme), "System")
            SettingsItem(Icons.Filled.Notifications, stringResource(R.string.profile_notifications_setting), "On")
            SettingsItem(Icons.Filled.Info, stringResource(R.string.profile_about))

            Spacer(Modifier.height(24.dp))

            // Logout
            TextButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, null)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.profile_logout), fontWeight = FontWeight.SemiBold)
            }
        } else {
            // Guest state
            Column(
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Filled.AccountCircle, null, Modifier.size(72.dp), MaterialTheme.colorScheme.outline)
                Spacer(Modifier.height(16.dp))
                Text("Sign in to access your profile", style = MaterialTheme.typography.bodyLarge)
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = onNavigateToLogin,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = MaterialTheme.shapes.medium,
                ) {
                    Text(stringResource(R.string.auth_login_button))
                }
            }
        }
    }
}

@Composable
private fun SettingsItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    value: String? = null,
) {
    ListItem(
        headlineContent = { Text(title) },
        leadingContent = { Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
        trailingContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (value != null) Text(value, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Icon(Icons.Filled.ChevronRight, null, Modifier.size(20.dp), MaterialTheme.colorScheme.outline)
            }
        },
    )
}
