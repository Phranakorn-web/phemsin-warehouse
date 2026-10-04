// =========================================================================
// --- MODULE 3: FAST INBOUND DATABASE ENGINE ---
// =========================================================================

let recentInboundList = [];

async function handleInboundSubmit(e) {
    if (e) e.preventDefault();

    const snInput = document.getElementById('inboundSn');
    const sn = snInput.value.trim();
    const category = document.getElementById('inboundCategory').value.trim();
    const name = document.getElementById('inboundName').value.trim();
    const meterVal = parseInt(document.getElementById('inboundMeter').value) || 0;
    const location = document.getElementById('inboundLocationPreview').textContent;

    if (!sn) return;
    if (!category || !name) {
        playErrorSound();
        showToast('⚠️ กรุณาเลือก/กรอก SKU และชื่อรุ่นก่อนสแกน S/N', true);
        return;
    }

    if (globalInventoryData.some(i => String(i.sn).toLowerCase() === sn.toLowerCase()) || isPendingSn(sn)) {
        playErrorSound();
        showToast(`🚨 S/N "${escapeHTML(sn)}" มีอยู่ในระบบสต็อกแล้ว!`, true);
        snInput.select();
        return;
    }

    if (location !== 'DOCK' && location !== 'OFFICE' && location !== 'PENDING') {
        if (occupiedLocationsSet.has(location.toUpperCase())) {
            playErrorSound();
            showToast(`⛔ พิกัด ${location} มีสินค้าจัดเก็บอยู่แล้ว! ระบบกำลังปรับเลือกพิกัดใหม่ให้อัตโนมัติ`, true);
            autoSelectNextAvailableSlotAfterInbound();
            return;
        }
    }

    const rawPayload = { category, name, sn, meter: meterVal, location, qty: 1, created_at: new Date().toISOString() };

    snInput.value = '';
    snInput.focus();

    playSuccessSound();
    if (voiceSettings.inboundVoice) speakThaiText(`รับสินค้าซีเรียล ${sn} เข้าพิกัด ${location} เรียบร้อยค่ะ`);

    if (navigator.onLine) {
        try {
            const cleanData = sanitizeForDb(rawPayload);
            const { data, error } = await _supabase.from('warehouse_items').insert([cleanData]).select();

            if (error) {
                console.error("Supabase Direct Insert Error:", error);
                if (error.code === '23505') {
                    playErrorSound();
                    showToast(`🚨 S/N "${escapeHTML(sn)}" มีอยู่ในฐานข้อมูล Supabase แล้ว!`, true);
                    return;
                } else {
                    playErrorSound();
                    showToast(`⚠️ เกิดข้อผิดพลาดจาก DB: ${error.message}`, true);
                    
                    rawPayload._pending = true;
                    globalInventoryData.unshift(rawPayload);
                    offlineInboundQueue.push(rawPayload);
                    persistQueue();

                    recentInboundList.unshift({
                        sn, category, name, meter: meterVal, location,
                        time: new Date().toLocaleTimeString('th-TH'),
                        isOffline: true
                    });
                }
            } else {
                const insertedItem = (data && data[0]) ? data[0] : cleanData;
                globalInventoryData.unshift(insertedItem);

                recentInboundList.unshift({
                    sn, category, name, meter: meterVal, location,
                    time: new Date().toLocaleTimeString('th-TH'),
                    isOffline: false
                });
                if (recentInboundList.length > 100) recentInboundList.length = 100;

                showToast(`✅ บันทึก S/N: ${escapeHTML(sn)} เข้าฐานข้อมูลเรียบร้อยแล้ว`);
            }
        } catch (err) {
            console.error('Inbound submit exception:', err);
            rawPayload._pending = true;
            globalInventoryData.unshift(rawPayload);
            offlineInboundQueue.push(rawPayload);
            persistQueue();

            recentInboundList.unshift({
                sn, category, name, meter: meterVal, location,
                time: new Date().toLocaleTimeString('th-TH'),
                isOffline: true
            });
            showToast(`🟠 สัญญาณขัดข้อง เก็บ S/N: ${escapeHTML(sn)} ไว้ในเครื่องแล้ว`, true);
        }
    } else {
        rawPayload._pending = true;
        globalInventoryData.unshift(rawPayload);
        offlineInboundQueue.push(rawPayload);
        persistQueue();

        recentInboundList.unshift({
            sn, category, name, meter: meterVal, location,
            time: new Date().toLocaleTimeString('th-TH'),
            isOffline: true
        });
        showToast(`🟠 (ออฟไลน์) เก็บ S/N: ${escapeHTML(sn)} ไว้ในเครื่องแล้ว`);
    }

    updateKPIs();
    filterInventoryData();
    refreshLocationVisualizerIfActive();
    autoSelectNextAvailableSlotAfterInbound();
    renderLiveInboundFeed();

    logUserActivity('INBOUND', `รับเข้าสินค้า [SKU: ${category}] ${name} เข้าพิกัด ${location}`, sn);
}

async function loadRecentInboundFeedFromDB() {
    if (!navigator.onLine) return;
    try {
        const { data, error } = await _supabase
            .from('warehouse_items')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            recentInboundList = data.map(item => ({
                sn: item.sn,
                category: item.category || 'N/A',
                name: item.name || '-',
                meter: item.meter || 0,
                location: item.location || 'DOCK',
                time: item.created_at ? new Date(item.created_at).toLocaleTimeString('th-TH') : '-',
                isOffline: false
            }));
            renderLiveInboundFeed();
        }
    } catch (e) {}
}

function renderLiveInboundFeed() {
    const container = document.getElementById('liveInboundFeedContainer');
    if(!container || recentInboundList.length === 0) return;

    let html = '';
    recentInboundList.forEach(item => {
        const syncBadge = item.isOffline 
            ? `<span class="badge-action delete" style="font-size:0.7rem;"><i class="fa-solid fa-wifi-slash"></i> รอนำเข้า DB</span>`
            : `<span class="badge-action inbound" style="font-size:0.7rem;"><i class="fa-solid fa-circle-check"></i> บันทึก DB แล้ว</span>`;

        const cancelBtn = item.isOffline 
            ? `<button class="btn btn-sm btn-danger" style="padding:2px 6px; font-size:0.7rem;" onclick="removePendingItemBySn('${escapeHTML(item.sn)}')" title="ยกเลิกการรออนุมัติ/บันทึก"><i class="fa-solid fa-xmark"></i> ลบคิว</button>` 
            : '';

        const feedClass = item.isOffline ? 'db-pending-warn' : 'db-synced-success';

        html += `
            <div class="feed-item ${feedClass}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="mono font-bold" style="color:var(--text-main); font-size:0.9rem;">S/N: ${escapeHTML(item.sn)}</span>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${syncBadge}
                        ${cancelBtn}
                        <span class="badge-location mono" style="font-size:0.75rem;">📍 ${escapeHTML(formatLocationCode(item.location))}</span>
                    </div>
                </div>
                <div class="text-multiline-truncate" style="font-size:0.8rem; color:var(--text-sub); font-weight:500;" title="[${escapeHTML(item.category)}] ${escapeHTML(item.name)}">
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

function onSkuSearchInput(val) {
    const box = document.getElementById('skuSuggestionsBox');
    if (!box) return;

    if (!val.trim()) {
        box.style.display = 'none';
        return;
    }

    const query = val.toLowerCase().trim();
    const skuMap = new Map();

    globalMasterProducts.concat(globalInventoryData).forEach(item => {
        const skuKey = (item.category || item.sku || '').trim();
        const nameVal = (item.name || '').trim();

        if (skuKey && !skuMap.has(skuKey.toLowerCase())) {
            if (skuKey.toLowerCase().includes(query) || nameVal.toLowerCase().includes(query)) {
                skuMap.set(skuKey.toLowerCase(), { sku: skuKey, name: nameVal });
            }
        }
    });

    const uniqueResults = Array.from(skuMap.values()).slice(0, 50);

    if (uniqueResults.length === 0) {
        box.innerHTML = `<div style="padding:12px; text-align:center; color:var(--text-muted); font-size:0.85rem;">ไม่พบข้อมูล SKU / ชื่อรุ่น "${escapeHTML(val)}" ในฐานข้อมูล</div>`;
        box.style.display = 'block';
        return;
    }

    let html = '';
    uniqueResults.forEach(item => {
        html += `
            <div class="suggestion-item" onclick="selectSkuSuggestion('${escapeHTML(item.sku)}', '${escapeHTML(item.name)}')">
                <span class="mono font-bold" style="color:var(--primary-text);">${escapeHTML(item.sku)}</span>
                <span style="color:var(--text-main); font-size:0.82rem; margin-left:10px;">${escapeHTML(item.name)}</span>
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