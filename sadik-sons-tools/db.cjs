const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'sadik_sons.db');
const db = new DatabaseSync(DB_FILE);

// Enable WAL mode (Write-Ahead Logging) for crash safety & concurrency
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    category TEXT,
    serial TEXT,
    shelf TEXT,
    status TEXT DEFAULT 'available',
    assigned_to TEXT,
    assigned_site TEXT,
    checkout_time TEXT,
    expected_return TEXT,
    condition TEXT DEFAULT 'Good',
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    dept TEXT,
    pin TEXT
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    technician TEXT NOT NULL,
    site TEXT,
    condition TEXT,
    notes TEXT
  );
`);

// Check if tools table is empty, seed if so
const countQuery = db.prepare('SELECT COUNT(*) as count FROM tools');
const rowCount = countQuery.get().count;

if (rowCount === 0) {
  console.log('⚡ Seeding initial tools and technicians into SQLite database (sadik_sons.db)...');

  const insertTool = db.prepare(`
    INSERT INTO tools (id, code, name, brand, model, category, serial, shelf, status, assigned_to, assigned_site, checkout_time, expected_return, condition, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialTools = [
    ['SS-TL-001', 'SS-TL-001', 'Hilti TE 70-ATC Rotary Hammer', 'Hilti', 'TE 70-ATC (SDS Max)', 'Heavy Drills', 'HLT-883921-23', 'Rack A-01', 'checked_out', 'Tariq Mansour', 'Tripoli Port Project', '2026-09-14 08:30', '2026-09-22', 'Good', 'hammer'],
    ['SS-TL-002', 'SS-TL-002', 'Bosch GWS 2200W Angle Grinder', 'Bosch', 'GWS 2200-230 Heavy Duty', 'Grinders & Saws', 'BSH-2200-9182', 'Rack B-03', 'available', null, null, null, null, 'Good', 'disc'],
    ['SS-TL-003', 'SS-TL-003', 'DeWalt DWS780 Mitre Saw', 'DeWalt', 'DWS780 305mm Sliding Compound', 'Grinders & Saws', 'DW-780-44910', 'Bay 02 - Floor', 'checked_out', 'Ahmed Al-Hadi', 'Al-Andalus Commercial Center', '2026-09-13 14:15', '2026-09-20', 'Good', 'scissors'],
    ['SS-TL-004', 'SS-TL-004', 'Fluke 87V Industrial Multimeter', 'Fluke', '87V True-RMS High Accuracy', 'Electrical & Test', 'FLK-87V-10294', 'Cabinet C-Elec-1', 'available', null, null, null, null, 'Good', 'activity'],
    ['SS-TL-005', 'SS-TL-005', 'Leica DISTO D810 Laser Measure', 'Leica', 'D810 Touch (200m Range)', 'Lasers & Optics', 'LCA-D810-7731', 'Cabinet A-Laser', 'checked_out', 'Youssef Salem', 'Benghazi Substation A', '2026-09-15 07:10', '2026-09-21', 'Good', 'crosshair'],
    ['SS-TL-006', 'SS-TL-006', 'Makita DTD152 Impact Driver 18V', 'Makita', 'DTD152Z 165Nm Cordless', 'Heavy Drills', 'MKT-152-88219', 'Rack A-04', 'available', null, null, null, null, 'Good', 'drill'],
    ['SS-TL-007', 'SS-TL-007', 'Honda EU30is Inverter Generator', 'Honda', 'EU30is 3.0kVA Silent', 'Power & Generators', 'HND-EU30-5510', 'Ground Yard - G1', 'checked_out', 'Omar Benali', 'Misrata Industrial Zone', '2026-09-12 11:00', '2026-09-20', 'Good', 'zap'],
    ['SS-TL-008', 'SS-TL-008', 'Milwaukee M18 Fuel Pipe Threader', 'Milwaukee', 'M18 FPT2-0C 2-Inch Compact', 'Grinders & Saws', 'MLW-M18-0922', 'Rack B-06', 'maintenance', null, null, null, null, 'Blade worn - servicing motor brushes', 'tool'],
    ['SS-TL-009', 'SS-TL-009', 'Hilti PR 30-HVS Rotating Laser', 'Hilti', 'PR 30-HVS Outdoor Horizontal/Vertical', 'Lasers & Optics', 'HLT-PR30-1928', 'Cabinet A-Laser', 'checked_out', 'Khaled Zaid', 'Tripoli Port Project', '2026-09-15 08:00', '2026-09-23', 'Good', 'radar'],
    ['SS-TL-010', 'SS-TL-010', 'Bosch Professional Line Laser GLL 3-80', 'Bosch', 'GLL 3-80 C 3x360°', 'Lasers & Optics', 'BSH-GLL-6110', 'Cabinet A-Laser', 'available', null, null, null, null, 'Good', 'crosshair'],
    ['SS-TL-011', 'SS-TL-011', 'Knipex Master Electrician Set (1000V)', 'Knipex', 'VDE Insulated 12-Piece Case', 'Electrical & Test', 'KNP-VDE-38102', 'Cabinet C-Elec-2', 'available', null, null, null, null, 'Good', 'briefcase'],
    ['SS-TL-012', 'SS-TL-012', 'DeWalt D25980 Demolition Breaker', 'DeWalt', 'D25980 30kg Pavement Breaker', 'Heavy Drills', 'DW-BRK-9901', 'Bay 01 - Heavy', 'checked_out', 'Tariq Mansour', 'Tripoli Port Project', '2026-09-14 09:10', '2026-09-22', 'Good', 'hammer']
  ];

  initialTools.forEach(t => insertTool.run(...t));

  const insertTech = db.prepare(`
    INSERT INTO technicians (id, name, role, phone, dept, pin)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const initialTechs = [
    ['T-01', 'Tariq Mansour', 'Lead Civil & Structural Tech', '+218 91 234 5678', 'Heavy Machinery', '1122'],
    ['T-02', 'Ahmed Al-Hadi', 'Senior Carpenter & Joiner', '+218 92 345 6789', 'Finishing & Woodwork', '2233'],
    ['T-03', 'Youssef Salem', 'Site Surveyor & Quality Inspector', '+218 91 456 7890', 'Engineering & Survey', '3344'],
    ['T-04', 'Omar Benali', 'Chief Electrical Technician', '+218 92 567 8901', 'High Voltage & Power', '4455'],
    ['T-05', 'Khaled Zaid', 'HVAC & Plumbing Lead', '+218 91 678 9012', 'Mechanical Services', '5566']
  ];
  initialTechs.forEach(tech => insertTech.run(...tech));

  const insertSite = db.prepare('INSERT OR IGNORE INTO sites (name) VALUES (?)');
  const initialSites = [
    'Tripoli Port Project',
    'Benghazi Substation A',
    'Al-Andalus Commercial Center',
    'Misrata Industrial Zone',
    'Central Workshop'
  ];
  initialSites.forEach(s => insertSite.run(s));

  const insertLog = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, tool_id, tool_name, technician, site, condition, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialLogs = [
    ['LOG-109', '2026-09-15 08:00', 'CHECK_OUT', 'SS-TL-009', 'Hilti PR 30-HVS Rotating Laser', 'Khaled Zaid', 'Tripoli Port Project', 'Good', 'Includes tripod & detector staff'],
    ['LOG-108', '2026-09-15 07:10', 'CHECK_OUT', 'SS-TL-005', 'Leica DISTO D810 Laser Measure', 'Youssef Salem', 'Benghazi Substation A', 'Good', 'Site survey measurement']
  ];
  initialLogs.forEach(l => insertLog.run(...l));
}

function getNowString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

// Convert row to camelCase for API compatibility
function mapToolRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    brand: r.brand,
    model: r.model,
    category: r.category,
    serial: r.serial,
    shelf: r.shelf,
    status: r.status,
    assignedTo: r.assigned_to,
    assignedSite: r.assigned_site,
    checkoutTime: r.checkout_time,
    expectedReturn: r.expected_return,
    condition: r.condition,
    icon: r.icon
  };
}

const sqliteService = {
  getTools() {
    const rows = db.prepare('SELECT * FROM tools ORDER BY id ASC').all();
    return rows.map(mapToolRow);
  },

  getTool(idOrCode) {
    const clean = String(idOrCode).trim().toUpperCase();
    const row = db.prepare('SELECT * FROM tools WHERE UPPER(id) = ? OR UPPER(code) = ?').get(clean, clean);
    return mapToolRow(row);
  },

  addTool(tool) {
    const count = db.prepare('SELECT COUNT(*) as count FROM tools').get().count + 1;
    const code = tool.code || `SS-TL-${String(count).padStart(3, '0')}`;
    const id = code;

    const stmt = db.prepare(`
      INSERT INTO tools (id, code, name, brand, model, category, serial, shelf, status, condition, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', 'Good', ?)
    `);

    stmt.run(
      id,
      code,
      tool.name || 'Untitled Tool',
      tool.brand || 'Generic',
      tool.model || '',
      tool.category || 'Hand Tools',
      tool.serial || 'SN-' + Date.now().toString().slice(-6),
      tool.shelf || 'Main Crib',
      tool.icon || 'wrench'
    );

    return this.getTool(id);
  },

  checkoutTool({ toolId, technicianName, site, expectedReturn, notes }) {
    const clean = String(toolId).trim().toUpperCase();
    const tool = this.getTool(clean);
    if (!tool) throw new Error('Tool not found');
    if (tool.status === 'checked_out') throw new Error(`Tool is already checked out to ${tool.assignedTo}`);
    if (tool.status === 'maintenance') throw new Error(`Tool is currently in maintenance and cannot be dispatched`);

    const nowStr = getNowString();

    db.prepare(`
      UPDATE tools
      SET status = 'checked_out',
          assigned_to = ?,
          assigned_site = ?,
          checkout_time = ?,
          expected_return = ?
      WHERE UPPER(id) = ? OR UPPER(code) = ?
    `).run(technicianName, site || 'Job Site', nowStr, expectedReturn || '', clean, clean);

    // Insert Audit Log
    const logId = 'LOG-' + Math.floor(1000 + Math.random() * 9000);
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, tool_id, tool_name, technician, site, condition, notes)
      VALUES (?, ?, 'CHECK_OUT', ?, ?, ?, ?, ?, ?)
    `).run(logId, nowStr, tool.id, tool.name, technicianName, site || 'Job Site', tool.condition || 'Good', notes || 'Checked out to job site');

    return this.getTool(clean);
  },

  checkinTool({ toolId, condition, shelf, notes }) {
    const clean = String(toolId).trim().toUpperCase();
    const tool = this.getTool(clean);
    if (!tool) throw new Error('Tool not found');

    const prevTech = tool.assignedTo || 'Technician';
    const prevSite = tool.assignedSite || 'Job Site';
    const nowStr = getNowString();
    const newStatus = condition === 'Damaged' ? 'maintenance' : 'available';

    db.prepare(`
      UPDATE tools
      SET status = ?,
          condition = ?,
          assigned_to = NULL,
          assigned_site = NULL,
          checkout_time = NULL,
          expected_return = NULL,
          shelf = COALESCE(?, shelf)
      WHERE UPPER(id) = ? OR UPPER(code) = ?
    `).run(newStatus, condition || 'Good', shelf || null, clean, clean);

    // Insert Audit Log
    const logId = 'LOG-' + Math.floor(1000 + Math.random() * 9000);
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, tool_id, tool_name, technician, site, condition, notes)
      VALUES (?, ?, 'CHECK_IN', ?, ?, ?, ?, ?, ?)
    `).run(logId, nowStr, tool.id, tool.name, prevTech, prevSite, condition || 'Good', notes || 'Returned to tool crib');

    return this.getTool(clean);
  },

  getTechnicians() {
    return db.prepare('SELECT * FROM technicians ORDER BY id ASC').all();
  },

  getSites() {
    const rows = db.prepare('SELECT name FROM sites ORDER BY name ASC').all();
    return rows.map(r => r.name);
  },

  getLogs() {
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all();
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      toolId: r.tool_id,
      toolName: r.tool_name,
      technician: r.technician,
      site: r.site,
      condition: r.condition,
      notes: r.notes
    }));
  },

  getStats() {
    const total = db.prepare('SELECT COUNT(*) as c FROM tools').get().c;
    const inField = db.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'checked_out'").get().c;
    const available = db.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'available'").get().c;
    const maintenance = db.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'maintenance'").get().c;
    return { total, inField, available, maintenance };
  }
};

module.exports = sqliteService;
