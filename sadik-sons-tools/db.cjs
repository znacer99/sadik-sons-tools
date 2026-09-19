const path = require('path');
const fs = require('fs');

let DatabaseSync = null;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  DatabaseSync = null;
}

const DB_FILE_SQLITE = path.join(__dirname, 'sadik_sons.db');
const DB_FILE_JSON = path.join(__dirname, 'sadik_sons_database.json');
const DB_FILE_TMP = path.join(__dirname, 'sadik_sons_database.tmp.json');

const INITIAL_TOOLS = [
  {
    id: 'SS-TL-001',
    code: 'SS-TL-001',
    name: 'Hilti TE 70-ATC Rotary Hammer',
    brand: 'Hilti',
    model: 'TE 70-ATC (SDS Max)',
    category: 'Heavy Drills',
    serial: 'HLT-883921-23',
    shelf: 'Rack A-01',
    status: 'checked_out',
    assignedTo: 'Tariq Mansour',
    assignedSite: 'Tripoli Port Project',
    checkoutTime: '2026-09-14 08:30',
    expectedReturn: '2026-09-22',
    condition: 'Good',
    icon: 'hammer'
  },
  {
    id: 'SS-TL-002',
    code: 'SS-TL-002',
    name: 'Bosch GWS 2200W Angle Grinder',
    brand: 'Bosch',
    model: 'GWS 2200-230 Heavy Duty',
    category: 'Grinders & Saws',
    serial: 'BSH-2200-9182',
    shelf: 'Rack B-03',
    status: 'available',
    assignedTo: null,
    assignedSite: null,
    checkoutTime: null,
    expectedReturn: null,
    condition: 'Good',
    icon: 'disc'
  },
  {
    id: 'SS-TL-003',
    code: 'SS-TL-003',
    name: 'DeWalt DWS780 Mitre Saw',
    brand: 'DeWalt',
    model: 'DWS780 305mm Sliding Compound',
    category: 'Grinders & Saws',
    serial: 'DW-780-44910',
    shelf: 'Bay 02 - Floor',
    status: 'checked_out',
    assignedTo: 'Ahmed Al-Hadi',
    assignedSite: 'Al-Andalus Commercial Center',
    checkoutTime: '2026-09-13 14:15',
    expectedReturn: '2026-09-20',
    condition: 'Good',
    icon: 'scissors'
  },
  {
    id: 'SS-TL-004',
    code: 'SS-TL-004',
    name: 'Fluke 87V Industrial Multimeter',
    brand: 'Fluke',
    model: '87V True-RMS High Accuracy',
    category: 'Electrical & Test',
    serial: 'FLK-87V-10294',
    shelf: 'Cabinet C-Elec-1',
    status: 'available',
    assignedTo: null,
    assignedSite: null,
    checkoutTime: null,
    expectedReturn: null,
    condition: 'Good',
    icon: 'activity'
  },
  {
    id: 'SS-TL-005',
    code: 'SS-TL-005',
    name: 'Leica DISTO D810 Laser Measure',
    brand: 'Leica',
    model: 'D810 Touch (200m Range)',
    category: 'Lasers & Optics',
    serial: 'LCA-D810-7731',
    shelf: 'Cabinet A-Laser',
    status: 'checked_out',
    assignedTo: 'Youssef Salem',
    assignedSite: 'Benghazi Substation A',
    checkoutTime: '2026-09-15 07:10',
    expectedReturn: '2026-09-21',
    condition: 'Good',
    icon: 'crosshair'
  },
  {
    id: 'SS-TL-006',
    code: 'SS-TL-006',
    name: 'Makita DTD152 Impact Driver 18V',
    brand: 'Makita',
    model: 'DTD152Z 165Nm Cordless',
    category: 'Heavy Drills',
    serial: 'MKT-152-88219',
    shelf: 'Rack A-04',
    status: 'available',
    assignedTo: null,
    assignedSite: null,
    checkoutTime: null,
    expectedReturn: null,
    condition: 'Good',
    icon: 'drill'
  },
  {
    id: 'SS-TL-007',
    code: 'SS-TL-007',
    name: 'Honda EU30is Inverter Generator',
    brand: 'Honda',
    model: 'EU30is 3.0kVA Silent',
    category: 'Power & Generators',
    serial: 'HND-EU30-5510',
    shelf: 'Ground Yard - G1',
    status: 'checked_out',
    assignedTo: 'Omar Benali',
    assignedSite: 'Misrata Industrial Zone',
    checkoutTime: '2026-09-12 11:00',
    expectedReturn: '2026-09-20',
    condition: 'Good',
    icon: 'zap'
  },
  {
    id: 'SS-TL-008',
    code: 'SS-TL-008',
    name: 'Milwaukee M18 Fuel Pipe Threader',
    brand: 'Milwaukee',
    model: 'M18 FPT2-0C 2-Inch Compact',
    category: 'Grinders & Saws',
    serial: 'MLW-M18-0922',
    shelf: 'Rack B-06',
    status: 'maintenance',
    assignedTo: null,
    assignedSite: null,
    checkoutTime: null,
    expectedReturn: null,
    condition: 'Blade worn - servicing motor brushes',
    icon: 'tool'
  },
  {
    id: 'SS-TL-009',
    code: 'SS-TL-009',
    name: 'Hilti PR 30-HVS Rotating Laser',
    brand: 'Hilti',
    model: 'PR 30-HVS Outdoor Horizontal/Vertical',
    category: 'Lasers & Optics',
    serial: 'HLT-PR30-1928',
    shelf: 'Cabinet A-Laser',
    status: 'checked_out',
    assignedTo: 'Khaled Zaid',
    assignedSite: 'Tripoli Port Project',
    checkoutTime: '2026-09-15 08:00',
    expectedReturn: '2026-09-23',
    condition: 'Good',
    icon: 'radar'
  },
  {
    id: 'SS-TL-010',
    code: 'SS-TL-010',
    name: 'Bosch Professional Line Laser GLL 3-80',
    brand: 'Bosch',
    model: 'GLL 3-80 C 3x360°',
    category: 'Lasers & Optics',
    serial: 'BSH-GLL-6110',
    shelf: 'Cabinet A-Laser',
    status: 'available',
    assignedTo: null,
    assignedSite: null,
    checkoutTime: null,
    expectedReturn: null,
    condition: 'Good',
    icon: 'crosshair'
  },
  {
    id: 'SS-TL-011',
    code: 'SS-TL-011',
    name: 'Knipex Master Electrician Set (1000V)',
    brand: 'Knipex',
    model: 'VDE Insulated 12-Piece Case',
    category: 'Electrical & Test',
    serial: 'KNP-VDE-38102',
    shelf: 'Cabinet C-Elec-2',
    status: 'available',
    assignedTo: null,
    assignedSite: null,
    checkoutTime: null,
    expectedReturn: null,
    condition: 'Good',
    icon: 'briefcase'
  },
  {
    id: 'SS-TL-012',
    code: 'SS-TL-012',
    name: 'DeWalt D25980 Demolition Breaker',
    brand: 'DeWalt',
    model: 'D25980 30kg Pavement Breaker',
    category: 'Heavy Drills',
    serial: 'DW-BRK-9901',
    shelf: 'Bay 01 - Heavy',
    status: 'checked_out',
    assignedTo: 'Tariq Mansour',
    assignedSite: 'Tripoli Port Project',
    checkoutTime: '2026-09-14 09:10',
    expectedReturn: '2026-09-22',
    condition: 'Good',
    icon: 'hammer'
  }
];

const INITIAL_TECHS = [
  { id: 'T-01', name: 'Tariq Mansour', role: 'Lead Civil & Structural Tech', phone: '+218 91 234 5678', dept: 'Heavy Machinery', pin: '1122' },
  { id: 'T-02', name: 'Ahmed Al-Hadi', role: 'Senior Carpenter & Joiner', phone: '+218 92 345 6789', dept: 'Finishing & Woodwork', pin: '2233' },
  { id: 'T-03', name: 'Youssef Salem', role: 'Site Surveyor & Quality Inspector', phone: '+218 91 456 7890', dept: 'Engineering & Survey', pin: '3344' },
  { id: 'T-04', name: 'Omar Benali', role: 'Chief Electrical Technician', phone: '+218 92 567 8901', dept: 'High Voltage & Power', pin: '4455' },
  { id: 'T-05', name: 'Khaled Zaid', role: 'HVAC & Plumbing Lead', phone: '+218 91 678 9012', dept: 'Mechanical Services', pin: '5566' }
];

const INITIAL_SITES = [
  'Tripoli Port Project',
  'Benghazi Substation A',
  'Al-Andalus Commercial Center',
  'Misrata Industrial Zone',
  'Central Workshop'
];

const INITIAL_LOGS = [
  {
    id: 'LOG-109',
    timestamp: '2026-09-15 08:00',
    action: 'CHECK_OUT',
    toolId: 'SS-TL-009',
    toolName: 'Hilti PR 30-HVS Rotating Laser',
    technician: 'Khaled Zaid',
    site: 'Tripoli Port Project',
    condition: 'Good',
    notes: 'Includes tripod & detector staff'
  }
];

function getNowString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

// -------------------------------------------------------------
// ENGINE 1: NATIVE SQLITE (If Node 22.5+ with node:sqlite is present)
// -------------------------------------------------------------
if (DatabaseSync) {
  console.log("⚡ Using Native SQLite Engine (sadik_sons.db)");
  const sqliteDb = new DatabaseSync(DB_FILE_SQLITE);
  sqliteDb.exec('PRAGMA journal_mode = WAL;');

  sqliteDb.exec(`
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

  const count = sqliteDb.prepare('SELECT COUNT(*) as c FROM tools').get().c;
  if (count === 0) {
    const insertTool = sqliteDb.prepare(`
      INSERT INTO tools (id, code, name, brand, model, category, serial, shelf, status, assigned_to, assigned_site, checkout_time, expected_return, condition, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    INITIAL_TOOLS.forEach(t => {
      insertTool.run(t.id, t.code, t.name, t.brand, t.model, t.category, t.serial, t.shelf, t.status, t.assignedTo, t.assignedSite, t.checkoutTime, t.expectedReturn, t.condition, t.icon);
    });

    const insertTech = sqliteDb.prepare('INSERT INTO technicians VALUES (?, ?, ?, ?, ?, ?)');
    INITIAL_TECHS.forEach(tech => insertTech.run(tech.id, tech.name, tech.role, tech.phone, tech.dept, tech.pin));

    const insertSite = sqliteDb.prepare('INSERT OR IGNORE INTO sites (name) VALUES (?)');
    INITIAL_SITES.forEach(s => insertSite.run(s));

    const insertLog = sqliteDb.prepare('INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    INITIAL_LOGS.forEach(l => insertLog.run(l.id, l.timestamp, l.action, l.toolId, l.toolName, l.technician, l.site, l.condition, l.notes));
  }

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

  module.exports = {
    getTools() {
      return sqliteDb.prepare('SELECT * FROM tools ORDER BY id ASC').all().map(mapToolRow);
    },
    getTool(idOrCode) {
      const clean = String(idOrCode).trim().toUpperCase();
      const row = sqliteDb.prepare('SELECT * FROM tools WHERE UPPER(id) = ? OR UPPER(code) = ?').get(clean, clean);
      return mapToolRow(row);
    },
    addTool(tool) {
      const count = sqliteDb.prepare('SELECT COUNT(*) as c FROM tools').get().c + 1;
      const code = tool.code || `SS-TL-${String(count).padStart(3, '0')}`;
      sqliteDb.prepare(`
        INSERT INTO tools (id, code, name, brand, model, category, serial, shelf, status, condition, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', 'Good', ?)
      `).run(code, code, tool.name || 'Untitled Tool', tool.brand || 'Generic', tool.model || '', tool.category || 'Hand Tools', tool.serial || 'SN-' + Date.now().toString().slice(-6), tool.shelf || 'Main Crib', tool.icon || 'wrench');
      return this.getTool(code);
    },
    checkoutTool({ toolId, technicianName, site, expectedReturn, notes }) {
      const clean = String(toolId).trim().toUpperCase();
      const tool = this.getTool(clean);
      if (!tool) throw new Error('Tool not found');
      const nowStr = getNowString();
      sqliteDb.prepare(`
        UPDATE tools SET status = 'checked_out', assigned_to = ?, assigned_site = ?, checkout_time = ?, expected_return = ?
        WHERE UPPER(id) = ? OR UPPER(code) = ?
      `).run(technicianName, site || 'Job Site', nowStr, expectedReturn || '', clean, clean);

      const logId = 'LOG-' + Math.floor(1000 + Math.random() * 9000);
      sqliteDb.prepare(`
        INSERT INTO audit_logs VALUES (?, ?, 'CHECK_OUT', ?, ?, ?, ?, ?, ?)
      `).run(logId, nowStr, tool.id, tool.name, technicianName, site || 'Job Site', tool.condition || 'Good', notes || 'Checked out');

      return this.getTool(clean);
    },
    checkinTool({ toolId, condition, shelf, notes }) {
      const clean = String(toolId).trim().toUpperCase();
      const tool = this.getTool(clean);
      if (!tool) throw new Error('Tool not found');
      const nowStr = getNowString();
      const newStatus = condition === 'Damaged' ? 'maintenance' : 'available';

      sqliteDb.prepare(`
        UPDATE tools SET status = ?, condition = ?, assigned_to = NULL, assigned_site = NULL, checkout_time = NULL, expected_return = NULL, shelf = COALESCE(?, shelf)
        WHERE UPPER(id) = ? OR UPPER(code) = ?
      `).run(newStatus, condition || 'Good', shelf || null, clean, clean);

      const logId = 'LOG-' + Math.floor(1000 + Math.random() * 9000);
      sqliteDb.prepare(`
        INSERT INTO audit_logs VALUES (?, ?, 'CHECK_IN', ?, ?, ?, ?, ?, ?)
      `).run(logId, nowStr, tool.id, tool.name, tool.assignedTo || 'Technician', tool.assignedSite || 'Job Site', condition || 'Good', notes || 'Returned');

      return this.getTool(clean);
    },
    getTechnicians() {
      return sqliteDb.prepare('SELECT * FROM technicians ORDER BY id ASC').all();
    },
    getSites() {
      return sqliteDb.prepare('SELECT name FROM sites ORDER BY name ASC').all().map(r => r.name);
    },
    getLogs() {
      return sqliteDb.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all().map(r => ({
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
      const total = sqliteDb.prepare('SELECT COUNT(*) as c FROM tools').get().c;
      const inField = sqliteDb.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'checked_out'").get().c;
      const available = sqliteDb.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'available'").get().c;
      const maintenance = sqliteDb.prepare("SELECT COUNT(*) as c FROM tools WHERE status = 'maintenance'").get().c;
      return { total, inField, available, maintenance };
    }
  };

} else {
  // -------------------------------------------------------------
  // ENGINE 2: COMPATIBILITY ATOMIC STORAGE (Works on ANY Node version on Windows)
  // -------------------------------------------------------------
  console.log("⚡ Using Universal JSON Storage Engine (sadik_sons_database.json)");

  function readJsonDb() {
    try {
      if (!fs.existsSync(DB_FILE_JSON)) {
        writeJsonDb({ tools: INITIAL_TOOLS, technicians: INITIAL_TECHS, sites: INITIAL_SITES, logs: INITIAL_LOGS });
        return { tools: INITIAL_TOOLS, technicians: INITIAL_TECHS, sites: INITIAL_SITES, logs: INITIAL_LOGS };
      }
      return JSON.parse(fs.readFileSync(DB_FILE_JSON, 'utf8'));
    } catch (e) {
      return { tools: INITIAL_TOOLS, technicians: INITIAL_TECHS, sites: INITIAL_SITES, logs: INITIAL_LOGS };
    }
  }

  function writeJsonDb(data) {
    try {
      fs.writeFileSync(DB_FILE_TMP, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(DB_FILE_TMP, DB_FILE_JSON);
      return true;
    } catch (e) {
      return false;
    }
  }

  module.exports = {
    getTools() {
      return readJsonDb().tools;
    },
    getTool(idOrCode) {
      const clean = String(idOrCode).trim().toUpperCase();
      return readJsonDb().tools.find(t => t.id.toUpperCase() === clean || t.code.toUpperCase() === clean);
    },
    addTool(tool) {
      const data = readJsonDb();
      const count = data.tools.length + 1;
      const code = tool.code || `SS-TL-${String(count).padStart(3, '0')}`;
      const newTool = {
        id: code,
        code: code,
        name: tool.name || 'Untitled Tool',
        brand: tool.brand || 'Generic',
        model: tool.model || '',
        category: tool.category || 'Hand Tools',
        serial: tool.serial || 'SN-' + Date.now().toString().slice(-6),
        shelf: tool.shelf || 'Main Crib',
        status: 'available',
        assignedTo: null,
        assignedSite: null,
        checkoutTime: null,
        expectedReturn: null,
        condition: 'Good',
        icon: tool.icon || 'wrench'
      };
      data.tools.push(newTool);
      writeJsonDb(data);
      return newTool;
    },
    checkoutTool({ toolId, technicianName, site, expectedReturn, notes }) {
      const data = readJsonDb();
      const clean = String(toolId).trim().toUpperCase();
      const tool = data.tools.find(t => t.id.toUpperCase() === clean || t.code.toUpperCase() === clean);
      if (!tool) throw new Error('Tool not found');
      const nowStr = getNowString();
      tool.status = 'checked_out';
      tool.assignedTo = technicianName;
      tool.assignedSite = site || 'Job Site';
      tool.checkoutTime = nowStr;
      tool.expectedReturn = expectedReturn || '';

      data.logs.unshift({
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: nowStr,
        action: 'CHECK_OUT',
        toolId: tool.id,
        toolName: tool.name,
        technician: technicianName,
        site: site || 'Job Site',
        condition: tool.condition || 'Good',
        notes: notes || 'Checked out'
      });

      writeJsonDb(data);
      return tool;
    },
    checkinTool({ toolId, condition, shelf, notes }) {
      const data = readJsonDb();
      const clean = String(toolId).trim().toUpperCase();
      const tool = data.tools.find(t => t.id.toUpperCase() === clean || t.code.toUpperCase() === clean);
      if (!tool) throw new Error('Tool not found');

      const prevTech = tool.assignedTo || 'Technician';
      const prevSite = tool.assignedSite || 'Job Site';
      const nowStr = getNowString();

      tool.status = condition === 'Damaged' ? 'maintenance' : 'available';
      tool.condition = condition || 'Good';
      tool.assignedTo = null;
      tool.assignedSite = null;
      tool.checkoutTime = null;
      tool.expectedReturn = null;
      if (shelf) tool.shelf = shelf;

      data.logs.unshift({
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: nowStr,
        action: 'CHECK_IN',
        toolId: tool.id,
        toolName: tool.name,
        technician: prevTech,
        site: prevSite,
        condition: condition || 'Good',
        notes: notes || 'Returned'
      });

      writeJsonDb(data);
      return tool;
    },
    getTechnicians() {
      return readJsonDb().technicians;
    },
    getSites() {
      return readJsonDb().sites;
    },
    getLogs() {
      return readJsonDb().logs;
    },
    getStats() {
      const data = readJsonDb();
      const total = data.tools.length;
      const inField = data.tools.filter(t => t.status === 'checked_out').length;
      const available = data.tools.filter(t => t.status === 'available').length;
      const maintenance = data.tools.filter(t => t.status === 'maintenance').length;
      return { total, inField, available, maintenance };
    }
  };
}
