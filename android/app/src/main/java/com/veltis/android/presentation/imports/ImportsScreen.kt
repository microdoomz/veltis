package com.veltis.android.presentation.imports

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.FileUpload
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.veltis.android.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImportsScreen(
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Imports",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 20.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onMenuClick) {
                        Icon(imageVector = Icons.Default.Menu, contentDescription = "Menu", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = VeltisDarkBg)
            )
        },
        containerColor = VeltisDarkBg
    ) { padding ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Bank Statement Parsers",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Veltis ingests transaction statements from bank accounts, credit cards, and investment accounts with zero loss of decimal accuracy.",
                    fontSize = 13.sp,
                    color = TextMuted
                )
            }

            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = TealPrimary.copy(alpha = 0.15f),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(imageVector = Icons.Default.FileUpload, contentDescription = null, tint = TealPrimary)
                                }
                            }
                            Column {
                                Text(text = "Supported Statement Formats", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text(text = "PDF, CSV, Excel (.XLSX), QFX/OFX", fontSize = 12.sp, color = TextMuted)
                            }
                        }

                        Divider(color = VeltisCardBorder, thickness = 0.5.dp)

                        Text(
                            text = "1. Authoritative double-entry ledger reconciliation guarantees every debit matches a credit.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                        Text(
                            text = "2. Auto-categorization engine learns your spending patterns across merchants.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                        Text(
                            text = "3. To upload large PDF statements or run bulk imports, visit https://veltismoney.vercel.app/imports on desktop or mobile browser.",
                            fontSize = 12.sp,
                            color = TealLight
                        )
                    }
                }
            }

            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(VeltisCardBg)
                        .border(1.dp, VeltisCardBorder, RoundedCornerShape(16.dp))
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Realtime Synchronization",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Whenever you import statements via the Web or PWA, all accounts, balances, and categorized transactions automatically synchronize with your Android device instantaneously.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(60.dp)) }
        }
    }
}
