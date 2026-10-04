// =========================================================================
// --- MODULE 2: INVENTORY CHECK & MANAGEMENT DATABASE ENGINE ---
// =========================================================================

let globalInventoryData = [];
let globalMasterProducts = [];
let occupiedLocationsSet = new Set();
let selectedItemSnSet = new Set();
let currentFilteredItems = [];

async function fetchAllWarehouseItems() {
    if (!navigator.onLine) {
        const cached = localStorage.getItem('WMS_LOCAL_INVENTORY_CACHE');
        return cached ? JSON.parse(cached) : [];
    }

    let allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await _supabase
            .from('warehouse_items')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += step;
            if (data.length < step) hasMore = false;
        } else {
            hasMore = false;
        }
    }
    
    try { localStorage.setItem('WMS_LOCAL_INVENTORY_CACHE', JSON.stringify(allData)); } catch (e) {}
    updateDBConnectionStatus(true, `(สต็อก: ${allData.length.toLocaleString()} รายการ)`);
    return allData;
}

async function loadMasterProductsFromDB() {
    try {
        if (!navigator.onLine) {
            const cachedMaster = localStorage.getItem('WMS_MASTER_PRODUCTS_CACHE');
            if (cachedMaster) globalMasterProducts = JSON.parse(cachedMaster);
            return;
        }

        let allProducts = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await _supabase
                .from('products')
                .select('*')
                .range(from, from + step - 1);

            if (error) break;

            if (data && data.length > 0) {
                allProducts = allProducts.concat(data);
                from += step;
                if (data.length < step) hasMore = false;
            } else {
                hasMore = false;
            }
        }

        if (allProducts.length > 0) {
            globalMasterProducts = allProducts;
            localStorage.setItem('WMS_MASTER_PRODUCTS_CACHE', JSON.stringify(allProducts));
        }
    } catch(e) {}
}

async function loadDataFromDatabase() {
    try {
        globalInventoryData = await fetchAllWarehouseItems();
        
        globalInventoryData.forEach(item => {
            if (item.meter === undefined || item.meter === null || item.meter === '') {
                item.meter = 0;
            }
        });

        mergePendingIntoInventory();
        await loadMasterProductsFromDB();
        await loadWarehouseConfigsFromDB();

        rebuildOccupiedSet();
        filterInventoryData();
        updateKPIs();
        refreshLocationVisualizerIfActive();
        await loadRecentInboundFeedFromDB(); 
    } catch (err) {
        updateDBConnectionStatus(false, "(Sync Failed)");
    }
}

function mergePendingIntoInventory() {
    const have = new Set(globalInventoryData.map(i => String(i.sn).toLowerCase()));
    offlineInboundQueue.forEach(p => {
        if (!have.has(String(p.sn).toLowerCase())) globalInventoryData.unshift({ ...p, _pending: true });
    });
}

function rebuildOccupiedSet() {
    occupiedLocationsSet.clear();
    globalInventoryData.forEach(i => {
        if(i.location && i.location.toUpperCase() !== 'DOCK' && i.location.toUpperCase() !== 'OFFICE' && i.location.toUpperCase() !== 'PENDING') {
            occupiedLocationsSet.add(i.location.toUpperCase());
        }
    });
}

function filterInventoryData() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const aisleFilter = document.getElementById('filterAisleSelect').value;
    const bayFilter = document.getElementById('filterBaySelect').value;
    const locFilter = document.getElementById('filterLocationSelect').value;

    currentFilteredItems = globalInventoryData.filter(item => {
        const matchText = !query || 
            (item.sn && item.sn.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.name && item.name.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query));

        let matchAisle = true;
        if(aisleFilter !== 'ALL') {
            if(aisleFilter === 'DOCK') matchAisle = (item.location || '').toUpperCase() === 'DOCK';
            else matchAisle = (item.location || '').toUpperCase().startsWith(`${aisleFilter}-`) || (item.location || '').toUpperCase() === aisleFilter;
        }

        let matchBay = true;
        if(bayFilter !== 'ALL' && aisleFilter !== 'ALL' && aisleFilter !== 'DOCK') {
            matchBay = (item.location || '').toUpperCase().startsWith(`${aisleFilter}-${bayFilter}-`);
        }

        let matchLoc = true;
        if(locFilter !== 'ALL') {
            matchLoc = (item.location || '').toUpperCase() === locFilter.toUpperCase();
        }

        return matchText && matchAisle && matchBay && matchLoc;
    });

    renderInventoryTable(currentFilteredItems);
}

function renderInventoryTable(items) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    document.getElementById('totalCountBadge').textContent = `ดึงข้อมูลแล้ว ${items.length.toLocaleString()} / ${globalInventoryData.length.toLocaleString()} รายการ`;

    if(items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:24px; color:var(--text-muted);">ไม่พบข้อมูลสินค้าตรงตามเงื่อนไขค้นหา</td></tr>`;
        return;
    }

    const frag = document.createDocumentFragment();
    let allVisibleChecked = items.length > 0;

    items.forEach((item, index) => {
        const isChecked = selectedItemSnSet.has(item.sn);
        if(!isChecked) allVisibleChecked = false;

        const formatLoc = formatLocationCode(item.location);
        const meterValue = item.meter !== undefined && item.meter !== null ? item.meter : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center;"><input type="checkbox" class="item-checkbox" data-sn="${escapeHTML(item.sn)}" ${isChecked ? 'checked' : ''} onchange="toggleItemSelection('${escapeHTML(item.sn)}', this.checked)"></td>
            <td style="text-align:center; font-weight:700;" class="mono">${index + 1}</td>
            <td><code class="mono font-bold" style="color:var(--primary-text);">${escapeHTML(item.category || 'N/A')}</code></td>
            <td><div class="text-multiline-truncate" title="${escapeHTML(item.name || '-')}">${escapeHTML(item.name || '-')}</div></td>
            <td><span class="mono font-bold" style="color:var(--warning); font-size:0.92rem;"><i class="fa-solid fa-gauge"></i> ${Number(meterValue).toLocaleString()}</span></td>
            <td><code class="mono font-bold">${escapeHTML(item.sn)}</code>${item._pending ? ' <span class="badge-action delete" style="font-size:0.68rem;"><i class="fa-solid fa-clock"></i> รอบันทึก DB</span>' : ''}</td>
            <td><span class="badge-location mono"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(formatLoc)}</span></td>
            <td style="text-align:center; font-weight:700;" class="mono">${item.qty ?? 1}</td>
            <td style="font-size:0.78rem; color:var(--text-muted);">${item.created_at ? new Date(item.created_at).toLocaleString('th-TH') : '-'}</td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-primary" onclick="openPrintBarcodeModal('SINGLE', '${escapeHTML(item.sn)}')"><i class="fa-solid fa-barcode"></i> พิมพ์</button>
            </td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-secondary" onclick="openEditItemModal('${item.id}', '${escapeHTML(item.sn)}')"><i class="fa-solid fa-pen-to-square" style="color:var(--primary);"></i> แก้ไข</button>
            </td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-secondary" onclick="requestRelocateModal('${item.id}', '${escapeHTML(item.sn)}', '${escapeHTML(item.name)}', '${escapeHTML(item.location)}')"><i class="fa-solid fa-right-left"></i> ย้าย</button>
            </td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-danger" onclick="requestDeleteModal('SINGLE', '${escapeHTML(item.sn)}', '${item.id}')"><i class="fa-solid fa-trash"></i> ลบ</button>
            </td>
        `;
        frag.appendChild(tr);
    });

    tbody.appendChild(frag);
    document.getElementById('selectAllCheckbox').checked = allVisibleChecked;
    updateSelectedCountUI();
}

function updateKPIs() {
    document.getElementById('kpiTotalItems').textContent = globalInventoryData.length.toLocaleString();
    const uniqueSkus = new Set(globalInventoryData.map(i => i.category)).size;
    document.getElementById('kpiTotalModels').textContent = uniqueSkus.toLocaleString();
    const dockItems = globalInventoryData.filter(i => (i.location || '').toUpperCase() === 'DOCK').length;
    document.getElementById('kpiDockItems').textContent = dockItems.toLocaleString();
}

function toggleSelectAllVisibleItems(checked) {
    currentFilteredItems.forEach(item => {
        if (checked) selectedItemSnSet.add(item.sn);
        else selectedItemSnSet.delete(item.sn);
    });

    document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = checked);
    updateSelectedCountUI();
}

function toggleItemSelection(sn, checked) {
    if(checked) selectedItemSnSet.add(sn);
    else selectedItemSnSet.delete(sn);
    updateSelectedCountUI();
}

function updateSelectedCountUI() {
    const count = selectedItemSnSet.size;
    document.getElementById('selectedCountSpan').textContent = count;
    document.getElementById('selectedRelocateCountSpan').textContent = count;
}