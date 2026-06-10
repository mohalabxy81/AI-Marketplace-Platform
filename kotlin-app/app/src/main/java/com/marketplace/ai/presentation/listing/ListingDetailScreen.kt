package com.marketplace.ai.presentation.listing

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.marketplace.ai.R
import com.marketplace.ai.core.extensions.toCurrencyString
import com.marketplace.ai.ui.components.ContentTypeBadge
import com.marketplace.ai.ui.components.ErrorState
import com.marketplace.ai.ui.theme.Amber500
import com.marketplace.ai.ui.theme.Amber600

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ListingDetailScreen(
    listingId: String,
    onBack: () -> Unit,
    onChatClick: (String) -> Unit = {},
    windowSizeClass: WindowSizeClass,
    viewModel: ListingDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.cd_back)) } },
                actions = {
                    IconButton(onClick = {}) { Icon(Icons.Filled.Share, stringResource(R.string.listing_share)) }
                    IconButton(onClick = viewModel::toggleSave) {
                        Icon(
                            if (state.listing?.isSaved == true) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
                            stringResource(R.string.listing_save),
                            tint = if (state.listing?.isSaved == true) Amber600 else MaterialTheme.colorScheme.onSurface,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        bottomBar = {
            state.listing?.let { listing ->
                Surface(shadowElevation = 8.dp) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(listing.price.toCurrencyString(listing.currency), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        }
                        Button(
                            onClick = { onChatClick(listing.id) },
                            modifier = Modifier.height(48.dp),
                            shape = MaterialTheme.shapes.medium,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        ) {
                            Icon(Icons.Filled.Chat, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(stringResource(R.string.listing_contact_seller))
                        }
                    }
                }
            }
        },
    ) { padding ->
        when {
            state.isLoading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) { CircularProgressIndicator() }
            state.error != null -> ErrorState(state.error!!, onRetry = {}, modifier = Modifier.padding(padding))
            state.listing != null -> {
                val listing = state.listing!!
                Column(
                    modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()),
                ) {
                    // Image
                    AsyncImage(
                        model = listing.imageUrls.firstOrNull(),
                        contentDescription = listing.title,
                        modifier = Modifier.fillMaxWidth().height(280.dp),
                        contentScale = ContentScale.Crop,
                    )
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ContentTypeBadge(listing.contentType)
                            Spacer(Modifier.width(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Star, null, Modifier.size(16.dp), Amber500)
                                Text(" ${listing.rating} (${listing.reviewCount})", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        Text(listing.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocationOn, null, Modifier.size(16.dp), MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.width(4.dp))
                            Text(listing.location, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

                        // Description
                        Text(stringResource(R.string.listing_description), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(8.dp))
                        Text(listing.description, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)

                        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

                        // Seller
                        Text(stringResource(R.string.listing_seller), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (listing.sellerAvatar != null) {
                                AsyncImage(listing.sellerAvatar, listing.sellerName, Modifier.size(40.dp))
                            } else {
                                Icon(Icons.Filled.AccountCircle, null, Modifier.size(40.dp), MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Spacer(Modifier.width(12.dp))
                            Text(listing.sellerName, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                        }

                        // Tags
                        if (listing.tags.isNotEmpty()) {
                            Spacer(Modifier.height(16.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listing.tags.forEach { tag ->
                                    item {
                                        SuggestionChip(onClick = {}, label = { Text(tag) })
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(80.dp)) // Space for bottom bar
                    }
                }
            }
        }
    }
}
