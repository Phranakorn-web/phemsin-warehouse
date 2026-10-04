// =========================================================================
// --- MODULE 4: OUTBOUND ORDERS DATABASE ENGINE ---
// =========================================================================

let recentOutboundOrders = [];
let outboundCartItems = [];

function handleAddOutboundToCart(e) {
    if (e) e.preventDefault();
    const snInput = document.getElementById('outboundSn');
    if (!snInput) return;

    const sn = snInput.value.trim();
    if(!sn) return;

    const item = globalInventoryData.find(i => i.sn.toLowerCase() === sn.toLowerCase());
    if(!item) {
        playErrorSound();
        showToast(`❌ ไม่พบ S/N "${escapeHTML(sn)}" ในระบบสต็อก!`, true);
        snInput.select();
        return;
    }

    if(outboundCartItems.some(i => i.sn.toLowerCase() === sn.toLowerCase())) {
        playErrorSound();
        showToast(`⚠ S/N "${escapeHTML(sn)}" มีอยู่ในรายการตัดจ่ายแล้ว`, true);
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
    if (!tbody) return;

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

// 🟢 ส่งคำขอจ่ายสินค้าออกสำหรับ User ทั่วไป หรือดำเนินการตัดจ่ายทันทีสำหรับ Admin
async function requestOutboundApproval() {
    if (!requireOnline('ตัดจ่าย/ส่งคำขอต้องเชื่อมต่ออินเทอร์เน็ต')) return;
    if(outboundCartItems.length === 0) {
        alert("⚠ กรุณายิงสแกน S/N สินค้าอย่างน้อย 1 รายการเพื่อตัดจ่าย");
        return;
    }

    const dest = document.getElementById('outboundDestination').value.trim();
    const dispatcher = document.getElementById('outboundDispatcher').value.trim();
    const receiver = document.getElementById('outboundReceiver').value.trim();

    if(!dest || !dispatcher || !receiver) {
        alert("⚠️ กรุณากรอกข้อมูลสถานที่จ่าย, ผู้ส่ง และ ผู้รับ ให้ครบถ้วน");
        return;
    }

    const snList = outboundCartItems.map(i => i.sn);

    // 🟢 หากผู้ใช้เป็น User ทั่วไป -> ส่งคำขออนุมัติจ่ายออก
    if (currentUser && currentUser.role === 'user') {
        const success = await createPendingApprovalRequest(
            'OUTBOUND', 
            `ขอตัดจ่ายสินค้าออกจากคลังไปยัง: ${dest} (${snList.length} รายการ)`, 
            snList, 
            { destination: dest, dispatcher: dispatcher, receiver: receiver, snList: snList }
        );
        
        if (success) {
            outboundCartItems = [];
            renderOutboundCartTable();
        }
        return;
    }

    // 🟢 หากเป็น Admin -> ดำเนินการตัดจ่ายลง DB โดยตรง
    await processFinalOutboundWorkOrder();
}

async function processFinalOutboundWorkOrder() {
    if (!requireOnline('ตัดจ่ายสินค้าต้องออนไลน์')) return;
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

    await logUserActivity('OUTBOUND', `ตัดจ่ายสินค้าไปที่: ${dest} (จำนวน ${outboundCartItems.length} เครื่อง)`);

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
    if (!container) return;

    if (!navigator.onLine) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">อยู่ในโหมดออฟไลน์</div>`;
        return;
    }

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
                            S/N: ${(order.sn_list || []).map(s => escapeHTML(s)).join(', ')}
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
    } catch(e) {}
}