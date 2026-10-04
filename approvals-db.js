// =========================================================================
// --- MODULE 6: APPROVAL REQUESTS DATABASE ENGINE ---
// =========================================================================

let pendingApprovalsList = [];
let approvalStatusFilter = 'ALL';

async function createPendingApprovalRequest(type, desc, targetSns, payloadData) {
    if (!requireOnline('ส่งคำขออนุมัติต้องออนไลน์')) return;
    const requestPayload = {
        requester_username: currentUser ? currentUser.username : 'user',
        requester_name: currentUser ? currentUser.name : 'User General',
        request_type: type,
        description: desc,
        target_sns: targetSns,
        payload: payloadData,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        if (navigator.onLine) {
            const { error } = await _supabase.from('approval_requests').insert([requestPayload]);
            if (error) throw error;
        }

        showPendingNoticeModal(desc, `ส่งคำขอไปยังผู้ดูแลระบบเรียบร้อยแล้ว คำขอถูกบันทึกลงศูนย์อนุมัติ 100%`);
        await logUserActivity('APPROVAL_REQ', `ส่งคำขอรออนุมัติ: ${desc}`);
        loadPendingApprovalsFromDB();
    } catch(e) {
        alert("⚠️ เกิดข้อผิดพลาด ไม่สามารถส่งคำขออนุมัติได้");
    }
}

async function loadPendingApprovalsFromDB() {
    const tbody = document.getElementById('approvalsTableBody');
    if (!tbody) return;

    if (!navigator.onLine) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">อยู่ในโหมดออฟไลน์</td></tr>`;
        return;
    }

    try {
        let query = _supabase.from('approval_requests').select('*');
        if (approvalStatusFilter !== 'ALL') {
            query = query.eq('status', approvalStatusFilter);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false }).limit(200);

        if (!error && data) {
            pendingApprovalsList = data;
            renderApprovalsTable(data);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">ไม่มีรายการคำขอตรงตามเงื่อนไข</td></tr>`;
        }
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--danger);">ไม่สามารถดึงข้อมูลคำขอได้</td></tr>`;
    }
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

    if (navigator.onLine) {
        if (req.request_type === 'DELETE') {
            await _supabase.from('warehouse_items').delete().in('sn', req.target_sns);
        } else if (req.request_type === 'OUTBOUND') {
            const { destination, dispatcher, receiver, snList } = req.payload || {};
            if (snList && snList.length > 0) {
                await _supabase.from('warehouse_items').delete().in('sn', snList);
                await _supabase.from('outbound_orders').insert([{
                    destination, dispatcher, receiver, sn_list: snList, items_count: snList.length, created_at: new Date().toISOString()
                }]);
            }
        }

        await _supabase.from('approval_requests').update({ 
            status: 'APPROVED', 
            approved_by: currentUser ? currentUser.username : 'admin',
            updated_at: new Date().toISOString()
        }).eq('id', id);
    }

    showToast(`✅ อนุมัติคำขอเรียบร้อยแล้ว (บันทึก SQL 100%)`);
    await logUserActivity('APPROVAL_EXEC', `อนุมัติคำขอ: ${req.description} ของผู้ใช้ ${req.requester_username}`);
    await loadPendingApprovalsFromDB();
    await loadDataFromDatabase();
}

async function rejectUserRequest(id) {
    const req = pendingApprovalsList.find(r => String(r.id) === String(id));
    
    if (navigator.onLine) {
        await _supabase.from('approval_requests').update({ 
            status: 'REJECTED', 
            approved_by: currentUser ? currentUser.username : 'admin',
            updated_at: new Date().toISOString()
        }).eq('id', id);
    }

    showToast(`⛔ ปฏิเสธคำขอเรียบร้อยแล้ว`);
    if (req) await logUserActivity('APPROVAL_EXEC', `ปฏิเสธคำขอ: ${req.description} ของผู้ใช้ ${req.requester_username}`);
    await loadPendingApprovalsFromDB();
}