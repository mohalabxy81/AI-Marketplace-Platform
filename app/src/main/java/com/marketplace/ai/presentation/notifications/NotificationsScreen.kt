package com.marketplace.ai.presentation.notifications

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.marketplace.ai.R
import com.marketplace.ai.core.extensions.toRelativeTimeString
import com.marketplace.ai.data.remote.mock.MockDataProvider
import com.marketplace.ai.domain.model.Notification
import com.marketplace.ai.domain.model.NotificationType
import com.marketplace.ai.ui.components.EmptyState
import com.marketplace.ai.ui.theme.*

@Composable
fun NotificationsScreen() {
    val notifications = remember { MockDataProvider.getNotifications() }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            stringResource(R.string.notifications_title),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp).padding(top = 8.dp),
        )

        if (notifications.isEmpty()) {
            EmptyState(
                title = stringResource(R.string.notifications_empty_title),
                subtitle = stringResource(R.string.notifications_empty_subtitle),
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            LazyColumn {
                items(notifications, key = { it.id }) { notification ->
                    NotificationItem(notification)
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                }
            }
        }
    }
}

@Composable
private fun NotificationItem(notification: Notification) {
    val (icon, color) = when (notification.type) {
        NotificationType.PRICE_DROP -> Icons.Filled.TrendingDown to Emerald500
        NotificationType.RECOMMENDATION -> Icons.Filled.AutoAwesome to Amber600
        NotificationType.LISTING_UPDATE -> Icons.Filled.Update to Blue500
        NotificationType.NEW_MESSAGE -> Icons.Filled.Message to Teal500
        NotificationType.SYSTEM -> Icons.Filled.Info to Stone500
    }

    ListItem(
        headlineContent = {
            Text(
                notification.title,
                fontWeight = if (!notification.isRead) FontWeight.SemiBold else FontWeight.Normal,
            )
        },
        supportingContent = {
            Column {
                Text(notification.message, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(notification.createdAt.toRelativeTimeString(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            }
        },
        leadingContent = {
            Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
        },
        colors = ListItemDefaults.colors(
            containerColor = if (!notification.isRead) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface,
        ),
    )
}
