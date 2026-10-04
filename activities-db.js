// =========================================================================
// --- MODULE 7: USER ACTIVITIES LOGS DATABASE ENGINE ---
// =========================================================================

let globalActivityLogs = [];
let currentInspectedUserLogs = [];
let currentInspectedUser = null;

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
    if (navigator.onLine) {
        try {
            await _supabase.from('user_activities').insert([payload]);
            return;
        } catch (e) {}
    }
    offlineActivityQueue.push(payload);
    persistQueue();
}

async function loadUserActivityLogsFromDB() {
    const tbody = document.getElementById('activityLogsTableBody');
    if (!tbody) return;

    if (!navigator.onLine) return;

    try {
        const { data, error } = await _supabase
            .from('user_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(300);

        if(!error && data) {
            globalActivityLogs = data;
            filterActivityLogs();
        }
    } catch(e) {}
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
    if (!tbody) return;

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