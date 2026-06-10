package com.marketplace.ai.presentation.search

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.marketplace.ai.ui.components.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SearchScreen(
    onListingClick: (String) -> Unit,
    onBack: () -> Unit,
    windowSizeClass: WindowSizeClass,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val isCompact = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Compact

    Column(modifier = Modifier.fillMaxSize()) {
        // Advanced Search Bar
        SearchBar(
            inputField = {
                SearchBarDefaults.InputField(
                    query = state.query,
                    onQueryChange = viewModel::updateQuery,
                    onSearch = { viewModel.search(it) },
                    expanded = false,
                    onExpandedChange = {},
                    placeholder = { Text(stringResource(R.string.search_placeholder)) },
                    leadingIcon = {
                        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.cd_back)) }
                    },
                    trailingIcon = {
                        if (state.query.isNotEmpty()) {
                            IconButton(onClick = { viewModel.updateQuery("") }) { Icon(Icons.Filled.Close, stringResource(R.string.cd_clear)) }
                        } else {
                            Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        }
                    },
                )
            },
            expanded = false,
            onExpandedChange = {},
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {}

        if (state.isLoading) {
            // Skeleton Loader for search results
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(5) {
                    ShimmerHorizontalCard()
                }
            }
        } else if (state.hasSearched) {
            if (state.results.isEmpty()) {
                EmptyState(
                    title = stringResource(R.string.search_no_results),
                    subtitle = "The AI couldn't find matches. Try adjusting keywords.",
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Text(
                            text = "AI Ranked Results",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                    }
                    items(state.results, key = { it.id }) { listing ->
                        ListingCard(
                            listing = listing,
                            onClick = { onListingClick(listing.id) },
                            onSaveClick = {},
                            isCompact = isCompact,
                        )
                    }
                }
            }
        } else {
            // Pre-search state: Suggestions & Recent
            LazyColumn(contentPadding = PaddingValues(8.dp)) {
                
                // Recent Searches
                if (state.recentSearches.isNotEmpty() && state.query.isBlank()) {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Recent Searches",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                    
                    item {
                        FlowRow(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            state.recentSearches.forEach { recent ->
                                AssistChip(
                                    onClick = { 
                                        viewModel.updateQuery(recent)
                                        viewModel.search(recent)
                                    },
                                    label = { Text(recent) },
                                    leadingIcon = { Icon(Icons.Filled.History, null, modifier = Modifier.size(16.dp)) }
                                )
                            }
                        }
                    }
                    
                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }

                // AI Suggestions
                if (state.suggestions.isNotEmpty()) {
                    item {
                        Text(
                            text = if (state.query.isBlank()) "Suggested for you" else "Suggestions",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    items(state.suggestions) { suggestion ->
                        ListItem(
                            headlineContent = { Text(suggestion.text) },
                            supportingContent = { Text("${suggestion.resultCount} results") },
                            leadingContent = { 
                                Icon(
                                    if (suggestion.type != null) Icons.Filled.AutoAwesome else Icons.Filled.Search, 
                                    null, 
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant 
                                ) 
                            },
                            modifier = Modifier.clickable { 
                                viewModel.updateQuery(suggestion.text)
                                viewModel.search(suggestion.text) 
                            },
                        )
                    }
                }
            }
        }
    }
}
