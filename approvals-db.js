// =========================================================================
// --- MODULE 6: APPROVAL REQUESTS DATABASE & REALTIME NOTIFICATION ENGINE ---
// =========================================================================

let pendingApprovalsList = [];
let approvalStatusFilter = 'ALL';
let approvalPollingTimer = null;
let approvalRealtimeChannel = null;
let userTrackedRequestStatuses = {};

async function createPendingApprovalRequest(type, desc, targetSns, payloadData) {
    if (typeof requireOnline === 'function' && !requireOnline('ส่งคำขออนุมัติต้องเชื่อมต่ออินเทอร์เน็ต')) {
        return false;
    }
    
    const cleanTargetSns = Array.isArray(targetSns)
        ? targetSns.filter(s => s !== null && s !== undefined && String(s).trim() !== '').map(s => String(s).trim())
        : (targetSns ? [String(targetSns).trim()] : []);

    if (cleanTargetSns.length === 0) {
        if (typeof playErrorSound === 'function') playErrorSound();
        if (typeof showToast === 'function') showToast("⚠️ ไม่พบหมายเลข S/N ที่ต้องการส่งคำขออนุมัติ", true);
        return false;
    }

    const usernameVal = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.username || 'user') : 'user';
    const nameVal = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || currentUser.full_name || currentUser.username || 'User General') : 'User General';

    const requestPayload = {
        requester_username: String(usernameVal),
        requester_name: String(nameVal),
        request_type: String(type || 'DELETE'),
        description: String(desc || 'ขอดำเนินการเกี่ยวกับสต็อกสินค้า'),
        target_sns: cleanTargetSns,
        payload: payloadData || {},
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        if (navigator.onLine && window._supabase) {
            const { data, error } = await _supabase
                .from('approval_requests')
                .insert([requestPayload])
                .select();

            if (error) throw new Error(error.message || "ข้อผิดพลาดจากฐานข้อมูล");
        }

        showFloatingNotificationAlert(
            "📤 ส่งคำขออนุมัติสำเร็จ!",
            `รายการ: ${desc}\nสถานะ: กำลังรอผู้ดูแลระบบ (Admin) ตรวจสอบและกดอนุมัติ`,
            "warning"
        );

        if (typeof playSuccessSound === 'function') playSuccessSound();
        if (typeof logUserActivity === 'function') await logUserActivity('APPROVAL_REQ', `ส่งคำขอรออนุมัติ [${type}]: ${desc}`);
        await loadPendingApprovalsFromDB();
        
        return true;
    } catch(e) {
        if (typeof playErrorSound === 'function') playErrorSound();
        alert(`❌ ไม่สามารถส่งคำขออนุมัติได้: ${e.message}`);
        return false;
    }
}

async function loadPendingApprovalsFromDB() {
    const tbody = document.getElementById('approvalsTableBody');
    if (!navigator.onLine) return;

    try {
        let query = _supabase.from('approval_requests').select('*');
        if (approvalStatusFilter !== 'ALL') {
            query = query.eq('status', approvalStatusFilter);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false }).limit(200);

        if (!error && data) {
            pendingApprovalsList = data;
            const currentPendingCount = data.filter(r => r.status === 'PENDING').length;

            if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'user') {
                data.forEach(req => {
                    if (req.requester_username === currentUser.username) {
                        const oldStatus = userTrackedRequestStatuses[req.id];
                        if (oldStatus && oldStatus === 'PENDING' && req.status === 'APPROVED') {
                            if (typeof playSuccessSound === 'function') playSuccessSound();
                            if (typeof speakThaiText === 'function') speakThaiText("ผู้ดูแลระบบอนุมัติคำขอของคุณเรียบร้อยแล้วค่ะ");
                            showFloatingNotificationAlert(
                                "🎉 ผู้ดูแลระบบกดอนุมัติให้แล้ว!",
                                `คำขอ "${req.description}" ได้รับการอนุมัติแล้ว ระบบทำการอัปเดตข้อมูลให้อัตโนมัติ`,
                                "success"
                            );
                            loadDataFromDatabase();
                        } else if (oldStatus && oldStatus === 'PENDING' && req.status === 'REJECTED') {
                            if (typeof playErrorSound === 'function') playErrorSound();
                            showFloatingNotificationAlert(
                                "❌ คำขอถูกปฏิเสธ",
                                `ผู้ดูแลระบบ (Admin) ได้ปฏิเสธคำขอ "${req.description}" ของคุณ`,
                                "danger"
                            );
                        }
                        userTrackedRequestStatuses[req.id] = req.status;
                    }
                });
            }

            if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin') {
                updateAdminApprovalBadgeUI(currentPendingCount);
            }

            if (tbody) renderApprovalsTable(data);
        }
    } catch(e) {}
}

function updateAdminApprovalBadgeUI(count) {
    const badgeElem = document.getElementById('sidebarApprovalBadge');
    if (badgeElem) {
        if (count > 0) {
            badgeElem.style.display = 'inline-flex';
            badgeElem.textContent = count;
        } else {
            badgeElem.style.display = 'none';
        }
    }
}

function startApprovalRealtimeMonitor() {
    initApprovalRealtimeSubscription();
    if (approvalPollingTimer) clearInterval(approvalPollingTimer);
    loadPendingApprovalsFromDB();
    approvalPollingTimer = setInterval(() => { loadPendingApprovalsFromDB(); }, 3000);
}

function initApprovalRealtimeSubscription() {
    if (!window.supabase || !_supabase) return;
    if (approvalRealtimeChannel) {
        try { _supabase.removeChannel(approvalRealtimeChannel); } catch(e) {}
    }
    approvalRealtimeChannel = _supabase
        .channel('realtime_approval_requests_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, (payload) => {
            handleApprovalRealtimePayload(payload);
        })
        .subscribe();
}

function handleApprovalRealtimePayload(payload) {
    const eventType = payload.eventType;
    const newRecord = payload.new;
    if (!newRecord) return;

    if (eventType === 'INSERT' && newRecord.status === 'PENDING') {
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin') {
            if (typeof playErrorSound === 'function') playErrorSound();
            if (typeof speakThaiText === 'function') speakThaiText("มีคำขออนุมัติใหม่เข้ามาค่ะ");
            showFloatingNotificationAlert(
                "🚨 คำขออนุมัติใหม่เข้ามา!",
                `ผู้ส่ง: ${newRecord.requester_name || newRecord.requester_username}\nรายการ: ${newRecord.description}`,
                "warning"
            );
            loadPendingApprovalsFromDB();
        }
    } 
    else if (eventType === 'UPDATE') {
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.username === newRecord.requester_username) {
            if (newRecord.status === 'APPROVED') {
                if (typeof playSuccessSound === 'function') playSuccessSound();
                if (typeof speakThaiText === 'function') speakThaiText("ผู้ดูแลระบบอนุมัติคำขอของคุณเรียบร้อยแล้วค่ะ");
                showFloatingNotificationAlert(
                    "🎉 ผู้ดูแลระบบกดอนุมัติให้แล้ว!",
                    `คำขอ "${newRecord.description}" ได้รับการอนุมัติเรียบร้อย`,
                    "success"
                );
                loadDataFromDatabase();
            } else if (newRecord.status === 'REJECTED') {
                if (typeof playErrorSound === 'function') playErrorSound();
                showFloatingNotificationAlert(
                    "❌ คำขอถูกปฏิเสธ",
                    `คำขอ "${newRecord.description}" ของคุณถูกปฏิเสธ`,
                    "danger"
                );
            }
        }
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin') {
            loadPendingApprovalsFromDB();
        }
    }
}

function showFloatingNotificationAlert(title, message, type = 'info') {
    let container = document.getElementById('globalFloatingNotificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'globalFloatingNotificationContainer';
        container.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 999999;
            display: flex; flex-direction: column; gap: 12px;
            max-width: 420px; width: calc(100vw - 48px); pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const card = document.createElement('div');
    let borderColor = 'var(--primary, #2563eb)';
    let iconClass = 'fa-bell';
    
    if (type === 'success') { borderColor = 'var(--success, #10b981)'; iconClass = 'fa-circle-check'; }
    else if (type === 'warning') { borderColor = 'var(--warning, #f59e0b)'; iconClass = 'fa-triangle-exclamation'; }
    else if (type === 'danger') { borderColor = 'var(--danger, #ef4444)'; iconClass = 'fa-circle-xmark'; }

    card.style.cssText = `
        background: var(--bg-surface, #ffffff); border: 2px solid ${borderColor}; border-left: 6px solid ${borderColor};
        border-radius: 12px; padding: 14px 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        color: var(--text-main, #0f172a); pointer-events: auto; display: flex; align-items: flex-start; gap: 12px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); transform: translateY(20px); opacity: 0;
    `;

    card.innerHTML = `
        <div style="font-size: 1.5rem; color: ${borderColor}; margin-top: 2px;"><i class="fa-solid ${iconClass}"></i></div>
        <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 4px; color: var(--text-main);">${escapeHTML(title)}</div>
            <div style="font-size: 0.85rem; color: var(--text-sub, #334155); line-height: 1.4; white-space: pre-line;">${escapeHTML(message)}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem; padding: 0 4px;">&times;</button>
    `;

    container.appendChild(card);
    requestAnimationFrame(() => { card.style.transform = 'translateY(0)'; card.style.opacity = '1'; });
    setTimeout(() => {
        if (card && card.parentElement) {
            card.style.opacity = '0'; card.style.transform = 'translateX(50px)';
            setTimeout(() => card.remove(), 300);
        }
    }, 9000);
}

function renderApprovalsTable(approvals) {
    const tbody = document.getElementById('approvalsTableBody');
    if (!tbody) return;

    if (approvals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">ไม่มีรายการคำขอในขณะนี้</td></tr>`;
        return;
    }

    let html = '';
    approvals.forEach((item, idx) => {
        let statusBadge = `<span class="badge-action nav">⏳ รออนุมัติ</span>`;
        if (item.status === 'APPROVED') statusBadge = `<span class="badge-action inbound">✅ อนุมัติแล้ว</span>`;
        else if (item.status === 'REJECTED') statusBadge = `<span class="badge-action delete">❌ ปฏิเสธ</span>`;

        html += `
            <tr>
                <td style="text-align:center;" class="mono">${idx + 1}</td>
                <td style="font-size:0.78rem; color:var(--text-muted);">${new Date(item.created_at).toLocaleString('th-TH')}</td>
                <td><strong>${escapeHTML(item.requester_name || '-')}</strong> <br><small class="mono">(${escapeHTML(item.requester_username || '-')})</small></td>
                <td><span class="badge-action relocate">${escapeHTML(item.request_type || '-')}</span> ${statusBadge}</td>
                <td>${escapeHTML(item.description || '-')}</td>
                <td><code class="mono font-bold">${Array.isArray(item.target_sns) ? item.target_sns.map(s => escapeHTML(s)).join(', ') : escapeHTML(item.target_sns || '-')}</code></td>
                <td style="text-align:center;">
                    ${item.status === 'PENDING' ? `
                        <button class="btn btn-sm btn-success" onclick="approveUserRequest('${item.id}')"><i class="fa-solid fa-check"></i> อนุมัติ</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectUserRequest('${item.id}')"><i class="fa-solid fa-xmark"></i> ปฏิเสธ</button>
                    ` : `<small class="text-muted">โดย ${escapeHTML(item.approved_by || 'Admin')}</small>`}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

async function approveUserRequest(id) {
    const req = pendingApprovalsList.find(r => String(r.id) === String(id));
    if (!req) return;

    try {
        if (navigator.onLine) {
            if (req.request_type === 'DELETE') {
                await _supabase.from('warehouse_items').delete().in('sn', req.target_sns);
            } 
            else if (req.request_type === 'OUTBOUND') {
                const { destination, dispatcher, receiver, snList } = req.payload || {};
                if (snList && snList.length > 0) {
                    await _supabase.from('warehouse_items').delete().in('sn', snList);
                    await _supabase.from('outbound_orders').insert([{
                        destination, dispatcher, receiver, sn_list: snList, items_count: snList.length, created_at: new Date().toISOString()
                    }]);
                }
            } 
            else if (req.request_type === 'RELOCATE') {
                const { sn, newLoc } = req.payload || {};
                const targetSn = sn || (req.target_sns && req.target_sns[0]);
                if (targetSn && newLoc) {
                    await _supabase.from('warehouse_items').update({ location: newLoc }).eq('sn', targetSn);
                }
            } 
            else if (req.request_type === 'BATCH_RELOCATE') {
                const { snList, targetAisle } = req.payload || {};
                const list = snList || req.target_sns || [];
                if (list.length > 0 && targetAisle) {
                    for (const sn of list) {
                        const freeLoc = allocateFreeSlot(targetAisle);
                        await _supabase.from('warehouse_items').update({ location: freeLoc }).eq('sn', sn);
                    }
                }
            }

            await _supabase.from('approval_requests').update({ 
                status: 'APPROVED', 
                approved_by: currentUser ? currentUser.username : 'admin',
                updated_at: new Date().toISOString()
            }).eq('id', id);
        }

        if (typeof playSuccessSound === 'function') playSuccessSound();
        showToast(`✅ อนุมัติคำขอเรียบร้อยแล้ว (อัปเดต DB 100%)`);
        await loadPendingApprovalsFromDB();
        await loadDataFromDatabase();
    } catch(err) {
        if (typeof playErrorSound === 'function') playErrorSound();
        showToast("⚠️ เกิดข้อผิดพลาดในการอนุมัติคำขอ", true);
    }
}

async function rejectUserRequest(id) {
    if (navigator.onLine) {
        await _supabase.from('approval_requests').update({ 
            status: 'REJECTED', 
            approved_by: currentUser ? currentUser.username : 'admin',
            updated_at: new Date().toISOString()
        }).eq('id', id);
    }

    if (typeof playSuccessSound === 'function') playSuccessSound();
    showToast(`⛔ ปฏิเสธคำขอเรียบร้อยแล้ว`);
    await loadPendingApprovalsFromDB();
}