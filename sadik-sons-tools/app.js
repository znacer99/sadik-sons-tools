// --- SADIK SONS ENTERPRISE DESKTOP APP LOGIC ---

let tools = [];
let technicians = [];
let sites = [];
let logs = [];
let serverConfig = { hostUrl: window.location.origin };

let currentCategoryFilter = "All";
let currentStatusFilter = "All";
let currentSearchTerm = "";
let html5QrScanner = null;
let activeCheckoutToolId = null;
let activeCheckinToolId = null;
let pollTimer = null;

// Load server config (for host IP in QR tags)
async function fetchConfig() {
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      serverConfig = await res.json();
    }
  } catch (e) {}
}

async function fetchAllData(silent = false) {
  try {
    const [toolsRes, techRes, sitesRes, logsRes] = await Promise.all([
      fetch("/api/tools"),
      fetch("/api/technicians"),
      fetch("/api/sites"),
      fetch("/api/logs")
    ]);

    if (toolsRes.ok) tools = await toolsRes.json();
    if (techRes.ok) technicians = await techRes.json();
    if (sitesRes.ok) sites = await sitesRes.json();
    if (logsRes.ok) logs = await logsRes.json();

    renderDashboard();
    renderInventoryGrid();
    renderCustodyBoard();
    renderAuditLogs();
  } catch (err) {
    if (!silent) console.error("Error fetching data:", err);
  }
}

// --- VIEW SWITCHING ---
function switchTab(viewId) {
  ["view-dashboard", "view-inventory", "view-custody", "view-print", "view-logs"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const activeEl = document.getElementById(viewId);
  if (activeEl) activeEl.classList.remove("hidden");

  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.classList.remove("active", "text-brand-700", "font-bold");
    btn.classList.add("text-surface-muted", "font-medium");
  });

  const mapping = {
    "view-dashboard": "nav-btn-dashboard",
    "view-inventory": "nav-btn-inventory",
    "view-custody": "nav-btn-custody",
    "view-print": "nav-btn-print"
  };

  if (mapping[viewId]) {
    const btn = document.getElementById(mapping[viewId]);
    if (btn) {
      btn.classList.add("active", "text-brand-700", "font-bold");
      btn.classList.remove("text-surface-muted", "font-medium");
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (viewId === "view-print") generateAllPrintTags();
  if (viewId === "view-custody") renderCustodyBoard();
  if (viewId === "view-inventory") renderInventoryGrid();
  if (viewId === "view-logs") renderAuditLogs();
  if (viewId === "view-dashboard") renderDashboard();

  lucide.createIcons();
}

// --- RENDER DASHBOARD ---
function renderDashboard() {
  const total = tools.length;
  const inField = tools.filter(t => t.status === "checked_out").length;
  const available = tools.filter(t => t.status === "available").length;
  const maintenance = tools.filter(t => t.status === "maintenance").length;

  document.getElementById("metric-total-tools").textContent = total;
  document.getElementById("metric-in-field").textContent = inField;
  document.getElementById("metric-available").textContent = available;
  document.getElementById("metric-maintenance").textContent = maintenance;
  document.getElementById("field-count-pill").textContent = `${inField} Tools in Field`;

  const activeToolsContainer = document.getElementById("dashboard-active-tools-container");
  if (!activeToolsContainer) return;
  activeToolsContainer.innerHTML = "";

  const fieldTools = tools.filter(t => t.status === "checked_out");
  if (fieldTools.length === 0) {
    activeToolsContainer.innerHTML = `
      <div class="col-span-2 p-8 text-center bg-white rounded-3xl border border-surface-border text-surface-muted shadow-card-sm">
        <i data-lucide="check-circle-2" class="w-8 h-8 mx-auto mb-2 text-emerald-600"></i>
        <p class="text-sm font-semibold text-surface-navy">All tools are safe in the crib.</p>
        <p class="text-xs text-surface-muted mt-0.5">No active checkouts currently in the field.</p>
      </div>
    `;
  } else {
    fieldTools.slice(0, 6).forEach(tool => {
      const card = document.createElement("div");
      card.className = "bg-white hover:bg-surface-subtle p-4 rounded-3xl border border-surface-border shadow-card-sm hover:shadow-card-md transition-all flex flex-col justify-between";
      card.innerHTML = `
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
              ${tool.code}
            </span>
            <span class="text-[10px] text-surface-muted flex items-center gap-1">
              <i data-lucide="clock" class="w-3 h-3 text-brand-600"></i>
              <span>${tool.checkoutTime ? tool.checkoutTime.split(" ")[0] : "Active"}</span>
            </span>
          </div>
          <h4 class="text-sm font-bold text-surface-navy line-clamp-1">${tool.name}</h4>
          <p class="text-xs text-surface-muted font-mono mt-0.5">${tool.brand} • ${tool.model}</p>
          
          <div class="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-brand-700 text-white font-extrabold flex items-center justify-center text-[10px]">
                ${tool.assignedTo ? tool.assignedTo[0] : "T"}
              </div>
              <div>
                <span class="font-semibold text-surface-navy text-xs block leading-tight">${tool.assignedTo || "Unassigned"}</span>
                <span class="text-[10px] text-surface-muted flex items-center gap-1">
                  <i data-lucide="map-pin" class="w-2.5 h-2.5 text-brand-600"></i>
                  <span>${tool.assignedSite || "Job Site"}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3 pt-3 border-t border-surface-border flex items-center gap-2">
          <button onclick="triggerCheckin('${tool.id}')" class="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1 transition-all">
            <i data-lucide="arrow-down-left" class="w-3.5 h-3.5"></i>
            <span>Return Tool</span>
          </button>
          <button onclick="previewToolQR('${tool.id}')" class="p-1.5 rounded-xl bg-surface-subtle text-surface-muted hover:text-surface-navy border border-surface-border">
            <i data-lucide="qr-code" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;
      activeToolsContainer.appendChild(card);
    });
  }

  const recentLogsContainer = document.getElementById("dashboard-recent-logs");
  if (!recentLogsContainer) return;
  recentLogsContainer.innerHTML = "";
  logs.slice(0, 5).forEach(log => {
    const item = document.createElement("div");
    item.className = "flex items-start gap-3 p-2.5 rounded-2xl bg-surface-subtle border border-surface-border/70 text-xs";
    const isCheckout = log.action === "CHECK_OUT";
    item.innerHTML = `
      <div class="w-7 h-7 rounded-xl ${isCheckout ? "bg-brand-100 text-brand-700" : "bg-emerald-100 text-emerald-700"} flex items-center justify-center shrink-0 font-bold">
        <i data-lucide="${isCheckout ? "arrow-up-right" : "arrow-down-left"}" class="w-3.5 h-3.5"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-surface-navy truncate">${log.toolName}</span>
          <span class="text-[10px] text-surface-muted font-mono">${log.timestamp.split(" ")[1] || log.timestamp}</span>
        </div>
        <p class="text-[11px] text-surface-muted mt-0.5 flex items-center gap-1.5">
          <span class="text-surface-navy font-medium">${log.technician}</span>
          <span>•</span>
          <span class="truncate">${log.site || "Tool Crib"}</span>
        </p>
      </div>
    `;
    recentLogsContainer.appendChild(item);
  });

  lucide.createIcons();
}

// --- RENDER INVENTORY GRID ---
function renderInventoryGrid() {
  const grid = document.getElementById("inventory-grid");
  if (!grid) return;
  grid.innerHTML = "";

  let filtered = tools.filter(tool => {
    const matchCat = currentCategoryFilter === "All" || tool.category === currentCategoryFilter;
    const matchStat = currentStatusFilter === "All" || tool.status === currentStatusFilter;
    const q = currentSearchTerm.toLowerCase();
    const matchSearch = !q || 
      tool.name.toLowerCase().includes(q) ||
      tool.brand.toLowerCase().includes(q) ||
      tool.model.toLowerCase().includes(q) ||
      tool.code.toLowerCase().includes(q) ||
      tool.serial.toLowerCase().includes(q) ||
      (tool.assignedTo && tool.assignedTo.toLowerCase().includes(q));
    return matchCat && matchStat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-12 text-center bg-white rounded-3xl border border-surface-border text-surface-muted shadow-card-sm">
        <i data-lucide="search-x" class="w-10 h-10 mx-auto mb-2 text-surface-muted"></i>
        <p class="text-sm font-semibold text-surface-navy">No tools matched your criteria.</p>
        <p class="text-xs text-surface-muted mt-1">Try clearing search filters or add a new tool.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  filtered.forEach(tool => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-3xl p-5 border border-surface-border shadow-card-sm hover:shadow-card-md hover:border-brand-200 transition-all flex flex-col justify-between group";

    let statusBadge = "";
    if (tool.status === "available") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
      </span>`;
    } else if (tool.status === "checked_out") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-brand-600"></span> In Field
      </span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Maintenance
      </span>`;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-[11px] font-mono font-bold text-surface-muted px-2 py-0.5 rounded bg-surface-subtle border border-surface-border">
            ${tool.code}
          </span>
          ${statusBadge}
        </div>

        <div class="flex items-start gap-3">
          <div class="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 shrink-0 group-hover:bg-brand-100 transition-colors">
            <i data-lucide="${tool.icon || "wrench"}" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-surface-navy line-clamp-1">${tool.name}</h3>
            <p class="text-xs text-surface-muted font-mono">${tool.brand} • ${tool.model}</p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div class="bg-surface-subtle p-2 rounded-xl border border-surface-border">
            <span class="text-surface-muted block text-[9px] uppercase">Serial Number</span>
            <span class="text-surface-navy truncate block font-bold">${tool.serial}</span>
          </div>
          <div class="bg-surface-subtle p-2 rounded-xl border border-surface-border">
            <span class="text-surface-muted block text-[9px] uppercase">Crib Shelf</span>
            <span class="text-surface-navy truncate block">${tool.shelf || "Main Crib"}</span>
          </div>
        </div>

        <div class="mt-3 p-3 rounded-2xl bg-surface-subtle border border-surface-border text-xs">
          ${tool.status === "checked_out" ? `
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] uppercase font-bold text-brand-700 block">Current Custody</span>
                <span class="font-bold text-surface-navy">${tool.assignedTo}</span>
                <span class="text-[11px] text-surface-muted block mt-0.5 flex items-center gap-1">
                  <i data-lucide="map-pin" class="w-3 h-3 text-brand-600"></i> ${tool.assignedSite}
                </span>
              </div>
            </div>
          ` : `
            <div class="flex items-center justify-between text-surface-muted">
              <span class="text-[11px]">Ready for dispatch</span>
              <span class="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Locked in Crib</span>
            </div>
          `}
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-surface-border flex items-center gap-2">
        ${tool.status === "available" ? `
          <button onclick="triggerCheckout('${tool.id}')" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95">
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
            <span>Check Out</span>
          </button>
        ` : tool.status === "checked_out" ? `
          <button onclick="triggerCheckin('${tool.id}')" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5 transition-all active:scale-95">
            <i data-lucide="arrow-down-left" class="w-3.5 h-3.5"></i>
            <span>Return Tool</span>
          </button>
        ` : `
          <button onclick="releaseFromMaintenance('${tool.id}')" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-surface-subtle text-surface-navy border border-surface-border flex items-center justify-center gap-1.5">
            <i data-lucide="wrench" class="w-3.5 h-3.5 text-brand-700"></i>
            <span>Mark Repaired</span>
          </button>
        `}
        
        <button onclick="previewToolQR('${tool.id}')" title="View Printable Tag" class="p-2 rounded-xl bg-surface-subtle hover:bg-slate-200 text-surface-muted hover:text-surface-navy border border-surface-border">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  lucide.createIcons();
}

// --- RENDER TECHNICIAN CUSTODY BOARD ---
function renderCustodyBoard() {
  const grid = document.getElementById("technicians-grid");
  if (!grid) return;
  grid.innerHTML = "";

  technicians.forEach(tech => {
    const assignedTools = tools.filter(t => t.assignedTo === tech.name && t.status === "checked_out");
    const card = document.createElement("div");
    card.className = "bg-white rounded-3xl p-5 border border-surface-border shadow-card-sm hover:shadow-card-md transition-all";

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 font-black text-base flex items-center justify-center">
            ${tech.name.split(" ").map(n=>n[0]).join("")}
          </div>
          <div>
            <h3 class="text-sm font-bold text-surface-navy">${tech.name}</h3>
            <p class="text-xs text-surface-muted">${tech.role}</p>
            <span class="text-[10px] font-mono text-brand-700 font-medium mt-0.5 block">${tech.dept}</span>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold ${assignedTools.length > 0 ? "bg-brand-700 text-white" : "bg-surface-subtle text-surface-muted border border-surface-border"}">
          ${assignedTools.length} Tools
        </span>
      </div>

      <div class="space-y-2 pt-3 border-t border-surface-border">
        <div class="text-[11px] font-semibold text-surface-muted uppercase tracking-wider flex items-center justify-between">
          <span>Tools in Possession:</span>
          <span class="text-surface-navy font-mono font-bold">${tech.phone}</span>
        </div>

        ${assignedTools.length === 0 ? `
          <p class="text-xs text-surface-muted italic py-2">No company equipment currently assigned.</p>
        ` : `
          <div class="space-y-2">
            ${assignedTools.map(tool => `
              <div class="p-2.5 rounded-2xl bg-surface-subtle border border-surface-border flex items-center justify-between text-xs">
                <div>
                  <span class="font-bold text-surface-navy block">${tool.name}</span>
                  <span class="text-[10px] text-surface-muted font-mono">${tool.code} • ${tool.assignedSite || "Field"}</span>
                </div>
                <button onclick="triggerCheckin('${tool.id}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                  Return
                </button>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
    grid.appendChild(card);
  });

  lucide.createIcons();
}

// --- RENDER AUDIT LOGS ---
function renderAuditLogs() {
  const tbody = document.getElementById("audit-logs-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  logs.forEach(log => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-surface-subtle transition-colors";
    const isCheckout = log.action === "CHECK_OUT";

    tr.innerHTML = `
      <td class="py-3 px-4 font-mono text-surface-navy whitespace-nowrap">${log.timestamp}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isCheckout ? "bg-brand-50 text-brand-700 border border-brand-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}">
          ${log.action}
        </span>
      </td>
      <td class="py-3 px-4 font-bold text-surface-navy">
        ${log.toolName}
        <span class="block text-[10px] font-mono text-surface-muted font-normal">${log.toolId}</span>
      </td>
      <td class="py-3 px-4 text-surface-navy font-medium">${log.technician}</td>
      <td class="py-3 px-4 text-surface-muted">${log.site || "Tool Crib"}</td>
      <td class="py-3 px-4">
        <span class="text-xs font-semibold ${log.condition === "Good" ? "text-emerald-700" : "text-amber-700"}">${log.condition || "Good"}</span>
      </td>
      <td class="py-3 px-4 text-surface-muted text-[11px]">${log.notes || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- QR PRINT STUDIO GENERATOR ---
function generateAllPrintTags() {
  const container = document.getElementById("print-tags-grid");
  if (!container) return;
  container.innerHTML = "";
  document.getElementById("print-tag-count").textContent = `${tools.length} Labels Ready`;

  const baseUrl = serverConfig.hostUrl || window.location.origin;

  tools.forEach(tool => {
    const tagBox = document.createElement("div");
    tagBox.className = "p-4 rounded-2xl bg-white border-2 border-slate-300 flex flex-col items-center justify-between text-center relative overflow-hidden shadow-sm";

    const canvasId = `qr-canvas-${tool.id}`;
    const phoneScanUrl = `${baseUrl}/scan?id=${encodeURIComponent(tool.id)}`;

    tagBox.innerHTML = `
      <!-- Header with Sadik Sons -->
      <div class="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
        <div class="flex items-center gap-1.5">
          <img src="./logo-sadik-sons.png" alt="Sadik Sons" class="w-4 h-4 object-contain" />
          <span class="text-[10px] font-extrabold text-brand-900 uppercase tracking-wider">Sadik Sons</span>
        </div>
        <span class="text-[9px] font-mono font-bold text-brand-700 px-1.5 py-0.5 bg-brand-50 rounded border border-brand-200">${tool.code}</span>
      </div>

      <!-- Canvas QR -->
      <div class="bg-white p-1 rounded-xl my-1">
        <canvas id="${canvasId}" class="w-24 h-24"></canvas>
      </div>

      <!-- Tool Info -->
      <div class="w-full mt-1.5">
        <h4 class="text-xs font-bold text-slate-900 truncate">${tool.name}</h4>
        <p class="text-[10px] text-slate-500 font-mono truncate">SN: ${tool.serial}</p>
        <p class="text-[8px] font-mono uppercase text-brand-700 mt-1 font-bold tracking-tighter">POINT PHONE TO CHECK-OUT</p>
      </div>
    `;
    container.appendChild(tagBox);

    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        QRCode.toCanvas(canvas, phoneScanUrl, {
          width: 96,
          margin: 1,
          color: {
            dark: "#0F172A",
            light: "#ffffff"
          }
        });
      }
    }, 50);
  });
}

// --- SCANNER & CAMERA CONTROLS ---
function openScannerModal() {
  document.getElementById("modal-scanner").classList.remove("hidden");
  
  const picker = document.getElementById("quick-tool-picker");
  picker.innerHTML = "<option value=''>-- Choose a tool to simulate scanning --</option>";
  tools.forEach(t => {
    picker.innerHTML += `<option value="${t.id}">${t.code} - ${t.name} (${t.status.toUpperCase()})</option>`;
  });

  try {
    if (!html5QrScanner) {
      html5QrScanner = new Html5Qrcode("qr-reader");
    }
    html5QrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        handleScannedCode(decodedText);
      },
      (errorMessage) => {}
    ).catch(err => {
      console.warn("Camera fallback mode:", err);
    });
  } catch(e) {
    console.warn("Camera error:", e);
  }
}

function closeScannerModal() {
  document.getElementById("modal-scanner").classList.add("hidden");
  if (html5QrScanner) {
    try {
      html5QrScanner.stop().catch(e => {});
    } catch(e){}
  }
}

function simulateScan(toolId) {
  if (!toolId) return;
  handleScannedCode(toolId);
}

function handleScannedCode(code) {
  closeScannerModal();

  let targetId = code;
  if (code.includes("id=")) {
    const parts = code.split("id=");
    if (parts[1]) targetId = parts[1].split("&")[0];
  }

  const match = tools.find(t => 
    targetId.toUpperCase().includes(t.id.toUpperCase()) || 
    targetId.toUpperCase().includes(t.code.toUpperCase())
  );

  if (!match) {
    alert("Scanned tag was not recognized: " + code);
    return;
  }

  if (match.status === "available") {
    triggerCheckout(match.id);
  } else if (match.status === "checked_out") {
    triggerCheckin(match.id);
  } else {
    alert(`Tool ${match.name} is currently flagged for Maintenance/Repair.`);
  }
}

// --- CHECK-OUT MODAL FLOW (CONNECTED TO REST API) ---
function triggerCheckout(toolId) {
  const tool = tools.find(t => t.id === toolId);
  if (!tool) return;
  activeCheckoutToolId = toolId;

  const preview = document.getElementById("checkout-tool-preview");
  preview.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold shrink-0">
      <i data-lucide="wrench" class="w-5 h-5"></i>
    </div>
    <div>
      <span class="text-[10px] font-mono font-bold text-brand-700 px-1.5 py-0.5 rounded bg-brand-100">${tool.code}</span>
      <h4 class="text-xs font-bold text-surface-navy mt-1">${tool.name}</h4>
      <p class="text-[11px] text-surface-muted font-mono">SN: ${tool.serial} • Shelf: ${tool.shelf}</p>
    </div>
  `;

  const select = document.getElementById("checkout-technician-select");
  select.innerHTML = "";
  technicians.forEach(tech => {
    select.innerHTML += `<option value="${tech.name}">${tech.name} (${tech.dept})</option>`;
  });

  const siteSelect = document.getElementById("checkout-site-select");
  siteSelect.innerHTML = "";
  sites.forEach(s => {
    siteSelect.innerHTML += `<option value="${s}">${s}</option>`;
  });

  const date = new Date();
  date.setDate(date.getDate() + 3);
  document.getElementById("checkout-return-date").value = date.toISOString().split("T")[0];

  document.getElementById("modal-checkout").classList.remove("hidden");
  lucide.createIcons();
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();
  if (!activeCheckoutToolId) return;

  const techName = document.getElementById("checkout-technician-select").value;
  const site = document.getElementById("checkout-site-select").value;
  const returnDate = document.getElementById("checkout-return-date").value;
  const notes = document.getElementById("checkout-notes").value;

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId: activeCheckoutToolId,
        technicianName: techName,
        site: site,
        expectedReturn: returnDate,
        notes: notes
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Checkout failed");
    }

    closeModal("modal-checkout");
    await fetchAllData(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#2563EB", "#1D4ED8", "#60A5FA", "#FFFFFF"]
      });
    } catch(e){}
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// --- CHECK-IN / RETURN MODAL FLOW ---
function triggerCheckin(toolId) {
  const tool = tools.find(t => t.id === toolId);
  if (!tool) return;
  activeCheckinToolId = toolId;

  const preview = document.getElementById("checkin-tool-preview");
  preview.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
      <i data-lucide="box" class="w-5 h-5"></i>
    </div>
    <div>
      <span class="text-[10px] font-mono font-bold text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-100">${tool.code}</span>
      <h4 class="text-xs font-bold text-surface-navy mt-1">${tool.name}</h4>
      <p class="text-[11px] text-surface-muted">Returning from: <span class="text-surface-navy font-semibold">${tool.assignedTo || "Field"}</span> (${tool.assignedSite || "Job Site"})</p>
    </div>
  `;

  document.getElementById("checkin-shelf").value = tool.shelf || "Rack A-01";
  document.getElementById("modal-checkin").classList.remove("hidden");
  lucide.createIcons();
}

async function handleCheckinSubmit(event) {
  event.preventDefault();
  if (!activeCheckinToolId) return;

  const condition = document.querySelector('input[name="return-condition"]:checked').value;
  const shelf = document.getElementById("checkin-shelf").value;
  const notes = document.getElementById("checkin-notes").value;

  try {
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId: activeCheckinToolId,
        condition: condition,
        shelf: shelf,
        notes: notes
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Return failed");
    }

    closeModal("modal-checkin");
    await fetchAllData(true);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function releaseFromMaintenance(toolId) {
  const tool = tools.find(t => t.id === toolId);
  if (!tool) return;
  if (confirm(`Mark ${tool.name} as serviced and return to Available inventory?`)) {
    try {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: tool.id,
          condition: "Good (Serviced)"
        })
      });
      await fetchAllData(true);
    } catch (e) {
      alert("Error: " + e.message);
    }
  }
}

// --- ADD NEW TOOL FLOW ---
function openAddToolModal() {
  document.getElementById("modal-add-tool").classList.remove("hidden");
}

async function handleAddToolSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("new-tool-name").value;
  const brand = document.getElementById("new-tool-brand").value;
  const model = document.getElementById("new-tool-model").value;
  const category = document.getElementById("new-tool-category").value;
  const serial = document.getElementById("new-tool-serial").value;
  const shelf = document.getElementById("new-tool-shelf").value;

  try {
    const res = await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        brand,
        model,
        category,
        serial,
        shelf
      })
    });

    if (!res.ok) throw new Error("Could not add tool");

    closeModal("modal-add-tool");
    document.getElementById("add-tool-form").reset();
    await fetchAllData(true);
    switchTab("view-inventory");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function previewToolQR(toolId) {
  switchTab("view-print");
}

function filterCategory(cat) {
  currentCategoryFilter = cat;
  document.querySelectorAll(".category-btn").forEach(btn => {
    if (btn.textContent.trim() === cat || (cat === "All" && btn.textContent.includes("All"))) {
      btn.className = "category-btn active px-4 py-2 rounded-2xl font-bold bg-brand-700 text-white shadow-sm transition-all";
    } else {
      btn.className = "category-btn px-4 py-2 rounded-2xl font-medium bg-white text-surface-muted hover:text-surface-navy border border-surface-border transition-all";
    }
  });
  renderInventoryGrid();
}

function filterStatus(status) {
  currentStatusFilter = status;
  renderInventoryGrid();
}

function handleSearch(val) {
  currentSearchTerm = val;
  if (document.getElementById("view-inventory").classList.contains("hidden")) {
    switchTab("view-inventory");
  }
  renderInventoryGrid();
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function exportLogsCSV() {
  let csv = "Timestamp,Action,Tool_ID,Tool_Name,Technician,Site,Condition,Notes\n";
  logs.forEach(l => {
    csv += `"${l.timestamp}","${l.action}","${l.toolId}","${l.toolName}","${l.technician}","${l.site || ""}","${l.condition || ""}","${l.notes || ""}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", `sadik_sons_custody_log_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
}

// Initialize App
window.addEventListener("DOMContentLoaded", async () => {
  await fetchConfig();
  await fetchAllData();
  lucide.createIcons();

  // Auto-refresh poll every 3.5s for multi-device sync
  pollTimer = setInterval(() => {
    fetchAllData(true);
  }, 3500);
});
