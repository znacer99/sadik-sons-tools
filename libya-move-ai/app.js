/**
 * LIBYA MOVE AI — Executive Application Logic
 * Prototype for Tripoli Pilot MVP & Multi-Persona Mobility Simulation
 */

// ==========================================
// 1. STATE & GLOBAL CONFIGURATION
// ==========================================
const APP_STATE = {
  activeTab: 'rider',
  surgeMultiplier: 1.15,
  isDriverOnline: true,
  selectedService: 'taxi',
  activeRide: null,
  activeDriverChoice: 1,
  leafletMap: null,
  driverMarkers: [],
  routeLine: null,
  simCarMarker: null,
  simAnimationInterval: null
};

// Known Coordinates across Greater Tripoli (طرابلس الكبرى)
const TRIPOLI_LOCATIONS = {
  martyrs: { name: 'ميدان الشهداء - طرابلس المركز', lat: 32.8948, lng: 13.1818 },
  tower: { name: 'برج طرابلس (طريق الشط)', lat: 32.8955, lng: 13.1670 },
  ashour: { name: 'بن عاشور - شارع الجرابة', lat: 32.8790, lng: 13.1990 },
  andalus: { name: 'حي الأندلس - السياحية', lat: 32.8780, lng: 13.1320 },
  jumaa: { name: 'سوق الجمعة - جامع الحاراتي', lat: 32.8850, lng: 13.2350 },
  mitiga: { name: 'مطار معيتيقة الدولي (Mitiga)', lat: 32.8940, lng: 13.2840 },
  tajoura: { name: 'تاجوراء - الطريق الساحلي', lat: 32.8760, lng: 13.3420 },
  janzour: { name: 'جنزور - كوبري المعاقين', lat: 32.8190, lng: 13.0180 },
  tripoli_intl: { name: 'مطار طرابلس العالمي الجديد', lat: 32.6690, lng: 13.1590 }
};

// Fleet of Simulated Vehicles in Tripoli
const SIMULATED_DRIVERS = [
  { id: 1, name: 'طارق الورفلي', car: 'هيونداي إلنترا 2021', plate: '5-89412 طرابلس', rating: 4.94, lat: 32.8930, lng: 13.1780, eta: '2 دقيقة' },
  { id: 2, name: 'مروان القرقني', car: 'كيا سيراتو 2020', plate: '5-33190 طرابلس', rating: 4.82, lat: 32.8890, lng: 13.1890, eta: '4 دقائق' },
  { id: 3, name: 'أحمد المجبري', car: 'تويوتا كامري Executive', plate: '5-11029 طرابلس', rating: 5.00, lat: 32.8980, lng: 13.1710, eta: '3 دقائق' },
  { id: 4, name: 'عبدالسلام الزليتني', car: 'هيونداي سوناتا', plate: '5-67431 طرابلس', rating: 4.88, lat: 32.8820, lng: 13.1740, eta: '5 دقائق' },
  { id: 5, name: 'محمود بن عثمان', car: 'تويوتا كورولا 2022', plate: '5-90124 طرابلس', rating: 4.91, lat: 32.8860, lng: 13.1950, eta: '3 دقائق' }
];

// Service Multipliers
const SERVICE_FACTORS = {
  taxi: { multiplier: 1.0, name: 'Move Standard' },
  choice: { multiplier: 1.0, name: 'Move Choice' },
  share: { multiplier: 0.60, name: 'Move Share (-40%)' },
  return: { multiplier: 0.80, name: 'Smart Return (-20%)' },
  airport: { multiplier: 1.50, name: 'Airport Executive' },
  women: { multiplier: 1.05, name: 'Move Women' }
};

// ==========================================
// 2. INITIALIZATION ON DOM READY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  updateClock();
  setInterval(updateClock, 30000);

  initTripoliMap();
  calculateFareEstimate();
  initFinancialCharts();
  switchDocTab('memo');
});

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const clockEl = document.getElementById('phone-clock');
  if (clockEl) clockEl.innerText = `${hours}:${minutes}`;
}

// ==========================================
// 3. TAB NAVIGATION
// ==========================================
function switchTab(tabId) {
  APP_STATE.activeTab = tabId;

  const tabs = ['rider', 'driver', 'business', 'admin', 'financial', 'costs'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const content = document.getElementById(`view-${t}`);
    if (btn && content) {
      if (t === tabId) {
        btn.classList.add('active');
        btn.classList.remove('text-slate-400');
        btn.classList.add('text-white');
        content.classList.remove('hidden');
      } else {
        btn.classList.remove('active');
        btn.classList.remove('text-white');
        btn.classList.add('text-slate-400');
        content.classList.add('hidden');
      }
    }
  });

  if (tabId === 'rider' && APP_STATE.leafletMap) {
    setTimeout(() => {
      APP_STATE.leafletMap.invalidateSize();
    }, 150);
  }

  if (window.lucide) lucide.createIcons();
}

// ==========================================
// 4. LEAFLET TRIPOLI MAP & LIVE FLEET SIM
// ==========================================
function initTripoliMap() {
  const mapContainer = document.getElementById('rider-map');
  if (!mapContainer) return;

  const tripoliCenter = [32.8872, 13.1913];

  APP_STATE.leafletMap = L.map('rider-map', {
    zoomControl: true,
    attributionControl: false
  }).setView(tripoliCenter, 13);

  // CartoDB Dark Matter tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(APP_STATE.leafletMap);

  // Minimalist vector vehicle marker
  const carIconHtml = `
    <div class="vehicle-marker"></div>
  `;

  const carIcon = L.divIcon({
    html: carIconHtml,
    className: 'custom-car-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  APP_STATE.driverMarkers = [];
  SIMULATED_DRIVERS.forEach(driver => {
    const marker = L.marker([driver.lat, driver.lng], { icon: carIcon }).addTo(APP_STATE.leafletMap);
    marker.bindPopup(`
      <div style="direction: rtl; font-family: 'Alexandria', sans-serif; font-size: 11px; color: #f8fafc; background: #0d1322; padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
        <strong style="color: #10b981;">${driver.name}</strong> (${driver.rating})<br>
        <span style="color: #94a3b8;">${driver.car}</span><br>
        <span style="font-size: 10px; color: #64748b;">${driver.plate} • وصول: ${driver.eta}</span>
      </div>
    `);
    APP_STATE.driverMarkers.push({ id: driver.id, marker, driver });
  });

  setInterval(roamSimulatedDrivers, 4000);
}

function roamSimulatedDrivers() {
  if (!APP_STATE.driverMarkers.length) return;
  APP_STATE.driverMarkers.forEach(item => {
    const currentLatLng = item.marker.getLatLng();
    const deltaLat = (Math.random() - 0.5) * 0.0012;
    const deltaLng = (Math.random() - 0.5) * 0.0012;
    const newLatLng = [currentLatLng.lat + deltaLat, currentLatLng.lng + deltaLng];
    item.marker.setLatLng(newLatLng);
  });
}

function recenterTripoliMap() {
  if (APP_STATE.leafletMap) {
    APP_STATE.leafletMap.flyTo([32.8872, 13.1913], 13);
  }
}

// ==========================================
// 5. FARE ESTIMATION & SERVICE SELECTOR
// ==========================================
function selectServiceType(type) {
  APP_STATE.selectedService = type;
  
  const chips = ['taxi', 'choice', 'share', 'return', 'airport', 'women'];
  chips.forEach(s => {
    const btn = document.getElementById(`service-${s}`);
    if (btn) {
      if (s === type) {
        btn.className = "service-chip active shrink-0 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium";
      } else {
        btn.className = "service-chip shrink-0 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-slate-900 text-slate-300 font-medium hover:text-white";
      }
    }
  });

  const choicePicker = document.getElementById('choice-driver-picker');
  if (choicePicker) {
    if (type === 'choice') {
      choicePicker.classList.remove('hidden');
    } else {
      choicePicker.classList.add('hidden');
    }
  }

  calculateFareEstimate();
  if (window.lucide) lucide.createIcons();
}

function calculateFareEstimate() {
  const pickupKey = document.getElementById('pickup-select')?.value || 'martyrs';
  const dropoffKey = document.getElementById('dropoff-select')?.value || 'ashour';

  const pickup = TRIPOLI_LOCATIONS[pickupKey] || TRIPOLI_LOCATIONS.martyrs;
  const dropoff = TRIPOLI_LOCATIONS[dropoffKey] || TRIPOLI_LOCATIONS.ashour;

  const distKm = getDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);

  // Base pricing formula in Tripoli:
  // Base fare: 5.00 LYD + (1.80 LYD * km)
  let basePrice = 5.00 + (distKm * 1.80);

  const factor = SERVICE_FACTORS[APP_STATE.selectedService]?.multiplier || 1.0;
  basePrice = basePrice * factor;

  let finalFare = basePrice * APP_STATE.surgeMultiplier;

  const minFloor = APP_STATE.selectedService === 'share' ? 8.00 : 12.00;
  if (finalFare < minFloor) finalFare = minFloor;

  const priceEl = document.getElementById('fare-price');
  if (priceEl) {
    priceEl.innerText = finalFare.toFixed(2);
  }

  return finalFare;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.max(2.5, R * c * 1.25);
}

function pickSpecificDriver(id) {
  APP_STATE.activeDriverChoice = id;
  for (let i = 1; i <= 3; i++) {
    const card = document.getElementById(`choice-card-${i}`);
    if (card) {
      if (i === id) {
        card.className = "p-2 rounded bg-slate-900 border border-emerald-500/40 cursor-pointer transition";
      } else {
        card.className = "p-2 rounded bg-slate-900 border border-white/[0.06] cursor-pointer transition";
      }
    }
  }
}

// ==========================================
// 6. TRIP BOOKING & ROUTE ANIMATION SIM
// ==========================================
function requestTripSimulation() {
  playBeep();

  const btnRequest = document.getElementById('btn-request-trip');
  const activeRideCard = document.getElementById('active-ride-card');
  const mapStatusText = document.getElementById('map-status-text');

  if (btnRequest) {
    btnRequest.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> جاري تعيين أقرب مركبة...`;
    btnRequest.disabled = true;
    if (window.lucide) lucide.createIcons();
  }

  setTimeout(() => {
    if (btnRequest) {
      btnRequest.classList.add('hidden');
    }
    if (activeRideCard) {
      activeRideCard.classList.remove('hidden');
    }
    if (mapStatusText) {
      mapStatusText.innerText = "تم تأكيد الحجز: الكابتن طارق الورفلي في طريقه إليك";
    }

    startRouteNavigationSimulation();
  }, 1200);
}

function startRouteNavigationSimulation() {
  if (!APP_STATE.leafletMap) return;

  const pickupKey = document.getElementById('pickup-select')?.value || 'martyrs';
  const dropoffKey = document.getElementById('dropoff-select')?.value || 'ashour';

  const pickup = TRIPOLI_LOCATIONS[pickupKey] || TRIPOLI_LOCATIONS.martyrs;
  const dropoff = TRIPOLI_LOCATIONS[dropoffKey] || TRIPOLI_LOCATIONS.ashour;

  if (APP_STATE.routeLine) {
    APP_STATE.leafletMap.removeLayer(APP_STATE.routeLine);
  }
  if (APP_STATE.simCarMarker) {
    APP_STATE.leafletMap.removeLayer(APP_STATE.simCarMarker);
  }
  if (APP_STATE.simAnimationInterval) {
    clearInterval(APP_STATE.simAnimationInterval);
  }

  const routePoints = generateIntermediatePoints(pickup, dropoff, 25);
  APP_STATE.routeLine = L.polyline(routePoints, {
    color: '#10b981',
    weight: 3.5,
    opacity: 0.85,
    dashArray: '6, 6'
  }).addTo(APP_STATE.leafletMap);

  APP_STATE.leafletMap.fitBounds(APP_STATE.routeLine.getBounds(), { padding: [40, 40] });

  const carIcon = L.divIcon({
    html: `
      <div style="background-color: #070a11; border: 2px solid #10b981; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(16,185,129,0.5);">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  let step = 0;
  APP_STATE.simCarMarker = L.marker(routePoints[0], { icon: carIcon }).addTo(APP_STATE.leafletMap);

  const progressBar = document.getElementById('ride-progress-bar');
  const statusEl = document.getElementById('active-trip-status');

  APP_STATE.simAnimationInterval = setInterval(() => {
    step++;
    if (step < routePoints.length) {
      APP_STATE.simCarMarker.setLatLng(routePoints[step]);
      const pct = Math.round((step / routePoints.length) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (pct > 70 && statusEl) {
        statusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> اقتراب من نقطة الوصول (${100 - pct}% متبقية)`;
      }
    } else {
      clearInterval(APP_STATE.simAnimationInterval);
      if (statusEl) {
        statusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> اكتملت الرحلة بنجاح`;
      }
      if (progressBar) progressBar.style.width = `100%`;
    }
  }, 600);
}

function generateIntermediatePoints(p1, p2, count) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const curve = Math.sin(t * Math.PI) * 0.003;
    const lat = p1.lat + (p2.lat - p1.lat) * t + curve;
    const lng = p1.lng + (p2.lng - p1.lng) * t;
    points.push([lat, lng]);
  }
  return points;
}

function triggerSOSAlert() {
  playBeep();
  alert("تم تفعيل بروتوكول الأمان (SOS).\n\nتم إرسال إحداثيات الموقع مباشرة إلى غرفة العمليات والتواصل جارٍ مع جهات الاستجابة.");
}

function shareLiveTrip() {
  alert("تم نسخ رابط التتبع المباشر للرحلة لمشاركته بأمان.");
}

// ==========================================
// 7. DRIVER PRO INTERACTIONS
// ==========================================
function toggleDriverOnlineStatus() {
  const checkbox = document.getElementById('driver-status-toggle');
  const label = document.getElementById('driver-status-label');
  APP_STATE.isDriverOnline = checkbox.checked;

  if (APP_STATE.isDriverOnline) {
    label.innerText = "متاح";
    label.className = "text-xs font-medium text-emerald-400";
  } else {
    label.innerText = "غير متصل";
    label.className = "text-xs font-medium text-slate-500";
  }
}

function acceptSmartReturnDemo() {
  playBeep();
  const btn = document.getElementById('btn-accept-return');
  if (btn) {
    btn.innerHTML = "تم تأكيد مشوار العودة";
    btn.className = "px-3 py-1 rounded-md bg-slate-800 text-slate-300 font-medium text-xs";
    btn.disabled = true;
  }
  alert("تم تأكيد رحلة العودة (تاجوراء ← طرابلس المركز).\n\nتم تفادي 18 كم من القيادة الفارغة وضمان دخل إضافي قدره 28 ديناراً.");
}

function acceptIncomingTripDriver() {
  playBeep();
  const card = document.getElementById('driver-incoming-card');
  if (card) {
    card.innerHTML = `
      <div class="p-3 bg-slate-900 border border-emerald-500/30 rounded-lg text-center space-y-1">
        <div class="text-xs font-medium text-emerald-400">تم قبول الطلب</div>
        <div class="text-[11px] text-slate-300">الراكب أحمد الفيتوري في انتظارك ببرج طرابلس.</div>
      </div>
    `;
  }
}

function declineIncomingTripDriver() {
  const card = document.getElementById('driver-incoming-card');
  if (card) {
    card.classList.add('hidden');
    setTimeout(() => {
      card.classList.remove('hidden');
    }, 5000);
  }
}

// ==========================================
// 8. CORPORATE B2B PORTAL
// ==========================================
function downloadCorporateTaxInvoice() {
  playBeep();
  alert("تم إنشاء الفاتورة الضريبية الموحدة لشركة المدار الجديد بنجاح.\n\n• إجمالي الرحلات: 1,420 رحلة\n• القيمة الإجمالية: 28,450 د.ل\n• مطابقة للمعايير المحاسبية المعتمدة.");
}

// ==========================================
// 9. ADMIN AI OPS & SURGE CONTROLS
// ==========================================
function updateSurgeMultiplier(val) {
  APP_STATE.surgeMultiplier = parseFloat(val);
  const sliderVal = document.getElementById('surge-slider-val');
  const indicator = document.getElementById('surge-indicator');
  if (sliderVal) sliderVal.innerText = `${APP_STATE.surgeMultiplier.toFixed(2)}x`;
  if (indicator) indicator.innerText = `${APP_STATE.surgeMultiplier.toFixed(2)}x`;

  calculateFareEstimate();
}

function triggerSimulatedSOSAdmin() {
  playBeep();
  alert("محاكاة إنذار السلامة في مركز القيادة:\n\n• الرحلة: #8949 (شارع الجرابة، بن عاشور)\n• السائق: محمود ع.\n• تم فتح قناة اتصال مباشرة مع المركبة.");
}

// ==========================================
// 10. FINANCIAL SIMULATOR & CHARTS (CHART.JS)
// ==========================================
let growthChartInstance = null;
let revenuePieInstance = null;

function runFinancialSimulation() {
  const drivers = parseInt(document.getElementById('slider-drivers')?.value || '300');
  const tripsPerDay = parseInt(document.getElementById('slider-trips-day')?.value || '10');
  const ticketPrice = parseFloat(document.getElementById('slider-ticket-price')?.value || '21.5');
  const takeRate = parseFloat(document.getElementById('slider-take-rate')?.value || '18.0') / 100;

  document.getElementById('val-drivers').innerText = `${drivers} سائق`;
  document.getElementById('val-trips-day').innerText = `${tripsPerDay} مشاوير`;
  document.getElementById('val-ticket-price').innerText = `${ticketPrice.toFixed(2)} د.ل`;
  document.getElementById('val-take-rate').innerText = `${(takeRate * 100).toFixed(1)}%`;

  const monthlyTrips = drivers * tripsPerDay * 30;
  const monthlyGMV = monthlyTrips * ticketPrice;
  const monthlyNetRevenue = monthlyGMV * takeRate;
  const annualNetRevenue = monthlyNetRevenue * 12;

  const driverDailyGross = tripsPerDay * ticketPrice;
  const driverDailyComm = driverDailyGross * takeRate;
  const driverFuel = 3.0;
  const driverMaintenance = 28.0;
  const driverDailyNet = driverDailyGross - driverDailyComm - driverFuel - driverMaintenance;
  const driverMonthlyNet = driverDailyNet * 25;

  const opex = 35000 + (monthlyTrips * 0.85);
  const monthlyEBITDA = monthlyNetRevenue - opex;
  const ebitdaMargin = (monthlyEBITDA / monthlyNetRevenue) * 100;

  document.getElementById('calc-monthly-gmv').innerText = `${formatNumber(monthlyGMV)} د.ل`;
  document.getElementById('calc-monthly-trips').innerText = `${formatNumber(monthlyTrips)} مشوار شهرياً`;
  document.getElementById('calc-monthly-revenue').innerText = `${formatNumber(monthlyNetRevenue)} د.ل`;
  document.getElementById('calc-annual-revenue').innerText = `${(annualNetRevenue / 1000000).toFixed(2)} مليون د.ل سنوياً`;
  document.getElementById('calc-driver-income').innerText = `${formatNumber(driverMonthlyNet)} د.ل`;
  document.getElementById('calc-monthly-ebitda').innerText = `${formatNumber(monthlyEBITDA)} د.ل`;
  document.getElementById('calc-ebitda-margin').innerText = `هامش ربح ~${ebitdaMargin.toFixed(1)}%`;

  updateFinancialChart(drivers, monthlyNetRevenue);
}

function formatNumber(num) {
  return Math.round(num).toLocaleString('en-US');
}

function initFinancialCharts() {
  const ctxGrowth = document.getElementById('growthChart')?.getContext('2d');
  const ctxPie = document.getElementById('revenuePieChart')?.getContext('2d');

  if (ctxGrowth) {
    growthChartInstance = new Chart(ctxGrowth, {
      type: 'line',
      data: {
        labels: ['شهر 1', 'شهر 6', 'شهر 12 (تعادل)', 'شهر 18', 'شهر 24', 'شهر 36'],
        datasets: [
          {
            label: 'صافي إيراد المنصة (LYD)',
            data: [42000, 195000, 480000, 950000, 1850000, 3300000],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'السائقون النشطون',
            data: [80, 250, 450, 850, 1400, 2500],
            borderColor: '#64748b',
            borderDash: [4, 4],
            fill: false,
            tension: 0.3,
            borderWidth: 1.5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Alexandria', size: 11 } }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', font: { family: 'Alexandria', size: 10 } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            ticks: { color: '#94a3b8', font: { family: 'Alexandria', size: 10 } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y1: {
            position: 'right',
            ticks: { color: '#64748b', font: { family: 'Alexandria', size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  if (ctxPie) {
    revenuePieInstance = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: ['عمولة المشاوير الحضرية', 'عقود الشركات B2B', 'اشتراكات الأساطيل SaaS', 'نقل المطارات التنفيذي'],
        datasets: [{
          data: [65, 18, 9, 8],
          backgroundColor: ['#10b981', '#0284c7', '#64748b', '#334155'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Alexandria', size: 9 }, boxWidth: 8 }
          }
        },
        cutout: '72%'
      }
    });
  }

  runFinancialSimulation();
}

function updateFinancialChart(drivers, netRevenue) {
  if (!growthChartInstance) return;
  growthChartInstance.data.datasets[0].data[2] = netRevenue;
  growthChartInstance.data.datasets[1].data[2] = drivers;
  growthChartInstance.update();
}

// ==========================================
// 11. DOCS MODAL & IN-APP READER
// ==========================================
function openDocsModal() {
  const modal = document.getElementById('docs-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDocsModal() {
  const modal = document.getElementById('docs-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

const DOCS_CONTENT = {
  memo: `
    <h2 class="text-lg font-semibold font-heading text-white mb-2">01. المذكرة التنفيذية والمقترح الاستثماري (Executive Memo)</h2>
    <p><strong>المشروع:</strong> LIBYA MOVE AI — منصة التنقل الذكي والبنية التحتية الرقمية للنقل في ليبيا.</p>
    <p><strong>طبيعة النموذج:</strong> منصة وساطة تقنية (Asset-Light Platform) متكاملة تجمع بين تطبيق الركاب الذكي، بوابة السائق المحترف، نظام إدارة تنقل الشركات B2B، وبرمجيات إدارة الأساطيل.</p>
    <h3 class="text-sm font-semibold text-white mt-4">شروط الجولة التمويلية الأولى (Pre-Seed):</h3>
    <ul class="list-disc list-inside space-y-1 text-slate-300">
      <li><strong>حجم الاستثمار المستهدف:</strong> 120,000 – 150,000 دولار أمريكي (ما يعادل 600,000 – 750,000 دينار ليبي).</li>
      <li><strong>الحصة المعروضة:</strong> 12% – 15% من رأس مال الشركة.</li>
      <li><strong>تقييم الشركة (Pre-money):</strong> 850,000 – 1,000,000 دولار.</li>
      <li><strong>نقطة التعادل المالي (Break-even):</strong> الشهر 11 – 13 بعد الإطلاق في طرابلس.</li>
      <li><strong>معدل العائد الداخلي المستهدف (IRR):</strong> 42% – 58% خلال 3 سنوات.</li>
    </ul>
    <h3 class="text-sm font-semibold text-white mt-4">خطة توزيع رأس المال (Use of Funds):</h3>
    <p class="text-slate-400">• 30% البنية التحتية التقنية والخوادم • 25% الاستحواذ والتسويق الرقمي • 20% مركز الفحص والعمليات Move Hub • 10% حوافز السائقين • 10% خدمة العملاء ومركز السلامة 24/7 • 5% الاحتياطي التنظيمي.</p>
  `,
  market: `
    <h2 class="text-lg font-semibold font-heading text-white mb-2">02. دراسة السوق الليبي الميدانية (Tripoli Market Study)</h2>
    <p>تتمتع ليبيا بمؤشرات اقتصادية فريدة تؤثر إيجاباً على اقتصاديات منصات النقل الذكي:</p>
    <h3 class="text-sm font-semibold text-white mt-4">1. معادلة الوقود الاستثنائية:</h3>
    <p class="text-slate-300">سعر لتر الوقود في ليبيا <strong>0.15 دينار ليبي</strong> (~0.03 دولار)، ما يجعل تكلفة الوقود لا تتجاوز 2% من دخل السائق. التكلفة الحقيقية هي إهلاك الإطارات والقطع والكيلومترات الفارغة. تضمن خاصية <em>Smart Return Ride</em> معالجة هذا الهدر بربط السائق برحلات عودة فورية.</p>
    <h3 class="text-sm font-semibold text-white mt-4">2. مصفوفة الأسعار الميدانية في طرابلس (2025/2026):</h3>
    <ul class="list-disc list-inside space-y-1 text-slate-300">
      <li>مشوار حضري قصير (ميدان الشهداء ↔ بن عاشور): 12 – 15 د.ل</li>
      <li>مشوار متوسط (حي الأندلس ↔ وسط المدينة): 18 – 22 د.ل</li>
      <li>مشوار مطار معيتيقة الدولي: 30 – 45 د.ل</li>
      <li>مشوار أطراف وضواحي (تاجوراء أو جنزور ↔ المركز): 30 – 42 د.ل</li>
    </ul>
    <p class="text-slate-400 mt-2">متوسط قيمة التذكرة الحضرية: <strong>21.50 دينار ليبي</strong>.</p>
  `,
  finance: `
    <h2 class="text-lg font-semibold font-heading text-white mb-2">03. النموذج المالي واقتصاديات الوحدة (Unit Economics & ROI)</h2>
    <h3 class="text-sm font-semibold text-white mt-2">اقتصاديات الرحلة الواحدة (Unit Economics per 21.50 LYD Ride):</h3>
    <ul class="list-disc list-inside space-y-1 text-slate-300">
      <li>إجمالي قيمة المشوار: 21.50 د.ل (100%)</li>
      <li>صافي دخل السائق: 17.63 د.ل (82%)</li>
      <li>عمولة المنصة: 3.87 د.ل (18%)</li>
      <li>تكاليف تشغيلية مباشرة (خرائط، رسائل، سيرفرات، بوابات دفع): (0.85 د.ل)</li>
      <li>إطفاء تكلفة جذب العميل (CAC): (0.50 د.ل)</li>
      <li>حوافز السائق والدعم: (0.32 د.ل)</li>
      <li><strong>هامش المساهمة الصافي لكل مشوار: 2.20 د.ل (56.8% من إيراد المنصة).</strong></li>
    </ul>
    <h3 class="text-sm font-semibold text-white mt-4">دخل السائق الصافي:</h3>
    <p class="text-slate-300">يحقق السائق المتفرغ بعد خصم كافة التكاليف التشغيلية ومخصص الصيانة نحو <strong>4,073 دينار ليبي شهرياً</strong>، ما يعزز استقرار السائقين وخفض معدل التسرب السنوي إلى ما دون 8%.</p>
  `,
  tech: `
    <h2 class="text-lg font-semibold font-heading text-white mb-2">04. المعمارية التقنية ومحركات الذكاء الاصطناعي (Tech & AI Specs)</h2>
    <h3 class="text-sm font-semibold text-white mt-2">المحركات الخوارزمية الأساسية:</h3>
    <ul class="list-disc list-inside space-y-1 text-slate-300">
      <li><strong>Predictive Demand Engine:</strong> تقسيم طرابلس إلى شبكة خلايا Uber H3 وتوقع بؤر الطلب قبل 15 دقيقة لتخفيض زمن الوصول ETA إلى 4.2 دقيقة.</li>
      <li><strong>Smart Return Ride Matcher:</strong> ربط مسارات السائقين في الضواحي بركاب متوجهين إلى المركز لتفادي القيادة الفارغة.</li>
      <li><strong>Move Choice Scoring:</strong> خوارزمية ترتيب ومطابقة متعددة المعايير تعتمد على التقييم والمسافة وسعر العرض.</li>
      <li><strong>Telematics & Route Anomaly Detection:</strong> رصد انحراف المسار لأكثر من 500 متر أو التوقف غير المبرر وإطلاق الإنذار آلياً.</li>
    </ul>
    <h3 class="text-sm font-semibold text-white mt-4">التكامل المالي الرقمي:</h3>
    <p class="text-slate-300">ربط مباشر مع واجهات برمجة تطبيقات الدفع الإلكتروني الوطنية: <strong>سداد (Sadad - المدار)</strong>، <strong>موبي كاش (MobiCash)</strong>، و<strong>تداول (Tadawul)</strong>، بجانب نظام التسوية النقدية الرقمي المبتكر بمحفظة ذات سقف ائتماني.</p>
  `,
  costs: `
    <h2 class="text-lg font-semibold font-heading text-white mb-2">05. ميزانية التأسيس، تكاليف الإطلاق، وخطة السيولة (Capital & Runway)</h2>
    <h3 class="text-sm font-semibold text-white mt-2">ملخص رأس المال المطلوب:</h3>
    <p class="text-slate-300">يبلغ إجمالي رأس المال المطلوب لخطة النمو القياسية الموصى بها <strong>140,000 دولار أمريكي</strong> (~700,000 دينار ليبي)، مع وجود خيار إطلاق مرن يبدأ من <strong>85,000 دولار</strong> (~425,000 دينار ليبي).</p>
    <h3 class="text-sm font-semibold text-white mt-4">توزيع الميزانية التفصيلي ($140,000):</h3>
    <ul class="list-disc list-inside space-y-1 text-slate-300">
      <li><strong>البنية التقنية والتطبيقات:</strong> $42,000 (تطبيقات Flutter، خوادم Go، محرك PostGIS، وخرائط OSRM).</li>
      <li><strong>التسويق وجذب الركاب والشركات:</strong> $35,000 (حملات ممولة في طرابلس، صناع المحتوى، وأكواد الرحلة الأولى).</li>
      <li><strong>مقر Move Hub بطرابلس ومعدات الفحص:</strong> $26,000 (إيجار المقر 12 شهراً، أجهزة الفحص، ومولد الطاقة).</li>
      <li><strong>تجهيز وتدريب أول 200 كابتن:</strong> $14,000 (حقيبة السائق المغناطيسية، حوافز أول 20 رحلة، ورش السلامة).</li>
      <li><strong>فريق العمل والإدارة 24/7 (6 أشهر):</strong> $33,000 (مدير العمليات، مسؤول التقنية، 2 موظفي طوارئ ودعم).</li>
      <li><strong>الشؤون القانونية والتراخيص:</strong> $7,500 (السجل التجاري، التراخيص البلدية، واستشارات العقود).</li>
      <li><strong>احتياطي السيولة والطوارئ:</strong> $12,500 (مخصص أمان نقدي غير مستهلك).</li>
    </ul>
    <h3 class="text-sm font-semibold text-white mt-4">مسار نقطة التعادل (Break-even Path):</h3>
    <p class="text-slate-300">يغطي رأس المال <strong>14 إلى 15 شهراً</strong> من التشغيل المستمر؛ وتصل المنصة إلى نقطة التعادل المالي الكامل في <strong>الشهر 11</strong> عند تشغيل 300 سائق نشط في طرابلس، محققة تدفقاً نقدياً ذاتياً موجباً منذ الشهر 12.</p>
  `
};

function switchDocTab(docId) {
  const tabs = ['memo', 'market', 'finance', 'tech', 'costs'];
  tabs.forEach(t => {
    const btn = document.getElementById(`doc-btn-${t}`);
    if (btn) {
      if (t === docId) {
        btn.className = "doc-tab-btn active py-3 border-b-2 border-emerald-400 text-emerald-400";
      } else {
        btn.className = "doc-tab-btn py-3 border-b-2 border-transparent text-slate-400 hover:text-white";
      }
    }
  });

  const container = document.getElementById('doc-content-container');
  if (container) {
    container.innerHTML = DOCS_CONTENT[docId] || '';
  }
}

// ==========================================
// 12. COST TIER TOGGLE (LEAN VS RECOMMENDED)
// ==========================================
function toggleCostTier(tier) {
  playBeep();
  const btnRec = document.getElementById('btn-tier-recommended');
  const btnLean = document.getElementById('btn-tier-lean');

  if (tier === 'recommended') {
    btnRec.className = "px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white border border-white/[0.08] transition";
    btnLean.className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition";

    document.getElementById('cost-total-cap').innerText = "$140,000 USD";
    document.getElementById('cost-total-lyd').innerText = "ما يعادل ~700,000 دينار ليبي";
    document.getElementById('cost-runway-months').innerText = "14 إلى 15 شهراً";
    document.getElementById('cost-contingency').innerText = "$12,500 USD";

    document.getElementById('cat-cost-tech').innerText = "$42,000 (30.0%)";
    document.getElementById('cat-cost-mkt').innerText = "$35,000 (25.0%)";
    document.getElementById('cat-cost-hub').innerText = "$26,000 (18.5%)";
    document.getElementById('cat-cost-drivers').innerText = "$14,000 (10.0%)";
    document.getElementById('cat-cost-payroll').innerText = "$33,000 (23.5%)";
    document.getElementById('cat-cost-legal').innerText = "$20,000 (14.5%)";
  } else {
    btnLean.className = "px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white border border-white/[0.08] transition";
    btnRec.className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition";

    document.getElementById('cost-total-cap').innerText = "$85,000 USD";
    document.getElementById('cost-total-lyd').innerText = "ما يعادل ~425,000 دينار ليبي";
    document.getElementById('cost-runway-months').innerText = "9 إلى 11 شهراً";
    document.getElementById('cost-contingency').innerText = "$5,000 USD";

    document.getElementById('cat-cost-tech').innerText = "$26,000 (30.5%)";
    document.getElementById('cat-cost-mkt').innerText = "$14,000 (16.5%)";
    document.getElementById('cat-cost-hub').innerText = "$12,000 (14.0%)";
    document.getElementById('cat-cost-drivers').innerText = "$6,000 (7.0%)";
    document.getElementById('cat-cost-payroll').innerText = "$18,000 (21.0%)";
    document.getElementById('cat-cost-legal').innerText = "$9,000 (10.5%)";
  }
}

function playBeep() {
  try {
    const audio = document.getElementById('beep-sound');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch(e) {}
}
