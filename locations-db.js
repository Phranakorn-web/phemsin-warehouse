// =========================================================================
// --- MODULE 5: LOCATION VISUALIZER & RACK MAP DATABASE ENGINE ---
// =========================================================================

let currentSelectedAisle = '';
let currentSelectedBay = '01';

function renderDrillDownAisleBar() {
    const bar = document.getElementById('aisleFilterBar');
    if (!bar) return;
    bar.innerHTML = '';

    if (masterAisles.length === 0) return;

    if (!currentSelectedAisle || !masterAisles.includes(currentSelectedAisle)) {
        currentSelectedAisle = masterAisles[0];
    }

    masterAisles.forEach(aisle => {
        const btn = document.createElement('button');
        btn.className = `aisle-tab-btn ${aisle === currentSelectedAisle ? 'active' : ''}`;
        btn.innerHTML = `<i class="fa-solid fa-layer-group"></i> แถว ${escapeHTML(aisle)}`;
        btn.onclick = () => {
            currentSelectedAisle = aisle;
            currentSelectedBay = '01';
            renderDrillDownAisleBar();
            renderDrillDownBaysGrid();
            renderDrillDownSlotsGrid();
        };
        bar.appendChild(btn);
    });
}

function renderDrillDownBaysGrid() {
    const container = document.getElementById('baysGridContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!currentSelectedAisle) return;

    if(currentSelectedAisle === 'DOCK' || currentSelectedAisle === 'OFFICE' || currentSelectedAisle === 'PENDING') {
        container.innerHTML = `<div style="grid-column:1/-1; padding:10px; font-size:0.85rem; color:var(--text-muted);">พื้นที่ ${escapeHTML(currentSelectedAisle)} ไม่แบ่งล็อกจัดเก็บย่อย</div>`;
        return;
    }

    const cfg = aisleConfigs[currentSelectedAisle] || { bays: 10 };
    for(let b = 1; b <= cfg.bays; b++) {
        const bayStr = String(b).padStart(2, '0');
        const prefix = `${currentSelectedAisle}-${bayStr}-`;
        const count = globalInventoryData.filter(i => (i.location || '').toUpperCase().startsWith(prefix)).length;

        const btn = document.createElement('div');
        btn.className = `bay-card-btn ${bayStr === currentSelectedBay ? 'active' : ''}`;
        btn.onclick = () => {
            currentSelectedBay = bayStr;
            renderDrillDownBaysGrid();
            renderDrillDownSlotsGrid();
        };

        btn.innerHTML = `
            <div style="font-weight:700; font-size:0.9rem;" class="mono">ล็อก ${bayStr}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${count} เครื่อง</div>
            <div class="capacity-bar"><div class="capacity-fill cap-green" style="width:${Math.min(count * 10, 100)}%;"></div></div>
        `;
        container.appendChild(btn);
    }
}

function renderDrillDownSlotsGrid() {
    const container = document.getElementById('rackSlotsGrid');
    const infoText = document.getElementById('bayCapacityInfoText');
    if (!container) return;
    container.innerHTML = '';

    if (!currentSelectedAisle) return;

    if(currentSelectedAisle === 'DOCK' || currentSelectedAisle === 'OFFICE' || currentSelectedAisle === 'PENDING') {
        const specialItems = globalInventoryData.filter(i => (i.location || '').toUpperCase() === currentSelectedAisle);
        if (infoText) infoText.textContent = `พื้นที่ ${currentSelectedAisle} (รวม ${specialItems.length} เครื่องทั้งหมด)`;
        renderSlotCard(container, `${currentSelectedAisle} Area`, specialItems, true);
        return;
    }

    const currentBayPrefix = `${currentSelectedAisle}-${currentSelectedBay}-`;
    const bayAllItems = globalInventoryData.filter(i => (i.location || '').toUpperCase().startsWith(currentBayPrefix));

    if (infoText) infoText.textContent = `พิกัด แถว ${currentSelectedAisle} / ล็อก ${currentSelectedBay} (${bayAllItems.length} เครื่อง)`;

    const slotMap = {};
    bayAllItems.forEach(item => {
        const loc = (item.location || currentBayPrefix).toUpperCase();
        if(!slotMap[loc]) slotMap[loc] = [];
        slotMap[loc].push(item);
    });

    const activeKeys = Object.keys(slotMap);

    if(activeKeys.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">ไม่มีสินค้าจัดเก็บในแถว ${currentSelectedAisle} / ล็อก ${currentSelectedBay} (ยอดคงเหลือ 0 เครื่อง)</div>`;
        return;
    }

    activeKeys.sort().forEach(locKey => {
        renderSlotCard(container, locKey, slotMap[locKey]);
    });
}

function renderSlotCard(container, slotTitle, items, isDockFull = false) {
    const card = document.createElement('div');
    card.className = 'slot-card';
    if(isDockFull) card.style.gridColumn = "1 / -1";

    let rowsHtml = items.map(item => `
        <div style="background:var(--bg-subtle); padding:8px 10px; border-radius:6px; margin-bottom:6px; border:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                <span class="mono font-bold" style="color:var(--primary-text); font-size:0.92rem;">S/N: ${escapeHTML(item.sn)}</span>
                <div style="display:flex; gap:4px;">
                    <button class="btn btn-sm btn-primary" style="padding:2px 6px;" onclick="openPrintBarcodeModal('SINGLE', '${escapeHTML(item.sn)}')" title="พิมพ์สติ๊กเกอร์"><i class="fa-solid fa-print"></i></button>
                    <button class="btn btn-sm btn-secondary" style="padding:2px 6px;" onclick="openEditItemModal('${item.id}', '${escapeHTML(item.sn)}')" title="แก้ไขข้อมูล"><i class="fa-solid fa-pen-to-square" style="color:var(--primary);"></i></button>
                    <button class="btn btn-sm btn-secondary" style="padding:2px 6px;" onclick="requestRelocateModal('${item.id}', '${escapeHTML(item.sn)}', '${escapeHTML(item.name)}', '${escapeHTML(item.location)}')" title="ย้าย"><i class="fa-solid fa-right-left"></i></button>
                    <button class="btn btn-sm btn-danger" style="padding:2px 6px;" onclick="requestDeleteModal('SINGLE', '${escapeHTML(item.sn)}', '${item.id}')" title="ลบออก"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>

            <div class="text-multiline-truncate" style="font-size:0.8rem; color:var(--text-sub); font-weight:600; margin-bottom:2px;" title="${escapeHTML(item.name || '-')}">
                <span class="mono" style="color:var(--text-muted);">[${escapeHTML(item.category || 'N/A')}]</span> ${escapeHTML(item.name || '-')}
            </div>

            <div style="font-size:0.82rem; color:var(--warning); font-weight:700;">
                <i class="fa-solid fa-gauge"></i> เลขมิเตอร์: ${Number(item.meter || 0).toLocaleString()}
            </div>
        </div>
    `).join('');

    card.innerHTML = `
        <div class="slot-card-header">
            <strong class="mono" style="font-size:0.92rem; color:var(--text-main);">📍 ${escapeHTML(formatLocationCode(slotTitle))}</strong>
            <span class="mono" style="font-size:0.78rem; font-weight:700; color:var(--success); background:var(--bg-subtle); padding:2px 8px; border-radius:4px;">
                ${items.length} เครื่อง
            </span>
        </div>
        <div style="${isDockFull ? 'max-height:550px; display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:8px;' : 'max-height:280px;'} overflow-y:auto;">${rowsHtml}</div>
    `;
    container.appendChild(card);
}

function refreshLocationVisualizerIfActive() {
    const locSec = document.getElementById('view-locations');
    if(locSec && locSec.classList.contains('active')) {
        renderDrillDownAisleBar();
        renderDrillDownBaysGrid();
        renderDrillDownSlotsGrid();
    }
}