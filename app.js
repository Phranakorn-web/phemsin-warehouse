// =========================================================================
// --- WMS Enterprise Suite v2026 Ultimate Engine (Full Uncut Code) ---
// =========================================================================

function initThemeSystem() {
    const savedTheme = localStorage.getItem('WMS_THEME_MODE') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);
}

function toggleAppTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = (currentTheme === 'light') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('WMS_THEME_MODE', nextTheme);
    updateThemeToggleUI(nextTheme);
    showToast(`🎨 เปลี่ยนธีมเป็น: ${nextTheme === 'light' ? 'โหมดสว่าง' : 'โหมดมืด'}`);
}

function updateThemeToggleUI(theme) {
    const textElem = document.getElementById('themeToggleText');
    const sunIcon = document.getElementById('themeIconSun');
    const moonIcon = document.getElementById('themeIconMoon');

    if (theme === 'light') {
        if (textElem) textElem.textContent = 'โหมดสว่าง';
        if (sunIcon) sunIcon.style.display = 'inline-block';
        if (moonIcon) moonIcon.style.display = 'none';
    } else {
        if (textElem) textElem.textContent = 'โหมดมืด';
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'inline-block';
    }
}

// --- VOICE CONTROL ENGINE WITH SUPABASE SETTINGS SYNC ---
let isVoiceAlertEnabled = true;
let voiceSettings = {
    inboundVoice: false,
    deleteVoice: false
};

function toggleVoiceAudioAlert() {
    isVoiceAlertEnabled = !isVoiceAlertEnabled;
    const btn = document.getElementById('voiceToggleBtn');
    if (isVoiceAlertEnabled) {
        btn.innerHTML = `<i class="fa-solid fa-volume-high" style="color:var(--success);"></i> AI Voice On`;
        speakThaiText("เปิดระบบเสียงอ่านตอบรับเรียบร้อยค่ะ");
    } else {
        btn.innerHTML = `<i class="fa-solid fa-volume-xmark" style="color:var(--danger);"></i> AI Voice Off`;
    }
}

function speakThaiText(text) {
    if (!isVoiceAlertEnabled || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    } catch(e) {
        console.log('Voice synthesis error:', e);
    }
}

async function loadVoiceSettingsFromDB() {
    try {
        const { data, error } = await _supabase
            .from('system_settings')
            .select('*')
            .eq('key', 'voice_config')
            .maybeSingle();

        if (data && data.value) {
            voiceSettings = data.value;
            const toggleInbound = document.getElementById('voiceToggleInbound');
            const toggleDelete = document.getElementById('voiceToggleDelete');
            if (toggleInbound) toggleInbound.checked = !!voiceSettings.inboundVoice;
            if (toggleDelete) toggleDelete.checked = !!voiceSettings.deleteVoice;
        }
    } catch (e) {
        console.warn('Voice config load warning:', e);
    }
}

async function saveVoiceSettingsToDB() {
    if (!currentUser || currentUser.role !== 'admin') return;

    const toggleInbound = document.getElementById('voiceToggleInbound');
    const toggleDelete = document.getElementById('voiceToggleDelete');

    voiceSettings.inboundVoice = toggleInbound ? toggleInbound.checked : false;
    voiceSettings.deleteVoice = toggleDelete ? toggleDelete.checked : false;

    try {
        const payload = {
            key: 'voice_config',
            value: voiceSettings,
            updated_at: new Date().toISOString()
        };
        await _supabase.from('system_settings').upsert(payload, { onConflict: 'key' });
        showToast("⚡ บันทึกการตั้งค่าเสียงบรรยายลง DB สำเร็จ");
    } catch (e) {
        console.error("Save voice settings error:", e);
    }
}

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const SUPABASE_URL = 'https://eusuehaqgwkcgowsgyco.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ww-mPdyom_i6S4XhfAFj9Q_vFBpTuaE';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

async function logUserActivity(actionType, description, targetSn = null) {
    if (!currentUser) return;

    const payload = {
        username: currentUser.username,
        full_name: currentUser.name || currentUser.username,
        role: currentUser.role || 'user',
        action_type: actionType,
        description: description,
        target_sn: targetSn,
        created_at: new Date().toISOString()
    };

    try {
        await _supabase.from('user_activities').insert([payload]);
    } catch(e) {
        console.error('Activity logging exception:', e);
    }
}

const DEFAULT_USERS = [
    { id: 1, username: 'admin', password: '123456', name: 'Super Admin (ผู้ดูแลระบบ)', department: 'ฝ่ายบริหาร IT', role: 'admin' },
    { id: 2, username: 'user1', password: '123456', name: 'นายสมชาย ใจดี', department: 'แผนกคลังสินค้า', role: 'user' }
];

let systemUsers = [];
let globalActivityLogs = [];
let currentInspectedUserLogs = [];
let currentInspectedUser = null;
let currentUser = null;
let isAdminAuthenticatedSession = false;
let loginFailedAttempts = 0;

let pendingApprovalCallback = null;

const AUTO_LOGOUT_TIMEOUT_MS = 15 * 60 * 1000;
let autoLogoutTimer = null;

function resetAutoLogoutTimer() {
    if (!currentUser) return;
    clearTimeout(autoLogoutTimer);
    autoLogoutTimer = setTimeout(() => {
        handleSystemLogout("⏳ คุณไม่ได้ใช้งานเว็บไซต์นานเกิน 15 นาที ระบบจึงออกจากระบบอัตโนมัติ");
    }, AUTO_LOGOUT_TIMEOUT_MS);
}

function initSecurityListeners() {
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(evt => {
        document.addEventListener(evt, resetAutoLogoutTimer, false);
    });
}

async function loadUsersFromDB() {
    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
            systemUsers = data.map(u => ({
                id: u.id,
                username: u.username,
                password: u.password || '123456',
                name: u.full_name || u.name || u.username,
                department: u.department || 'แผนกคลังสินค้า',
                role: u.role || 'user'
            }));
            localStorage.setItem('WMS_USERS', JSON.stringify(systemUsers));
        } else {
            const savedUsers = localStorage.getItem('WMS_USERS');
            systemUsers = savedUsers ? JSON.parse(savedUsers) : [...DEFAULT_USERS];
        }
    } catch(e) {
        const savedUsers = localStorage.getItem('WMS_USERS');
        systemUsers = savedUsers ? JSON.parse(savedUsers) : [...DEFAULT_USERS];
    }

    renderUserManagementTable();
    populateLogUserDropdown();
}

async function initAuthSystem() {
    await loadUsersFromDB();
    await loadVoiceSettingsFromDB();

    const activeSession = sessionStorage.getItem('WMS_ACTIVE_USER');
    if (activeSession) {
        try {
            currentUser = JSON.parse(activeSession);
            const matchedUser = systemUsers.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
            if(matchedUser) currentUser = matchedUser;

            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('currentUserNameText').textContent = escapeHTML(`${currentUser.name} (${currentUser.username})`);
            resetAutoLogoutTimer();
            initSecurityListeners();
        } catch(e) {
            forceShowLoginOverlay();
        }
    } else {
        forceShowLoginOverlay();
    }
}

function forceShowLoginOverlay() {
    currentUser = null;
    isAdminAuthenticatedSession = false;
    sessionStorage.removeItem('WMS_ACTIVE_USER');
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('loginUsername').focus();
}

async function handleSystemLogin(e) {
    e.preventDefault();
    
    if (loginFailedAttempts >= 5) {
        document.getElementById('loginErrorMsg').textContent = '⚠️ พิมพ์ผิดเกินกำหนด กรุณารอ 30 วินาที!';
        document.getElementById('loginErrorAlert').style.display = 'block';
        return;
    }

    const uInput = document.getElementById('loginUsername').value.trim();
    const pInput = document.getElementById('loginPassword').value.trim();

    showToast("⏳ กำลังตรวจสอบสิทธิ์จาก DB...");

    let foundUser = null;
    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .ilike('username', uInput)
            .eq('password', pInput)
            .maybeSingle();

        if (!error && data) {
            foundUser = {
                id: data.id,
                username: data.username,
                password: data.password,
                name: data.full_name || data.name || data.username,
                department: data.department || 'แผนกคลังสินค้า',
                role: data.role || 'user'
            };
        }
    } catch(e) {}

    if(!foundUser) {
        foundUser = systemUsers.find(u => u.username.toLowerCase() === uInput.toLowerCase() && u.password === pInput);
    }

    if (foundUser) {
        loginFailedAttempts = 0;
        currentUser = foundUser;
        sessionStorage.setItem('WMS_ACTIVE_USER', JSON.stringify(currentUser));
        
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('loginErrorAlert').style.display = 'none';
        document.getElementById('currentUserNameText').textContent = escapeHTML(`${currentUser.name} (${currentUser.username})`);
        
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';

        resetAutoLogoutTimer();
        initSecurityListeners();
        playSuccessSound();
        
        speakThaiText(`ยินดีต้อนรับ คุณ ${currentUser.name}`);
        showToast(`🎉 ยืนยันสิทธิ์สำเร็จ! ยินดีต้อนรับคุณ ${escapeHTML(currentUser.name)}`);

        await logUserActivity('AUTH', `เข้าสู่ระบบสำเร็จ`);
    } else {
        loginFailedAttempts++;
        playErrorSound();
        if (loginFailedAttempts >= 5) {
            document.getElementById('loginSubmitBtn').disabled = true;
            document.getElementById('loginErrorMsg').textContent = '🚨 กรอกรหัสผิด 5 ครั้ง! ระงับชั่วคราว 30 วินาที';
            document.getElementById('loginErrorAlert').style.display = 'block';
            setTimeout(() => {
                loginFailedAttempts = 0;
                document.getElementById('loginSubmitBtn').disabled = false;
                document.getElementById('loginErrorAlert').style.display = 'none';
            }, 30000);
        } else {
            document.getElementById('loginErrorMsg').textContent = `Username หรือ Password ไม่ถูกต้อง! (ลองได้อีก ${5 - loginFailedAttempts} ครั้ง)`;
            document.getElementById('loginErrorAlert').style.display = 'block';
        }
    }
}

async function handleSystemLogout(reasonMsg = null) {
    if (reasonMsg || confirm("คุณแน่ใจหรือไม่ที่จะออกจากระบบ?")) {
        if (currentUser) {
            await logUserActivity('AUTH', `ออกจากระบบ ${reasonMsg ? '(Auto Timeout)' : ''}`);
        }
        sessionStorage.removeItem('WMS_ACTIVE_USER');
        currentUser = null;
        isAdminAuthenticatedSession = false;
        clearTimeout(autoLogoutTimer);
        if (reasonMsg) alert(reasonMsg);
        location.reload();
    }
}

// ADMIN FORCE LOGOUT SPECIFIC USER
async function adminForceLogoutUser(username) {
    requireAdminApproval(`บังคับเตะผู้ใช้ ${username} ออกจากระบบ`, async () => {
        await logUserActivity('AUTH', `Admin บังคับให้ผู้ใช้ ${username} ออกจากระบบเพื่อเข้ารหัสใหม่`, username);
        showToast(`🔒 สั่งให้ผู้ใช้ ${username} ออกจากระบบเรียบร้อยแล้ว`);
        await loadUsersFromDB();
    });
}

function requireAdminApproval(actionDesc, onApprovedCallback) {
    if (currentUser && currentUser.role === 'admin') {
        onApprovedCallback();
        return;
    }

    pendingApprovalCallback = onApprovedCallback;
    document.getElementById('approvalActionText').textContent = actionDesc;
    document.getElementById('adminApprovalPasswordInput').value = '';
    document.getElementById('adminApprovalModal').style.display = 'flex';
    document.getElementById('adminApprovalPasswordInput').focus();
}

function closeAdminApprovalModal() {
    document.getElementById('adminApprovalModal').style.display = 'none';
    pendingApprovalCallback = null;
}

function verifyAdminApprovalPassword(e) {
    e.preventDefault();
    const inputPass = document.getElementById('adminApprovalPasswordInput').value;

    const adminUser = systemUsers.find(u => u.role === 'admin' && u.password === inputPass);

    if (adminUser) {
        playSuccessSound();
        showToast(`🔓 อนุมัติการทำรายการโดย Admin: ${escapeHTML(adminUser.name)}`);
        closeAdminApprovalModal();
        if (typeof pendingApprovalCallback === 'function') {
            pendingApprovalCallback();
        }
    } else {
        playErrorSound();
        alert("❌ รหัสผ่านผู้ดูแลระบบ (Admin) ไม่ถูกต้อง!");
        document.getElementById('adminApprovalPasswordInput').value = '';
        document.getElementById('adminApprovalPasswordInput').focus();
    }
}

let globalInventoryData = [];
let globalMasterProducts = [];
let recentInboundList = [];
let recentOutboundOrders = [];
let outboundCartItems = [];
let occupiedLocationsSet = new Set();

let pendingDeleteMode = null;
let pendingDeleteSn = null;
let pendingDeleteId = null;

const defaultMasterAisles = ['DOCK', 'A', 'B', 'C', 'D'];
let aisleConfigs = {
    'DOCK': { bays: 1, shelves: 1, slots: 1 },
    'A': { bays: 10, shelves: 1, slots: 10 },
    'B': { bays: 10, shelves: 1, slots: 10 },
    'C': { bays: 10, shelves: 1, slots: 10 },
    'D': { bays: 10, shelves: 1, slots: 10 }
};
let masterAisles = [...defaultMasterAisles];

let selectedItemSnSet = new Set();

let currentSelectedAisle = 'A';
let currentSelectedBay = '01';

// LATEST TAB ORDER: เช็คสต็อก, รับสินค้า, จ่ายสินค้า, ตำแหน่ง, ดูประวัติ, ตั้งค่าพิกัด
let menuConfig = [
    { id: 'view-inventory', label: 'เช็คสต็อกสินค้า', icon: 'fa-list-check' },
    { id: 'view-inbound', label: 'รับสินค้าเข้าคลัง (Fast)', icon: 'fa-arrow-right-to-bracket' },
    { id: 'view-outbound', label: 'จ่ายสินค้าออกจากคลัง', icon: 'fa-truck-arrow-right' },
    { id: 'view-locations', label: 'ผังตำแหน่งคลังสินค้า (Drill-Down)', icon: 'fa-map-location-dot' },
    { id: 'view-activities', label: 'ดูประวัติการใช้งาน (User Logs)', icon: 'fa-clock-rotate-left' },
    { id: 'view-settings', label: 'ตั้งค่าพิกัดคลังสินค้า', icon: 'fa-gears' }
];

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSuccessSound() {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1760, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.1);
    } catch (e) {}
}

function playErrorSound() {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', async () => {
    initThemeSystem();
    await initAuthSystem();
    renderSidebarMenu();
    await loadWarehouseConfigsFromDB();
    await loadDataFromDatabase();
    await loadOutboundHistoryFromDB();
    initRealtimeSubscription();
    populateAisleDropdowns();
    onInboundAisleOrBayChange();
});

function renderSidebarMenu() {
    const list = document.getElementById('sidebarMenuList');
    list.innerHTML = '';
    
    menuConfig.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'menu-item';
        li.innerHTML = `
            <button class="${idx === 0 ? 'active' : ''}" onclick="switchView('${escapeHTML(item.id)}')">
                <i class="fa-solid ${escapeHTML(item.icon)}"></i> ${escapeHTML(item.label)}
            </button>
        `;
        list.appendChild(li);
    });
}

// MOVE AISLE POSITION UP / DOWN
function moveAisleOrder(index, direction) {
    if (direction === 'UP' && index > 0) {
        const temp = masterAisles[index];
        masterAisles[index] = masterAisles[index - 1];
        masterAisles[index - 1] = temp;
    } else if (direction === 'DOWN' && index < masterAisles.length - 1) {
        const temp = masterAisles[index];
        masterAisles[index] = masterAisles[index + 1];
        masterAisles[index + 1] = temp;
    }
    renderAisleSettingsTable();
    populateAisleDropdowns();
    saveAllWarehouseConfigsToDB();
}

function switchView(viewId) {
    if (viewId === 'view-settings' || viewId === 'view-activities') {
        if (!currentUser || currentUser.role !== 'admin') {
            playErrorSound();
            alert("⛔ ปฏิเสธการเข้าถึง: หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น!");
            return;
        }

        if (!isAdminAuthenticatedSession) {
            document.getElementById('adminGuardAccountName').textContent = escapeHTML(`${currentUser.name} (${currentUser.username})`);
            document.getElementById('adminGuardModal').style.display = 'flex';
            document.getElementById('adminGuardPasswordInput').value = '';
            document.getElementById('adminGuardPasswordInput').focus();
            return;
        }
    }
    executeSwitchView(viewId);
}

function verifyAdminGuardPassword(e) {
    e.preventDefault();
    const pass = document.getElementById('adminGuardPasswordInput').value;
    if (currentUser && currentUser.password === pass) {
        isAdminAuthenticatedSession = true;
        closeAdminGuardModal();
        showToast("🔓 ยืนยันสิทธิ์ผู้ดูแลระบบสำเร็จ");
        executeSwitchView(document.querySelector('.menu-item button.active').getAttribute('onclick').match(/'([^']+)'/)[1] || 'view-settings');
    } else {
        playErrorSound();
        alert("❌ รหัสผ่านไม่ถูกต้อง!");
    }
}

function closeAdminGuardModal() {
    document.getElementById('adminGuardModal').style.display = 'none';
}

async function executeSwitchView(viewId) {
    document.querySelectorAll('.menu-item button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.menu-item button')).find(b => b.getAttribute('onclick').includes(viewId));
    if(activeBtn) activeBtn.classList.add('active');

    document.getElementById(viewId).classList.add('active');

    const itemConfig = menuConfig.find(m => m.id === viewId);
    if(itemConfig) {
        document.getElementById('navTitleText').innerHTML = `<i class="fa-solid ${escapeHTML(itemConfig.icon)}" style="color:var(--primary);"></i> ${escapeHTML(itemConfig.label)}`;
        await logUserActivity('NAVIGATION', `กดเข้าดูหน้าเมนู: ${itemConfig.label}`);
    }

    if(viewId === 'view-locations') {
        renderDrillDownAisleBar();
        renderDrillDownBaysGrid();
        renderDrillDownSlotsGrid();
    } else if(viewId === 'view-activities') {
        loadUserActivityLogsFromDB();
    } else if(viewId === 'view-settings') {
        renderAisleSettingsTable();
        renderUserManagementTable();
    }
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toastAlert');
    document.getElementById('toastMessage').textContent = msg;
    if(isError) toast.classList.add('error');
    else toast.classList.remove('error');
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// FETCH ALL WAREHOUSE ITEMS WITH PAGINATION (SUPPORT 2,000+ ITEMS)
async function fetchAllWarehouseItems() {
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
    return allData;
}

// FETCH ALL MASTER PRODUCTS WITH PAGINATION (>1,000 & 2,000+ ITEMS)
async function loadMasterProductsFromDB() {
    try {
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
        } else {
            // Fallback from warehouse_items
            const productMap = new Map();
            globalInventoryData.forEach(item => {
                if (item.category && !productMap.has(item.category)) {
                    productMap.set(item.category, { sku: item.category, name: item.name });
                }
            });
            globalMasterProducts = Array.from(productMap.values());
        }

        document.getElementById('inboundMasterProductsStatText').textContent = `ดึงข้อมูล Master SKU ทั้งหมด ${globalMasterProducts.length.toLocaleString()} รายการ`;
    } catch(e) {
        console.warn('Master products load error:', e);
    }
}

async function loadDataFromDatabase() {
    const statusText = document.getElementById('dbStatusText');
    try {
        statusText.textContent = "กำลังซิงค์ DB (100%)...";
        globalInventoryData = await fetchAllWarehouseItems();
        
        globalInventoryData.forEach(item => {
            if (item.meter === undefined || item.meter === null || item.meter === '') {
                item.meter = 0;
            }
        });

        await loadMasterProductsFromDB();

        statusText.textContent = `DB Online (สต็อก: ${globalInventoryData.length.toLocaleString()})`;

        rebuildOccupiedSet();
        filterInventoryData();
        updateKPIs();
        refreshLocationVisualizerIfActive();
    } catch (err) {
        console.error('Database Sync Error:', err);
        statusText.textContent = "เชื่อมต่อ DB ไม่สำเร็จ";
    }
}

function rebuildOccupiedSet() {
    occupiedLocationsSet.clear();
    globalInventoryData.forEach(i => {
        if(i.location && i.location.toUpperCase() !== 'DOCK') {
            occupiedLocationsSet.add(i.location.toUpperCase());
        }
    });
}

let currentFilteredItems = [];

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
            else matchAisle = (item.location || '').toUpperCase().startsWith(`${aisleFilter}-`);
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
            <td style="font-weight:600;"><div class="text-multiline-truncate" title="${escapeHTML(item.name || '-')}">${escapeHTML(item.name || '-')}</div></td>
            <td><span class="mono font-bold" style="color:var(--warning); font-size:0.92rem;"><i class="fa-solid fa-gauge"></i> ${Number(meterValue).toLocaleString()}</span></td>
            <td><code class="mono font-bold">${escapeHTML(item.sn)}</code></td>
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
        if (checked) {
            selectedItemSnSet.add(item.sn);
        } else {
            selectedItemSnSet.delete(item.sn);
        }
    });

    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
    });

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

function openEditItemModal(id, sn) {
    const item = globalInventoryData.find(i => String(i.id) === String(id) || i.sn === sn);
    if (!item) return;

    requireAdminApproval(`แก้ไขข้อมูลสินค้า S/N: ${sn}`, () => {
        document.getElementById('editItemId').value = item.id;
        document.getElementById('editItemSn').value = item.sn;
        document.getElementById('editItemCategory').value = item.category || '';
        document.getElementById('editItemName').value = item.name || '';
        document.getElementById('editItemMeter').value = item.meter !== undefined ? item.meter : 0;
        document.getElementById('editItemLocation').value = item.location || 'DOCK';
        document.getElementById('editItemModal').style.display = 'flex';
    });
}

function closeEditItemModal() {
    document.getElementById('editItemModal').style.display = 'none';
}

async function submitEditItemForm(e) {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const sn = document.getElementById('editItemSn').value;
    const category = document.getElementById('editItemCategory').value.trim();
    const name = document.getElementById('editItemName').value.trim();
    const meter = parseInt(document.getElementById('editItemMeter').value) || 0;

    showToast("⏳ กำลังบันทึกการแก้ไขลง DB...");

    const item = globalInventoryData.find(i => String(i.id) === String(id) || i.sn === sn);
    if (item) {
        item.category = category;
        item.name = name;
        item.meter = meter;
    }

    rebuildOccupiedSet();
    filterInventoryData();
    refreshLocationVisualizerIfActive();
    closeEditItemModal();

    playSuccessSound();
    showToast(`✅ แก้ไขข้อมูล S/N: ${sn} เรียบร้อยแล้ว`);

    await logUserActivity('UPDATE', `แก้ไขข้อมูลสินค้า S/N: ${sn} (มิเตอร์: ${meter})`, sn);

    if (navigator.onLine) {
        await _supabase.from('warehouse_items').update({ category: category, name: name, meter: meter }).eq('id', id);
    }
}

function requestRelocateModal(id, sn, name, currentLoc) {
    requireAdminApproval(`ย้ายพิกัดจัดเก็บ S/N: ${sn}`, () => {
        openRelocateModal(id, sn, name, currentLoc);
    });
}

function requestBatchRelocateModal() {
    if (selectedItemSnSet.size === 0) {
        alert("⚠️ กรุณาเลือกรายการสินค้าที่ต้องการย้ายอย่างน้อย 1 รายการ");
        return;
    }

    requireAdminApproval(`ย้ายพิกัดจัดเก็บเป็นกลุ่มจำนวน ${selectedItemSnSet.size} รายการ`, () => {
        openBatchRelocateModal();
    });
}

function openRelocateModal(id, sn, name, currentLoc) {
    document.getElementById('relocateItemId').value = id;
    document.getElementById('relocateItemSn').textContent = sn;
    document.getElementById('relocateItemName').textContent = name;
    document.getElementById('relocateItemCurrentLoc').textContent = formatLocationCode(currentLoc);
    document.getElementById('relocateModal').style.display = 'flex';
    populateAisleDropdowns();
    onRelocateAisleOrBayChange();
}

function closeRelocateModal() {
    document.getElementById('relocateModal').style.display = 'none';
}

async function submitRelocateLocation() {
    const id = document.getElementById('relocateItemId').value;
    const sn = document.getElementById('relocateItemSn').textContent;
    const newLoc = document.getElementById('relocatePreviewBadge').textContent;

    const item = globalInventoryData.find(i => String(i.id) === String(id) || i.sn === sn);
    if (item) {
        const oldLoc = item.location;
        item.location = newLoc;
        rebuildOccupiedSet();
        filterInventoryData();
        refreshLocationVisualizerIfActive();
        closeRelocateModal();

        playSuccessSound();
        showToast(`🔀 ย้าย S/N: ${sn} ไปยัง ${newLoc} สำเร็จ`);

        await logUserActivity('RELOCATE', `ย้ายตำแหน่งสินค้า S/N: ${sn} จาก ${oldLoc} -> ${newLoc}`, sn);

        if (navigator.onLine) {
            await _supabase.from('warehouse_items').update({ location: newLoc }).eq('id', id);
        }
    }
}

function requestDeleteModal(mode, sn = null, id = null) {
    requireAdminApproval(`ลบสินค้าออกจากคลัง ${mode === 'SINGLE' ? 'S/N: ' + sn : 'จำนวน ' + selectedItemSnSet.size + ' รายการ'}`, () => {
        openDeleteConfirmModal(mode, sn, id);
    });
}

function openDeleteConfirmModal(mode, sn = null, id = null) {
    pendingDeleteMode = mode;
    pendingDeleteSn = sn;
    pendingDeleteId = id;

    const detailsBox = document.getElementById('deleteConfirmModalDetails');
    if(mode === 'SINGLE') {
        detailsBox.innerHTML = ` S/N: <strong>${sn}</strong>`;
    } else {
        if(selectedItemSnSet.size === 0) {
            alert("⚠️ กรุณาเลือกรายการที่ต้องการลบอย่างน้อย 1 รายการ");
            return;
        }
        detailsBox.innerHTML = Array.from(selectedItemSnSet).map(s => `• ${s}`).join('<br>');
    }
    document.getElementById('deleteConfirmModal').style.display = 'flex';
}

function closeDeleteConfirmModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
}

async function executeDeleteAction() {
    if (pendingDeleteMode === 'SINGLE') {
        const sn = pendingDeleteSn;
        const id = pendingDeleteId;

        globalInventoryData = globalInventoryData.filter(i => i.sn !== sn);
        rebuildOccupiedSet();
        playSuccessSound();

        if (voiceSettings.deleteVoice) {
            speakThaiText(`ลบซีเรียล ${sn} เรียบร้อยแล้วค่ะ`);
        }

        showToast(`🗑️ ลบ S/N: ${sn} เรียบร้อยแล้ว`);

        filterInventoryData();
        updateKPIs();
        refreshLocationVisualizerIfActive();
        closeDeleteConfirmModal();

        await logUserActivity('DELETE', `ลบรายการสินค้า S/N ออกจากสต็อก`, sn);

        if (navigator.onLine && id) {
            await _supabase.from('warehouse_items').delete().eq('id', id);
        }
    } else if (pendingDeleteMode === 'BATCH') {
        const snArray = Array.from(selectedItemSnSet);
        globalInventoryData = globalInventoryData.filter(i => !selectedItemSnSet.has(i.sn));
        rebuildOccupiedSet();
        selectedItemSnSet.clear();
        updateSelectedCountUI();

        playSuccessSound();
        showToast(`🗑️ ลบรายการสินค้าจำนวน ${snArray.length} รายการ เรียบร้อย`);

        filterInventoryData();
        updateKPIs();
        refreshLocationVisualizerIfActive();
        closeDeleteConfirmModal();

        await logUserActivity('DELETE', `ลบรายการสินค้าเป็นกลุ่มจำนวน ${snArray.length} รายการ`);

        if (navigator.onLine) {
            await _supabase.from('warehouse_items').delete().in('sn', snArray);
        }
    }
}

// --- FAST INBOUND ENGINE ---
async function handleInboundSubmit(e) {
    e.preventDefault();

    const snInput = document.getElementById('inboundSn');
    const sn = snInput.value.trim();
    const category = document.getElementById('inboundCategory').value.trim();
    const name = document.getElementById('inboundName').value.trim();
    const meterVal = parseInt(document.getElementById('inboundMeter').value) || 0;
    const location = document.getElementById('inboundLocationPreview').textContent;

    if(!sn) return;

    if(globalInventoryData.some(i => i.sn.toLowerCase() === sn.toLowerCase())) {
        playErrorSound();
        showToast(`🚨 S/N "${sn}" มีอยู่ในระบบสต็อกแล้ว!`, true);
        snInput.select();
        return;
    }

    const payload = {
        category: category,
        name: name,
        sn: sn,
        meter: meterVal,
        location: location,
        qty: 1,
        unit: "เครื่อง",
        created_at: new Date().toISOString()
    };

    globalInventoryData.unshift(payload);
    snInput.value = '';
    snInput.focus();

    updateKPIs();
    filterInventoryData();
    refreshLocationVisualizerIfActive();
    autoSelectAvailableSlot();

    playSuccessSound();
    
    if (voiceSettings.inboundVoice) {
        speakThaiText(`รับสินค้าซีเรียล ${sn} เข้าพิกัด ${location} เรียบร้อยค่ะ`);
    }

    showToast(`✅ บันทึกรับสินค้า S/N: ${sn} (มิเตอร์: ${meterVal}) สำเร็จ`);

    recentInboundList.unshift({
        sn: sn,
        category: category,
        name: name,
        meter: meterVal,
        location: location,
        time: new Date().toLocaleTimeString('th-TH')
    });
    renderLiveInboundFeed();

    await logUserActivity('INBOUND', `รับเข้าสินค้า [SKU: ${category}] ${name} (มิเตอร์: ${meterVal}) เข้าพิกัด ${location}`, sn);

    if (navigator.onLine) {
        await _supabase.from('warehouse_items').insert([payload]);
    }
}

function renderLiveInboundFeed() {
    const container = document.getElementById('liveInboundFeedContainer');
    if(recentInboundList.length === 0) return;

    let html = '';
    recentInboundList.forEach(item => {
        html += `
            <div class="feed-item db-synced-success">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="mono font-bold" style="color:var(--text-main);">${escapeHTML(item.sn)}</span>
                    <span class="badge-location mono">📍 ${escapeHTML(formatLocationCode(item.location))}</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-sub); font-weight:500;">
                    [${escapeHTML(item.category)}] ${escapeHTML(item.name)}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--warning); font-weight:700; margin-top:2px;">
                    <span><i class="fa-solid fa-gauge"></i> มิเตอร์: ${Number(item.meter || 0).toLocaleString()}</span>
                    <span style="color:var(--text-muted); font-weight:400;">🕒 ${escapeHTML(item.time)} น.</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// AUTOCOMPLETE FIX: UNIQUE SKU ONLY (DEDUPLICATED LIST)
function onSkuSearchInput(val) {
    const box = document.getElementById('skuSuggestionsBox');
    if (!val.trim()) {
        box.style.display = 'none';
        return;
    }

    const query = val.toLowerCase();
    const skuMap = new Map();

    globalInventoryData.concat(globalMasterProducts).forEach(item => {
        const skuKey = (item.category || item.sku || '').trim();
        const nameVal = (item.name || '').trim();

        if (skuKey && !skuMap.has(skuKey.toLowerCase())) {
            if (skuKey.toLowerCase().includes(query) || nameVal.toLowerCase().includes(query)) {
                skuMap.set(skuKey.toLowerCase(), { sku: skuKey, name: nameVal });
            }
        }
    });

    const uniqueResults = Array.from(skuMap.values()).slice(0, 8);

    if (uniqueResults.length === 0) {
        box.style.display = 'none';
        return;
    }

    let html = '';
    uniqueResults.forEach(item => {
        html += `
            <div class="suggestion-item" onclick="selectSkuSuggestion('${escapeHTML(item.sku)}', '${escapeHTML(item.name)}')">
                <span class="mono font-bold" style="color:var(--primary-text);">${escapeHTML(item.sku)}</span>
                <span style="color:var(--text-main); font-size:0.82rem;">${escapeHTML(item.name)}</span>
            </div>
        `;
    });
    box.innerHTML = html;
    box.style.display = 'block';
}

function selectSkuSuggestion(sku, name) {
    document.getElementById('inboundCategory').value = sku;
    document.getElementById('inboundName').value = name;
    document.getElementById('skuSearchInput').value = `${sku} - ${name}`;
    document.getElementById('skuSuggestionsBox').style.display = 'none';
    document.getElementById('inboundSn').focus();
}

// --- OUTBOUND ENGINE ---
function handleAddOutboundToCart(e) {
    e.preventDefault();
    const snInput = document.getElementById('outboundSn');
    const sn = snInput.value.trim();
    if(!sn) return;

    const item = globalInventoryData.find(i => i.sn.toLowerCase() === sn.toLowerCase());
    if(!item) {
        playErrorSound();
        showToast(`❌ ไม่พบ S/N "${sn}" ในระบบสต็อก!`, true);
        snInput.select();
        return;
    }

    if(outboundCartItems.some(i => i.sn.toLowerCase() === sn.toLowerCase())) {
        playErrorSound();
        showToast(`⚠️️ S/N "${sn}" มีอยู่ในรายการตัดจ่ายแล้ว`, true);
        snInput.select();
        return;
    }

    outboundCartItems.push(item);
    snInput.value = '';
    snInput.focus();

    playSuccessSound();
    renderOutboundCartTable();
}

function renderOutboundCartTable() {
    const tbody = document.getElementById('outboundCartTableBody');
    document.getElementById('outboundCartCountBadge').textContent = `${outboundCartItems.length} รายการ`;

    if(outboundCartItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:var(--text-muted);">ยังไม่มีรายการ ยิงสแกน S/N เพื่อเพิ่มเข้าใบสั่งจ่าย</td></tr>`;
        return;
    }

    let html = '';
    outboundCartItems.forEach((item, idx) => {
        html += `
            <tr>
                <td style="text-align:center;" class="mono">${idx + 1}</td>
                <td><code class="mono font-bold">${escapeHTML(item.category || 'N/A')}</code></td>
                <td>${escapeHTML(item.name || '-')}</td>
                <td><code class="mono font-bold">${escapeHTML(item.sn)}</code></td>
                <td class="mono font-bold" style="color:var(--warning);">${Number(item.meter || 0).toLocaleString()}</td>
                <td><span class="badge-location mono">${escapeHTML(formatLocationCode(item.location))}</span></td>
                <td style="text-align:center;">
                    <button class="btn btn-sm btn-danger" style="padding:2px 6px;" onclick="removeFromOutboundCart('${escapeHTML(item.sn)}')">&times;</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function removeFromOutboundCart(sn) {
    outboundCartItems = outboundCartItems.filter(i => i.sn !== sn);
    renderOutboundCartTable();
}

function requestOutboundApproval() {
    if(outboundCartItems.length === 0) {
        alert("⚠️ กรุณายิงสแกน S/N สินค้าอย่างน้อย 1 รายการเพื่อตัดจ่าย");
        return;
    }

    const dest = document.getElementById('outboundDestination').value.trim();
    const dispatcher = document.getElementById('outboundDispatcher').value.trim();
    const receiver = document.getElementById('outboundReceiver').value.trim();

    if(!dest || !dispatcher || !receiver) {
        alert("⚠️ กรุณากรอกข้อมูลสถานที่จ่าย, ผู้ส่ง และ ผู้รับ ให้ครบถ้วน");
        return;
    }

    requireAdminApproval(`อนุมัติตัดจ่ายสินค้าออกจากคลังจำนวน ${outboundCartItems.length} รายการ ไปยัง: ${dest}`, () => {
        processFinalOutboundWorkOrder();
    });
}

async function processFinalOutboundWorkOrder() {
    const dest = document.getElementById('outboundDestination').value.trim();
    const dispatcher = document.getElementById('outboundDispatcher').value.trim();
    const receiver = document.getElementById('outboundReceiver').value.trim();

    const snList = outboundCartItems.map(i => i.sn);
    globalInventoryData = globalInventoryData.filter(i => !snList.includes(i.sn));
    rebuildOccupiedSet();

    const orderPayload = {
        destination: dest,
        dispatcher: dispatcher,
        receiver: receiver,
        sn_list: snList,
        items_count: outboundCartItems.length,
        created_at: new Date().toISOString()
    };

    playSuccessSound();
    showToast(`📤 ตัดจ่ายสินค้าออกจากคลังจำนวน ${outboundCartItems.length} รายการ เรียบร้อย`);

    await logUserActivity('OUTBOUND', `ตัดจ่ายสินค้าไปที่: ${dest} (จำนวน ${outboundCartItems.length} เครื่อง) โดยผู้จ่าย ${dispatcher}`);

    if (navigator.onLine) {
        await _supabase.from('warehouse_items').delete().in('sn', snList);
        await _supabase.from('outbound_orders').insert([orderPayload]);
    }

    outboundCartItems = [];
    renderOutboundCartTable();
    filterInventoryData();
    updateKPIs();
    refreshLocationVisualizerIfActive();
    loadOutboundHistoryFromDB();
}

async function loadOutboundHistoryFromDB() {
    const container = document.getElementById('liveOutboundFeedContainer');
    try {
        const { data, error } = await _supabase
            .from('outbound_orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if(!error && data && data.length > 0) {
            recentOutboundOrders = data;
            let html = '';
            data.forEach(order => {
                html += `
                    <div class="feed-item outbound">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="color:var(--warning); font-size:0.9rem;">📍 ${escapeHTML(order.destination)}</strong>
                            <span class="mono font-bold badge-location">${order.items_count} เครื่อง</span>
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-sub);">
                            ผู้จ่าย: <strong>${escapeHTML(order.dispatcher)}</strong> | ผู้รับ: <strong>${escapeHTML(order.receiver)}</strong>
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;" class="mono">
                            S/N: ${(order.sn_list || []).join(', ')}
                        </div>
                        <div style="font-size:0.72rem; color:var(--text-muted); text-align:right;">
                            🕒 ${new Date(order.created_at).toLocaleString('th-TH')}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">ยังไม่มีประวัติใบสั่งจ่ายสินค้า</div>`;
        }
    } catch(e) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">ไม่พบประวัติใบสั่งจ่ายในระบบ</div>`;
    }
}

// --- DRILL-DOWN LOCATION VISUALIZER ---
function renderDrillDownAisleBar() {
    const bar = document.getElementById('aisleFilterBar');
    bar.innerHTML = '';

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
    container.innerHTML = '';

    if(currentSelectedAisle === 'DOCK') {
        container.innerHTML = `<div style="grid-column:1/-1; padding:10px; font-size:0.85rem; color:var(--text-muted);">ลานพักสินค้า DOCK ไม่แบ่งล็อกจัดเก็บ</div>`;
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
    container.innerHTML = '';

    if(currentSelectedAisle === 'DOCK') {
        const dockItems = globalInventoryData.filter(i => (i.location || '').toUpperCase() === 'DOCK');
        infoText.textContent = `ลาน DOCK (รวม ${dockItems.length} เครื่องทั้งหมด)`;
        renderSlotCard(container, 'DOCK Area (ลานพักโหลดสินค้า)', dockItems, true);
        return;
    }

    const currentBayPrefix = `${currentSelectedAisle}-${currentSelectedBay}-`;
    const bayAllItems = globalInventoryData.filter(i => (i.location || '').toUpperCase().startsWith(currentBayPrefix));

    infoText.textContent = `พิกัด แถว ${currentSelectedAisle} / ล็อก ${currentSelectedBay} (${bayAllItems.length} เครื่อง)`;

    const slotMap = {};
    bayAllItems.forEach(item => {
        const loc = (item.location || currentBayPrefix).toUpperCase();
        if(!slotMap[loc]) slotMap[loc] = [];
        slotMap[loc].push(item);
    });

    const activeKeys = Object.keys(slotMap);

    if(activeKeys.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">ไม่มีสินค้าจัดเก็บในล็อก ${currentSelectedBay}</div>`;
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
    if(document.getElementById('view-locations').classList.contains('active')) {
        renderDrillDownBaysGrid();
        renderDrillDownSlotsGrid();
    }
}

// --- USER AUDIT LOGS ENGINE ---
async function loadUserActivityLogsFromDB() {
    const tbody = document.getElementById('activityLogsTableBody');
    try {
        const { data, error } = await _supabase
            .from('user_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(300);

        if(!error && data) {
            globalActivityLogs = data;
            filterActivityLogs();
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--danger);">ไม่สามารถดึงข้อมูลประวัติกิจกรรมจาก DB ได้</td></tr>`;
        }
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--danger);">เกิดข้อผิดพลาดในการเชื่อมต่อ DB</td></tr>`;
    }
}

function populateLogUserDropdown() {
    const select = document.getElementById('logUserSelect');
    if(!select) return;
    select.innerHTML = `<option value="ALL">👤 ผู้ใช้ทุกคน (All Users)</option>`;
    systemUsers.forEach(u => {
        select.innerHTML += `<option value="${escapeHTML(u.username)}">${escapeHTML(u.name)} (${escapeHTML(u.username)})</option>`;
    });
}

function filterActivityLogs() {
    const search = document.getElementById('logSearchInput').value.trim().toLowerCase();
    const user = document.getElementById('logUserSelect').value;
    const type = document.getElementById('logTypeSelect').value;

    const filtered = globalActivityLogs.filter(log => {
        const matchSearch = !search || 
            (log.username && log.username.toLowerCase().includes(search)) ||
            (log.full_name && log.full_name.toLowerCase().includes(search)) ||
            (log.description && log.description.toLowerCase().includes(search)) ||
            (log.target_sn && log.target_sn.toLowerCase().includes(search));

        const matchUser = (user === 'ALL') || (log.username === user);
        const matchType = (type === 'ALL') || (log.action_type === type);

        return matchSearch && matchUser && matchType;
    });

    renderActivityLogsTable(filtered);
}

function renderActivityLogsTable(logs) {
    const tbody = document.getElementById('activityLogsTableBody');
    document.getElementById('logTotalBadge').textContent = `${logs.length} ประวัติ`;

    if(logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">ไม่พบประวัติการใช้งานตรงตามเงื่อนไข</td></tr>`;
        return;
    }

    let html = '';
    logs.forEach((log, idx) => {
        let badgeClass = 'nav';
        if(log.action_type === 'INBOUND') badgeClass = 'inbound';
        else if(log.action_type === 'OUTBOUND') badgeClass = 'outbound';
        else if(log.action_type === 'DELETE') badgeClass = 'delete';
        else if(log.action_type === 'RELOCATE') badgeClass = 'relocate';
        else if(log.action_type === 'UPDATE') badgeClass = 'update';
        else if(log.action_type === 'AUTH') badgeClass = 'auth';

        html += `
            <tr>
                <td style="text-align:center;" class="mono">${idx + 1}</td>
                <td style="font-size:0.78rem; color:var(--text-muted);">${log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'}</td>
                <td><strong class="mono" style="color:var(--primary-text);">${escapeHTML(log.full_name || log.username)}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${escapeHTML(log.username)})</span></td>
                <td><span class="badge-action ${badgeClass}">${escapeHTML(log.action_type)}</span></td>
                <td>${escapeHTML(log.description || '-')}</td>
                <td><code class="mono font-bold">${escapeHTML(log.target_sn || '-')}</code></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function inspectUserLogs(username) {
    const targetUser = systemUsers.find(u => u.username === username);
    if (!targetUser) return;

    currentInspectedUser = targetUser;
    document.getElementById('auditTargetUsername').textContent = targetUser.username;
    document.getElementById('auditTargetFullName').textContent = targetUser.name;
    document.getElementById('auditTargetDept').textContent = targetUser.department;
    document.getElementById('auditTargetRole').textContent = targetUser.role;

    document.getElementById('userHistoryAuditModal').style.display = 'flex';
    refreshSingleUserLogs();
}

async function refreshSingleUserLogs() {
    if (!currentInspectedUser) return;
    const tbody = document.getElementById('individualAuditLogsTableBody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</td></tr>`;

    try {
        const { data, error } = await _supabase
            .from('user_activities')
            .select('*')
            .eq('username', currentInspectedUser.username)
            .order('created_at', { ascending: false })
            .limit(200);

        if (!error && data) {
            currentInspectedUserLogs = data;
            filterIndividualAuditLogs();
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--danger);">ไม่สามารถดึงข้อมูลประวัติผู้ใช้คนนี้ได้</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--danger);">เกิดข้อผิดพลาดในการเชื่อมต่อ DB</td></tr>`;
    }
}

function filterIndividualAuditLogs() {
    const search = document.getElementById('auditModalSearchInput').value.trim().toLowerCase();
    const type = document.getElementById('auditModalTypeFilter').value;

    const filtered = currentInspectedUserLogs.filter(log => {
        const matchSearch = !search || 
            (log.description && log.description.toLowerCase().includes(search)) ||
            (log.target_sn && log.target_sn.toLowerCase().includes(search));
        const matchType = (type === 'ALL') || (log.action_type === type);
        return matchSearch && matchType;
    });

    renderIndividualAuditLogsTable(filtered);
}

function renderIndividualAuditLogsTable(logs) {
    const tbody = document.getElementById('individualAuditLogsTableBody');
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">ไม่พบประวัติการใช้งาน</td></tr>`;
        return;
    }

    let html = '';
    logs.forEach((log, idx) => {
        let badgeClass = 'nav';
        if(log.action_type === 'INBOUND') badgeClass = 'inbound';
        else if(log.action_type === 'OUTBOUND') badgeClass = 'outbound';
        else if(log.action_type === 'DELETE') badgeClass = 'delete';
        else if(log.action_type === 'RELOCATE') badgeClass = 'relocate';
        else if(log.action_type === 'UPDATE') badgeClass = 'update';
        else if(log.action_type === 'AUTH') badgeClass = 'auth';

        html += `
            <tr>
                <td style="text-align:center;" class="mono">${idx + 1}</td>
                <td style="font-size:0.78rem; color:var(--text-muted);">${log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'}</td>
                <td><span class="badge-action ${badgeClass}">${escapeHTML(log.action_type)}</span></td>
                <td>${escapeHTML(log.description || '-')}</td>
                <td><code class="mono font-bold">${escapeHTML(log.target_sn || '-')}</code></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function closeUserHistoryAuditModal() {
    document.getElementById('userHistoryAuditModal').style.display = 'none';
    currentInspectedUser = null;
}

// --- WAREHOUSE CONFIGS & USER MANAGEMENT ---
async function loadWarehouseConfigsFromDB() {
    try {
        const { data, error } = await _supabase
            .from('system_settings')
            .select('*')
            .eq('key', 'aisle_configs')
            .maybeSingle();

        if (data && data.value) {
            aisleConfigs = data.value.configs || aisleConfigs;
            masterAisles = data.value.aisles || masterAisles;
        }
    } catch(e) {}

    renderAisleSettingsTable();
    populateAisleDropdowns();
}

async function saveAllWarehouseConfigsToDB() {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
        const payload = {
            key: 'aisle_configs',
            value: { aisles: masterAisles, configs: aisleConfigs },
            updated_at: new Date().toISOString()
        };
        await _supabase.from('system_settings').upsert(payload, { onConflict: 'key' });
        showToast("⚡ บันทึกโครงสร้างพิกัดคลังสินค้าลง DB สำเร็จ");
    } catch(e) {
        alert("❌ ไม่สามารถบันทึกข้อมูลลง DB ได้");
    }
}

function renderAisleSettingsTable() {
    const tbody = document.getElementById('aisleSettingsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    masterAisles.forEach((aisle, idx) => {
        const cfg = aisleConfigs[aisle] || { bays: 10, shelves: 1, slots: 10 };
        const count = globalInventoryData.filter(i => (i.location || '').toUpperCase().startsWith(`${aisle}-`) || (aisle === 'DOCK' && i.location === 'DOCK')).length;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center;" class="mono">${idx + 1}</td>
            <td><strong class="mono" style="font-size:1rem; color:var(--primary-text);">${escapeHTML(aisle)}</strong></td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:80px; text-align:center; display:inline-block;" value="${cfg.bays}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'bays', this.value)"></td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:80px; text-align:center; display:inline-block;" value="${cfg.shelves}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'shelves', this.value)"></td>
            <td style="text-align:center;"><input type="number" class="form-control mono" style="width:80px; text-align:center; display:inline-block;" value="${cfg.slots}" onchange="updateAisleParam('${escapeHTML(aisle)}', 'slots', this.value)"></td>
            <td style="text-align:center;" class="mono font-bold">${count} เครื่อง</td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-secondary" onclick="moveAisleOrder(${idx}, 'UP')" ${idx === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn btn-sm btn-secondary" onclick="moveAisleOrder(${idx}, 'DOWN')" ${idx === masterAisles.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
                ${aisle !== 'DOCK' ? `<button class="btn btn-sm btn-danger" onclick="deleteAisleConfig('${escapeHTML(aisle)}')"><i class="fa-solid fa-trash"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateAisleParam(aisle, key, val) {
    if(!aisleConfigs[aisle]) aisleConfigs[aisle] = { bays:10, shelves:1, slots:10 };
    aisleConfigs[aisle][key] = parseInt(val) || 1;
}

function addNewAisleConfig() {
    const input = document.getElementById('newAisleInput');
    const aisleName = input.value.trim().toUpperCase();
    if (!aisleName) return;

    if (masterAisles.includes(aisleName)) {
        alert("⚠️ มีชื่อแถวนี้อยู่ในระบบแล้ว");
        return;
    }

    masterAisles.push(aisleName);
    aisleConfigs[aisleName] = { bays: 10, shelves: 1, slots: 10 };
    input.value = '';

    renderAisleSettingsTable();
    populateAisleDropdowns();
    saveAllWarehouseConfigsToDB();
}

function deleteAisleConfig(aisle) {
    if(confirm(`คุณแน่ใจหรือไม่ที่จะลบแถว ${aisle}?`)) {
        masterAisles = masterAisles.filter(a => a !== aisle);
        delete aisleConfigs[aisle];
        renderAisleSettingsTable();
        populateAisleDropdowns();
        saveAllWarehouseConfigsToDB();
    }
}

function renderUserManagementTable() {
    const tbody = document.getElementById('userManagementTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    systemUsers.forEach((u, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center;" class="mono">${idx + 1}</td>
            <td><code class="mono font-bold" style="color:var(--primary-text);">${escapeHTML(u.username)}</code></td>
            <td style="font-weight:600;">${escapeHTML(u.name)}</td>
            <td>${escapeHTML(u.department || '-')}</td>
            <td><span class="badge-action ${u.role === 'admin' ? 'auth' : 'nav'}">${escapeHTML(u.role)}</span></td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-primary" onclick="inspectUserLogs('${escapeHTML(u.username)}')"><i class="fa-solid fa-eye"></i> ดูประวัติ</button>
            </td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-warning" onclick="adminForceLogoutUser('${escapeHTML(u.username)}')"><i class="fa-solid fa-right-from-bracket"></i> เตะออกจากระบบ</button>
            </td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-secondary" onclick="openEditUserModal(${u.id})"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
            </td>
            <td style="text-align:center;">
                ${u.username !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUserAccount(${u.id})"><i class="fa-solid fa-trash"></i></button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openCreateUserModal() {
    document.getElementById('userFormId').value = '';
    document.getElementById('userFormUsername').value = '';
    document.getElementById('userFormUsername').readOnly = false;
    document.getElementById('userFormFullName').value = '';
    document.getElementById('userFormDepartment').value = '';
    document.getElementById('userFormPassword').value = '';
    document.getElementById('userFormRole').value = 'user';
    document.getElementById('userModalTitle').textContent = 'เพิ่มผู้ใช้งานใหม่';
    document.getElementById('createUserModal').style.display = 'flex';
}

function openEditUserModal(id) {
    const u = systemUsers.find(item => item.id === id);
    if (!u) return;

    document.getElementById('userFormId').value = u.id;
    document.getElementById('userFormUsername').value = u.username;
    document.getElementById('userFormUsername').readOnly = true;
    document.getElementById('userFormFullName').value = u.name;
    document.getElementById('userFormDepartment').value = u.department || '';
    document.getElementById('userFormPassword').value = u.password;
    document.getElementById('userFormRole').value = u.role;
    document.getElementById('userModalTitle').textContent = `แก้ไขผู้ใช้งาน: ${u.username}`;
    document.getElementById('createUserModal').style.display = 'flex';
}

function closeCreateUserModal() {
    document.getElementById('createUserModal').style.display = 'none';
}

async function submitUserForm(e) {
    e.preventDefault();
    const id = document.getElementById('userFormId').value;
    const username = document.getElementById('userFormUsername').value.trim();
    const fullName = document.getElementById('userFormFullName').value.trim();
    const department = document.getElementById('userFormDepartment').value.trim();
    const password = document.getElementById('userFormPassword').value.trim();
    const role = document.getElementById('userFormRole').value;

    const payload = {
        username: username,
        full_name: fullName,
        department: department,
        password: password,
        role: role,
        updated_at: new Date().toISOString()
    };

    if (id) {
        const index = systemUsers.findIndex(u => u.id == id);
        if (index !== -1) {
            systemUsers[index] = { ...systemUsers[index], ...payload, name: fullName };
        }
        await _supabase.from('profiles').update(payload).eq('id', id);
        showToast(`✅ แก้ไขผู้ใช้งาน ${username} สำเร็จ`);
    } else {
        const { data, error } = await _supabase.from('profiles').insert([payload]).select();
        if(!error && data) {
            systemUsers.push({ id: data[0].id, username: username, name: fullName, department: department, password: password, role: role });
            showToast(`✅ เพิ่มผู้ใช้งาน ${username} สำเร็จ`);
        }
    }

    localStorage.setItem('WMS_USERS', JSON.stringify(systemUsers));
    renderUserManagementTable();
    populateLogUserDropdown();
    closeCreateUserModal();
}

async function deleteUserAccount(id) {
    const user = systemUsers.find(u => u.id === id);
    if (!user) return;

    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งาน ${user.username}?`)) {
        systemUsers = systemUsers.filter(u => u.id !== id);
        localStorage.setItem('WMS_USERS', JSON.stringify(systemUsers));
        renderUserManagementTable();
        populateLogUserDropdown();
        await _supabase.from('profiles').delete().eq('id', id);
        showToast(`🗑️ ลบผู้ใช้งาน ${user.username} เรียบร้อยแล้ว`);
    }
}

// --- BARCODE PRINT STICKER ENGINE (A4 EQUAL GRID 2x2 & 1 S/N PER THERMAL PAGE) ---
function openPrintBarcodeModal(mode, singleSn = null) {
    if (mode === 'SINGLE' && singleSn) {
        selectedItemSnSet.clear();
        selectedItemSnSet.add(singleSn);
        updateSelectedCountUI();
    }

    if (selectedItemSnSet.size === 0) {
        alert("⚠️ กรุณาเลือกรายการสินค้าที่ต้องการพิมพ์บาร์โค้ดอย่างน้อย 1 รายการ");
        return;
    }

    document.getElementById('printBarcodeModal').style.display = 'flex';
    updatePrintPreviewLayout();
}

function closePrintBarcodeModal() {
    document.getElementById('printBarcodeModal').style.display = 'none';
}

function updatePrintPreviewLayout() {
    const area = document.getElementById('barcodePreviewArea');
    const sizeFormat = document.getElementById('thermalSizeSelect').value;
    area.innerHTML = '';

    const selectedSnArray = Array.from(selectedItemSnSet);
    const selectedItems = globalInventoryData.filter(i => selectedSnArray.includes(i.sn));

    if (selectedItems.length === 0) {
        area.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">ไม่พบรายการที่เลือก</div>';
        return;
    }

    let cardClass = 'thermal-card-50x30';

    if (sizeFormat === '40x30') cardClass = 'thermal-card-40x30';
    else if (sizeFormat === '100x75') cardClass = 'thermal-card-100x75';
    else if (sizeFormat === '100x150') cardClass = 'thermal-card-100x150';
    else if (sizeFormat === 'A4') cardClass = 'thermal-card-a4-grid';

    selectedItems.forEach((item, idx) => {
        const cardBox = document.createElement('div');
        cardBox.className = `barcode-card-box ${cardClass}`;
        const svgId = `barcode-svg-element-${idx}`;

        cardBox.innerHTML = `
            <div style="font-weight:800; font-size:0.8rem; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; border-bottom:1px solid #000; padding-bottom:2px; margin-bottom:2px;">
                ${escapeHTML(item.name || 'WMS Item')}
            </div>
            <div style="font-size:0.75rem; font-weight:700; color:#333;">SKU: ${escapeHTML(item.category || '-')}</div>
            <div class="barcode-svg-container">
                <svg id="${svgId}"></svg>
            </div>
            <div style="font-size:0.7rem; font-weight:700; display:flex; justify-content:space-between; margin-top:2px; border-top:1px dashed #666; padding-top:2px;">
                <span>LOC: ${escapeHTML(formatLocationCode(item.location))}</span>
                <span>METER: ${Number(item.meter || 0).toLocaleString()}</span>
            </div>
        `;
        area.appendChild(cardBox);

        setTimeout(() => {
            try {
                JsBarcode(`#${svgId}`, item.sn, {
                    format: "CODE128",
                    width: 1.6,
                    height: 40,
                    displayValue: true,
                    fontSize: 12,
                    font: "JetBrains Mono",
                    margin: 2
                });
            } catch (e) {
                console.error("JsBarcode generation error:", e);
            }
        }, 50);
    });
}

function triggerPDFPrintPreview() {
    const areaContent = document.getElementById('barcodePreviewArea').innerHTML;
    const sizeFormat = document.getElementById('thermalSizeSelect').value;
    const printWindow = window.open('', '_blank', 'width=950,height=750');

    let pageStyle = `
        @page { size: A4 portrait; margin: 8mm; }
        body { font-family: 'Prompt', sans-serif; background: #fff; color: #000; margin: 0; padding: 0; }
        .thermal-label-container { display: flex; flex-wrap: wrap; gap: 0; justify-content: space-between; }
        .barcode-card-box { border: 2px solid #000; border-radius: 4px; padding: 6px; box-sizing: border-box; text-align: center; }
        .thermal-card-a4-grid { width: 48.5% !important; height: 135px !important; margin-bottom: 8px !important; page-break-inside: avoid !important; float: left; }
        .barcode-svg-container svg { max-width: 100%; height: auto; }
    `;

    if (sizeFormat !== 'A4') {
        pageStyle = `
            @page { size: auto; margin: 0mm; }
            body { font-family: 'Prompt', sans-serif; background: #fff; color: #000; margin: 0; padding: 0; }
            .barcode-card-box { page-break-after: always !important; margin: 0 auto !important; page-break-inside: avoid !important; }
            .barcode-svg-container svg { max-width: 100%; height: auto; }
        `;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>พิมพ์บาร์โค้ดสติ๊กเกอร์ WMS</title>
            <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
            <style>${pageStyle}</style>
        </head>
        <body>
            <div class="thermal-label-container">
                ${areaContent}
            </div>
            <script>
                setTimeout(() => { window.print(); window.close(); }, 600);
            <\/script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

function openChangePasswordModal() {
    document.getElementById('oldPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmNewPasswordInput').value = '';
    document.getElementById('changePasswordModal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
}

async function submitChangePassword(e) {
    e.preventDefault();
    const oldP = document.getElementById('oldPasswordInput').value;
    const newP = document.getElementById('newPasswordInput').value;
    const confirmP = document.getElementById('confirmNewPasswordInput').value;

    if (oldP !== currentUser.password) {
        alert("❌ รหัสผ่านเดิมไม่ถูกต้อง!");
        return;
    }
    if (newP !== confirmP) {
        alert("❌ รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน!");
        return;
    }

    currentUser.password = newP;
    sessionStorage.setItem('WMS_ACTIVE_USER', JSON.stringify(currentUser));
    
    const matchedUser = systemUsers.find(u => u.username === currentUser.username);
    if (matchedUser) matchedUser.password = newP;
    localStorage.setItem('WMS_USERS', JSON.stringify(systemUsers));

    await _supabase.from('profiles').update({ password: newP }).eq('username', currentUser.username);

    playSuccessSound();
    showToast("🔑 เปลี่ยนรหัสผ่านสำเร็จ!");
    closeChangePasswordModal();
}

// --- HELPER DROPDOWNS & LOCATIONS ---
function populateAisleDropdowns() {
    const filterSelect = document.getElementById('filterAisleSelect');
    const inboundSelect = document.getElementById('inboundAisleSelect');
    const relocateSelect = document.getElementById('relocateAisleSelect');
    const batchSelect = document.getElementById('batchRelocateAisleSelect');
    const exportSelect = document.getElementById('exportAisleSelect');

    const optionsHtml = masterAisles.map(a => `<option value="${escapeHTML(a)}">${a === 'DOCK' ? '🚚 ลาน DOCK' : `แถว ${a}`}</option>`).join('');

    if (filterSelect) filterSelect.innerHTML = `<option value="ALL">📍 แสดงทุกแถว (All)</option>` + optionsHtml;
    if (inboundSelect) inboundSelect.innerHTML = optionsHtml;
    if (relocateSelect) relocateSelect.innerHTML = optionsHtml;
    if (batchSelect) batchSelect.innerHTML = optionsHtml;
    if (exportSelect) exportSelect.innerHTML = optionsHtml;
}

function onInboundAisleOrBayChange() {
    const aisle = document.getElementById('inboundAisleSelect').value;
    const baySelect = document.getElementById('inboundBaySelect');
    
    if (aisle === 'DOCK') {
        baySelect.innerHTML = `<option value="01">DOCK Area</option>`;
        document.getElementById('inboundShelfSelect').innerHTML = `<option value="1">1</option>`;
        document.getElementById('inboundSlotSelect').innerHTML = `<option value="1">1</option>`;
        updateInboundLocationPreview();
        return;
    }

    const cfg = aisleConfigs[aisle] || { bays: 10, shelves: 1, slots: 10 };
    let bayOptions = '';
    for (let b = 1; b <= cfg.bays; b++) {
        const bStr = String(b).padStart(2, '0');
        bayOptions += `<option value="${bStr}">ล็อก ${bStr}</option>`;
    }
    baySelect.innerHTML = bayOptions;

    let shelfOptions = '';
    for (let s = 1; s <= cfg.shelves; s++) {
        shelfOptions += `<option value="${s}">ชั้น ${s}</option>`;
    }
    document.getElementById('inboundShelfSelect').innerHTML = shelfOptions;

    let slotOptions = '';
    for (let sl = 1; sl <= cfg.slots; sl++) {
        const slStr = String(sl).padStart(2, '0');
        slotOptions += `<option value="${slStr}">ช่อง ${slStr}</option>`;
    }
    document.getElementById('inboundSlotSelect').innerHTML = slotOptions;

    autoSelectAvailableSlot();
}

function autoSelectAvailableSlot() {
    const aisle = document.getElementById('inboundAisleSelect').value;
    if (aisle === 'DOCK') {
        updateInboundLocationPreview();
        return;
    }

    const bay = document.getElementById('inboundBaySelect').value;
    const cfg = aisleConfigs[aisle] || { bays: 10, shelves: 1, slots: 10 };

    for (let s = 1; s <= cfg.shelves; s++) {
        for (let sl = 1; sl <= cfg.slots; sl++) {
            const locCode = `${aisle}-${bay}-${s}-${String(sl).padStart(2, '0')}`;
            if (!occupiedLocationsSet.has(locCode)) {
                document.getElementById('inboundShelfSelect').value = s;
                document.getElementById('inboundSlotSelect').value = String(sl).padStart(2, '0');
                updateInboundLocationPreview();
                return;
            }
        }
    }
    updateInboundLocationPreview();
}

function updateInboundLocationPreview() {
    const aisle = document.getElementById('inboundAisleSelect').value;
    if (aisle === 'DOCK') {
        document.getElementById('inboundLocationPreview').textContent = 'DOCK';
        return;
    }
    const bay = document.getElementById('inboundBaySelect').value;
    const shelf = document.getElementById('inboundShelfSelect').value;
    const slot = document.getElementById('inboundSlotSelect').value;

    const locCode = `${aisle}-${bay}-${shelf}-${slot}`;
    document.getElementById('inboundLocationPreview').textContent = locCode;

    const bayCount = globalInventoryData.filter(i => (i.location || '').toUpperCase().startsWith(`${aisle}-${bay}-`)).length;
    document.getElementById('bayInboundCountBadge').textContent = `รับแล้วในล็อกนี้: ${bayCount} เครื่อง`;
}

function onRelocateAisleOrBayChange() {
    const aisle = document.getElementById('relocateAisleSelect').value;
    const baySelect = document.getElementById('relocateBaySelect');
    
    if (aisle === 'DOCK') {
        baySelect.innerHTML = `<option value="01">DOCK Area</option>`;
        document.getElementById('relocateShelfSelect').innerHTML = `<option value="1">1</option>`;
        document.getElementById('relocateSlotSelect').innerHTML = `<option value="1">1</option>`;
        updateRelocatePreview();
        return;
    }

    const cfg = aisleConfigs[aisle] || { bays: 10, shelves: 1, slots: 10 };
    let bayOptions = '';
    for (let b = 1; b <= cfg.bays; b++) {
        const bStr = String(b).padStart(2, '0');
        bayOptions += `<option value="${bStr}">ล็อก ${bStr}</option>`;
    }
    baySelect.innerHTML = bayOptions;

    let shelfOptions = '';
    for (let s = 1; s <= cfg.shelves; s++) {
        shelfOptions += `<option value="${s}">ชั้น ${s}</option>`;
    }
    document.getElementById('relocateShelfSelect').innerHTML = shelfOptions;

    let slotOptions = '';
    for (let sl = 1; sl <= cfg.slots; sl++) {
        const slStr = String(sl).padStart(2, '0');
        slotOptions += `<option value="${slStr}">ช่อง ${slStr}</option>`;
    }
    document.getElementById('relocateSlotSelect').innerHTML = slotOptions;

    autoSelectAvailableRelocateSlot();
}

function autoSelectAvailableRelocateSlot() {
    const aisle = document.getElementById('relocateAisleSelect').value;
    if (aisle === 'DOCK') {
        updateRelocatePreview();
        return;
    }

    const bay = document.getElementById('relocateBaySelect').value;
    const cfg = aisleConfigs[aisle] || { bays: 10, shelves: 1, slots: 10 };

    for (let s = 1; s <= cfg.shelves; s++) {
        for (let sl = 1; sl <= cfg.slots; sl++) {
            const locCode = `${aisle}-${bay}-${s}-${String(sl).padStart(2, '0')}`;
            if (!occupiedLocationsSet.has(locCode)) {
                document.getElementById('relocateShelfSelect').value = s;
                document.getElementById('relocateSlotSelect').value = String(sl).padStart(2, '0');
                updateRelocatePreview();
                return;
            }
        }
    }
    updateRelocatePreview();
}

function updateRelocatePreview() {
    const aisle = document.getElementById('relocateAisleSelect').value;
    if (aisle === 'DOCK') {
        document.getElementById('relocatePreviewBadge').textContent = 'DOCK';
        return;
    }
    const bay = document.getElementById('relocateBaySelect').value;
    const shelf = document.getElementById('relocateShelfSelect').value;
    const slot = document.getElementById('relocateSlotSelect').value;

    document.getElementById('relocatePreviewBadge').textContent = `${aisle}-${bay}-${shelf}-${slot}`;
}

function onFilterAisleChange() {
    const aisle = document.getElementById('filterAisleSelect').value;
    const baySelect = document.getElementById('filterBaySelect');

    if (aisle === 'ALL' || aisle === 'DOCK') {
        baySelect.innerHTML = `<option value="ALL">📦 ทุกล็อกในแถว</option>`;
        filterInventoryData();
        return;
    }

    const cfg = aisleConfigs[aisle] || { bays: 10 };
    let html = `<option value="ALL">📦 ทุกล็อกในแถว</option>`;
    for (let b = 1; b <= cfg.bays; b++) {
        const bStr = String(b).padStart(2, '0');
        html += `<option value="${bStr}">ล็อก ${bStr}</option>`;
    }
    baySelect.innerHTML = html;
    filterInventoryData();
}

function formatLocationCode(loc) {
    if (!loc || loc.toUpperCase() === 'DOCK') return 'DOCK';
    return loc.toUpperCase();
}

function generateAutoSN() {
    const rand = Math.floor(100000 + Math.random() * 900000);
    const sn = `SN-${rand}`;
    document.getElementById('inboundSn').value = sn;
    showToast(`🪄 สุ่ม S/N: ${sn}`);
}

function initRealtimeSubscription() {
    _supabase
        .channel('public:warehouse_items')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_items' }, payload => {
            loadDataFromDatabase();
        })
        .subscribe();
}

function openBatchRelocateModal() {
    if (selectedItemSnSet.size === 0) {
        alert("⚠️ กรุณาเลือกรายการสินค้าที่ต้องการย้ายอย่างน้อย 1 รายการ");
        return;
    }
    document.getElementById('batchRelocateTotalCount').textContent = selectedItemSnSet.size;
    document.getElementById('batchRelocateModal').style.display = 'flex';
    populateAisleDropdowns();
    updateBatchRelocateCapacityPreview();
}

function closeBatchRelocateModal() {
    document.getElementById('batchRelocateModal').style.display = 'none';
}

function updateBatchRelocateCapacityPreview() {
    const targetAisle = document.getElementById('batchRelocateAisleSelect').value;
    const textElem = document.getElementById('batchCapacityPreviewText');

    if (targetAisle === 'DOCK') {
        textElem.textContent = "ย้ายไปพื้นที่ DOCK (รองรับการพักโหลดสินค้าได้ไม่จำกัด)";
        return;
    }

    const count = globalInventoryData.filter(i => (i.location || '').toUpperCase().startsWith(`${targetAisle}-`)).length;
    textElem.textContent = `แถว ${targetAisle} ปัจจุบันจัดเก็บสินค้าอยู่แล้ว ${count} เครื่อง`;
}

async function executeBatchRelocate() {
    const targetAisle = document.getElementById('batchRelocateAisleSelect').value;
    const targetSnArray = Array.from(selectedItemSnSet);

    showToast("⏳ กำลังดำเนินการย้ายพิกัดสินค้าทั้งหมด...");

    for (let i = 0; i < targetSnArray.length; i++) {
        const sn = targetSnArray[i];
        const item = globalInventoryData.find(item => item.sn === sn);
        if (item) {
            let newLoc = 'DOCK';
            if (targetAisle !== 'DOCK') {
                newLoc = `${targetAisle}-01-1-01`;
            }
            item.location = newLoc;
            if (navigator.onLine) {
                await _supabase.from('warehouse_items').update({ location: newLoc }).eq('sn', sn);
            }
        }
    }

    rebuildOccupiedSet();
    selectedItemSnSet.clear();
    updateSelectedCountUI();
    filterInventoryData();
    refreshLocationVisualizerIfActive();
    closeBatchRelocateModal();

    playSuccessSound();
    showToast(`🎉 ย้ายสินค้าจำนวน ${targetSnArray.length} รายการไปยังแถว ${targetAisle} เรียบร้อยแล้ว`);
}

function openExcelExportModal() {
    document.getElementById('excelExportModal').style.display = 'flex';
    populateAisleDropdowns();
}

function closeExcelExportModal() {
    document.getElementById('excelExportModal').style.display = 'none';
}

function onExportScopeChange(val) {
    const group = document.getElementById('exportAisleGroup');
    if (val === 'AISLE') group.style.display = 'block';
    else group.style.display = 'none';
}

// EXCEL EXPORT WITH PERFECT COLUMN WIDTHS
function executeExcelExport() {
    const scope = document.getElementById('exportScopeSelect').value;
    let exportData = [];

    if (scope === 'ALL') {
        exportData = globalInventoryData;
    } else if (scope === 'AISLE') {
        const targetAisle = document.getElementById('exportAisleSelect').value;
        exportData = globalInventoryData.filter(i => {
            if (targetAisle === 'DOCK') return (i.location || '').toUpperCase() === 'DOCK';
            return (i.location || '').toUpperCase().startsWith(`${targetAisle}-`);
        });
    } else {
        const query = document.getElementById('searchInput').value.trim().toLowerCase();
        exportData = globalInventoryData.filter(i => 
            !query || i.sn.toLowerCase().includes(query) || (i.name && i.name.toLowerCase().includes(query))
        );
    }

    if (exportData.length === 0) {
        alert("⚠ ไม่พบข้อมูลที่จะส่งออก Excel");
        return;
    }

    const formattedRows = exportData.map((item, idx) => ({
        "ลำดับ": idx + 1,
        "รหัสสินค้า (SKU)": item.category || 'N/A',
        "ชื่อรุ่น / รายละเอียดสินค้า": item.name || '-',
        "เลขมิเตอร์ (Meter)": item.meter || 0,
        "หมายเลขซีเรียล (S/N)": item.sn,
        "พิกัดจัดเก็บ (Location)": formatLocationCode(item.location),
        "จำนวน": item.qty || 1,
        "วัน-เวลาบันทึกรับเข้า": item.created_at ? new Date(item.created_at).toLocaleString('th-TH') : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);

    // Auto Column Width Calculation
    const columnWidths = [
        { wch: 8 },   // ลำดับ
        { wch: 22 },  // รหัสสินค้า
        { wch: 45 },  // ชื่อรุ่น
        { wch: 18 },  // เลขมิเตอร์
        { wch: 25 },  // S/N
        { wch: 22 },  // พิกัด
        { wch: 10 },  // จำนวน
        { wch: 26 }   // วันเวลา
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WMS_Inventory_Report");
    XLSX.writeFile(workbook, `WMS_Inventory_Report_${new Date().toISOString().slice(0,10)}.xlsx`);

    closeExcelExportModal();
    showToast("📊 ส่งออกไฟล์ Excel สำเร็จเรียบร้อย (จัดคอลัมน์สวยงาม 100%)");
}