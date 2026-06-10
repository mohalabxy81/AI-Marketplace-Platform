package com.marketplace.ai.presentation.saved

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.marketplace.ai.ui.components.EmptyState
import com.marketplace.ai.ui.components.ListingCard

@Composable
fun SavedScreen(
    onListingClick: (String) -> Unit,
    windowSizeClass: WindowSizeClass,
    viewModel: SavedViewModel = hiltViewModel(),
) {
    val listings by viewModel.listings.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isCompact = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Compact

    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            stringResource(R.string.saved_title),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp).padding(top = 8.dp),
        )

        if (isLoading) {
            Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
        } else if (listings.isEmpty()) {
            EmptyState(
                title = stringResource(R.string.saved_empty_title),
                subtitle = stringResource(R.string.saved_empty_subtitle),
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(listings, key = { it.id }) { listing ->
                    ListingCard(listing = listing, onClick = { onListingClick(listing.id) }, onSaveClick = {}, isCompact = isCompact)
                }
            }
        }
    }
}
