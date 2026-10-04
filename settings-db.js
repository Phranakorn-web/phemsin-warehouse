// =========================================================================
// --- MODULE 8: WAREHOUSE SETTINGS & MENU DB MAPPING ENGINE ---
// =========================================================================

let aisleConfigs = {};
let masterAisles = [];

const MENU_DATABASE_MAPPING = [
    { menuId: 'view-inventory', menuTitle: 'เช็คสต็อกสินค้า', dbTable: 'warehouse_items / products', status: 'Active (Realtime)', desc: 'อ่าน/ค้นหา สต็อกทั้งหมด และค้นหารหัสสินค้า Master' },
    { menuId: 'view-inbound', menuTitle: 'รับสินค้าเข้าคลัง (Fast)', dbTable: 'warehouse_items', status: 'Active (Realtime Insert)', desc: 'เพิ่มรายการ S/N สินค้าเข้าฐานข้อมูลโดยตรง' },
    { menuId: 'view-outbound', menuTitle: 'จ่ายสินค้าออกจากคลัง', dbTable: 'outbound_orders / warehouse_items', status: 'Active (Realtime Sync)', desc: 'ตัดจ่าย S/N ออกจากคลัง และสร้างใบสั่งจ่าย' },
    { menuId: 'view-locations', menuTitle: 'ผังตำแหน่งคลังสินค้า', dbTable: 'warehouse_items / system_settings', status: 'Active (Drill-Down)', desc: 'แสดงตำแหน่งจัดเก็บจริงตามโครงสร้างแถวและล็อก' },
    { menuId: 'view-approvals', menuTitle: 'ศูนย์อนุมัติคำขอ', dbTable: 'approval_requests', status: 'Active (Realtime Approvals)', desc: 'จัดการอนุมัติ/ปฏิเสธคำขอลบและจ่ายสินค้าจาก User' },
    { menuId: 'view-activities', menuTitle: 'ดูประวัติการใช้งาน', dbTable: 'user_activities', status: 'Active (Realtime Logging)', desc: 'เก็บบันทึกและแสดงผลประวัติกิจกรรมผู้ใช้งานทั้งหมด' },
    { menuId: 'view-settings', menuTitle: 'ตั้งค่าพิกัดคลังสินค้า', dbTable: 'system_settings / profiles', status: 'Active (System Config)', desc: 'บันทึกโครงสร้างคลัง จัดการสิทธิ์ผู้ใช้ และตรวจสอบ DB Connection' }
];

async function saveAllWarehouseConfigsToDB() {
    const payload = {
        key: 'aisle_configs',
        value: { aisles: masterAisles, configs: aisleConfigs },
        updated_at: new Date().toISOString()
    };

    localStorage.setItem('WMS_AISLE_CONFIGS', JSON.stringify(payload.value));

    if (navigator.onLine) {
        try {
            await _supabase.from('system_settings').upsert(payload, { onConflict: 'key' });
            showToast("⚡ บันทึกลำดับและโครงสร้างแถวลง DB สำเร็จ 100%");
        } catch(e) {}
    }
}

async function loadWarehouseConfigsFromDB() {
    try {
        let dbAisles = [];
        let dbConfigs = {};

        if (navigator.onLine) {
            const { data } = await _supabase
                .from('system_settings')
                .select('*')
                .eq('key', 'aisle_configs')
                .maybeSingle();

            if (data && data.value) {
                dbAisles = Array.isArray(data.value.aisles) ? data.value.aisles : [];
                dbConfigs = data.value.configs || {};
            }
        }

        const finalMasterAisles = [...dbAisles];
        masterAisles = finalMasterAisles.length > 0 ? finalMasterAisles : ['A', 'B', 'C', 'D', 'DOCK'];
        
        masterAisles.forEach(aisle => {
            aisleConfigs[aisle] = dbConfigs[aisle] || { bays: 10, shelves: 1, slots: 10, is_locked: false };
        });

        if (masterAisles.length > 0 && (!currentSelectedAisle || !masterAisles.includes(currentSelectedAisle))) {
            currentSelectedAisle = masterAisles[0];
        }
    } catch(e) {}

    renderAisleSettingsTable();
    populateAisleDropdowns();
    refreshLocationVisualizerIfActive();
    renderMenuDatabaseMappingTable();
}

function renderAisleSettingsTable() {
    const tbody = document.getElementById('aisleSettingsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    masterAisles.forEach((aisle, idx) => {
        const cfg = aisleConfigs[aisle] || { bays: 10, shelves: 1, slots: 10, is_locked: false };
        const count = globalInventoryData.filter(i => (i.location || '').toUpperCase().startsWith(`${aisle}-`) || (i.location || '').toUpperCase() === aisle).length;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center; font-weight:700;" class="mono">${idx + 1}</td>
            <td><strong class="mono" style="font-size:1rem; color:var(--primary-text);">${escapeHTML(aisle)}</strong></td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:80px; text-align:center; display:inline-block;" value="${cfg.bays}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'bays', this.value)"></td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:80px; text-align:center; display:inline-block;" value="${cfg.shelves}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'shelves', this.value)"></td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:80px; text-align:center; display:inline-block;" value="${cfg.slots}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'slots', this.value)"></td>
            <td style="text-align:center;" class="mono font-bold">${count} เครื่อง</td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-danger" onclick="deleteAisleConfig('${escapeHTML(aisle)}')"><i class="fa-solid fa-trash"></i> ลบ</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMenuDatabaseMappingTable() {
    const tbody = document.getElementById('menuDbMappingTableBody');
    if (!tbody) return;

    let html = '';
    MENU_DATABASE_MAPPING.forEach((item, idx) => {
        html += `
            <tr>
                <td style="text-align:center;" class="mono">${idx + 1}</td>
                <td><strong>${escapeHTML(item.menuTitle)}</strong></td>
                <td><code class="mono font-bold" style="color:var(--primary-text);">${escapeHTML(item.dbTable)}</code></td>
                <td><span class="badge-action inbound"><i class="fa-solid fa-circle-dot"></i> ${escapeHTML(item.status)}</span></td>
                <td style="font-size:0.84rem; color:var(--text-sub);">${escapeHTML(item.desc)}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function updateAisleParam(aisle, key, val) {
    if(!aisleConfigs[aisle]) aisleConfigs[aisle] = { bays:10, shelves:1, slots:10, is_locked:false };
    aisleConfigs[aisle][key] = parseInt(val) || 1;
    saveAllWarehouseConfigsToDB();
}

function addNewAisleConfig() {
    const input = document.getElementById('newAisleInput');
    if (!input) return;

    const aisleName = input.value.trim().toUpperCase();
    if (!aisleName || masterAisles.includes(aisleName)) return;

    masterAisles.push(aisleName);
    aisleConfigs[aisleName] = { bays: 10, shelves: 1, slots: 10, is_locked: false };
    input.value = '';

    renderAisleSettingsTable();
    populateAisleDropdowns();
    refreshLocationVisualizerIfActive();
    saveAllWarehouseConfigsToDB();
}

function deleteAisleConfig(aisle) {
    if (confirm(`แน่ใจหรือไม่ที่จะลบแถว ${aisle}?`)) {
        masterAisles = masterAisles.filter(a => a !== aisle);
        delete aisleConfigs[aisle];
        renderAisleSettingsTable();
        populateAisleDropdowns();
        saveAllWarehouseConfigsToDB();
    }
}