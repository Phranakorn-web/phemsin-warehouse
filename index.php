<?php 
// =========================================================================
// --- WMS Enterprise Suite v2026 Ultimate (Fully Synced & Fixed Engine) ---
// =========================================================================
session_start();
date_default_timezone_set('Asia/Bangkok');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ระบบบริหารจัดการคลังสินค้า (WMS Enterprise Ultimate)</title>
    
    <!-- Google Fonts & Font Awesome Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <!-- External Libraries: Supabase, SheetJS & JsBarcode -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>

    <style>
        :root {
            --bg-body: #f8fafc;
            --bg-surface: #ffffff;
            --bg-subtle: #f1f5f9;
            --bg-hover: #e2e8f0;
            
            --border-color: #e2e8f0;
            --border-strong: #cbd5e1;
            
            --text-main: #0f172a;
            --text-sub: #334155;
            --text-muted: #64748b;
            --text-white: #ffffff;
            
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --primary-light: #eff6ff;
            --primary-border: #bfdbfe;
            
            --success: #059669;
            --success-light: #ecfdf5;
            --warning: #d97706;
            --warning-light: #fffbeb;
            --danger: #dc2626;
            --danger-light: #fef2f2;
            
            --sidebar-width: 260px;
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 14px;
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
            --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.12);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Prompt', sans-serif;
            background-color: var(--bg-body);
            color: var(--text-main);
            display: flex;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
        }
        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Fullscreen Layout Structure */
        .sidebar {
            width: var(--sidebar-width);
            background: #0f172a;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            z-index: 100;
        }
        .sidebar-brand {
            padding: 1.25rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .brand-icon {
            width: 40px;
            height: 40px;
            background: var(--primary);
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: #ffffff;
            box-shadow: 0 0 12px rgba(37, 99, 235, 0.4);
        }
        .sidebar-menu {
            list-style: none;
            padding: 1rem 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
            overflow-y: auto;
        }
        .menu-item button {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border: none;
            background: transparent;
            color: #94a3b8;
            font-family: 'Prompt', sans-serif;
            font-size: 0.92rem;
            font-weight: 500;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.15s ease-out;
            text-align: left;
        }
        .menu-item button:hover {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-white);
        }
        .menu-item button.active {
            background: var(--primary);
            color: var(--text-white);
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .main-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            width: calc(100% - var(--sidebar-width));
        }

        .top-navbar {
            height: 60px;
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
            flex-shrink: 0;
            box-shadow: var(--shadow-sm);
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 20px;
            background: var(--bg-subtle);
            border: 1px solid var(--border-color);
            font-size: 0.82rem;
            font-weight: 600;
            color: var(--text-sub);
        }
        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--success);
            box-shadow: 0 0 8px var(--success);
        }
        .pulse-dot.offline {
            background: var(--danger);
            box-shadow: 0 0 8px var(--danger);
        }

        .content-area {
            flex: 1;
            padding: 1.25rem;
            overflow-y: auto;
        }

        /* Cards */
        .card {
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
            box-shadow: var(--shadow-sm);
            margin-bottom: 1.25rem;
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--border-color);
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .card-title {
            font-size: 1.05rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-main);
        }

        /* KPI Dashboard Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1rem;
            margin-bottom: 1.25rem;
        }
        .kpi-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 1.1rem 1.25rem;
            border-left: 5px solid var(--primary);
            box-shadow: var(--shadow-sm);
        }
        .kpi-card.green { border-left-color: var(--success); }
        .kpi-card.amber { border-left-color: var(--warning); }
        .kpi-title { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
        .kpi-value { font-size: 1.8rem; font-weight: 700; margin-top: 4px; color: var(--text-main); }

        .fullscreen-split-layout {
            display: grid;
            grid-template-columns: 1fr 380px;
            gap: 1.25rem;
            align-items: start;
        }

        .db-stat-box {
            background: var(--primary-light);
            border: 1px solid var(--primary-border);
            border-radius: var(--radius-md);
            padding: 0.9rem 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.25rem;
        }

        /* Autocomplete Box */
        .autocomplete-wrapper { position: relative; }
        .suggestions-box {
            position: absolute;
            top: 100%; left: 0; right: 0;
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            max-height: 240px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: var(--shadow-md);
            display: none;
        }
        .suggestion-item {
            padding: 10px 14px;
            cursor: pointer;
            font-size: 0.88rem;
            border-bottom: 1px solid var(--bg-subtle);
            transition: background 0.15s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .suggestion-item:hover {
            background: var(--primary-light);
            color: var(--primary);
        }

        .feed-item {
            background: var(--bg-subtle);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 10px 12px;
            margin-bottom: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            border-left: 4px solid var(--success);
        }
        .feed-item.outbound { border-left-color: var(--warning); }
        .feed-item.offline-queued { border-left-color: var(--warning); background: var(--warning-light); }
        .feed-item.db-synced-success { border-left-color: var(--success); background: var(--success-light); }

        /* Form Controls */
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.8rem;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-bottom: 0.8rem;
        }
        .form-group label {
            font-size: 0.84rem;
            font-weight: 600;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .form-control, .form-select {
            width: 100%;
            padding: 9px 12px;
            border: 1px solid var(--border-strong);
            border-radius: var(--radius-md);
            font-size: 0.88rem;
            font-family: 'Prompt', sans-serif;
            background: var(--bg-surface);
            color: var(--text-main);
            outline: none;
            transition: all 0.2s ease;
        }
        .form-control:focus, .form-select:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 9px 16px;
            border-radius: var(--radius-md);
            font-size: 0.88rem;
            font-weight: 600;
            font-family: 'Prompt', sans-serif;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
        }
        .btn-sm { padding: 5px 10px; font-size: 0.78rem; border-radius: 6px; }
        .btn-primary { background: var(--primary); color: #fff; }
        .btn-primary:hover { background: var(--primary-hover); }
        .btn-success { background: var(--success); color: #fff; }
        .btn-warning { background: var(--warning); color: #fff; }
        .btn-danger { background: var(--danger); color: #fff; }
        .btn-secondary { background: var(--bg-subtle); color: var(--text-main); border: 1px solid var(--border-strong); }
        .btn-secondary:hover { background: var(--bg-hover); }

        /* Fullscreen Table Layout */
        .table-responsive {
            width: 100%;
            overflow-x: auto;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
            max-height: calc(100vh - 270px);
            overflow-y: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
            text-align: left;
        }
        th {
            position: sticky;
            top: 0;
            background: var(--bg-subtle);
            color: var(--text-main);
            font-weight: 700;
            padding: 10px 12px;
            border-bottom: 2px solid var(--border-color);
            z-index: 10;
            white-space: nowrap;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: middle;
            white-space: nowrap;
        }
        tbody tr:hover { background-color: var(--bg-subtle); }

        /* Badge Location */
        .badge-location {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.82rem;
            font-weight: 700;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
            box-shadow: 0 1px 2px rgba(37, 99, 235, 0.08);
        }

        /* Drill-down Location Rack Visualizer */
        .aisle-filter-bar {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-bottom: 1rem;
            background: var(--bg-subtle);
            padding: 0.6rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
        }
        .aisle-tab-btn {
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            background: transparent;
            border: 1px solid transparent;
            color: var(--text-muted);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        .aisle-tab-btn.active {
            background: #ffffff;
            color: var(--primary);
            border-color: var(--border-color);
            box-shadow: var(--shadow-sm);
        }

        .bays-grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
            gap: 0.8rem;
            margin-bottom: 1.25rem;
        }
        .bay-card-btn {
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0.85rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-sm);
            position: relative;
            overflow: hidden;
        }
        .bay-card-btn:hover { border-color: var(--primary); }
        .bay-card-btn.active {
            background: var(--primary-light);
            border-color: var(--primary);
            box-shadow: 0 0 10px rgba(37, 99, 235, 0.2);
        }

        .capacity-bar {
            height: 6px;
            width: 100%;
            background: #e2e8f0;
            position: absolute;
            bottom: 0;
            left: 0;
        }
        .capacity-fill { height: 100%; transition: width 0.3s ease; }
        .cap-green { background: var(--success); }
        .cap-amber { background: var(--warning); }
        .cap-red { background: var(--danger); }

        .rack-slots-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1rem;
        }
        .slot-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0.9rem;
            box-shadow: var(--shadow-sm);
        }
        .slot-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.6rem;
            padding-bottom: 0.4rem;
            border-bottom: 1px solid var(--border-color);
        }

        /* Modal Overlay */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(3px);
        }

        .toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #0f172a;
            color: #ffffff;
            padding: 12px 20px;
            border-radius: var(--radius-md);
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: var(--shadow-md);
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
            pointer-events: none;
            z-index: 10000;
            max-width: 80vw;
        }
        .toast.show { opacity: 1; transform: translateY(0); }
        .toast.error { background: var(--danger); }

        .view-section { display: none; }
        .view-section.active { display: block; }

        /* Thermal & A4 Barcode Styles */
        .thermal-label-container {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            justify-content: center;
            padding: 10px;
        }

        .barcode-card-box {
            border: 2px solid #0f172a !important;
            border-radius: 6px;
            padding: 6px 8px;
            background: #ffffff;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.08);
            page-break-inside: avoid;
            overflow: hidden;
        }

        .thermal-card-50x30 { width: 220px; height: 135px; }
        .thermal-card-40x30 { width: 180px; height: 125px; }
        .thermal-card-100x75 { width: 380px; height: 260px; }
        .thermal-card-100x150 { width: 380px; height: 520px; }

        .thermal-card-a4-grid {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            padding: 10px;
            background: #fff;
            box-sizing: border-box;
        }

        .barcode-svg-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            overflow: hidden;
        }
        .barcode-svg-container svg {
            max-width: 100% !important;
            height: auto !important;
        }

        .offline-notice-bar {
            background: var(--warning-light);
            border: 1px solid var(--warning);
            color: var(--warning);
            padding: 8px 12px;
            border-radius: var(--radius-md);
            font-size: 0.82rem;
            font-weight: 600;
            display: none;
            align-items: center;
            gap: 8px;
            margin-bottom: 0.8rem;
        }

        @media (max-width: 992px) {
            .fullscreen-split-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
            body { flex-direction: column; height: auto; overflow: auto; }
            .sidebar { width: 100%; }
            .main-wrapper { width: 100%; }
        }
    </style>
</head>
<body>

    <!-- Sidebar Navigation Menu -->
    <aside class="sidebar">
        <div class="sidebar-brand">
            <div class="brand-icon"><i class="fa-solid fa-boxes-stacked"></i></div>
            <div>
                <div style="font-weight: 800; font-size: 1.05rem; color:#fff;">WMS Enterprise</div>
                <div style="font-size: 0.72rem; color: #94a3b8;">ระบบบริหารจัดการคลังสินค้า Ultimate</div>
            </div>
        </div>

        <ul class="sidebar-menu" id="sidebarMenuList"></ul>
    </aside>

    <!-- Main Content Area -->
    <div class="main-wrapper">
        <header class="top-navbar">
            <div style="font-weight: 700; font-size: 1.15rem; display: flex; align-items: center; gap: 10px;" id="navTitleText">
                <i class="fa-solid fa-list-check" style="color:var(--primary);"></i> เช็คสต็อกคลังสินค้าทั้งหมด
            </div>
            
            <div style="display:flex; align-items:center; gap:10px;">
                <button class="btn btn-sm btn-secondary" onclick="playSuccessSound()" title="ทดสอบเสียงสแกนสำเร็จ">
                    <i class="fa-solid fa-volume-high" style="color:var(--success);"></i> เสียงรับ
                </button>
                <button class="btn btn-sm btn-secondary" onclick="playErrorSound()" title="ทดสอบเสียงสแกนผิดพลาด">
                    <i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> เสียงเตือน
                </button>
                <div class="status-badge" id="dbStatusBadge">
                    <span class="pulse-dot" id="dbPulseDot"></span>
                    <span id="dbStatusText">กำลังเชื่อมต่อ Supabase DB...</span>
                </div>
            </div>
        </header>

        <main class="content-area">

            <!-- VIEW 1: INVENTORY CHECK FULLSCREEN -->
            <section id="view-inventory" class="view-section active">
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-title"><i class="fa-solid fa-boxes-stacked" style="color:var(--primary);"></i> สินค้าทั้งหมดในคลัง</div>
                        <div class="kpi-value mono" id="kpiTotalItems">0</div>
                    </div>
                    <div class="kpi-card green">
                        <div class="kpi-title"><i class="fa-solid fa-tags" style="color:var(--success);"></i> SKU ในคลัง / Master</div>
                        <div class="kpi-value mono" id="kpiTotalModels" style="color:var(--success);">0</div>
                    </div>
                    <div class="kpi-card amber">
                        <div class="kpi-title"><i class="fa-solid fa-truck-loading" style="color:var(--warning);"></i> พักรอจัดเก็บ / DOCK</div>
                        <div class="kpi-value mono" id="kpiDockItems" style="color:var(--warning);">0</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><i class="fa-solid fa-warehouse" style="color:var(--primary);"></i> ตรวจเช็ครายการสต็อกสินค้า</div>
                        
                        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                            <button class="btn btn-primary" onclick="openBatchRelocateModal()">
                                <i class="fa-solid fa-arrows-split-up-and-left"></i> ย้ายรายการที่เลือก (<span id="selectedRelocateCountSpan">0</span>)
                            </button>
                            <button class="btn btn-danger" onclick="openDeleteConfirmModal('BATCH')">
                                <i class="fa-solid fa-trash-can"></i> ลบรายการที่เลือก (<span id="selectedCountSpan">0</span>)
                            </button>
                            <button class="btn btn-primary" onclick="openPrintBarcodeModal('SELECTED')">
                                <i class="fa-solid fa-print"></i> พิมพ์บาร์โค้ดสติ๊กเกอร์
                            </button>
                            <button class="btn btn-success" onclick="openExcelExportModal()">
                                <i class="fa-solid fa-file-excel"></i> ส่งออก Excel
                            </button>
                            <button class="btn btn-secondary" onclick="document.getElementById('importFileInput').click()">
                                <i class="fa-solid fa-file-import"></i> นำเข้าไฟล์ DB
                            </button>
                            <input type="file" id="importFileInput" style="display:none;" accept=".xlsx,.xls,.csv,.json" onchange="handleFileImport(event)">
                        </div>
                    </div>

                    <!-- Filter Controls Section -->
                    <div style="margin-bottom: 0.8rem; display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; justify-content: space-between; background:var(--bg-subtle); padding:0.7rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; flex:1;">
                            <input type="text" id="searchInput" class="form-control" style="max-width: 250px;" placeholder="🔍 ค้นหา S/N, SKU, ชื่อรุ่น..." oninput="filterInventoryData()">
                            
                            <!-- Filter By Aisle -->
                            <select id="filterAisleSelect" class="form-select mono" style="max-width: 160px;" onchange="onFilterAisleChange()">
                                <option value="ALL">📍 แสดงทุกแถว (All)</option>
                            </select>

                            <!-- Filter By Bay/Lock -->
                            <select id="filterBaySelect" class="form-select mono" style="max-width: 160px;" onchange="filterInventoryData()">
                                <option value="ALL">📦 ทุกล็อกในแถว</option>
                            </select>

                            <!-- Filter By Specific Location Slot -->
                            <select id="filterLocationSelect" class="form-select mono" style="max-width: 180px;" onchange="filterInventoryData()">
                                <option value="ALL">🏢 แสดงทุกช่องจัดเก็บ</option>
                            </select>
                        </div>
                        <span id="totalCountBadge" class="status-badge">ดึงข้อมูลแล้ว 0 รายการ</span>
                    </div>

                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 38px; text-align: center;"><input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAllItems(this.checked)"></th>
                                    <th style="width: 45px; text-align: center;">#</th>
                                    <th style="min-width: 130px;"><i class="fa-solid fa-barcode"></i> SKU</th>
                                    <th style="min-width: 220px;"><i class="fa-solid fa-box"></i> ชื่อรุ่น / รายละเอียด</th>
                                    <th style="min-width: 160px;"><i class="fa-solid fa-qrcode"></i> ซีเรียล (S/N)</th>
                                    <th style="min-width: 150px;"><i class="fa-solid fa-location-dot"></i> พิกัดจัดเก็บ</th>
                                    <th style="width: 60px; text-align: center;">จำนวน</th>
                                    <th style="min-width: 140px;"><i class="fa-solid fa-calendar-days"></i> รับเข้าเมื่อ</th>
                                    <th style="width: 75px; text-align: center;">พิมพ์</th>
                                    <th style="width: 70px; text-align: center;">ย้าย</th>
                                    <th style="width: 70px; text-align: center;">ลบ</th>
                                </tr>
                            </thead>
                            <tbody id="inventoryTableBody">
                                <tr><td colspan="11" style="text-align:center; padding:24px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูลทั้งหมดจาก DB...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- VIEW 2: FAST INBOUND RECEIVE -->
            <section id="view-inbound" class="view-section">
                <div class="db-stat-box">
                    <div>
                        <div style="font-size:0.85rem; color:var(--primary); font-weight:700;"><i class="fa-solid fa-database"></i> เชื่อมต่อฐานข้อมูลสินค้า Master (products)</div>
                        <div style="font-size:1.1rem; font-weight:800; color:var(--text-main);" id="inboundMasterProductsStatText">พร้อมค้นหาด่วนจาก 0 Master SKU</div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="loadDataFromDatabase()"><i class="fa-solid fa-rotate"></i> ซิงค์ข้อมูล DB</button>
                </div>

                <div id="offlineInboundNotice" class="offline-notice-bar">
                    <i class="fa-solid fa-wifi" style="color:var(--danger);"></i>
                    <span>คุณกำลังใช้ออฟไลน์โหมด ข้อมูลการรับเข้าจะถูกบันทึกลงในเครื่อง และจะอัปโหลดเข้าฐานข้อมูลโดยอัตโนมัติเมื่ออินเทอร์เน็ตกลับมา</span>
                </div>

                <div class="fullscreen-split-layout">
                    <!-- Left Column: Fast Inbound Form -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title">
                                <i class="fa-solid fa-arrow-right-to-bracket" style="color:var(--primary);"></i> 
                                <i class="fa-solid fa-box-tissue" style="color:var(--success);"></i> 
                                บันทึกรับสินค้าเข้าคลัง (Fast Inbound Engine)
                            </div>
                            <span class="status-badge"><i class="fa-solid fa-volume-high" style="color:var(--success);"></i> แจ้งเตือนด้วยเสียงสแกน</span>
                        </div>

                        <form id="inboundForm" onsubmit="handleInboundSubmit(event)">
                            <div class="form-group autocomplete-wrapper">
                                <label for="skuSearchInput"><i class="fa-solid fa-magnifying-glass" style="color:var(--primary);"></i> ค้นหารหัสสินค้า (SKU) หรือ ชื่อรุ่น จากฐานข้อมูล products</label>
                                <input type="text" id="skuSearchInput" class="form-control mono" style="font-weight:700;" placeholder="🔍 พิมพ์รหัสสินค้า หรือ ชื่อรุ่น เพื่อดึงข้อมูลอัตโนมัติ..." autocomplete="off" oninput="onSkuSearchInput(this.value)">
                                <div id="skuSuggestionsBox" class="suggestions-box"></div>
                            </div>

                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="inboundCategory"><i class="fa-solid fa-tag" style="color:var(--primary);"></i> รหัสสินค้า / SKU</label>
                                    <input type="text" id="inboundCategory" class="form-control mono" placeholder="เช่น 1102P13AX0" required>
                                </div>
                                <div class="form-group">
                                    <label for="inboundName"><i class="fa-solid fa-box-open" style="color:var(--primary);"></i> ชื่อรุ่น / รายละเอียดสินค้า</label>
                                    <input type="text" id="inboundName" class="form-control" placeholder="เช่น ECOSYS M4132idn" required>
                                </div>
                            </div>

                            <div class="form-group" style="background:var(--primary-light); border:1px solid var(--primary-border); padding:0.9rem; border-radius:var(--radius-md);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <label for="inboundSn" style="color:var(--primary); font-size:0.88rem; margin-bottom:0; font-weight:700;">
                                        <i class="fa-solid fa-barcode" style="font-size:1.1rem;"></i> หมายเลขซีเรียล (S/N)
                                    </label>
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="generateAutoSN()"><i class="fa-solid fa-wand-magic-sparkles"></i> สุ่ม S/N</button>
                                </div>
                                <input type="text" id="inboundSn" class="form-control mono" style="font-weight:700; font-size:1.1rem; border-color:var(--primary);" placeholder="🎯 ยิงปืนสแกน S/N แล้วกด Enter (มีเสียงเตือน)..." required autofocus>
                            </div>

                            <div class="card" style="background:var(--bg-subtle); padding:0.9rem; margin-top:0.4rem; margin-bottom:0.8rem;">
                                <div style="font-weight:700; font-size:0.85rem; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
                                    <span><i class="fa-solid fa-location-dot" style="color:var(--primary);"></i> เลือกพิกัดล็อกจัดเก็บ (ระบบคำนวณช่องว่างและรันล็อกให้อัตโนมัติ)</span>
                                    <span id="bayInboundCountBadge" style="font-size:0.78rem; font-weight:700; color:var(--primary);" class="mono">รับแล้วในช่องนี้: 0 เครื่อง</span>
                                </div>
                                
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label><i class="fa-solid fa-layer-group"></i> แถว (Aisle)</label>
                                        <select id="inboundAisleSelect" class="form-select mono" onchange="onInboundAisleOrBayChange()"></select>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fa-solid fa-cubes"></i> ล็อก (Bay)</label>
                                        <select id="inboundBaySelect" class="form-select mono" onchange="autoSelectAvailableSlot()"></select>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fa-solid fa-bars"></i> ชั้น (Shelf)</label>
                                        <select id="inboundShelfSelect" class="form-select mono" onchange="updateInboundLocationPreview()"></select>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fa-solid fa-border-all"></i> ช่องย่อย (Slot)</label>
                                        <select id="inboundSlotSelect" class="form-select mono" onchange="updateInboundLocationPreview()"></select>
                                    </div>
                                </div>
                                
                                <div style="font-size:0.88rem; font-weight:700; color:var(--primary); margin-top:4px;">
                                    พิกัดที่จะรับเข้า: <span id="inboundLocationPreview" class="badge-location mono">DOCK</span>
                                </div>
                            </div>

                            <button type="submit" id="inboundSubmitBtn" class="btn btn-primary" style="width: 100%; padding: 11px; font-size:0.95rem;">
                                <i class="fa-solid fa-cloud-arrow-up"></i> บันทึกรับสินค้าเข้า DB (ENTER)
                            </button>
                        </form>
                    </div>

                    <!-- Right Column: Live Inbound Feed -->
                    <div>
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title" style="font-size:0.95rem;"><i class="fa-solid fa-clock-rotate-left" style="color:var(--success);"></i> ประวัติการรับเข้าล่าสุด (Live Feed)</div>
                                <span class="status-badge" style="font-size:0.75rem;"><i class="fa-solid fa-signal"></i> เรียลไทม์</span>
                            </div>

                            <div id="liveInboundFeedContainer" style="max-height:480px; overflow-y:auto;">
                                <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">ยังไม่มีรายการรับเข้าใหม่ในรอบนี้</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- VIEW 3: OUTBOUND ISSUE & WORK ORDER ENGINE -->
            <section id="view-outbound" class="view-section">
                <div class="fullscreen-split-layout">
                    <!-- Left Column: Scan Outbound Form -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title"><i class="fa-solid fa-truck-arrow-right" style="color:var(--warning);"></i> บันทึกตัดจ่ายสินค้าออกจากคลัง (Outbound Work Order Engine)</div>
                            <span class="status-badge"><i class="fa-solid fa-file-invoice" style="color:var(--warning);"></i> ออกใบสั่งจ่ายสินค้า</span>
                        </div>

                        <form id="outboundForm" onsubmit="handleAddOutboundToCart(event)">
                            <div class="form-grid" style="margin-bottom:0.8rem;">
                                <div class="form-group">
                                    <label><i class="fa-solid fa-building-flag" style="color:var(--warning);"></i> สถานที่จ่ายไป / หน่วยงานปลายทาง</label>
                                    <input type="text" id="outboundDestination" class="form-control" placeholder="เช่น สาขาใหญ่ / ลูกค้าบริษัท ABC" required>
                                </div>
                                <div class="form-group">
                                    <label><i class="fa-solid fa-user-gear" style="color:var(--warning);"></i> ชื่อผู้จ่ายสินค้า (ผู้ส่ง)</label>
                                    <input type="text" id="outboundDispatcher" class="form-control" placeholder="เช่น นายสมชาย เจ้าหน้าที่คลัง" required>
                                </div>
                                <div class="form-group">
                                    <label><i class="fa-solid fa-user-check" style="color:var(--warning);"></i> ชื่อผู้รับสินค้า / ขนส่ง</label>
                                    <input type="text" id="outboundReceiver" class="form-control" placeholder="เช่น พนักงานขนส่ง / คุณวิชัย" required>
                                </div>
                            </div>

                            <div class="form-group" style="background:var(--warning-light); border:1px solid rgba(217, 119, 6, 0.3); padding:1rem; border-radius:var(--radius-md);">
                                <label for="outboundSn" style="color:var(--warning); font-size:0.95rem;"><i class="fa-solid fa-barcode"></i> ยิงสแกนหมายเลข S/N เพื่อสะสมลงใบสั่งจ่าย</label>
                                <input type="text" id="outboundSn" class="form-control mono" style="font-weight:700; font-size:1.1rem;" placeholder="🎯 ยิงสแกน S/N แล้วกด Enter..." autocomplete="off">
                            </div>

                            <!-- Outbound Cart Items List -->
                            <div style="margin-bottom:1rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                                    <strong style="font-size:0.88rem;"><i class="fa-solid fa-cart-flatbed"></i> รายการสินค้าที่จะตัดจ่ายในใบสั่งจ่ายนี้:</strong>
                                    <span class="badge-location mono" id="outboundCartCountBadge">0 รายการ</span>
                                </div>
                                <div class="table-responsive" style="max-height: 180px;">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>SKU</th>
                                                <th>ชื่อสินค้า</th>
                                                <th>S/N</th>
                                                <th>พิกัดเดิม</th>
                                                <th style="text-align:center;">ยกเลิก</th>
                                            </tr>
                                        </thead>
                                        <tbody id="outboundCartTableBody">
                                            <tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">ยังไม่มีรายการ ยิงสแกน S/N เพื่อเพิ่มเข้าใบสั่งจ่าย</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <button type="button" class="btn btn-warning" style="width: 100%; padding: 12px; font-size:0.95rem;" onclick="processFinalOutboundWorkOrder()">
                                <i class="fa-solid fa-receipt"></i> ยืนยันตัดจ่ายสินค้า + ออกใบงานจ่ายสินค้า (ENTER)
                            </button>
                        </form>
                    </div>

                    <!-- Right Column: Realtime Outbound Work Orders Feed -->
                    <div>
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title" style="font-size:0.95rem;"><i class="fa-solid fa-clock-rotate-left" style="color:var(--warning);"></i> ประวัติใบสั่งจ่ายล่าสุด (Outbound Orders)</div>
                                <span class="status-badge" style="font-size:0.75rem;"><i class="fa-solid fa-print"></i> พิมพ์ใบงานย้อนหลัง</span>
                            </div>

                            <div id="liveOutboundFeedContainer" style="max-height:480px; overflow-y:auto;">
                                <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">ยังไม่มีประวัติใบสั่งจ่ายสินค้า</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- VIEW 4: DRILL-DOWN LOCATION RACKS WITH REAL-SLOTS CAPACITY BARS -->
            <section id="view-locations" class="view-section">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><i class="fa-solid fa-map-location-dot" style="color:var(--primary);"></i> ผังตำแหน่งจัดเก็บในคลัง (Location Drill-Down Visualizer)</div>
                        <span id="drillDownStatusBadge" class="status-badge">คำนวณจำนวนช่องย่อยตามการตั้งค่าจริง</span>
                    </div>

                    <!-- Step 1: Select Aisle -->
                    <div style="font-size:0.85rem; font-weight:700; color:var(--text-sub); margin-bottom:0.5rem;">1. เลือกแถวจัดเก็บ (Select Aisle):</div>
                    <div id="aisleFilterBar" class="aisle-filter-bar"></div>

                    <!-- Step 2: Select Bay with Real Slots Capacity Status Bars -->
                    <div style="font-size:0.85rem; font-weight:700; color:var(--text-sub); margin-bottom:0.5rem;">2. เลือกล็อกจัดเก็บ (คำนวณตามจำนวนช่องย่อยจริง):</div>
                    <div id="baysGridContainer" class="bays-grid-container"></div>

                    <!-- Step 3: View Shelves & Slots Inside Selected Bay or DOCK -->
                    <div style="font-size:0.85rem; font-weight:700; color:var(--text-sub); margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
                        <span>3. รายการ S/N ทั้งหมดในพื้นที่ที่เลือก:</span>
                        <span id="bayCapacityInfoText" class="mono" style="color:var(--primary); font-weight:700;"></span>
                    </div>

                    <div id="rackSlotsGrid" class="rack-slots-grid"></div>
                </div>
            </section>

            <!-- VIEW 5: WAREHOUSE LOCATION CONFIG WITH INSTANT DB PERSISTENCE -->
            <section id="view-settings" class="view-section">
                <div class="card" style="width:100%;">
                    <div class="card-header">
                        <div class="card-title"><i class="fa-solid fa-gears" style="color:var(--primary);"></i> ตั้งค่าพิกัดคลังสินค้า (ซิงค์บันทึกเข้า DB อัตโนมัติทันที 100%)</div>
                        <span class="status-badge"><i class="fa-solid fa-bolt" style="color:var(--success);"></i> Realtime Database Sync</span>
                    </div>

                    <!-- Aisle & Location Config Table -->
                    <div style="margin-bottom:1.5rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem; flex-wrap:wrap; gap:0.5rem;">
                            <strong style="font-size:0.95rem; color:var(--text-main);"><i class="fa-solid fa-layer-group" style="color:var(--primary);"></i> ตั้งค่าแถวจัดเก็บ (Aisles), ล็อก, ชั้น และจำนวนช่องย่อย:</strong>
                            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                                <input type="text" id="newAisleInput" class="form-control mono" style="width:150px; padding:6px 10px;" placeholder="ชื่อแถวใหม่ เช่น E">
                                <button class="btn btn-primary" onclick="addNewAisleConfig()"><i class="fa-solid fa-plus"></i> เพิ่มแถวจัดเก็บ</button>
                                <button class="btn btn-success" onclick="saveAllWarehouseConfigsToDB()"><i class="fa-solid fa-floppy-disk"></i> บันทึกพิกัดทั้งหมดเข้า DB (Sync All Rows)</button>
                            </div>
                        </div>

                        <div class="table-responsive" style="max-height: initial;">
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width:50px; text-align:center;">ลำดับ</th>
                                        <th style="width:140px;">ชื่อแถว (Aisle)</th>
                                        <th style="width:140px; text-align:center;">จำนวนล็อกในแถว</th>
                                        <th style="width:140px; text-align:center;">จำนวนชั้น (Shelves)</th>
                                        <th style="width:140px; text-align:center;">จำนวนช่องย่อย (Slots)</th>
                                        <th style="width:120px; text-align:center;">สินค้าในแถว</th>
                                        <th style="width:160px; text-align:center;">สลับลำดับ / ลบแถว</th>
                                    </tr>
                                </thead>
                                <tbody id="aisleSettingsTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Sidebar Menu Reorder Table -->
                    <div>
                        <label style="font-weight:700; margin-bottom:0.5rem; display:block;">
                            <i class="fa-solid fa-bars-staggered" style="color:var(--primary);"></i> จัดลำดับการแสดงผลแถบเมนูหลัก (Sidebar Menu Reorder):
                        </label>
                        <div class="table-responsive" style="max-height: initial;">
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width:60px; text-align:center;">ลำดับ</th>
                                        <th>ชื่อเมนู</th>
                                        <th>รหัส View Section</th>
                                        <th style="text-align:center;">สลับตำแหน่งเมนู</th>
                                    </tr>
                                </thead>
                                <tbody id="menuReorderTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </section>

        </main>
    </div>

    <!-- MODAL: DELETE CONFIRMATION SAFETY GUARD -->
    <div id="deleteConfirmModal" class="modal-overlay" style="display:none;">
        <div class="card" style="width: 460px; max-width: 90vw; border-top:5px solid var(--danger);">
            <div class="card-header">
                <div class="card-title" style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> ยืนยันการลบรายการออกจากคลัง</div>
                <button class="btn btn-secondary" style="padding:4px 8px;" onclick="closeDeleteConfirmModal()">&times;</button>
            </div>

            <div style="background:var(--danger-light); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.25rem; font-size:0.88rem; color:var(--danger);">
                <div style="font-weight:700; margin-bottom:6px;"><i class="fa-solid fa-circle-exclamation"></i> คุณแน่ใจหรือไม่ที่จะลบรายการดังต่อไปนี้?</div>
                <div id="deleteConfirmModalDetails" class="mono font-bold" style="max-height:120px; overflow-y:auto; background:#fff; padding:8px; border-radius:6px; border:1px solid #fca5a5; margin-top:6px;">
                    <!-- รายการที่จะถูกลบ -->
                </div>
            </div>

            <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-danger" style="flex:1;" id="executeDeleteBtn" onclick="executeDeleteAction()">
                    <i class="fa-solid fa-trash-can"></i> ยืนยันลบออกจากระบบ DB
                </button>
                <button class="btn btn-secondary" onclick="closeDeleteConfirmModal()">ยกเลิก</button>
            </div>
        </div>
    </div>

    <!-- MODAL: PRINT BARCODE STICKER SETUP -->
    <div id="printBarcodeModal" class="modal-overlay" style="display:none;">
        <div class="card" style="width: 840px; max-width: 95vw; max-height: 90vh; overflow-y:auto;">
            <div class="card-header">
                <div class="card-title"><i class="fa-solid fa-print" style="color:var(--primary);"></i> เลือกรูปแบบและขนาดสติ๊กเกอร์ก่อนพิมพ์</div>
                <button class="btn btn-secondary" style="padding:4px 8px;" onclick="closePrintBarcodeModal()">&times;</button>
            </div>

            <div class="form-grid" style="margin-bottom:1rem;">
                <div class="form-group">
                    <label>รูปแบบกระดาษและเครื่องพิมพ์ (Print Format & Size):</label>
                    <select id="thermalSizeSelect" class="form-select" onchange="updatePrintPreviewLayout()">
                        <option value="50x30">🏷️ สติ๊กเกอร์ความร้อน Thermal 50 x 30 mm (1 S/N ต่อ 1 สติ๊กเกอร์)</option>
                        <option value="40x30">🏷️ สติ๊กเกอร์ความร้อน Thermal 40 x 30 mm (ขนาดเล็ก)</option>
                        <option value="100x75">📦 สติ๊กเกอร์พาเลท Thermal 100 x 75 mm (ขนาดใหญ่)</option>
                        <option value="100x150">📦 สติ๊กเกอร์ความร้อน Thermal 100 x 150 mm (ขนาดมาตรฐานขนส่ง/กล่องใหญ่)</option>
                        <option value="A4">📄 กระดาษ A4 Grid (2x2 คอลัมน์ สำหรับเครื่องพิมพ์ทั่วไป)</option>
                    </select>
                </div>
            </div>

            <div style="background:#f8fafc; border:1px solid var(--border-color); padding:1.2rem; border-radius:var(--radius-md); margin-bottom:1rem; color:#000;">
                <div style="font-weight:700; margin-bottom:0.5rem; font-size:0.85rem;"><i class="fa-solid fa-eye"></i> ตัวอย่างโครงสร้างสติ๊กเกอร์ก่อนพิมพ์ (1 S/N ต่อ 1 สติ๊กเกอร์ มีกรอบชัดเจน):</div>
                <div id="barcodePreviewArea" class="thermal-label-container"></div>
            </div>

            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button class="btn btn-primary" onclick="triggerPDFPrintPreview()"><i class="fa-solid fa-print"></i> ยืนยันพิมพ์ (เปิดหน้าต่างสั่งพิมพ์ทันที)</button>
                <button class="btn btn-secondary" onclick="closePrintBarcodeModal()">ยกเลิก</button>
            </div>
        </div>
    </div>

    <!-- MODAL: RELOCATE SINGLE ITEM -->
    <div id="relocateModal" class="modal-overlay" style="display:none;">
        <div class="card" style="width: 480px; max-width: 90vw;">
            <div class="card-header">
                <div class="card-title"><i class="fa-solid fa-right-left" style="color:var(--primary);"></i> ย้ายพิกัดจัดเก็บสินค้า (ค้นหาช่องว่างให้อัตโนมัติ)</div>
                <button class="btn btn-secondary" style="padding:4px 8px;" onclick="closeRelocateModal()">&times;</button>
            </div>

            <div style="background:var(--bg-subtle); padding:0.8rem; border-radius:var(--radius-md); margin-bottom:1rem; font-size:0.85rem;">
                <div><strong>S/N:</strong> <span id="relocateItemSn" class="mono font-bold" style="color:var(--primary);"></span></div>
                <div><strong>รุ่น:</strong> <span id="relocateItemName"></span></div>
                <div><strong>พิกัดปัจจุบัน:</strong> <span id="relocateItemCurrentLoc" class="badge-location mono"></span></div>
            </div>

            <input type="hidden" id="relocateItemId">

            <div class="form-group">
                <label style="display:flex; justify-content:space-between; align-items:center;">
                    <span>เลือกพิกัดจัดเก็บใหม่ (New Location):</span>
                    <span style="font-size:0.75rem; color:var(--primary); font-weight:700;"><i class="fa-solid fa-wand-magic-sparkles"></i> สุ่มช่องว่างอัตโนมัติ</span>
                </label>
                <div class="form-grid">
                    <div class="form-group">
                        <label>แถว</label>
                        <select id="relocateAisleSelect" class="form-select mono" onchange="onRelocateAisleOrBayChange()"></select>
                    </div>
                    <div class="form-group">
                        <label>ล็อก (Bay)</label>
                        <select id="relocateBaySelect" class="form-select mono" onchange="autoSelectAvailableRelocateSlot()"></select>
                    </div>
                    <div class="form-group">
                        <label>ชั้น (Shelf)</label>
                        <select id="relocateShelfSelect" class="form-select mono" onchange="updateRelocatePreview()"></select>
                    </div>
                    <div class="form-group">
                        <label>ช่อง (Slot)</label>
                        <select id="relocateSlotSelect" class="form-select mono" onchange="updateRelocatePreview()"></select>
                    </div>
                </div>
            </div>

            <div style="font-size:0.88rem; font-weight:700; color:var(--primary); margin-bottom:1rem; background:var(--primary-light); padding:8px 12px; border-radius:8px; border:1px solid var(--primary-border);">
                พิกัดใหม่ที่จะบันทึก: <span id="relocatePreviewBadge" class="badge-location mono">DOCK</span>
            </div>

            <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-primary" style="flex:1;" onclick="submitRelocateLocation()">
                    <i class="fa-solid fa-save"></i> ยืนยันย้ายตำแหน่ง DB
                </button>
                <button class="btn btn-secondary" onclick="closeRelocateModal()">ยกเลิก</button>
            </div>
        </div>
    </div>

    <!-- MODAL: BATCH RELOCATE MULTIPLE ITEMS -->
    <div id="batchRelocateModal" class="modal-overlay" style="display:none;">
        <div class="card" style="width: 520px; max-width: 90vw;">
            <div class="card-header">
                <div class="card-title"><i class="fa-solid fa-arrows-split-up-and-left" style="color:var(--primary);"></i> ย้ายคลังทีละหลายรายการ (Batch Relocate)</div>
                <button class="btn btn-secondary" style="padding:4px 8px;" onclick="closeBatchRelocateModal()">&times;</button>
            </div>

            <div style="background:var(--primary-light); padding:0.8rem; border-radius:var(--radius-md); margin-bottom:1rem; font-size:0.88rem; border:1px solid var(--primary-border);">
                <div>รายการที่เลือกย้ายทั้งหมด: <strong id="batchRelocateTotalCount" style="color:var(--primary);">0</strong> รายการ</div>
                <div style="font-size:0.78rem; color:var(--text-sub); margin-top:4px;">ระบบจะเรียงกระจายเข้าล็อก/ช่องว่างที่ว่างให้อัตโนมัติในแถวเป้าหมาย โดยไม่ซ้ำช่องเดิม</div>
            </div>

            <div class="form-group">
                <label>เลือกแถวเป้าหมายที่ต้องการย้ายไป (Target Aisle):</label>
                <select id="batchRelocateAisleSelect" class="form-select mono" onchange="updateBatchRelocateCapacityPreview()"></select>
            </div>

            <div id="batchCapacityPreviewText" style="font-size:0.82rem; font-weight:700; color:var(--text-sub); margin-bottom:1rem; background:var(--bg-subtle); padding:8px 12px; border-radius:6px; border:1px solid var(--border-color);">
                กำลังคำนวณพื้นที่ว่าง...
            </div>

            <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-primary" style="flex:1;" onclick="executeBatchRelocate()">
                    <i class="fa-solid fa-paper-plane"></i> ยืนยันย้ายสินค้าทั้งหมดเข้า DB
                </button>
                <button class="btn btn-secondary" onclick="closeBatchRelocateModal()">ยกเลิก</button>
            </div>
        </div>
    </div>

    <!-- MODAL: EXCEL EXPORT FILTER -->
    <div id="excelExportModal" class="modal-overlay" style="display:none;">
        <div class="card" style="width: 480px; max-width: 90vw;">
            <div class="card-header">
                <div class="card-title"><i class="fa-solid fa-file-excel" style="color:var(--success);"></i> เลือกแถว/ล็อก ที่ต้องการส่งออก Excel</div>
                <button class="btn btn-secondary" style="padding:4px 8px;" onclick="closeExcelExportModal()">&times;</button>
            </div>

            <div class="form-group">
                <label>เงื่อนไขการส่งออกข้อมูล:</label>
                <select id="exportScopeSelect" class="form-select" onchange="onExportScopeChange(this.value)">
                    <option value="ALL">📦 ส่งออกข้อมูลสินค้าทั้งหมดในคลัง</option>
                    <option value="AISLE">🧱 เลือกเจาะจงเฉพาะ แถวจัดเก็บ (Aisle)</option>
                    <option value="FILTERED">🔍 เฉพาะข้อมูลที่ค้นหาเจอในตารางปัจจุบัน</option>
                </select>
            </div>

            <div class="form-group" id="exportAisleGroup" style="display:none;">
                <label>เลือกแถวเป้าหมาย (Aisle):</label>
                <select id="exportAisleSelect" class="form-select mono"></select>
            </div>

            <div style="display:flex; gap:0.5rem; margin-top:1.25rem;">
                <button class="btn btn-success" style="flex:1;" onclick="executeExcelExport()">
                    <i class="fa-solid fa-download"></i> ดาวน์โหลดไฟล์ Excel
                </button>
                <button class="btn btn-secondary" onclick="closeExcelExportModal()">ยกเลิก</button>
            </div>
        </div>
    </div>

    <!-- TOAST NOTIFICATION -->
    <div id="toastAlert" class="toast">
        <i class="fa-solid fa-circle-check"></i>
        <span id="toastMessage">ทำรายการสำเร็จ</span>
    </div>

    <script>
        // --- SUPABASE CREDENTIALS CONFIGURATION ---
        const SUPABASE_URL = 'https://eusuehaqgwkcgowsgyco.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_ww-mPdyom_i6S4XhfAFj9Q_vFBpTuaE';
        const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });

        let globalInventoryData = [];
        let globalMasterProducts = [];
        let recentInboundList = [];
        let recentOutboundOrders = [];
        let outboundCartItems = [];
        
        let pendingDeleteMode = null;
        let pendingDeleteSn = null;
        let pendingDeleteId = null;

        // Master Default Aisles Config
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

        // Sidebar Navigation Config
        let menuConfig = [
            { id: 'view-inventory', label: 'เช็คสต็อกสินค้า', icon: 'fa-list-check' },
            { id: 'view-inbound', label: 'รับสินค้าเข้าคลัง (Fast)', icon: 'fa-arrow-right-to-bracket' },
            { id: 'view-outbound', label: 'จ่ายสินค้าออกจากคลัง', icon: 'fa-truck-arrow-right' },
            { id: 'view-locations', label: 'ผังตำแหน่งคลังสินค้า (Drill-Down)', icon: 'fa-map-location-dot' },
            { id: 'view-settings', label: 'ตั้งค่าพิกัดคลังสินค้า', icon: 'fa-gears' }
        ];

        // --- WEB AUDIO SOUND EFFECTS ENGINE ---
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

                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(2637, now + 0.1);
                gain2.gain.setValueAtTime(0.4, now + 0.1);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.start(now + 0.1);
                osc2.stop(now + 0.25);
            } catch (e) {
                console.log('Audio Context Error:', e);
            }
        }

        function playErrorSound() {
            try {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const now = audioCtx.currentTime;

                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.setValueAtTime(150, now + 0.15);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.4);
            } catch (e) {
                console.log('Audio Context Error:', e);
            }
        }

        // =========================================================================
        // --- INDEXED DB ENGINE FOR OFFLINE STORAGE & AUTO SYNC ---
        // =========================================================================
        let db;
        function initOfflineDatabase() {
            const request = indexedDB.open("WMS_OfflineDB", 1);
            request.onupgradeneeded = function(e) {
                db = e.target.result;
                if (!db.objectStoreNames.contains("inbound_queue")) {
                    db.createObjectStore("inbound_queue", { keyPath: "id", autoIncrement: true });
                }
            };
            request.onsuccess = function(e) {
                db = e.target.result;
                syncOfflineItemsToDatabase();
            };
            request.onerror = function(e) {
                console.error("IndexedDB initialization error:", e);
            };
        }

        async function saveItemOffline(item) {
            return new Promise((resolve, reject) => {
                if (!db) return reject("Database not initialized");
                const tx = db.transaction(["inbound_queue"], "readwrite");
                const store = tx.objectStore("inbound_queue");
                const req = store.add(item);
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            });
        }

        async function getOfflineItems() {
            return new Promise((resolve, reject) => {
                if (!db) return resolve([]);
                const tx = db.transaction(["inbound_queue"], "readonly");
                const store = tx.objectStore("inbound_queue");
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
        }

        async function clearOfflineItem(id) {
            return new Promise((resolve, reject) => {
                if (!db) return resolve();
                const tx = db.transaction(["inbound_queue"], "readwrite");
                const store = tx.objectStore("inbound_queue");
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }

        async function syncOfflineItemsToDatabase() {
            if (!navigator.onLine) return;
            const offlineItems = await getOfflineItems();
            if (offlineItems.length === 0) return;

            showToast(`🔄 เชื่อมต่ออินเทอร์เน็ตแล้ว! กำลังซิงค์อัปโหลด ${offlineItems.length} รายการที่ค้างอยู่...`);

            let successCount = 0;
            let uploadedSns = [];

            for (const item of offlineItems) {
                const itemData = { ...item };
                delete itemData.id;

                const { error } = await _supabase.from('warehouse_items').insert([itemData]);
                if (!error) {
                    await clearOfflineItem(item.id);
                    successCount++;
                    uploadedSns.push(itemData.sn);

                    // อัปเดตสถานะในรายการ recentInboundList ให้เปลี่ยนเป็นสีเขียว / DB Online ทันที
                    const foundFeed = recentInboundList.find(f => f.sn === itemData.sn);
                    if (foundFeed) {
                        foundFeed.isOffline = false;
                        foundFeed.isSyncedSuccess = true;
                    } else {
                        recentInboundList.unshift({
                            sn: itemData.sn,
                            category: itemData.category,
                            name: itemData.name,
                            location: itemData.location,
                            time: new Date().toLocaleTimeString('th-TH'),
                            isOffline: false,
                            isSyncedSuccess: true
                        });
                    }
                }
            }

            if (successCount > 0) {
                playSuccessSound();
                showToast(`✅ อัปโหลดเข้าฐานข้อมูลสำเร็จแล้ว ${successCount} รายการ (${uploadedSns.slice(0, 3).join(', ')}${uploadedSns.length > 3 ? '...' : ''}) มั่นใจได้ ข้อมูลไม่สูญหาย!`);
                renderLiveInboundFeed();
            }

            await loadDataFromDatabase();
            updateOnlineStatusUI(true);
        }

        window.addEventListener('online', () => {
            updateOnlineStatusUI(true);
            syncOfflineItemsToDatabase();
        });

        window.addEventListener('offline', () => {
            updateOnlineStatusUI(false);
        });

        function updateOnlineStatusUI(isOnline) {
            const badgeText = document.getElementById('dbStatusText');
            const dot = document.getElementById('dbPulseDot');
            const offlineNotice = document.getElementById('offlineInboundNotice');

            if (isOnline) {
                dot.classList.remove('offline');
                badgeText.textContent = `DB Online (เชื่อมต่อแล้ว)`;
                if (offlineNotice) offlineNotice.style.display = 'none';
            } else {
                dot.classList.add('offline');
                badgeText.textContent = `⚠️ ออฟไลน์โหมด (Offline)`;
                if (offlineNotice) offlineNotice.style.display = 'flex';
                showToast("⚠️ อินเทอร์เน็ตหลุด! ระบบรับเข้าต่อเนื่องออฟไลน์ให้อัตโนมัติ", true);
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            initOfflineDatabase();
            renderSidebarMenu();
            await loadWarehouseConfigsFromDB();
            await loadDataFromDatabase();
            initRealtimeSubscription();
            populateAisleDropdowns();
            onInboundAisleOrBayChange();
            updateOnlineStatusUI(navigator.onLine);

            // Setup Outbound Enter Key Interceptor Listener to fix scanning/typing issue
            const outboundSnInput = document.getElementById('outboundSn');
            if (outboundSnInput) {
                outboundSnInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOutboundToCart(e);
                    }
                });
            }
        });

        function renderSidebarMenu() {
            const list = document.getElementById('sidebarMenuList');
            list.innerHTML = '';
            
            menuConfig.forEach((item, idx) => {
                const li = document.createElement('li');
                li.className = 'menu-item';
                li.innerHTML = `
                    <button class="${idx === 0 ? 'active' : ''}" onclick="switchView('${item.id}')">
                        <i class="fa-solid ${item.icon}"></i> ${item.label}
                    </button>
                `;
                list.appendChild(li);
            });
        }

        function switchView(viewId) {
            document.querySelectorAll('.menu-item button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

            const activeBtn = Array.from(document.querySelectorAll('.menu-item button')).find(b => b.getAttribute('onclick').includes(viewId));
            if(activeBtn) activeBtn.classList.add('active');

            document.getElementById(viewId).classList.add('active');

            const itemConfig = menuConfig.find(m => m.id === viewId);
            if(itemConfig) {
                document.getElementById('navTitleText').innerHTML = `<i class="fa-solid ${itemConfig.icon}" style="color:var(--primary);"></i> ${itemConfig.label}`;
            }

            if(viewId === 'view-locations') {
                renderDrillDownAisleBar();
                renderDrillDownBaysGrid();
                renderDrillDownSlotsGrid();
            } else if(viewId === 'view-settings') {
                renderAisleSettingsTable();
                renderMenuReorderTable();
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

        // --- LOAD & REALTIME SYNC WAREHOUSE CONFIGS FROM DB ---
        async function loadWarehouseConfigsFromDB() {
            try {
                const { data, error } = await _supabase
                    .from('warehouse_configs')
                    .select('*')
                    .order('sort_order', { ascending: true });

                if (error) {
                    console.warn('ตาราง warehouse_configs ไม่พร้อมใช้งาน ใช้อินสแตนซ์เริ่มต้น:', error.message);
                    return;
                }

                if (data && data.length > 0) {
                    masterAisles = [];
                    data.forEach(item => {
                        const code = item.aisle_code.toUpperCase();
                        masterAisles.push(code);
                        aisleConfigs[code] = {
                            bays: item.bays_count || 10,
                            shelves: item.shelves_count || 1,
                            slots: item.slots_count || 10
                        };
                    });

                    defaultMasterAisles.forEach(defAisle => {
                        if (!masterAisles.includes(defAisle)) {
                            masterAisles.push(defAisle);
                            aisleConfigs[defAisle] = { bays: 10, shelves: 1, slots: 10 };
                        }
                    });
                } else {
                    masterAisles = [...defaultMasterAisles];
                    for (let code of masterAisles) {
                        await saveAisleConfigToDB(code);
                    }
                }
            } catch(e) {
                console.error('Config Fetching Exception:', e);
                masterAisles = [...defaultMasterAisles];
            }
        }

        async function saveAisleConfigToDB(aisleCode) {
            const cfg = aisleConfigs[aisleCode];
            if(!cfg) return false;

            const sortIdx = masterAisles.indexOf(aisleCode);
            const payload = {
                aisle_code: aisleCode,
                sort_order: sortIdx >= 0 ? sortIdx : 99,
                bays_count: parseInt(cfg.bays) || 10,
                shelves_count: parseInt(cfg.shelves) || 1,
                slots_count: parseInt(cfg.slots) || 10,
                updated_at: new Date().toISOString()
            };

            try {
                const { error: upsertErr } = await _supabase
                    .from('warehouse_configs')
                    .upsert(payload, { onConflict: 'aisle_code' });

                if (!upsertErr) {
                    showToast(`⚡ บันทึกเรียลไทม์: พิกัดแถว ${aisleCode} ลง DB เรียบร้อยแล้ว`);
                    return true;
                }

                const { data: existing } = await _supabase
                    .from('warehouse_configs')
                    .select('id')
                    .eq('aisle_code', aisleCode)
                    .maybeSingle();

                let writeErr = null;
                if (existing && existing.id) {
                    const { error } = await _supabase
                        .from('warehouse_configs')
                        .update(payload)
                        .eq('id', existing.id);
                    writeErr = error;
                } else {
                    const { error } = await _supabase
                        .from('warehouse_configs')
                        .insert([payload]);
                    writeErr = error;
                }

                if (writeErr) {
                    console.error('DB Sync Error for Aisle ' + aisleCode + ':', writeErr);
                    showToast(`❌ บันทึกแถว ${aisleCode} ไม่สำเร็จ: ${writeErr.message}`, true);
                    return false;
                } else {
                    showToast(`⚡ บันทึกเรียลไทม์: พิกัดแถว ${aisleCode} ลง DB เรียบร้อยแล้ว`);
                    return true;
                }
            } catch (err) {
                console.error('Exception in saveAisleConfigToDB:', err);
                showToast(`❌ ข้อผิดพลาด: ${err.message || 'ไม่สามารถบันทึกได้'}`, true);
                return false;
            }
        }

        async function saveAllWarehouseConfigsToDB() {
            showToast("⏳ กำลังบันทึกพิกัดคลังสินค้าทั้งหมดลงฐานข้อมูล...");
            let isAllSuccess = true;
            try {
                for (let index = 0; index < masterAisles.length; index++) {
                    const code = masterAisles[index];
                    const ok = await saveAisleConfigToDB(code);
                    if (!ok) isAllSuccess = false;
                }

                if (isAllSuccess) {
                    showToast("✅ บันทึกพิกัดแถวทั้งหมดเข้า DB เรียบร้อยแล้ว (ซิงค์เรียลไทม์ทุกเครื่อง 100%)");
                } else {
                    showToast("⚠️ บันทึกข้อมูลบางส่วนไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ DB/RLS", true);
                }
                await loadWarehouseConfigsFromDB();
                populateAisleDropdowns();
            } catch(err) {
                console.error('Bulk save config error:', err);
                showToast("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลเข้า DB", true);
            }
        }

        function populateAisleDropdowns() {
            const inboundSelect = document.getElementById('inboundAisleSelect');
            const relocateSelect = document.getElementById('relocateAisleSelect');
            const batchRelocateSelect = document.getElementById('batchRelocateAisleSelect');
            const filterAisle = document.getElementById('filterAisleSelect');
            
            inboundSelect.innerHTML = '';
            relocateSelect.innerHTML = '';
            if(batchRelocateSelect) batchRelocateSelect.innerHTML = '';
            filterAisle.innerHTML = '<option value="ALL">📍 แสดงทุกแถว (All)</option>';

            masterAisles.forEach(a => {
                const optName = a === 'DOCK' ? '🚚 ลาน DOCK' : `แถว ${a}`;
                inboundSelect.add(new Option(optName, a));
                relocateSelect.add(new Option(optName, a));
                if(batchRelocateSelect) batchRelocateSelect.add(new Option(optName, a));
                filterAisle.add(new Option(optName, a));
            });

            populateInboundBaysDropdown();
            populateRelocateBaysDropdown();
        }

        function populateInboundBaysDropdown() {
            const aisle = document.getElementById('inboundAisleSelect').value;
            const select = document.getElementById('inboundBaySelect');
            select.innerHTML = '';

            if(aisle === 'DOCK') {
                select.add(new Option('DOCK', '01'));
                return;
            }

            const bayCount = aisleConfigs[aisle] ? aisleConfigs[aisle].bays : 10;
            for(let i=1; i<=bayCount; i++) {
                const bayStr = String(i).padStart(2, '0');
                select.add(new Option(`ล็อก ${bayStr}`, bayStr));
            }
        }

        function populateRelocateBaysDropdown() {
            const aisle = document.getElementById('relocateAisleSelect').value;
            const select = document.getElementById('relocateBaySelect');
            select.innerHTML = '';

            const bayCount = aisleConfigs[aisle] ? aisleConfigs[aisle].bays : 10;
            for(let i=1; i<=bayCount; i++) {
                const bayStr = String(i).padStart(2, '0');
                select.add(new Option(`ล็อก ${bayStr}`, bayStr));
            }
        }

        function populateDynamicShelvesAndSlots(aisle) {
            const shelfSelect = document.getElementById('inboundShelfSelect');
            const slotSelect = document.getElementById('inboundSlotSelect');
            
            shelfSelect.innerHTML = '';
            slotSelect.innerHTML = '';

            const cfg = aisleConfigs[aisle] || { shelves: 1, slots: 10 };

            for(let s=1; s<=cfg.shelves; s++) {
                shelfSelect.add(new Option(`ชั้น L${s}`, `L${s}`));
            }
            for(let st=1; st<=cfg.slots; st++) {
                slotSelect.add(new Option(`ช่อง S${st}`, `S${st}`));
            }
        }

        // --- SMART GAP FINDER & AUTO ADVANCE LOCK/BAY/AISLE ENGINE ---
        function autoSelectAvailableSlot() {
            const aisleSelect = document.getElementById('inboundAisleSelect');
            let currentAisle = aisleSelect.value;
            
            if(currentAisle === 'DOCK') {
                updateInboundLocationPreview();
                return;
            }

            const occupiedLocations = new Set(globalInventoryData.map(i => (i.location || '').toUpperCase()));
            let startAisleIdx = masterAisles.indexOf(currentAisle);
            if(startAisleIdx === -1) startAisleIdx = 0;

            let foundLocation = null;

            for (let aIdx = startAisleIdx; aIdx < masterAisles.length; aIdx++) {
                const targetAisle = masterAisles[aIdx];
                if (targetAisle === 'DOCK') continue;

                const cfg = aisleConfigs[targetAisle] || { bays: 10, shelves: 1, slots: 10 };
                const currentBayVal = (targetAisle === currentAisle) ? parseInt(document.getElementById('inboundBaySelect').value || 1) : 1;

                for (let b = currentBayVal; b <= cfg.bays; b++) {
                    const bayStr = String(b).padStart(2, '0');
                    for (let s = 1; s <= cfg.shelves; s++) {
                        for (let st = 1; st <= cfg.slots; st++) {
                            const shelfStr = `L${s}`;
                            const slotStr = `S${st}`;
                            const targetLoc = `${targetAisle}-${bayStr}-${shelfStr}-${slotStr}`.toUpperCase();

                            if (!occupiedLocations.has(targetLoc)) {
                                foundLocation = {
                                    aisle: targetAisle,
                                    bay: bayStr,
                                    shelf: shelfStr,
                                    slot: slotStr
                                };
                                break;
                            }
                        }
                        if (foundLocation) break;
                    }
                    if (foundLocation) break;
                }
                if (foundLocation) break;
            }

            if (foundLocation) {
                if (aisleSelect.value !== foundLocation.aisle) {
                    aisleSelect.value = foundLocation.aisle;
                    populateInboundBaysDropdown();
                    populateDynamicShelvesAndSlots(foundLocation.aisle);
                }
                document.getElementById('inboundBaySelect').value = foundLocation.bay;
                document.getElementById('inboundShelfSelect').value = foundLocation.shelf;
                document.getElementById('inboundSlotSelect').value = foundLocation.slot;
            } else {
                showToast("⚠️ พิกัดจัดเก็บสินค้าเต็มหมดทุกชั้น ล็อก และแถว!", true);
            }

            updateInboundLocationPreview();
        }

        function onInboundAisleOrBayChange() {
            const aisle = document.getElementById('inboundAisleSelect').value;
            populateInboundBaysDropdown();
            populateDynamicShelvesAndSlots(aisle);
            autoSelectAvailableSlot();
        }

        function generateAutoSN() {
            const randStr = 'SN' + Date.now().toString().slice(-8) + Math.floor(Math.random()*100);
            document.getElementById('inboundSn').value = randStr;
            showToast(`✨ สุ่มหมายเลข S/N: ${randStr}`);
        }

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

        async function fetchMasterProducts() {
            let allProducts = [];
            let from = 0;
            const step = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await _supabase
                    .from('products')
                    .select('*')
                    .range(from, from + step - 1);

                if (error) {
                    console.log('ไม่สามารถโหลดตาราง products ได้');
                    break;
                }

                if (data && data.length > 0) {
                    allProducts = allProducts.concat(data);
                    from += step;
                    if (data.length < step) hasMore = false;
                } else {
                    hasMore = false;
                }
            }
            return allProducts;
        }

        async function loadDataFromDatabase() {
            const statusText = document.getElementById('dbStatusText');
            try {
                if(navigator.onLine) {
                    statusText.textContent = "กำลังซิงค์ DB & Master Products (100%)...";
                    globalInventoryData = await fetchAllWarehouseItems();
                    globalMasterProducts = await fetchMasterProducts();
                    statusText.textContent = `DB Online (สต็อก: ${globalInventoryData.length.toLocaleString()})`;
                } else {
                    statusText.textContent = `⚠️ ออฟไลน์โหมด (สต็อก: ${globalInventoryData.length.toLocaleString()})`;
                }

                filterInventoryData();
                updateKPIs();
                refreshLocationVisualizerIfActive();
            } catch (err) {
                console.error('Database Sync Error:', err);
                statusText.textContent = "เชื่อมต่อ DB ไม่สำเร็จ";
            }
        }

        function initRealtimeSubscription() {
            _supabase
                .channel('public:warehouse_items')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_items' }, () => {
                    loadDataFromDatabase();
                })
                .subscribe();

            _supabase
                .channel('public:warehouse_configs')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_configs' }, async () => {
                    await loadWarehouseConfigsFromDB();
                    populateAisleDropdowns();
                    if (document.getElementById('view-settings').classList.contains('active')) {
                        renderAisleSettingsTable();
                    }
                    refreshLocationVisualizerIfActive();
                })
                .subscribe();
        }

        function refreshLocationVisualizerIfActive() {
            if (document.getElementById('view-locations').classList.contains('active')) {
                renderDrillDownAisleBar();
                renderDrillDownBaysGrid();
                renderDrillDownSlotsGrid();
            }
        }

        function renderInventoryTable(items) {
            const tbody = document.getElementById('inventoryTableBody');
            tbody.innerHTML = '';

            document.getElementById('totalCountBadge').textContent = `ดึงข้อมูลแล้ว ${items.length.toLocaleString()} / ${globalInventoryData.length.toLocaleString()} รายการ`;
            
            const selectedCount = selectedItemSnSet.size.toLocaleString();
            document.getElementById('selectedCountSpan').textContent = selectedCount;
            const relSpan = document.getElementById('selectedRelocateCountSpan');
            if(relSpan) relSpan.textContent = selectedCount;

            if(items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:24px; color:var(--text-muted);">ไม่พบข้อมูลสินค้าตรงตามเงื่อนไขค้นหา</td></tr>`;
                return;
            }

            const frag = document.createDocumentFragment();
            items.forEach((item, index) => {
                const isChecked = selectedItemSnSet.has(item.sn);
                const formatLoc = formatLocationCode(item.location);
                
                const tr = document.createElement('tr');
                tr.setAttribute('id', `inventory-row-${item.sn}`);
                tr.innerHTML = `
                    <td style="text-align:center;"><input type="checkbox" class="item-checkbox" data-sn="${item.sn}" ${isChecked ? 'checked' : ''} onchange="toggleItemSelection('${item.sn}', this.checked)"></td>
                    <td style="text-align:center; font-weight:700;" class="mono">${index + 1}</td>
                    <td><code class="mono" style="color:var(--primary); font-weight:700;">${item.category || 'N/A'}</code></td>
                    <td style="font-weight:600;">${item.name || '-'}</td>
                    <td><code class="mono" style="font-weight:700;">${item.sn}</code></td>
                    <td><span class="badge-location mono"><i class="fa-solid fa-location-dot"></i> ${formatLoc}</span></td>
                    <td style="text-align:center; font-weight:700;" class="mono">${item.qty ?? 1}</td>
                    <td style="font-size:0.78rem; color:var(--text-muted);">${item.created_at ? new Date(item.created_at).toLocaleString('th-TH') : '-'}</td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm btn-primary" onclick="openPrintBarcodeModal('SINGLE', '${item.sn}')">
                            <i class="fa-solid fa-barcode"></i> พิมพ์
                        </button>
                    </td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm btn-secondary" onclick="openRelocateModal('${item.id}', '${item.sn}', '${item.name}', '${item.location}')">
                            <i class="fa-solid fa-right-left"></i> ย้าย
                        </button>
                    </td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm btn-danger" onclick="openDeleteConfirmModal('SINGLE', '${item.sn}', '${item.id}')">
                            <i class="fa-solid fa-trash"></i> ลบ
                        </button>
                    </td>
                `;
                frag.appendChild(tr);
            });

            tbody.appendChild(frag);
        }

        function formatLocationCode(locRaw) {
            if(!locRaw || locRaw.toUpperCase() === 'DOCK') return 'DOCK';
            const parts = locRaw.split('-');
            if(parts.length === 4) {
                return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2]}-${parts[3]}`;
            }
            return locRaw.toUpperCase();
        }

        function onFilterAisleChange() {
            const aisle = document.getElementById('filterAisleSelect').value;
            const selectBay = document.getElementById('filterBaySelect');
            const selectLoc = document.getElementById('filterLocationSelect');
            
            selectBay.innerHTML = '<option value="ALL">📦 ทุกล็อกในแถว</option>';
            selectLoc.innerHTML = '<option value="ALL">🏢 แสดงทุกช่องจัดเก็บ</option>';

            if(aisle !== 'ALL' && aisle !== 'DOCK') {
                const bayCount = aisleConfigs[aisle] ? aisleConfigs[aisle].bays : 10;
                for(let i=1; i<=bayCount; i++) {
                    const bayStr = String(i).padStart(2, '0');
                    selectBay.add(new Option(`ล็อก ${bayStr}`, bayStr));
                }

                const filteredLocs = new Set();
                globalInventoryData.forEach(item => {
                    const loc = (item.location || 'DOCK').toUpperCase();
                    if(loc.startsWith(`${aisle}-`)) {
                        filteredLocs.add(loc);
                    }
                });

                Array.from(filteredLocs).sort().forEach(loc => {
                    selectLoc.add(new Option(`📍 ${formatLocationCode(loc)}`, loc));
                });
            }

            filterInventoryData();
        }

        function filterInventoryData() {
            const q = document.getElementById('searchInput').value.toLowerCase().trim();
            const selectedAisle = document.getElementById('filterAisleSelect').value;
            const selectedBay = document.getElementById('filterBaySelect').value;
            const selectedLoc = document.getElementById('filterLocationSelect').value;

            const filtered = globalInventoryData.filter(item => {
                const itemLoc = (item.location || 'DOCK').toUpperCase();

                const matchesQuery = (
                    (item.sn && item.sn.toLowerCase().includes(q)) ||
                    (item.name && item.name.toLowerCase().includes(q)) ||
                    (item.category && item.category.toLowerCase().includes(q)) ||
                    (item.location && item.location.toLowerCase().includes(q))
                );

                let matchesAisle = true;
                if (selectedAisle !== 'ALL') {
                    if (selectedAisle === 'DOCK') {
                        matchesAisle = (itemLoc === 'DOCK');
                    } else {
                        matchesAisle = itemLoc.startsWith(`${selectedAisle}-`);
                    }
                }

                let matchesBay = true;
                if (selectedBay !== 'ALL' && selectedAisle !== 'ALL' && selectedAisle !== 'DOCK') {
                    const exactBayPrefix = `${selectedAisle}-${selectedBay}-`;
                    matchesBay = itemLoc.startsWith(exactBayPrefix);
                }

                let matchesLoc = true;
                if (selectedLoc !== 'ALL') {
                    matchesLoc = (itemLoc === selectedLoc);
                }

                return matchesQuery && matchesAisle && matchesBay && matchesLoc;
            });

            renderInventoryTable(filtered);
        }

        function toggleSelectAllItems(checked) {
            document.querySelectorAll('.item-checkbox').forEach(cb => {
                cb.checked = checked;
                const sn = cb.getAttribute('data-sn');
                if(checked) selectedItemSnSet.add(sn);
                else selectedItemSnSet.delete(sn);
            });
            const cnt = selectedItemSnSet.size.toLocaleString();
            document.getElementById('selectedCountSpan').textContent = cnt;
            const relSpan = document.getElementById('selectedRelocateCountSpan');
            if(relSpan) relSpan.textContent = cnt;
        }

        function toggleItemSelection(sn, checked) {
            if(checked) selectedItemSnSet.add(sn);
            else selectedItemSnSet.delete(sn);
            const cnt = selectedItemSnSet.size.toLocaleString();
            document.getElementById('selectedCountSpan').textContent = cnt;
            const relSpan = document.getElementById('selectedRelocateCountSpan');
            if(relSpan) relSpan.textContent = cnt;
        }

        // =========================================================================
        // --- DOUBLE CONFIRMATION SAFETY GUARD MODAL FOR DELETIONS ---
        // =========================================================================
        function openDeleteConfirmModal(mode, sn = null, id = null) {
            pendingDeleteMode = mode;
            pendingDeleteSn = sn;
            pendingDeleteId = id;

            const detailsBox = document.getElementById('deleteConfirmModalDetails');

            if (mode === 'SINGLE') {
                detailsBox.innerHTML = `<div>• S/N: <strong>${sn}</strong></div>`;
            } else if (mode === 'BATCH') {
                if (selectedItemSnSet.size === 0) {
                    alert("⚠️ กรุณาเลือกรายการที่ต้องการลบอย่างน้อย 1 รายการ");
                    return;
                }
                const targetSns = Array.from(selectedItemSnSet);
                let listHtml = targetSns.slice(0, 5).map(s => `<div>• S/N: ${s}</div>`).join('');
                if (targetSns.length > 5) {
                    listHtml += `<div style="color:var(--text-muted); font-size:0.8rem;">...และอีก ${targetSns.length - 5} รายการ</div>`;
                }
                detailsBox.innerHTML = listHtml;
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
                playSuccessSound();
                showToast(`🗑️ ลบ S/N: ${sn} เรียบร้อยแล้ว`);

                filterInventoryData();
                updateKPIs();
                refreshLocationVisualizerIfActive();
                closeDeleteConfirmModal();

                if (navigator.onLine && id) {
                    await _supabase.from('warehouse_items').delete().eq('id', id);
                }
            } else if (pendingDeleteMode === 'BATCH') {
                const confirmCount = selectedItemSnSet.size;
                const targetSns = Array.from(selectedItemSnSet);

                globalInventoryData = globalInventoryData.filter(i => !selectedItemSnSet.has(i.sn));
                selectedItemSnSet.clear();

                filterInventoryData();
                updateKPIs();
                refreshLocationVisualizerIfActive();
                closeDeleteConfirmModal();

                playSuccessSound();
                showToast(`🗑️ ลบข้อมูล ${confirmCount} รายการเรียบร้อยแล้ว`);

                if (navigator.onLine) {
                    await _supabase.from('warehouse_items').delete().in('sn', targetSns);
                }
            }
        }

        function updateKPIs() {
            document.getElementById('kpiTotalItems').textContent = globalInventoryData.length.toLocaleString();
            
            const masterCount = globalMasterProducts.length > 0 ? globalMasterProducts.length : new Set(globalInventoryData.map(i => i.category)).size;
            document.getElementById('kpiTotalModels').textContent = masterCount.toLocaleString();

            const dockCount = globalInventoryData.filter(i => (i.location || '').toUpperCase() === 'DOCK').length;
            document.getElementById('kpiDockItems').textContent = dockCount.toLocaleString();

            const statElem = document.getElementById('inboundMasterProductsStatText');
            if(statElem) statElem.textContent = `พร้อมค้นหาด่วนจาก ${masterCount.toLocaleString()} Master SKU`;
        }

        // --- AUTOCOMPLETE SKU SEARCH FROM MASTER DB ---
        function onSkuSearchInput(q) {
            const box = document.getElementById('skuSuggestionsBox');
            if(!q.trim()) {
                box.style.display = 'none';
                return;
            }

            const searchKey = q.toLowerCase();
            const matchesMap = new Map();

            if(globalMasterProducts.length > 0) {
                globalMasterProducts.forEach(prod => {
                    const code = prod.sku || prod.code || prod.category || '';
                    const name = prod.name || prod.product_name || '';
                    if(code.toLowerCase().includes(searchKey) || name.toLowerCase().includes(searchKey)) {
                        if(!matchesMap.has(code)) matchesMap.set(code, name);
                    }
                });
            } else {
                globalInventoryData.forEach(item => {
                    const code = item.category || '';
                    const name = item.name || '';
                    if(code.toLowerCase().includes(searchKey) || name.toLowerCase().includes(searchKey)) {
                        if(!matchesMap.has(code)) matchesMap.set(code, name);
                    }
                });
            }

            if(matchesMap.size === 0) {
                box.style.display = 'none';
                return;
            }

            let html = '';
            let count = 0;
            for(let [code, name] of matchesMap.entries()) {
                if(count >= 8) break;
                html += `
                    <div class="suggestion-item" onclick="selectSuggestedSku('${code}', '${name}')">
                        <div><span class="mono" style="color:var(--primary); font-weight:700;">[${code}]</span> ${name}</div>
                        <i class="fa-solid fa-arrow-turn-down" style="font-size:0.75rem; color:var(--text-muted);"></i>
                    </div>
                `;
                count++;
            }

            box.innerHTML = html;
            box.style.display = 'block';
        }

        function selectSuggestedSku(code, name) {
            document.getElementById('inboundCategory').value = code;
            document.getElementById('inboundName').value = name;
            document.getElementById('skuSearchInput').value = `[${code}] ${name}`;
            document.getElementById('skuSuggestionsBox').style.display = 'none';
            document.getElementById('inboundSn').focus();
        }

        function updateInboundLocationPreview() {
            const aisle = document.getElementById('inboundAisleSelect').value;
            const isDock = aisle === 'DOCK';
            
            document.getElementById('inboundBaySelect').disabled = isDock;
            document.getElementById('inboundShelfSelect').disabled = isDock;
            document.getElementById('inboundSlotSelect').disabled = isDock;

            let locText = 'DOCK';
            let currentSlotCount = 0;

            if(!isDock) {
                const bay = document.getElementById('inboundBaySelect').value;
                const shelf = document.getElementById('inboundShelfSelect').value;
                const slot = document.getElementById('inboundSlotSelect').value;
                locText = `${aisle}-${bay}-${shelf}-${slot}`;

                currentSlotCount = globalInventoryData.filter(i => (i.location || '').toUpperCase() === locText.toUpperCase()).length;
            } else {
                currentSlotCount = globalInventoryData.filter(i => (i.location || '').toUpperCase() === 'DOCK').length;
            }

            document.getElementById('inboundLocationPreview').textContent = formatLocationCode(locText);
            document.getElementById('bayInboundCountBadge').textContent = `รับแล้วในช่องนี้: ${currentSlotCount} เครื่อง`;
        }

        // --- FAST INBOUND ENGINE ---
        async function handleInboundSubmit(e) {
            e.preventDefault();

            const snInput = document.getElementById('inboundSn');
            const sn = snInput.value.trim();
            const category = document.getElementById('inboundCategory').value.trim();
            const name = document.getElementById('inboundName').value.trim();
            const location = document.getElementById('inboundLocationPreview').textContent;

            if(!sn) return;

            if(globalInventoryData.some(i => i.sn.toLowerCase() === sn.toLowerCase())) {
                playErrorSound();
                showToast(`🚨 S/N "${sn}" มีอยู่ในระบบสต็อกแล้ว!`, true);
                snInput.select();
                return;
            }

            const nowStr = new Date().toISOString();
            const payload = {
                category: category,
                name: name,
                sn: sn,
                location: location,
                qty: 1,
                unit: "เครื่อง",
                created_at: nowStr
            };

            globalInventoryData.unshift(payload);

            snInput.value = '';
            snInput.focus();

            updateKPIs();
            filterInventoryData();
            refreshLocationVisualizerIfActive();
            autoSelectAvailableSlot();

            if (!navigator.onLine) {
                try {
                    await saveItemOffline(payload);
                    playSuccessSound();
                    showToast(`📦 ออฟไลน์: บันทึก S/N: ${sn} ลงในเครื่องแล้ว`);
                    
                    recentInboundList.unshift({
                        sn: sn,
                        category: category,
                        name: name,
                        location: location,
                        time: new Date().toLocaleTimeString('th-TH'),
                        isOffline: true,
                        isSyncedSuccess: false
                    });
                    renderLiveInboundFeed();
                } catch (err) {
                    playErrorSound();
                    showToast('❌ ไม่สามารถบันทึกข้อมูลออฟไลน์ได้', true);
                }
            } else {
                _supabase.from('warehouse_items').insert([payload]).then(({ error }) => {
                    if(error) {
                        playErrorSound();
                        showToast('❌ ไม่สามารถบันทึกข้อมูลเข้า DB ได้', true);
                        globalInventoryData = globalInventoryData.filter(i => i.sn !== sn);
                        filterInventoryData();
                        refreshLocationVisualizerIfActive();
                    } else {
                        playSuccessSound();
                        showToast(`✅ บันทึกรับสินค้า S/N: ${sn} สำเร็จ`);
                        
                        recentInboundList.unshift({
                            sn: sn,
                            category: category,
                            name: name,
                            location: location,
                            time: new Date().toLocaleTimeString('th-TH'),
                            isOffline: false,
                            isSyncedSuccess: true
                        });
                        renderLiveInboundFeed();
                    }
                });
            }
        }

        function renderLiveInboundFeed() {
            const container = document.getElementById('liveInboundFeedContainer');
            if(recentInboundList.length === 0) return;

            let html = '';
            recentInboundList.forEach(item => {
                let cardClass = item.isOffline ? 'offline-queued' : (item.isSyncedSuccess ? 'db-synced-success' : '');
                html += `
                    <div class="feed-item ${cardClass}">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="mono" style="font-weight:700; color:var(--text-main);">${item.sn}</span>
                            <span class="badge-location mono">📍 ${formatLocationCode(item.location)}</span>
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-sub); font-weight:500;">
                            [${item.category}] ${item.name}
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
                            <span>${item.isOffline ? '⚠️ ค้างอัปโหลด (Offline)' : '⚡ DB Online (อัปโหลดสำเร็จ)'}</span>
                            <span>🕒 ${item.time} น.</span>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        // =========================================================================
        // --- OUTBOUND WORK ORDER & CART ISSUE ENGINE ---
        // =========================================================================
        function handleAddOutboundToCart(e) {
            if (e) e.preventDefault();
            const snInput = document.getElementById('outboundSn');
            const sn = snInput.value.trim();

            if (!sn) return;

            const item = globalInventoryData.find(i => i.sn.toLowerCase() === sn.toLowerCase());

            if (!item) {
                playErrorSound();
                showToast(`❌ ไม่พบ S/N: "${sn}" ในคลังสินค้า`, true);
                snInput.select();
                return;
            }

            if (outboundCartItems.some(i => i.sn.toLowerCase() === sn.toLowerCase())) {
                playErrorSound();
                showToast(`⚠️ S/N: "${sn}" ถูกเพิ่มไว้ในรายการจ่ายออกแล้ว`, true);
                snInput.select();
                return;
            }

            outboundCartItems.push(item);
            playSuccessSound();
            showToast(`🛒 เพิ่ม S/N: ${sn} เข้าใบสั่งจ่ายเรียบร้อย`);

            snInput.value = '';
            snInput.focus();
            renderOutboundCartTable();
        }

        function removeOutboundFromCart(sn) {
            outboundCartItems = outboundCartItems.filter(i => i.sn !== sn);
            renderOutboundCartTable();
        }

        function renderOutboundCartTable() {
            const tbody = document.getElementById('outboundCartTableBody');
            document.getElementById('outboundCartCountBadge').textContent = `${outboundCartItems.length} รายการ`;

            if (outboundCartItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">ยังไม่มีรายการ ยิงสแกน S/N เพื่อเพิ่มเข้าใบสั่งจ่าย</td></tr>`;
                return;
            }

            let html = '';
            outboundCartItems.forEach((item, idx) => {
                html += `
                    <tr>
                        <td style="font-weight:700;" class="mono">${idx + 1}</td>
                        <td><code class="mono">${item.category}</code></td>
                        <td>${item.name}</td>
                        <td class="mono font-bold">${item.sn}</td>
                        <td><span class="badge-location mono">📍 ${formatLocationCode(item.location)}</span></td>
                        <td style="text-align:center;">
                            <button class="btn btn-sm btn-danger" style="padding:2px 6px;" onclick="removeOutboundFromCart('${item.sn}')">&times;</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        async function processFinalOutboundWorkOrder() {
            const dest = document.getElementById('outboundDestination').value.trim();
            const disp = document.getElementById('outboundDispatcher').value.trim();
            const recv = document.getElementById('outboundReceiver').value.trim();

            if (!dest || !disp || !recv) {
                alert("⚠️ กรุณากรอก สถานที่ปลายทาง, ชื่อผู้ส่ง และ ชื่อผู้รับ ให้ครบถ้วน");
                return;
            }

            if (outboundCartItems.length === 0) {
                alert("⚠️ กรุณายิงสแกนสินค้าอย่างน้อย 1 รายการเข้าสู่ใบสั่งจ่าย");
                return;
            }

            const orderNo = 'OUT' + Date.now().toString().slice(-6);
            const nowTimeStr = new Date().toLocaleString('th-TH');

            const orderData = {
                orderNo: orderNo,
                destination: dest,
                dispatcher: disp,
                receiver: recv,
                time: nowTimeStr,
                items: [...outboundCartItems]
            };

            const removedSns = outboundCartItems.map(i => i.sn);
            const removedIds = outboundCartItems.map(i => i.id);

            globalInventoryData = globalInventoryData.filter(i => !removedSns.includes(i.sn));
            recentOutboundOrders.unshift(orderData);

            filterInventoryData();
            updateKPIs();
            refreshLocationVisualizerIfActive();
            renderLiveOutboundOrdersFeed();

            outboundCartItems = [];
            renderOutboundCartTable();

            playSuccessSound();
            showToast(`🎉 ออกใบสั่งจ่ายเลขที่ ${orderNo} และตัดจ่าย ${removedSns.length} รายการสำเร็จ!`);

            if (navigator.onLine) {
                await _supabase.from('warehouse_items').delete().in('id', removedIds);
            }

            printOutboundWorkOrderDoc(orderNo);
        }

        function renderLiveOutboundOrdersFeed() {
            const container = document.getElementById('liveOutboundFeedContainer');
            if (recentOutboundOrders.length === 0) return;

            let html = '';
            recentOutboundOrders.forEach(ord => {
                html += `
                    <div class="feed-item outbound">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong class="mono" style="color:var(--warning); font-size:0.92rem;">📄 เลขที่: ${ord.orderNo}</strong>
                            <button class="btn btn-sm btn-secondary" onclick="printOutboundWorkOrderDoc('${ord.orderNo}')"><i class="fa-solid fa-print"></i> พิมพ์ใบสั่งจ่าย</button>
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-sub); margin-top:2px;">
                            <strong>ปลายทาง:</strong> ${ord.destination} | <strong>รวม:</strong> ${ord.items.length} เครื่อง
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:4px;">
                            <span>ผู้ส่ง: ${ord.dispatcher} | ผู้รับ: ${ord.receiver}</span>
                            <span>🕒 ${ord.time}</span>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        function printOutboundWorkOrderDoc(orderNo) {
            const ord = recentOutboundOrders.find(o => o.orderNo === orderNo);
            if (!ord) return;

            const printWindow = window.open('', '_blank', 'width=900,height=800');
            if(!printWindow) {
                alert("⚠️ ป๊อปอัพถูกบล็อก กรุณาอนุญาตให้แสดง Pop-up");
                return;
            }

            let rowsHtml = ord.items.map((it, idx) => `
                <tr>
                    <td style="text-align:center; padding:8px; border:1px solid #ddd;">${idx + 1}</td>
                    <td style="padding:8px; border:1px solid #ddd;" class="mono">${it.category || '-'}</td>
                    <td style="padding:8px; border:1px solid #ddd;">${it.name || '-'}</td>
                    <td style="padding:8px; border:1px solid #ddd;" class="mono"><strong>${it.sn}</strong></td>
                    <td style="text-align:center; padding:8px; border:1px solid #ddd;" class="mono">${formatLocationCode(it.location)}</td>
                </tr>
            `).join('');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>ใบงานจ่ายสินค้าออกจากคลัง - ${ord.orderNo}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
                        body { font-family: 'Prompt', sans-serif; padding: 25px; color: #000; }
                        .mono { font-family: 'JetBrains Mono', monospace; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
                        th { background: #f1f5f9; padding: 8px; border: 1px solid #ddd; text-align: left; }
                        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; margin-top: 50px; font-size: 14px; }
                        .sig-line { border-bottom: 1px dashed #000; height: 40px; margin-bottom: 8px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h2 style="margin:0;">ใบสั่งจ่ายสินค้า / ใบงานจ่ายสินค้าออกจากคลัง</h2>
                            <div style="font-size:13px; color:#555;">WMS Enterprise Suite v2026</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="mono" style="font-size:18px; font-weight:bold;">${ord.orderNo}</div>
                            <div style="font-size:12px;">วันที่: ${ord.time}</div>
                        </div>
                    </div>

                    <div class="info-grid">
                        <div><strong>สถานที่จ่ายไป / ปลายทาง:</strong> ${ord.destination}</div>
                        <div><strong>ผู้ทำการเบิกจ่าย:</strong> ${ord.dispatcher}</div>
                        <div><strong>ผู้รับสินค้า / ขนส่ง:</strong> ${ord.receiver}</div>
                        <div><strong>จำนวนสินค้ารวม:</strong> ${ord.items.length} เครื่อง</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width:40px; text-align:center;">ลำดับ</th>
                                <th>รหัส SKU</th>
                                <th>ชื่อรุ่น / รายละเอียดสินค้า</th>
                                <th>หมายเลขซีเรียล (S/N)</th>
                                <th style="text-align:center;">พิกัดเดิม</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>

                    <div class="sig-grid">
                        <div>
                            <div class="sig-line"></div>
                            <div>ลงชื่อ.......................................................... (ผู้ส่ง/เจ้าหน้าที่คลัง)</div>
                            <div style="margin-top:4px; font-size:12px; color:#666;">(${ord.dispatcher})</div>
                        </div>
                        <div>
                            <div class="sig-line"></div>
                            <div>ลงชื่อ.......................................................... (ผู้รับสินค้า/ขนส่ง)</div>
                            <div style="margin-top:4px; font-size:12px; color:#666;">(${ord.receiver})</div>
                        </div>
                    </div>

                    <script>
                        window.onload = function() {
                            setTimeout(function() { window.print(); }, 300);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }

        // =========================================================================
        // --- DRILL-DOWN VISUALIZER ---
        // =========================================================================
        function renderDrillDownAisleBar() {
            const bar = document.getElementById('aisleFilterBar');
            bar.innerHTML = '';

            masterAisles.forEach(aisle => {
                const count = globalInventoryData.filter(i => {
                    const loc = (i.location || 'DOCK').toUpperCase();
                    return aisle === 'DOCK' ? loc === 'DOCK' : loc.startsWith(`${aisle}-`);
                }).length;

                const btn = document.createElement('button');
                btn.className = `aisle-tab-btn ${currentSelectedAisle === aisle ? 'active' : ''}`;
                btn.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${aisle === 'DOCK' ? 'ลาน DOCK' : `แถว ${aisle}`} <span class="mono" style="font-size:0.75rem; opacity:0.8;">(${count})</span>`;
                btn.onclick = () => {
                    currentSelectedAisle = aisle;
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
                container.innerHTML = `<div style="grid-column:1/-1; padding:10px; color:var(--text-muted);">ลาน DOCK เป็นพื้นที่พักรอจัดเก็บสินค้า (แสดงโชว์ S/N ทั้งหมด)</div>`;
                return;
            }

            const cfg = aisleConfigs[currentSelectedAisle] || { bays: 10, shelves: 1, slots: 10 };
            const totalBayMaxCap = cfg.shelves * cfg.slots;

            for(let i=1; i<=cfg.bays; i++) {
                const bayStr = String(i).padStart(2, '0');
                const locPrefix = `${currentSelectedAisle}-${bayStr}-`;
                const bayItemsCount = globalInventoryData.filter(item => (item.location || '').toUpperCase().startsWith(locPrefix)).length;

                const percent = totalBayMaxCap > 0 ? Math.min(Math.round((bayItemsCount / totalBayMaxCap) * 100), 100) : 0;
                
                let colorClass = 'cap-green';
                let statusLabel = 'ปกติ';
                if(percent >= 100) { colorClass = 'cap-red'; statusLabel = 'เต็ม'; }
                else if(percent >= 75) { colorClass = 'cap-amber'; statusLabel = 'ใกล้เต็ม'; }

                const btn = document.createElement('div');
                btn.className = `bay-card-btn ${currentSelectedBay === bayStr ? 'active' : ''}`;
                btn.onclick = () => {
                    currentSelectedBay = bayStr;
                    renderDrillDownBaysGrid();
                    renderDrillDownSlotsGrid();
                };

                btn.innerHTML = `
                    <div style="font-size:0.75rem; color:var(--text-muted);">ล็อก ${bayStr} (${statusLabel})</div>
                    <div class="mono" style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin:2px 0;">${bayItemsCount}/${totalBayMaxCap}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted); font-weight:600;">${percent}% ความจุ</div>
                    <div class="capacity-bar"><div class="capacity-fill ${colorClass}" style="width: ${percent}%;"></div></div>
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

            infoText.textContent = `พิกัด แถว ${currentSelectedAisle} / ล็อก ${currentSelectedBay} (แสดงโชว์เฉพาะที่มีจริง ${bayAllItems.length} เครื่อง)`;

            const slotMap = {};
            bayAllItems.forEach(item => {
                const loc = (item.location || currentBayPrefix).toUpperCase();
                if(!slotMap[loc]) slotMap[loc] = [];
                slotMap[loc].push(item);
            });

            const activeKeys = Object.keys(slotMap);

            if(activeKeys.length === 0) {
                container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted); font-size:0.9rem;">ไม่มีสินค้าจัดเก็บในล็อก ${currentSelectedBay}</div>`;
                return;
            }

            activeKeys.sort().forEach(locKey => {
                const items = slotMap[locKey];
                renderSlotCard(container, locKey, items);
            });
        }

        function renderSlotCard(container, slotTitle, items, isDockFull = false) {
            const card = document.createElement('div');
            card.className = 'slot-card';
            if(isDockFull) card.style.gridColumn = "1 / -1";

            let rowsHtml = items.map(item => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-subtle); padding:6px 10px; border-radius:6px; margin-bottom:6px; border:1px solid var(--border-color);">
                    <div style="display:flex; gap:10px; align-items:center; overflow:hidden;">
                        <span class="mono" style="font-weight:700; color:var(--primary); font-size:0.85rem;">${item.sn}</span>
                        <span style="font-size:0.8rem; color:var(--text-sub); font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">[${item.category}] ${item.name || ''}</span>
                    </div>
                    <div style="display:flex; gap:4px; flex-shrink:0;">
                        <button class="btn btn-sm btn-primary" style="padding:2px 8px;" onclick="openPrintBarcodeModal('SINGLE', '${item.sn}')" title="พิมพ์สติ๊กเกอร์ S/N"><i class="fa-solid fa-print"></i> พิมพ์</button>
                        <button class="btn btn-sm btn-secondary" style="padding:2px 8px;" onclick="openRelocateModal('${item.id}', '${item.sn}', '${item.name}', '${item.location}')" title="ย้าย"><i class="fa-solid fa-right-left"></i></button>
                        <button class="btn btn-sm btn-danger" style="padding:2px 8px;" onclick="openDeleteConfirmModal('SINGLE', '${item.sn}', '${item.id}')" title="ลบออก"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="slot-card-header">
                    <strong class="mono" style="font-size:0.92rem; color:var(--text-main);">📍 ${formatLocationCode(slotTitle)}</strong>
                    <span class="mono" style="font-size:0.78rem; font-weight:700; color:var(--success); background:rgba(0,0,0,0.04); padding:2px 8px; border-radius:4px;">
                        ${items.length} เครื่อง
                    </span>
                </div>
                <div style="${isDockFull ? 'max-height:550px; display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:8px;' : 'max-height:260px;'} overflow-y:auto;">${rowsHtml}</div>
            `;
            container.appendChild(card);
        }

        // =========================================================================
        // --- BARCODE PRINTING ENGINE ---
        // =========================================================================
        function openPrintBarcodeModal(mode = 'SELECTED', singleSn = null) {
            if (mode === 'SINGLE' && singleSn) {
                selectedItemSnSet.clear();
                selectedItemSnSet.add(singleSn);
            }

            const targetItems = globalInventoryData.filter(i => selectedItemSnSet.has(i.sn));

            if (targetItems.length === 0) {
                alert('⚠️ กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการเพื่อพิมพ์สติ๊กเกอร์');
                return;
            }

            document.getElementById('printBarcodeModal').style.display = 'flex';
            updatePrintPreviewLayout();
        }

        function closePrintBarcodeModal() {
            document.getElementById('printBarcodeModal').style.display = 'none';
        }

        function updatePrintPreviewLayout() {
            const format = document.getElementById('thermalSizeSelect').value;
            const previewArea = document.getElementById('barcodePreviewArea');
            const selectedItems = globalInventoryData.filter(i => selectedItemSnSet.has(i.sn));
            
            previewArea.innerHTML = '';

            if(format === 'A4') {
                let a4Html = `<div class="thermal-card-a4-grid">`;
                selectedItems.forEach(item => {
                    a4Html += `
                        <div class="barcode-card-box" style="height:62mm;">
                            <div style="font-size:11px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#000;">${item.name || ''}</div>
                            <div style="font-size:10px; color:#334155;" class="mono">SKU: ${item.category || '-'}</div>
                            <div class="barcode-svg-container"><svg id="barcode-svg-${item.sn}"></svg></div>
                            <div style="font-size:10px; font-weight:700; color:#000;" class="mono">LOCATION: ${formatLocationCode(item.location)}</div>
                        </div>
                    `;
                });
                a4Html += `</div>`;
                previewArea.innerHTML = a4Html;
            } else {
                let html = '';
                selectedItems.forEach(item => {
                    if(format === '40x30') {
                        html += `
                            <div class="barcode-card-box thermal-card-40x30">
                                <div style="font-size:0.65rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#000;">${item.name || ''}</div>
                                <div style="font-size:0.58rem; color:#334155;" class="mono">SKU: ${item.category || '-'}</div>
                                <div class="barcode-svg-container"><svg id="barcode-svg-${item.sn}"></svg></div>
                                <div style="font-size:0.62rem; font-weight:700; color:#000;" class="mono">LOC: ${formatLocationCode(item.location)}</div>
                            </div>
                        `;
                    } else if(format === '100x75') {
                        html += `
                            <div class="barcode-card-box thermal-card-100x75">
                                <div style="font-size:0.95rem; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#000;">${item.name || ''}</div>
                                <div style="font-size:0.8rem; color:#334155;" class="mono">SKU: ${item.category || '-'}</div>
                                <div class="barcode-svg-container" style="max-height:110px;"><svg id="barcode-svg-${item.sn}"></svg></div>
                                <div style="font-size:0.85rem; font-weight:700; color:#000;" class="mono">LOCATION: ${formatLocationCode(item.location)}</div>
                            </div>
                        `;
                    } else if(format === '100x150') {
                        html += `
                            <div class="barcode-card-box thermal-card-100x150">
                                <div style="font-size:1.25rem; font-weight:800; color:#000; padding:10px 0; border-bottom:1px dashed #cbd5e1;">${item.name || ''}</div>
                                <div style="font-size:1rem; color:#334155; margin-top:8px;" class="mono">SKU / ITEM: ${item.category || '-'}</div>
                                <div class="barcode-svg-container" style="margin:20px 0;"><svg id="barcode-svg-${item.sn}"></svg></div>
                                <div style="font-size:1.15rem; font-weight:800; color:#000; background:#f1f5f9; padding:8px; border-radius:6px;" class="mono">LOCATION: ${formatLocationCode(item.location)}</div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="barcode-card-box thermal-card-50x30">
                                <div style="font-size:0.72rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#000;">${item.name || ''}</div>
                                <div style="font-size:0.65rem; color:#334155;" class="mono">SKU: ${item.category || '-'}</div>
                                <div class="barcode-svg-container"><svg id="barcode-svg-${item.sn}"></svg></div>
                                <div style="font-size:0.68rem; font-weight:700; color:#000;" class="mono">LOC: ${formatLocationCode(item.location)}</div>
                            </div>
                        `;
                    }
                });
                previewArea.innerHTML = html;
            }

            selectedItems.forEach(item => {
                const snLen = item.sn ? item.sn.length : 10;
                const dynamicWidth = snLen > 20 ? 0.8 : (snLen > 14 ? 1.0 : 1.2);

                if(format === 'A4') {
                    JsBarcode(`#barcode-svg-${item.sn}`, item.sn, { format: "CODE128", width: 1.4, height: 42, displayValue: true, fontSize: 11, margin: 2 });
                } else if(format === '100x150') {
                    JsBarcode(`#barcode-svg-${item.sn}`, item.sn, { format: "CODE128", width: 2.2, height: 110, displayValue: true, fontSize: 16, margin: 5 });
                } else if(format === '100x75') {
                    JsBarcode(`#barcode-svg-${item.sn}`, item.sn, { format: "CODE128", width: 1.8, height: 60, displayValue: true, fontSize: 12, margin: 4 });
                } else if(format === '40x30') {
                    JsBarcode(`#barcode-svg-${item.sn}`, item.sn, { format: "CODE128", width: dynamicWidth, height: 28, displayValue: true, fontSize: 9, margin: 1 });
                } else {
                    JsBarcode(`#barcode-svg-${item.sn}`, item.sn, { format: "CODE128", width: dynamicWidth, height: 32, displayValue: true, fontSize: 9, margin: 2 });
                }
            });
        }

        function triggerPDFPrintPreview() {
            const format = document.getElementById('thermalSizeSelect').value;
            const targetItems = globalInventoryData.filter(i => selectedItemSnSet.has(i.sn));
            
            if(targetItems.length === 0) {
                alert("⚠️ กรุณาเลือกสินค้าอย่างน้อย 1 รายการเพื่อพิมพ์");
                return;
            }

            const printWindow = window.open('', '_blank', 'width=950,height=800');
            if(!printWindow) {
                alert("⚠️ ป๊อปอัพถูกบล็อก กรุณาอนุญาตให้แสดง Pop-up");
                return;
            }

            let styleHeader = `
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Prompt', sans-serif; background: #ffffff; color: #000; margin: 0; padding: 20px; }
                    .mono { font-family: 'JetBrains Mono', monospace; }
                    
                    .print-control-bar {
                        position: fixed; top: 0; left: 0; right: 0; height: 55px;
                        background: #1e293b; color: #fff; display: flex; align-items: center;
                        justify-content: space-between; padding: 0 20px; z-index: 99999;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    }
                    .btn-print-action {
                        background: #2563eb; color: #fff; border: none; padding: 8px 18px;
                        font-size: 14px; font-weight: 700; border-radius: 6px; cursor: pointer;
                        font-family: 'Prompt', sans-serif;
                    }
                    .btn-close-action {
                        background: #64748b; color: #fff; border: none; padding: 8px 16px;
                        font-size: 14px; border-radius: 6px; cursor: pointer;
                        font-family: 'Prompt', sans-serif;
                    }
                    .pdf-preview-container {
                        margin-top: 60px; display: flex; flex-direction: column; align-items: center; gap: 20px;
                    }
                    .barcode-card-box {
                        border: 2px solid #000 !important; border-radius: 4px; padding: 6px; background: #fff;
                        box-sizing: border-box; display: flex; flex-direction: column;
                        justify-content: space-between; text-align: center; page-break-inside: avoid;
                        overflow: hidden;
                    }
                    .barcode-svg-container {
                        display: flex; justify-content: center; align-items: center; width: 100%; overflow: hidden;
                    }
                    .barcode-svg-container svg { max-width: 100% !important; height: auto !important; }
                    @media print {
                        .print-control-bar { display: none !important; }
                        body { background: #fff !important; padding: 0 !important; }
                        .pdf-preview-container { margin-top: 0 !important; gap: 0 !important; }
                    }
            `;

            if(format === 'A4') {
                styleHeader += `
                    @page { size: A4 portrait; margin: 8mm; }
                    .print-a4-page {
                        background: #fff; width: 210mm; min-height: 297mm; padding: 8mm;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: grid; grid-template-columns: repeat(2, 1fr);
                        grid-auto-rows: 62mm; gap: 6mm; page-break-after: always;
                    }
                    .print-a4-page:last-child { page-break-after: avoid; }
                    .barcode-card-box { height: 62mm; }
                `;
            } else if(format === '100x150') {
                styleHeader += `
                    @page { size: 100mm 150mm; margin: 0; }
                    .thermal-single-page {
                        background: #fff; width: 100mm; height: 150mm; padding: 4mm;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2); page-break-after: always;
                        display: flex; flex-direction: column; justify-content: space-between; text-align: center;
                        box-sizing: border-box;
                    }
                    .thermal-single-page:last-child { page-break-after: avoid; }
                `;
            } else if(format === '40x30') {
                styleHeader += `
                    @page { size: 40mm 30mm; margin: 0; }
                    .thermal-single-page {
                        background: #fff; width: 40mm; height: 30mm; padding: 1.5mm;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2); page-break-after: always;
                        display: flex; flex-direction: column; justify-content: space-between; text-align: center;
                        box-sizing: border-box;
                    }
                    .thermal-single-page:last-child { page-break-after: avoid; }
                `;
            } else if(format === '100x75') {
                styleHeader += `
                    @page { size: 100mm 75mm; margin: 0; }
                    .thermal-single-page {
                        background: #fff; width: 100mm; height: 75mm; padding: 3.5mm;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2); page-break-after: always;
                        display: flex; flex-direction: column; justify-content: space-between; text-align: center;
                        box-sizing: border-box;
                    }
                    .thermal-single-page:last-child { page-break-after: avoid; }
                `;
            } else {
                styleHeader += `
                    @page { size: 50mm 30mm; margin: 0; }
                    .thermal-single-page {
                        background: #fff; width: 50mm; height: 30mm; padding: 2mm;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2); page-break-after: always;
                        display: flex; flex-direction: column; justify-content: space-between; text-align: center;
                        box-sizing: border-box;
                    }
                    .thermal-single-page:last-child { page-break-after: avoid; }
                `;
            }

            styleHeader += `</style>`;

            let bodyContent = '';

            if(format === 'A4') {
                const itemsPerPage = 8;
                for (let i = 0; i < targetItems.length; i += itemsPerPage) {
                    const chunk = targetItems.slice(i, i + itemsPerPage);
                    bodyContent += `<div class="print-a4-page">`;
                    chunk.forEach(item => {
                        bodyContent += `
                            <div class="barcode-card-box">
                                <div style="font-size:11px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name || ''}</div>
                                <div style="font-size:10px;" class="mono">SKU: ${item.category || '-'}</div>
                                <div class="barcode-svg-container"><svg id="pw-svg-${item.sn}"></svg></div>
                                <div style="font-size:10px; font-weight:700;" class="mono">LOCATION: ${formatLocationCode(item.location)}</div>
                            </div>
                        `;
                    });
                    bodyContent += `</div>`;
                }
            } else {
                targetItems.forEach(item => {
                    bodyContent += `
                        <div class="thermal-single-page">
                            <div class="barcode-card-box" style="height:100%; border:2px solid #000; padding:6px; display:flex; flex-direction:column; justify-content:space-between;">
                                <div style="font-size:${format === '100x150' ? '18px' : (format === '100x75' ? '14px' : '9px')}; font-weight:700;">${item.name || ''}</div>
                                <div style="font-size:${format === '100x150' ? '14px' : (format === '100x75' ? '12px' : '8px')}; color:#334155;" class="mono">SKU: ${item.category || '-'}</div>
                                <div class="barcode-svg-container"><svg id="pw-svg-${item.sn}"></svg></div>
                                <div style="font-size:${format === '100x150' ? '16px' : (format === '100x75' ? '13px' : '8.5px')}; font-weight:700;" class="mono">LOC: ${formatLocationCode(item.location)}</div>
                            </div>
                        </div>
                    `;
                });
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>หน้าต่างสั่งพิมพ์สติ๊กเกอร์บาร์โค้ด</title>
                    ${styleHeader}
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
                </head>
                <body>
                    <div class="print-control-bar">
                        <div style="font-weight:700; font-size:15px;">📄 พิมพ์บาร์โค้ดสติ๊กเกอร์ (${format}) - รวม ${targetItems.length} รายการ</div>
                        <div>
                            <button class="btn-print-action" onclick="window.print()">🖨️ สั่งพิมพ์ซ้ำ (Print)</button>
                            <button class="btn-close-action" onclick="window.close()">❌ ปิดหน้าต่าง</button>
                        </div>
                    </div>

                    <div class="pdf-preview-container">
                        ${bodyContent}
                    </div>

                    <script>
                        window.onload = function() {
                            const items = ${JSON.stringify(targetItems)};
                            const format = "${format}";
                            items.forEach(item => {
                                const snLen = item.sn ? item.sn.length : 10;
                                const dynamicWidth = snLen > 20 ? 0.8 : (snLen > 14 ? 1.0 : 1.2);
                                if(format === 'A4') {
                                    JsBarcode("#pw-svg-" + item.sn, item.sn, { format: "CODE128", width: 1.4, height: 42, displayValue: true, fontSize: 10, margin: 2 });
                                } else if(format === '100x150') {
                                    JsBarcode("#pw-svg-" + item.sn, item.sn, { format: "CODE128", width: 2.2, height: 110, displayValue: true, fontSize: 16, margin: 5 });
                                } else if(format === '100x75') {
                                    JsBarcode("#pw-svg-" + item.sn, item.sn, { format: "CODE128", width: 1.8, height: 60, displayValue: true, fontSize: 12, margin: 4 });
                                } else if(format === '40x30') {
                                    JsBarcode("#pw-svg-" + item.sn, item.sn, { format: "CODE128", width: dynamicWidth, height: 26, displayValue: true, fontSize: 8.5, margin: 1 });
                                } else {
                                    JsBarcode("#pw-svg-" + item.sn, item.sn, { format: "CODE128", width: dynamicWidth, height: 30, displayValue: true, fontSize: 9, margin: 2 });
                                }
                            });

                            setTimeout(function() {
                                window.print();
                            }, 400);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
            closePrintBarcodeModal();
        }

        // --- SINGLE RELOCATE ENGINE ---
        function openRelocateModal(id, sn, name, currentLoc) {
            document.getElementById('relocateItemId').value = id;
            document.getElementById('relocateItemSn').textContent = sn;
            document.getElementById('relocateItemName').textContent = name;
            document.getElementById('relocateItemCurrentLoc').textContent = formatLocationCode(currentLoc);
            
            populateRelocateBaysDropdown();
            onRelocateAisleOrBayChange();
            document.getElementById('relocateModal').style.display = 'flex';
        }

        function closeRelocateModal() {
            document.getElementById('relocateModal').style.display = 'none';
        }

        function populateDynamicRelocateShelvesAndSlots(aisle) {
            const shelfSelect = document.getElementById('relocateShelfSelect');
            const slotSelect = document.getElementById('relocateSlotSelect');
            
            shelfSelect.innerHTML = '';
            slotSelect.innerHTML = '';

            const cfg = aisleConfigs[aisle] || { shelves: 1, slots: 10 };

            for(let s=1; s<=cfg.shelves; s++) {
                shelfSelect.add(new Option(`ชั้น L${s}`, `L${s}`));
            }
            for(let st=1; st<=cfg.slots; st++) {
                slotSelect.add(new Option(`ช่อง S${st}`, `S${st}`));
            }
        }

        function onRelocateAisleOrBayChange() {
            const aisle = document.getElementById('relocateAisleSelect').value;
            populateRelocateBaysDropdown();
            populateDynamicRelocateShelvesAndSlots(aisle);
            autoSelectAvailableRelocateSlot();
        }

        function autoSelectAvailableRelocateSlot() {
            const aisle = document.getElementById('relocateAisleSelect').value;
            if(aisle === 'DOCK') {
                updateRelocatePreview();
                return;
            }

            const bay = document.getElementById('relocateBaySelect').value;
            const cfg = aisleConfigs[aisle] || { shelves: 1, slots: 10 };

            const occupiedLocations = new Set(globalInventoryData.map(i => (i.location || '').toUpperCase()));
            let foundAvailableSlot = false;

            for(let s=1; s<=cfg.shelves; s++) {
                for(let st=1; st<=cfg.slots; st++) {
                    const shelfStr = `L${s}`;
                    const slotStr = `S${st}`;
                    const targetLoc = `${aisle}-${bay}-${shelfStr}-${slotStr}`.toUpperCase();

                    if(!occupiedLocations.has(targetLoc)) {
                        document.getElementById('relocateShelfSelect').value = shelfStr;
                        document.getElementById('relocateSlotSelect').value = slotStr;
                        foundAvailableSlot = true;
                        break;
                    }
                }
                if(foundAvailableSlot) break;
            }

            updateRelocatePreview();
        }

        function updateRelocatePreview() {
            const aisle = document.getElementById('relocateAisleSelect').value;
            const isDock = aisle === 'DOCK';

            document.getElementById('relocateBaySelect').disabled = isDock;
            document.getElementById('relocateShelfSelect').disabled = isDock;
            document.getElementById('relocateSlotSelect').disabled = isDock;

            let newLoc = 'DOCK';
            if(!isDock) {
                const bay = document.getElementById('relocateBaySelect').value;
                const shelf = document.getElementById('relocateShelfSelect').value;
                const slot = document.getElementById('relocateSlotSelect').value;
                newLoc = `${aisle}-${bay}-${shelf}-${slot}`;
            }

            document.getElementById('relocatePreviewBadge').textContent = formatLocationCode(newLoc);
        }

        async function submitRelocateLocation() {
            const id = document.getElementById('relocateItemId').value;
            const sn = document.getElementById('relocateItemSn').textContent;
            const newLoc = document.getElementById('relocatePreviewBadge').textContent;

            const itemIdx = globalInventoryData.findIndex(i => String(i.id) === String(id) || i.sn === sn);
            if (itemIdx !== -1) {
                globalInventoryData[itemIdx].location = newLoc;
            }

            playSuccessSound();
            showToast(`✅ ย้ายพิกัดจัดเก็บใหม่เป็น ${newLoc} สำเร็จ`);
            closeRelocateModal();
            
            filterInventoryData();
            updateKPIs();
            refreshLocationVisualizerIfActive();

            if (navigator.onLine) {
                await _supabase
                    .from('warehouse_items')
                    .update({ location: newLoc })
                    .eq('id', id);
            }
        }

        // =========================================================================
        // --- BATCH RELOCATE MULTIPLE ITEMS ENGINE ---
        // =========================================================================
        function openBatchRelocateModal() {
            if (selectedItemSnSet.size === 0) {
                alert("⚠️ กรุณาเลือกรายการสินค้าที่ต้องการย้ายอย่างน้อย 1 รายการ");
                return;
            }

            document.getElementById('batchRelocateTotalCount').textContent = selectedItemSnSet.size.toLocaleString();
            populateAisleDropdowns();
            updateBatchRelocateCapacityPreview();
            document.getElementById('batchRelocateModal').style.display = 'flex';
        }

        function closeBatchRelocateModal() {
            document.getElementById('batchRelocateModal').style.display = 'none';
        }

        function updateBatchRelocateCapacityPreview() {
            const targetAisle = document.getElementById('batchRelocateAisleSelect').value;
            const previewText = document.getElementById('batchCapacityPreviewText');

            if (targetAisle === 'DOCK') {
                previewText.textContent = `🚚 พื้นที่ DOCK: รองรับสินค้าพักรอไม่จำกัดจำนวน`;
                previewText.style.color = "var(--primary)";
                return;
            }

            const cfg = aisleConfigs[targetAisle] || { bays: 10, shelves: 1, slots: 10 };
            const occupiedLocations = new Set(globalInventoryData.map(i => (i.location || '').toUpperCase()));

            let availableSlotsCount = 0;
            for (let b = 1; b <= cfg.bays; b++) {
                const bayStr = String(b).padStart(2, '0');
                for (let s = 1; s <= cfg.shelves; s++) {
                    for (let st = 1; st <= cfg.slots; st++) {
                        const targetLoc = `${targetAisle}-${bayStr}-L${s}-S${st}`.toUpperCase();
                        if (!occupiedLocations.has(targetLoc)) {
                            availableSlotsCount++;
                        }
                    }
                }
            }

            const selectedCount = selectedItemSnSet.size;
            if (availableSlotsCount >= selectedCount) {
                previewText.textContent = `✅ มีช่องว่างพร้อมรองรับ: ${availableSlotsCount} ช่อง (เพียงพอสำหรับ ${selectedCount} รายการที่เลือก)`;
                previewText.style.color = "var(--success)";
            } else {
                previewText.textContent = `⚠️ ช่องว่างแถว ${targetAisle} เหลือ ${availableSlotsCount} ช่อง (ไม่เพียงพอสำหรับ ${selectedCount} รายการ)`;
                previewText.style.color = "var(--danger)";
            }
        }

        async function executeBatchRelocate() {
            const targetAisle = document.getElementById('batchRelocateAisleSelect').value;
            const targetSns = Array.from(selectedItemSnSet);
            const occupiedLocations = new Set(globalInventoryData.map(i => (i.location || '').toUpperCase()));

            let updatesList = [];

            if (targetAisle === 'DOCK') {
                targetSns.forEach(sn => {
                    updatesList.push({ sn: sn, newLoc: 'DOCK' });
                });
            } else {
                const cfg = aisleConfigs[targetAisle] || { bays: 10, shelves: 1, slots: 10 };
                let snIdx = 0;

                for (let b = 1; b <= cfg.bays; b++) {
                    const bayStr = String(b).padStart(2, '0');
                    for (let s = 1; s <= cfg.shelves; s++) {
                        for (let st = 1; st <= cfg.slots; st++) {
                            if (snIdx >= targetSns.length) break;

                            const targetLoc = `${targetAisle}-${bayStr}-L${s}-S${st}`.toUpperCase();
                            if (!occupiedLocations.has(targetLoc)) {
                                occupiedLocations.add(targetLoc);
                                updatesList.push({ sn: targetSns[snIdx], newLoc: targetLoc });
                                snIdx++;
                            }
                        }
                        if (snIdx >= targetSns.length) break;
                    }
                    if (snIdx >= targetSns.length) break;
                }

                if (snIdx < targetSns.length) {
                    alert(`⚠️ ย้ายได้เพียง ${snIdx} รายการ เนื่องจากช่องว่างในแถว ${targetAisle} เต็มก่อน`);
                }
            }

            if (updatesList.length === 0) return;

            showToast(`⏳ กำลังย้ายสินค้า ${updatesList.length} รายการไปยังแถว ${targetAisle}...`);

            updatesList.forEach(u => {
                const item = globalInventoryData.find(i => i.sn === u.sn);
                if (item) item.location = u.newLoc;
            });

            selectedItemSnSet.clear();
            closeBatchRelocateModal();

            filterInventoryData();
            updateKPIs();
            refreshLocationVisualizerIfActive();
            playSuccessSound();
            showToast(`✅ ย้ายสินค้า ${updatesList.length} รายการเข้าแถว ${targetAisle} เรียบร้อยแล้ว!`);

            if (navigator.onLine) {
                for (const u of updatesList) {
                    await _supabase
                        .from('warehouse_items')
                        .update({ location: u.newLoc })
                        .eq('sn', u.sn);
                }
            }
        }

        // --- WAREHOUSE LOCATION CONFIG WITH INSTANT REALTIME AUTO-SAVE ---
        function renderAisleSettingsTable() {
            const tbody = document.getElementById('aisleSettingsTableBody');
            tbody.innerHTML = '';

            masterAisles.forEach((aisle, idx) => {
                const cfg = aisleConfigs[aisle] || { bays: 10, shelves: 1, slots: 10 };
                const count = globalInventoryData.filter(i => {
                    const loc = (i.location || 'DOCK').toUpperCase();
                    return aisle === 'DOCK' ? loc === 'DOCK' : loc.startsWith(`${aisle}-`);
                }).length;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:center; font-weight:700;" class="mono">${idx + 1}</td>
                    <td><strong class="mono" style="color:var(--primary);">แถว ${aisle}</strong></td>
                    <td style="text-align:center;">
                        <input type="number" class="form-control mono" style="width:80px; text-align:center; padding:4px;" value="${cfg.bays}" min="1" onchange="updateAisleConfigRealtime('${aisle}', 'bays', this.value)">
                    </td>
                    <td style="text-align:center;">
                        <input type="number" class="form-control mono" style="width:80px; text-align:center; padding:4px;" value="${cfg.shelves}" min="1" onchange="updateAisleConfigRealtime('${aisle}', 'shelves', this.value)">
                    </td>
                    <td style="text-align:center;">
                        <input type="number" class="form-control mono" style="width:80px; text-align:center; padding:4px;" value="${cfg.slots}" min="1" onchange="updateAisleConfigRealtime('${aisle}', 'slots', this.value)">
                    </td>
                    <td style="text-align:center;" class="mono">${count} เครื่อง</td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm btn-secondary" ${idx === 0 ? 'disabled' : ''} onclick="moveAisleOrder(${idx}, -1)"><i class="fa-solid fa-arrow-up"></i> ขึ้น</button>
                        <button class="btn btn-sm btn-secondary" ${idx === masterAisles.length - 1 ? 'disabled' : ''} onclick="moveAisleOrder(${idx}, 1)"><i class="fa-solid fa-arrow-down"></i> ลง</button>
                        <button class="btn btn-sm btn-danger" ${idx === 0 ? 'disabled' : ''} onclick="deleteAisleConfig('${aisle}')"><i class="fa-solid fa-trash"></i> ลบ</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        async function updateAisleConfigRealtime(aisle, key, value) {
            if(!aisleConfigs[aisle]) aisleConfigs[aisle] = { bays: 10, shelves: 1, slots: 10 };
            aisleConfigs[aisle][key] = parseInt(value) || 1;
            
            await saveAisleConfigToDB(aisle);
            populateAisleDropdowns();
            onInboundAisleOrBayChange();
        }

        async function addNewAisleConfig() {
            const val = document.getElementById('newAisleInput').value.trim().toUpperCase();
            if(!val) return;

            if(masterAisles.includes(val)) {
                alert('⚠️ แถวนี้มีอยู่ในระบบแล้ว');
                return;
            }

            masterAisles.push(val);
            aisleConfigs[val] = { bays: 10, shelves: 1, slots: 10 };
            document.getElementById('newAisleInput').value = '';

            const ok = await saveAisleConfigToDB(val);
            if (ok) {
                populateAisleDropdowns();
                renderAisleSettingsTable();
                showToast(`✅ เพิ่มแถวจัดเก็บใหม่ "${val}" และซิงค์ลง DB เรียบร้อยแล้ว`);
            }
        }

        async function deleteAisleConfig(aisle) {
            if(!confirm(`⚠️ คุณแน่ใจหรือไม่ที่จะลบแถว ${aisle}?`)) return;

            masterAisles = masterAisles.filter(a => a !== aisle);
            delete aisleConfigs[aisle];

            const { error } = await _supabase.from('warehouse_configs').delete().eq('aisle_code', aisle);
            if(error) {
                console.error('Delete Aisle Error:', error);
                showToast('❌ เกิดข้อผิดพลาดในการลบข้อมูลแถวใน DB', true);
            } else {
                populateAisleDropdowns();
                renderAisleSettingsTable();
                showToast(`🗑️ ลบแถว ${aisle} ออกจาก DB เรียบร้อยแล้ว`);
            }
        }

        async function moveAisleOrder(index, direction) {
            const targetIndex = index + direction;
            if(targetIndex < 0 || targetIndex >= masterAisles.length) return;

            const temp = masterAisles[index];
            masterAisles[index] = masterAisles[targetIndex];
            masterAisles[targetIndex] = temp;

            await saveAisleConfigToDB(masterAisles[index]);
            await saveAisleConfigToDB(masterAisles[targetIndex]);

            populateAisleDropdowns();
            renderAisleSettingsTable();
        }

        function renderMenuReorderTable() {
            const tbody = document.getElementById('menuReorderTableBody');
            tbody.innerHTML = '';

            menuConfig.forEach((item, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:center; font-weight:700;" class="mono">${idx + 1}</td>
                    <td><i class="fa-solid ${item.icon}"></i> <strong>${item.label}</strong></td>
                    <td><code class="mono" style="color:var(--text-sub);">${item.id}</code></td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm btn-secondary" ${idx === 0 ? 'disabled' : ''} onclick="moveMenuOrder(${idx}, -1)"><i class="fa-solid fa-arrow-up"></i> เลื่อนขึ้น</button>
                        <button class="btn btn-sm btn-secondary" ${idx === menuConfig.length - 1 ? 'disabled' : ''} onclick="moveMenuOrder(${idx}, 1)"><i class="fa-solid fa-arrow-down"></i> เลื่อนลง</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function moveMenuOrder(index, direction) {
            const targetIndex = index + direction;
            if(targetIndex < 0 || targetIndex >= menuConfig.length) return;

            const temp = menuConfig[index];
            menuConfig[index] = menuConfig[targetIndex];
            menuConfig[targetIndex] = temp;

            renderSidebarMenu();
            renderMenuReorderTable();
            showToast(`🔄 ปรับลำดับหน้าเมนูหลักเรียบร้อยแล้ว`);
        }

        // --- EXCEL EXPORT ENGINE ---
        function openExcelExportModal() {
            const select = document.getElementById('exportAisleSelect');
            select.innerHTML = '';

            masterAisles.forEach(aisle => {
                const count = globalInventoryData.filter(i => {
                    const loc = (i.location || 'DOCK').toUpperCase();
                    return aisle === 'DOCK' ? loc === 'DOCK' : loc.startsWith(`${aisle}-`);
                }).length;
                select.add(new Option(`แถว/ล็อก ${aisle} (${count} รายการ)`, aisle));
            });

            document.getElementById('excelExportModal').style.display = 'flex';
        }

        function closeExcelExportModal() {
            document.getElementById('excelExportModal').style.display = 'none';
        }

        function onExportScopeChange(val) {
            document.getElementById('exportAisleGroup').style.display = (val === 'AISLE') ? 'block' : 'none';
        }

        function executeExcelExport() {
            const scope = document.getElementById('exportScopeSelect').value;
            let exportData = [];

            if (scope === 'ALL') {
                exportData = globalInventoryData;
            } else if (scope === 'AISLE') {
                const targetAisle = document.getElementById('exportAisleSelect').value;
                exportData = globalInventoryData.filter(i => {
                    const loc = (i.location || 'DOCK').toUpperCase();
                    return targetAisle === 'DOCK' ? loc === 'DOCK' : loc.startsWith(`${targetAisle}-`);
                });
            } else if (scope === 'FILTERED') {
                const q = document.getElementById('searchInput').value.toLowerCase().trim();
                exportData = globalInventoryData.filter(i => 
                    (i.sn && i.sn.toLowerCase().includes(q)) ||
                    (i.name && i.name.toLowerCase().includes(q)) ||
                    (i.category && i.category.toLowerCase().includes(q)) ||
                    (i.location && i.location.toLowerCase().includes(q))
                );
            }

            if (exportData.length === 0) {
                alert("⚠️ ไม่พบข้อมูลตรงตามเงื่อนไขที่เลือกส่งออก");
                return;
            }

            let excelRows = [
                ["รายงานสรุปข้อมูลคลังสินค้า - WMS System"],
                [`วันที่ส่งออกข้อมูล: ${new Date().toLocaleString('th-TH')}`, "", "", "", `จำนวนส่งออก: ${exportData.length} รายการ`],
                [""],
                ["ลำดับ", "รหัสสินค้า (SKU)", "ชื่อรุ่น / รายละเอียดสินค้า", "ซีเรียลบาร์โค้ด (S/N)", "พิกัดจัดเก็บ (Location)", "จำนวน", "วันเวลารับเข้าคลัง"]
            ];

            exportData.forEach((item, idx) => {
                excelRows.push([
                    idx + 1,
                    item.category || '',
                    item.name || '',
                    item.sn || '',
                    formatLocationCode(item.location || 'DOCK'),
                    item.qty ?? 1,
                    item.created_at ? new Date(item.created_at).toLocaleString('th-TH') : ''
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(excelRows);
            ws['!cols'] = [
                { wch: 8 },
                { wch: 22 },
                { wch: 38 },
                { wch: 28 },
                { wch: 20 },
                { wch: 10 },
                { wch: 25 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stock Inventory");
            XLSX.writeFile(wb, `wms_inventory_export_${Date.now()}.xlsx`);

            closeExcelExportModal();
            showToast(`📥 ส่งออกไฟล์ Excel สำเร็จ (${exportData.length} รายการ)`);
        }

        // --- IMPORT DB FILE ENGINE ---
        function handleFileImport(e) {
            const file = e.target.files[0];
            if(!file) return;

            const reader = new FileReader();
            reader.onload = async function(evt) {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

                    let newItems = [];
                    rows.forEach((row, idx) => {
                        if (idx > 3 && row[3]) {
                            newItems.push({
                                category: String(row[1] || 'GENERAL').trim(),
                                name: String(row[2] || 'ไม่ระบุรุ่น').trim(),
                                sn: String(row[3]).trim(),
                                location: String(row[4] || 'DOCK').trim(),
                                qty: 1,
                                unit: "เครื่อง",
                                created_at: new Date().toISOString()
                            });
                        }
                    });

                    if(newItems.length > 0) {
                        showToast(`⏳ กำลังนำเข้าข้อมูล ${newItems.length} รายการ...`);
                        await _supabase.from('warehouse_items').insert(newItems);
                        playSuccessSound();
                        showToast(`✅ นำเข้าไฟล์ฐานข้อมูลเรียบร้อยแล้ว (${newItems.length} รายการ)`);
                        loadDataFromDatabase();
                    } else {
                        playErrorSound();
                        alert('⚠️ ไม่พบรูปแบบข้อมูลที่ถูกต้องในไฟล์');
                    }
                } catch(err) {
                    console.error('Import Error:', err);
                    playErrorSound();
                    alert('❌ เกิดข้อผิดพลาดในการอ่านไฟล์');
                }
            };
            reader.readAsArrayBuffer(file);
        }
    </script>
</body>
</html>