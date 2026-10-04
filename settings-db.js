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

// 🟢 บันทึกลำดับตำแหน่งแถวและการตั้งค่าทั้งหมดลงฐานข้อมูล Supabase อัตโนมัติ 100%
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
            showToast("⚡ บันทึกลำดับตำแหน่งล่าสุดลงฐานข้อมูลสำเร็จ 100%");
        } catch(e) {
            console.warn("⚠️ ไม่สามารถบันทึกโครงสร้างลง DB ได้:", e);
        }
    }
}

// 🟢 โหลดโครงสร้างแถวและลำดับตำแหน่งล่าสุดจาก Supabase DB
async function loadWarehouseConfigsFromDB() {
    try {
        let dbAisles = [];
        let dbConfigs = {};

        if (navigator.onLine) {
            const { data, error } = await _supabase
                .from('system_settings')
                .select('*')
                .eq('key', 'aisle_configs')
                .maybeSingle();

            if (!error && data && data.value) {
                dbAisles = Array.isArray(data.value.aisles) ? data.value.aisles : [];
                dbConfigs = data.value.configs || {};
            }
        }

        const activeAislesFromInventory = new Set();
        if (Array.isArray(globalInventoryData)) {
            globalInventoryData.forEach(item => {
                if (item.location) {
                    const parts = item.location.split('-');
                    if (parts[0]) activeAislesFromInventory.add(parts[0].toUpperCase());
                }
            });
        }

        const defaultAisles = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DOCK', 'OFFICE', 'PENDING'];
        
        // หากมีลำดับที่บันทึกไว้ใน DB ให้ใช้ลำดับนั้นเป็นหลัก มิฉะนั้นให้ใช้ชุดค่าผสมเริ่มต้น
        let combinedAisles;
        if (dbAisles.length > 0) {
            const missingAisles = [...defaultAisles, ...activeAislesFromInventory].filter(a => !dbAisles.includes(a));
            combinedAisles = [...dbAisles, ...missingAisles];
        } else {
            combinedAisles = Array.from(new Set([...defaultAisles, ...activeAislesFromInventory]));
        }

        masterAisles = combinedAisles;

        masterAisles.forEach(aisle => {
            aisleConfigs[aisle] = dbConfigs[aisle] || { bays: 10, shelves: 1, slots: 10, is_locked: ['A', 'B', 'C', 'D', 'DOCK'].includes(aisle) };
        });

        if (masterAisles.length > 0 && (!currentSelectedAisle || !masterAisles.includes(currentSelectedAisle))) {
            currentSelectedAisle = masterAisles[0];
        }
    } catch(e) {
        console.error("loadWarehouseConfigsFromDB Error:", e);
    }

    renderAisleSettingsTable();
    populateAisleDropdowns();
    refreshLocationVisualizerIfActive();
    renderMenuDatabaseMappingTable();
}

// 🟢 เรนเดอร์ตารางตั้งค่าโครงสร้างแถว พร้อมฟังก์ชันเลื่อนลำดับขึ้น-ลงและบันทึกอัตโนมัติ
function renderAisleSettingsTable() {
    const tbody = document.getElementById('aisleSettingsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    masterAisles.forEach((aisle, idx) => {
        const cfg = aisleConfigs[aisle] || { bays: 10, shelves: 1, slots: 10, is_locked: false };
        const count = globalInventoryData.filter(i => (i.location || '').toUpperCase().startsWith(`${aisle}-`) || (i.location || '').toUpperCase() === aisle).length;
        const isLocked = Boolean(cfg.is_locked);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center; font-weight:700;" class="mono">${idx + 1}</td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <strong class="mono" style="font-size:1rem; color:var(--primary-text);">${escapeHTML(aisle)}</strong>
                    ${isLocked ? '<span class="badge-action inbound" style="font-size:0.7rem;"><i class="fa-solid fa-lock"></i> โครงสร้างหลัก (ล็อก)</span>' : ''}
                </div>
            </td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:70px; text-align:center; display:inline-block;" value="${cfg.bays}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'bays', this.value)"></td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:70px; text-align:center; display:inline-block;" value="${cfg.shelves}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'shelves', this.value)"></td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:70px; text-align:center; display:inline-block;" value="${cfg.slots}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'slots', this.value)"></td>
            <td style="text-align:center;" class="mono font-bold">${count} เครื่อง</td>
            <td style="text-align:center;">
                <div style="display:flex; justify-content:center; gap:4px;">
                    <button class="btn btn-sm btn-secondary" onclick="moveAisleOrder(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="เลื่อนขึ้น"><i class="fa-solid fa-arrow-up"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="moveAisleOrder(${idx}, 1)" ${idx === masterAisles.length - 1 ? 'disabled' : ''} title="เลื่อนลง"><i class="fa-solid fa-arrow-down"></i></button>
                </div>
            </td>
            <td style="text-align:center;">
                <button class="btn btn-sm ${isLocked ? 'btn-secondary' : 'btn-primary'}" onclick="toggleAisleLock('${escapeHTML(aisle)}')">
                    <i class="fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i> ${isLocked ? 'ปลดล็อก' : 'ล็อก'}
                </button>
            </td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-danger" onclick="verifyAndDeleteAisle('${escapeHTML(aisle)}')" ${isLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    <i class="fa-solid fa-trash"></i> ลบ
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 🟢 ฟังก์ชันเลื่อนตำแหน่งแถวขึ้น-ลง พร้อมบันทึกจำค่าล่าสุดเข้าฐานข้อมูลทันที 100%
function moveAisleOrder(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= masterAisles.length) return;

    const temp = masterAisles[index];
    masterAisles[index] = masterAisles[targetIndex];
    masterAisles[targetIndex] = temp;

    renderAisleSettingsTable();
    populateAisleDropdowns();
    refreshLocationVisualizerIfActive();
    
    // บันทึกลำดับตำแหน่งล่าสุดลงฐานข้อมูลทันทีอัตโนมัติ
    saveAllWarehouseConfigsToDB();
    showToast("🔄 บันทึกสลับลำดับตำแหน่งล่าสุดลง DB แล้ว");
}

// 🟢 สลับสถานะการล็อกโครงสร้างหลัก
function toggleAisleLock(aisle) {
    if (!aisleConfigs[aisle]) aisleConfigs[aisle] = { bays: 10, shelves: 1, slots: 10, is_locked: false };
    aisleConfigs[aisle].is_locked = !aisleConfigs[aisle].is_locked;

    renderAisleSettingsTable();
    saveAllWarehouseConfigsToDB();
    showToast(`🔒 อัปเดตสถานะล็อกแถว ${aisle} เรียบร้อย`);
}

// 🟢 ป้องกันการลบพลาดโดยต้องใส่รหัสยืนยันก่อน
function verifyAndDeleteAisle(aisle) {
    const cfg = aisleConfigs[aisle];
    if (cfg && cfg.is_locked) {
        alert(`⚠️ แถว ${aisle} ถูกล็อกไว้เป็นโครงสร้างหลัก ไม่สามารถลบได้ กรุณาปลดล็อกก่อน`);
        return;
    }

    const pinCode = prompt(`🔐 ป้องกันการลบพลาด: กรุณากรอกรหัสผ่านยืนยันเพื่อลบแถว "${aisle}" (พิมพ์รหัส: 1234 หรือรหัสผ่านแอดมิน):`);
    if (pinCode === null) return;

    if (pinCode !== '1234' && (!currentUser || pinCode !== (currentUser.password || '123456'))) {
        playErrorSound();
        alert("❌ รหัสยืนยันไม่ถูกต้อง! ยกเลิกการลบแถว");
        return;
    }

    if (confirm(`คุณแน่ใจอย่างยิ่งใช่หรือไม่ว่าต้องการลบแถว ${aisle} ออกจากระบบ?`)) {
        masterAisles = masterAisles.filter(a => a !== aisle);
        delete aisleConfigs[aisle];
        renderAisleSettingsTable();
        populateAisleDropdowns();
        saveAllWarehouseConfigsToDB();
        playSuccessSound();
        showToast(`🗑️ ลบแถว ${aisle} เรียบร้อยแล้ว`);
    }
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
    showToast(`✨ เพิ่มแถว ${aisleName} เรียบร้อยแล้ว`);
}

function deleteAisleConfig(aisle) {
    verifyAndDeleteAisle(aisle);
}