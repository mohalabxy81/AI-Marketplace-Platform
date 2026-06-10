package com.marketplace.ai.presentation.explore

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.marketplace.ai.R
import com.marketplace.ai.domain.model.Category
import com.marketplace.ai.domain.model.ContentType
import com.marketplace.ai.ui.components.*
import com.marketplace.ai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    onListingClick: (String) -> Unit,
    windowSizeClass: WindowSizeClass,
    viewModel: ExploreViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val isCompact = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Compact
    val columns = if (isCompact) 2 else 3

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 16.dp),
    ) {
        item {
            Text(
                stringResource(R.string.explore_title),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp).padding(top = 8.dp),
            )
        }

        // Categories grid
        item {
            Text(
                stringResource(R.string.explore_categories),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
        }
        item {
            LazyVerticalGrid(
                columns = GridCells.Fixed(columns),
                modifier = Modifier.fillMaxWidth().height(((state.categories.size / columns + 1) * 100).dp).padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.categories) { category ->
                    CategoryCard(category = category, onClick = {})
                }
            }
        }

        // Featured
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(stringResource(R.string.explore_featured), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                TextButton(onClick = {}) { Text(stringResource(R.string.feed_see_all), color = MaterialTheme.colorScheme.tertiary) }
            }
        }

        if (state.isLoading) {
            items(3) {
                ShimmerListingCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
            }
        } else {
            items(state.featuredListings, key = { it.id }) { listing ->
                ListingCard(
                    listing = listing,
                    onClick = { onListingClick(listing.id) },
                    onSaveClick = {},
                    isCompact = isCompact,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun CategoryCard(category: Category, onClick: () -> Unit) {
    val color = when (category.contentType) {
        ContentType.REAL_ESTATE -> Emerald500
        ContentType.PRODUCT -> Blue500
        ContentType.SERVICE -> Orange500
        ContentType.LOCAL_OFFER -> Rose500
        ContentType.TRENDING -> Teal500
    }
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f)),
    ) {
        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = when (category.iconName) {
                    "home" -> Icons.Filled.Home
                    "devices" -> Icons.Filled.Devices
                    "checkroom" -> Icons.Filled.Checkroom
                    "handyman" -> Icons.Filled.Handyman
                    "restaurant" -> Icons.Filled.Restaurant
                    "spa" -> Icons.Filled.Spa
                    else -> Icons.Filled.Category
                },
                contentDescription = category.name,
                tint = color,
                modifier = Modifier.size(28.dp),
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(category.name, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Medium)
            Text("${category.listingCount} items", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
