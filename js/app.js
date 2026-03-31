// Smart Campus Transit Authority - Enhanced Main Application JavaScript with Authentication Integration

// Global variables
let map = null;
let busMarkers = [];
let routePolyline = null;
let currentLanguage = 'english';

// Simple global notification helper used across modules
function showNotification(message, type = 'info') {
    // create container if missing
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `position: fixed; top: 80px; right: 20px; z-index: 9999; max-width: 380px;`;
        document.body.appendChild(container);
    }
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show mb-2`;
    notification.innerHTML = `
        <div class="d-flex align-items-center">\n
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>
    `;

    container.appendChild(notification);
    setTimeout(()=>{ try{ notification.remove(); }catch(e){} }, 5000);
}

// expose to global so feature modules can call it
window.showNotification = showNotification;

// Determine API base URL. If page is opened via file:// assume server at localhost:3000
function getApiBase() {
    if (window.API_BASE) return window.API_BASE.replace(/\/$/, '');
    try {
        if (location.protocol === 'file:') return 'http://localhost:3000';
        // when served from same host, use relative
        return '';
    } catch (e) { return 'http://localhost:3000'; }
}

// --- i18n helpers for static labels ---
function tKey(key) {
  const tr = (window.appData && window.appData.translations && window.appData.translations[currentLanguage]) || {};
  if (tr && tr[key]) return tr[key];
  const en = (window.appData && window.appData.translations && window.appData.translations['english']) || {};
  return en[key] || key;
}

// Replace visible text nodes that exactly or partially match
function replaceTextContains(oldText, newText) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let node;
  const targets = [];
  while ((node = walker.nextNode())) {
    const s = node.nodeValue.trim();
    if (!s) continue;
    if (s === oldText || s.includes(oldText)) {
      targets.push(node);
    }
  }
  targets.forEach(n => {
    n.nodeValue = n.nodeValue.replace(oldText, newText);
  });
}

function applyStaticTranslations() {
  // Headings and labels in status/controls
  replaceTextContains("Live Tracking Status", tKey("liveTrackingStatusTitle"));
  replaceTextContains("Avg Speed (km/h)", tKey("avgSpeedLabel"));
  replaceTextContains("Accuracy", tKey("accuracyLabel"));
  replaceTextContains("Tracking Controls", tKey("trackingControlsTitle"));
  replaceTextContains("Start Tracking", tKey("startTrackingBtn"));
  replaceTextContains("Stop Tracking", tKey("stopTrackingBtn"));
  replaceTextContains("Export Data", tKey("exportDataBtn"));
  replaceTextContains("Route Selection & Live Data", tKey("routeSelectionTitle"));
  replaceTextContains("Update Frequency:", tKey("updateFrequencyLabel"));
  replaceTextContains("Tracking Options:", tKey("trackingOptionsLabel"));
  replaceTextContains("Proximity Alerts", tKey("proximityAlertsLabel"));
  replaceTextContains("Traffic Simulation", tKey("trafficSimulationLabel"));
  replaceTextContains("Live Bus Tracking Map", tKey("liveBusMapTitle"));
  replaceTextContains("My Location", tKey("myLocationBtn"));
  replaceTextContains("Follow Bus", tKey("followBusBtn"));
  replaceTextContains("Active Buses", tKey("activeBusesLabel"));
  replaceTextContains("Delayed", tKey("delayedLabel"));
  replaceTextContains("Live Tracking Active", tKey("liveActiveLabel"));
  replaceTextContains("Driver", tKey("driverLabel"));
  replaceTextContains("Next Stop", tKey("nextStopLabel"));

  // Capacity/occupied/ETA bits often appear with numbers; handle partials
  replaceTextContains("Capacity", tKey("capacityLabel"));
  replaceTextContains("occupied", tKey("occupiedLabel"));
  replaceTextContains("min ETA", tKey("minEtaLabel"));
  replaceTextContains("On Time", tKey("onTimeBadge"));
}



function getLocalizedRouteName(routeId) {
  const t = (window.appData && window.appData.translations && window.appData.translations[currentLanguage]) || null;
  if (t && t.routeNames && t.routeNames[routeId]) {
    const rn = t.routeNames[routeId];
    if (currentLanguage === 'hindi') return rn.hi;
    return rn.en;
  }
  const r = (window.appData.routes || []).find(x => x.id === routeId);
  return r ? r.name : routeId;
}

let selectedSeats = [];
let bookingData = {};
let ridershipChart = null;
let revenueChart = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // If a freshStart flag is present, reset UI state on load
    try {
        const fresh = sessionStorage.getItem('freshStart');
        if (fresh) {
            sessionStorage.removeItem('freshStart');
            // ensure we land on home and notify user
            try { showSection('home'); } catch(e){}
            try { if(window.showNotification) window.showNotification('Application restarted to initial state', 'info'); } catch(e){}
        }
    } catch(e){}
    // Set up event listeners
    setupEventListeners();

    // Initialize theme
    initializeTheme();

    // Initialize language
    const savedLanguage = localStorage.getItem('language') || 'english';
    setLanguage(savedLanguage);

    // Initialize map
    initializeMap();

    // Initialize feature modules (if present)
    if (window.QRIntent && typeof QRIntent.initUI === 'function') QRIntent.initUI();
    if (window.ClusteringModule && typeof ClusteringModule.initUI === 'function') ClusteringModule.initUI();
    if (window.RouteSuggester && typeof RouteSuggester.initUI === 'function') RouteSuggester.initUI();
    if (window.AlertsModule && typeof AlertsModule.initUI === 'function') AlertsModule.initUI();
    if (window.DemandInsights && typeof DemandInsights.initUI === 'function') DemandInsights.initUI();
    if (window.DemandQRModule && typeof DemandQRModule.initUI === 'function') DemandQRModule.initUI();

    const heatBtn = document.getElementById('refreshHeatmapBtn');
    if (heatBtn) heatBtn.addEventListener('click', ()=>{ if(window.HeatmapModule) HeatmapModule.refresh(map); });

    // Set default travel date
    const today = new Date().toISOString().split('T')[0];
    const travelDateInput = document.getElementById('travelDate');
    if (travelDateInput) {
        travelDateInput.value = today;
        travelDateInput.min = today;
    }

    // Initialize tracking stats update
    updateTrackingStats();
    setInterval(updateTrackingStats, 5000);

    console.log('Smart Campus Transit Authority initialized with enhanced tracking and authentication!');
}

function setupEventListeners() {
    // Language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            setLanguage(this.value);
        });
    }

    // Theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // Add rotating animation
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
            
            // Mark fresh start (keep in sessionStorage so it survives reload)
            try { sessionStorage.setItem('freshStart', '1'); } catch(e){}
            // Preserve auth and user preferences, then clear other persistent data
            try {
                const preserveKeys = ['scta_user', 'theme', 'language'];
                const preserved = {};
                preserveKeys.forEach(k => {
                    const v = localStorage.getItem(k);
                    if (v !== null) preserved[k] = v;
                });
                localStorage.clear();
                Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));
            } catch(e){}

            // Reload the page after a short delay to show fresh start
            setTimeout(() => {
                location.reload();
            }, 500);
        });
    }

    // Lost & Found button and form
    const lostFoundBtn = document.getElementById('lostFoundButton');
    if (lostFoundBtn) lostFoundBtn.addEventListener('click', showLostFoundModal);
    const lostForm = document.getElementById('lostItemForm');
    if (lostForm) lostForm.addEventListener('submit', submitLostItem);

    // Demand submission button
    const submitDemandBtn = document.getElementById('submitSMSIntentBtn');
    if (submitDemandBtn) submitDemandBtn.addEventListener('click', submitDemandIntent);

    // Listen for bus data updates from tracker
    document.addEventListener('busDataUpdate', function(event) {
        handleBusDataUpdate(event.detail);
    });
}

// --- Lost & Found UI and integration ---
function showLostFoundModal() {
    try {
        const modal = new bootstrap.Modal(document.getElementById('lostFoundModal'));
        modal.show();
        loadLostItems();
    } catch (e) { console.error('showLostFoundModal', e); }
}

async function loadLostItems() {
    const list = document.getElementById('lostItemsList');
    if (!list) return;
    list.innerHTML = '<div class="text-muted">Loading...</div>';
    try {
        const resp = await fetch(getApiBase() + '/api/lost-items');
        const data = await resp.json();
        if (!data || !data.success) throw new Error('Failed to fetch');
        const items = data.items || [];
        if (items.length === 0) {
            list.innerHTML = '<div class="text-muted">No items reported yet.</div>';
            return;
        }
        const html = items.map(item => {
            return `
            <div class="card mb-2">
              <div class="card-body p-2">
                <div><strong>${escapeHtml(item.description || '')}</strong></div>
                <div class="small text-muted">Reported by: ${escapeHtml(item.reporterName || 'Anonymous')} • ${escapeHtml(item.location || '')} • ${escapeHtml(item.contact || '')}</div>
                <div class="mt-2">
                  <button class="btn btn-sm btn-success me-2" onclick="markFound('${item.id}')">Mark Found</button>
                </div>
              </div>
            </div>`;
        }).join('');
        list.innerHTML = html;
    } catch (e) {
        console.error('loadLostItems', e);
        list.innerHTML = '<div class="text-danger">Failed to load items</div>';
    }
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function (m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
}

async function submitLostItem(e) {
    try {
        e.preventDefault();
        const reporterName = document.getElementById('lostReporterName').value;
        const contact = document.getElementById('lostContact').value;
        const busId = document.getElementById('lostBusId').value;
        const location = document.getElementById('lostLocation').value;
        const description = document.getElementById('lostDescription').value;

        if (!description || description.trim().length === 0) {
            showNotification('Please provide a description for the lost item', 'warning');
            return;
        }

        const payload = { reporterName, contact, busId, location, description };
        const resp = await fetch(getApiBase() + '/api/lost-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await resp.json();
        if (data && data.success) {
            showNotification('Lost item reported — thank you!', 'success');
            document.getElementById('lostItemForm').reset();
            loadLostItems();
        } else {
            showNotification('Failed to report lost item', 'danger');
        }
    } catch (err) {
        console.error('submitLostItem', err);
        showNotification('Error submitting lost item', 'danger');
    }
}

async function markFound(id) {
    if (!id) return;
    if (!confirm('Mark this item as found?')) return;
    try {
        const resp = await fetch(getApiBase() + `/api/lost-items/${id}/mark-found`, { method: 'PUT' });
        const data = await resp.json();
        if (data && data.success) {
            showNotification('Item marked as found', 'success');
            loadLostItems();
        } else {
            showNotification('Failed to mark item', 'danger');
        }
    } catch (e) {
        console.error('markFound', e);
        showNotification('Error marking item found', 'danger');
    }
}

// --- Demand submission handlers ---
async function submitDemandIntent(e) {
    try {
        if (e && e.preventDefault) e.preventDefault();
        const messageEl = document.getElementById('smsMessageInput');
        const fromEl = document.getElementById('smsFrom');
        const toEl = document.getElementById('smsTo');
        const seatsEl = document.getElementById('smsSeats');
        const timeEl = document.getElementById('smsTime');
        const dateEl = document.querySelector('#demandTab-sms input[type="date"]');

        const message = messageEl ? messageEl.value.trim() : '';
        const from = fromEl ? fromEl.value.trim() : '';
        const to = toEl ? toEl.value.trim() : '';
        const seats = seatsEl ? parseInt(seatsEl.value) || 1 : 1;
        const time = timeEl ? timeEl.value : '';
        const date = dateEl ? dateEl.value : '';

        if (!message && !(from && to)) {
            showNotification('Please enter a free-text message or both From and To fields', 'warning');
            return;
        }

        const payload = { from, to, seats, time, date, message, reporter: (window.authSystem && window.authSystem.currentUser) ? (window.authSystem.currentUser.name || 'anonymous') : (window.currentUser && window.currentUser.name) || 'guest' };

        const resp = await fetch(getApiBase() + '/api/demands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await resp.json();
        if (data && data.success) {
            showNotification('Demand submitted — thank you!', 'success');
            if (messageEl) messageEl.value = '';
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';
            if (seatsEl) seatsEl.value = '1';
            if (timeEl) timeEl.value = '';
            if (dateEl) dateEl.value = '';
            refreshDemandDashboard();
        } else {
            showNotification('Failed to submit demand', 'danger');
        }
    } catch (err) {
        console.error('submitDemandIntent', err);
        showNotification('Error submitting demand', 'danger');
    }
}

async function refreshDemandDashboard() {
    const out = document.getElementById('demandDashboard');
    if (!out) return;
    out.innerHTML = '<div class="alert alert-info">Loading demand dashboard...</div>';
    try {
        const resp = await fetch(getApiBase() + '/api/demands');
        const data = await resp.json();
        if (!data || !data.success) throw new Error('Failed to fetch demands');
        const items = data.items || [];
        if (items.length === 0) {
            out.innerHTML = '<div class="alert alert-secondary">No demand intents submitted yet.</div>';
            return;
        }
        const html = items.slice(0, 20).map(it => {
            return `<div class="card mb-2"><div class="card-body p-2"><strong>${escapeHtml(it.from || it.message || 'Intent')}</strong><div class="small text-muted">${escapeHtml(it.to || '')} • ${escapeHtml(it.time || '')} • ${escapeHtml(it.date || '')} • ${escapeHtml(it.reporter || '')}</div></div></div>`;
        }).join('');
        out.innerHTML = html;
    } catch (e) {
        console.error('refreshDemandDashboard', e);
        out.innerHTML = '<div class="alert alert-danger">Failed to load demand dashboard</div>';
    }
}

function handleBusDataUpdate(eventData) {
    // Handle real-time bus data updates from the enhanced tracker
    console.log('Received bus data update:', eventData);

    // Update UI elements if tracking section is active
    const routeSelect = document.getElementById('routeSelect');
    if (routeSelect && routeSelect.value) {
        // Refresh current route display
        loadEnhancedRoute();
    }

    // Update dashboard if visible
    const dashboardSection = document.getElementById('dashboardSection');
    if (dashboardSection && dashboardSection.classList.contains('active')) {
        populateFleetTable();
    }
}

// Enhanced Language Management
function setLanguage(lang) {

    currentLanguage = lang;
    localStorage.setItem('language', lang);

    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = lang;
    
  if (typeof updateRouteOptionTexts === 'function') updateRouteOptionTexts();
}

    updateLanguageContent();
}

// Theme Management
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            themeToggle.title = 'Switch to Dark Mode';
        }
    } else {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggle.title = 'Switch to Light Mode';
        }
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggle.title = 'Switch to Light Mode';
        }
    } else {
        body.classList.remove('dark-mode');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            themeToggle.title = 'Switch to Dark Mode';
        }
    }
}

function updateLanguageContent() {
  applyStaticTranslations();
  if (typeof updateRouteOptionTexts === 'function') updateRouteOptionTexts();
  if (typeof updateRouteOptionTexts === 'function') updateRouteOptionTexts();
    const translations = appData.translations[currentLanguage];

    // Update all translatable elements
    const translatableElements = {
        'navBrand': 'appName',
        'navHome': 'home',
        'navTracking': 'trackBus',
        'navBooking': 'bookTicket',
        'navDashboard': 'dashboard',
        'navProfile': 'profile',
        'heroTitle': 'heroTitle',
        'heroSubtitle': 'heroSubtitle',
        'heroTrackBtn': 'trackBus',
        'heroBookBtn': 'bookTicket',
        'featureTitle1': 'featureTitle1',
        'featureDesc1': 'featureDesc1',
        'featureTitle2': 'featureTitle2',
        'featureDesc2': 'featureDesc2',
        'featureTitle3': 'featureTitle3',
        'featureDesc3': 'featureDesc3',
        'trackingTitle': 'liveTracking',
        'busInfoTitle': 'busInfo',
        'routeStopsTitle': 'routeStops',
        'bookingTitle': 'bookingTitle',
        'costCalcTitle': 'costCalc',
        'dashboardTitle': 'dashboardTitle',
        'dashboardSubtitle': 'dashboardSubtitle',
        'profileTitle': 'profileTitle',
        'quickStatsTitle': 'quickStats',
        'bookingsTab': 'bookings',
        'preferencesTab': 'preferences',
        'editProfileBtn': 'editProfile',
        'routeLabel': 'selectRoute'
    };

    Object.keys(translatableElements).forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element && translations[translatableElements[elementId]]) {
            element.textContent = translations[translatableElements[elementId]];
        }
    });
}

// Enhanced Map Management
function initializeMap() {
    if (map) {
        map.remove();
    }

    map = L.map('map').setView([30.3398, 76.3869], 9);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add custom map styling
    map.getContainer().style.borderRadius = '8px';
}

// Enhanced route loading function (integrated with tracker)
function loadEnhancedRoute() {
    const routeSelect = document.getElementById('routeSelect');
    const selectedRouteId = routeSelect.value;

    if (!selectedRouteId) {
        clearMapData();
        updateEnhancedBusInfo(null, null);
        updateRouteProgress(null, null);
        return;
    }

    const route = appData.routes.find(r => r.id === selectedRouteId);
    const bus = appData.buses.find(b => b.route === selectedRouteId);

    if (route && bus) {
        displayEnhancedRouteOnMap(route, bus);
        updateEnhancedBusInfo(bus, route);
        updateRouteProgress(bus, route);
        updatePassengerInsights(bus);
    }
}

// Legacy function for compatibility
function loadRoute() {
    loadEnhancedRoute();
}

// Enhanced map display with tracking features
function displayEnhancedRouteOnMap(route, bus) {
    clearMapData();

    // Add route polyline with enhanced styling
    const routeCoordinates = route.stops.map(stop => [stop.lat, stop.lng]);
    routePolyline = L.polyline(routeCoordinates, {
        color: '#007bff',
        weight: 4,
        opacity: 0.8
    }).addTo(map);

    // Add stop markers with enhanced popups
    route.stops.forEach((stop, index) => {
        const isNext = stop.name === bus.nextStop;
        const markerIcon = L.divIcon({
            className: isNext ? 'stop-marker next-stop' : 'stop-marker',
            html: `<div class="stop-icon ${isNext ? 'next' : ''}">${index + 1}</div>`,
            iconSize: [25, 25]
        });

        const marker = L.marker([stop.lat, stop.lng], {icon: markerIcon}).addTo(map);
        marker.bindPopup(`
            <div class="stop-popup">
                <h6>${stop.name}</h6>
                <p>Scheduled: ${stop.time}</p>
                ${isNext ? '<span class="badge bg-warning">Next Stop</span>' : ''}
            </div>
        `);
    });

    // Add enhanced bus marker with direction
    const heading = window.busTracker ? busTracker.calculateHeading(bus, route) : 0;
    const busIcon = L.divIcon({
        className: 'enhanced-bus-marker',
        html: `
            <div class="bus-container" style="transform: rotate(${heading || 0}deg)">
                <i class="fas fa-bus"></i>
            </div>
        `,
        iconSize: [30, 30]
    });

    const busMarker = L.marker([bus.currentLat, bus.currentLng], {icon: busIcon}).addTo(map);
    busMarker.bindPopup(`
        <div class="bus-popup">
            <h6>🚌 ${bus.id}</h6>
            <p><strong>Driver:</strong> ${bus.driver}</p>
            <p><strong>Status:</strong> <span class="badge bg-${bus.status.includes('Delayed') ? 'warning' : 'success'}">${bus.status}</span></p>
            <p><strong>Speed:</strong> ${bus.speed} km/h</p>
            <p><strong>Next:</strong> ${bus.nextStop}</p>
            <p><strong>ETA:</strong> ${bus.eta} min</p>
            <p><strong>Occupancy:</strong> ${bus.occupancy}/${bus.capacity}</p>
        </div>
    `);
    busMarkers.push(busMarker);

    // Add bus trail if tracking history exists
    if (window.busTracker && busTracker.trackingHistory[bus.id]) {
        const history = busTracker.trackingHistory[bus.id];
        if (history && history.length > 1) {
            const trailCoordinates = history.slice(-10).map(point => [point.lat, point.lng]);
            const trailLine = L.polyline(trailCoordinates, {
                className: 'bus-trail',
                weight: 3,
                opacity: 0.6,
                color: '#ff6b6b'
            }).addTo(map);
        }
    }

    // Fit map to route bounds
    map.fitBounds(routePolyline.getBounds(), {padding: [20, 20]});
}

function clearMapData() {
    if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
    }

    busMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    busMarkers = [];

    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            if (layer !== routePolyline) {
                map.removeLayer(layer);
            }
        }
    });
}

// Update enhanced bus information panel
function updateEnhancedBusInfo(bus, route) {
    const busInfoElement = document.getElementById('enhancedBusInfo') || document.getElementById('busInfo');

    if (!bus || !route) {
        busInfoElement.innerHTML = '<p class="text-muted">Select a route to see live bus information</p>';
        return;
    }

    const stats = window.busTracker ? busTracker.getTrackingStats() : {
        trackingAccuracy: '±50m',
        lastUpdate: new Date().toLocaleTimeString()
    };

    const busInfoHtml = `
        <div class="enhanced-bus-info">
            <div class="bus-header mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0">${bus.id}</h6>
                    <span class="badge bg-${bus.status.includes('Delayed') ? 'warning' : bus.status === 'Maintenance Required' ? 'danger' : 'success'}">
                        ${bus.status}
                    </span>
                </div>
                <small class="text-muted">${route.name}</small>
            </div>

            <div class="bus-details">
                <div class="row text-center mb-3">
                    <div class="col-4">
                        <div class="metric">
                            <h5 class="text-primary mb-0">${bus.speed || 0}</h5>
                            <small class="text-muted">km/h</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="metric">
                            <h5 class="text-info mb-0">${bus.eta || 0}</h5>
                            <small class="text-muted">min ETA</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="metric">
                            <h5 class="text-success mb-0">${Math.round((bus.occupancy/bus.capacity)*100)}%</h5>
                            <small class="text-muted">occupied</small>
                        </div>
                    </div>
                </div>

                <div class="bus-info-items">
                    <div class="info-item d-flex justify-content-between mb-2">
                        <span class="text-muted">Driver:</span>
                        <span class="fw-medium">${bus.driver}</span>
                    </div>
                    <div class="info-item d-flex justify-content-between mb-2">
                        <span class="text-muted">Capacity:</span>
                        <span class="fw-medium">${bus.occupancy}/${bus.capacity} seats</span>
                    </div>
                    <div class="info-item d-flex justify-content-between mb-2">
                        <span class="text-muted">Next Stop:</span>
                        <span class="fw-medium">${bus.nextStop}</span>
                    </div>
                    <div class="info-item d-flex justify-content-between mb-2">
                        <span class="text-muted">Amenities:</span>
                        <div class="amenities">
                            ${bus.amenities.map(amenity => 
                                `<span class="badge bg-light text-dark me-1">${amenity}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>

                <div class="tracking-accuracy mt-3 p-2 bg-light rounded">
                    <small class="text-muted">
                        <i class="fas fa-satellite-dish me-1"></i>
                        Tracking Accuracy: ${stats.trackingAccuracy} | Last Update: ${stats.lastUpdate}
                    </small>
                </div>
            </div>
        </div>
    `;

    busInfoElement.innerHTML = busInfoHtml;
}

// Update route progress indicator
function updateRouteProgress(bus, route) {
    const progressElement = document.getElementById('routeProgress');
    if (!progressElement || !bus || !route) return;

    const currentStopIndex = getCurrentStopIndex(bus, route);
    const progress = ((currentStopIndex + 1) / route.stops.length) * 100;

    const progressHtml = `
        <div class="route-progress mb-3">
            <div class="d-flex justify-content-between mb-2">
                <small class="text-muted">Route Progress</small>
                <small class="text-muted">${currentStopIndex + 1}/${route.stops.length} stops</small>
            </div>
            <div class="route-progress-bar mb-2">
                <div class="route-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="current-segment">
                <div class="d-flex justify-content-between">
                    <span class="fw-medium">${route.stops[currentStopIndex]?.name || 'Unknown'}</span>
                    <span class="text-primary">${bus.eta} min</span>
                </div>
                <div class="text-center">
                    <i class="fas fa-arrow-down text-muted"></i>
                </div>
                <div class="text-center fw-medium text-info">
                    ${bus.nextStop}
                </div>
            </div>
        </div>
    `;

    progressElement.innerHTML = progressHtml;
}

// Update passenger insights
function updatePassengerInsights(bus) {
    const occupancyBar = document.getElementById('occupancyBar');
    const occupancyText = document.getElementById('occupancyText');
    const nextStopETA = document.getElementById('nextStopETA');
    const nextStopName = document.getElementById('nextStopName');

    if (occupancyBar && occupancyText) {
        const occupancyPercent = (bus.occupancy / bus.capacity) * 100;
        occupancyBar.style.width = occupancyPercent + '%';
        occupancyText.textContent = `${bus.occupancy}/${bus.capacity} seats`;

        // Change color based on occupancy
        occupancyBar.className = 'progress-bar ' + 
            (occupancyPercent > 80 ? 'bg-danger' : 
             occupancyPercent > 60 ? 'bg-warning' : 'bg-info');
    }

    if (nextStopETA) nextStopETA.textContent = `${bus.eta} min`;
    if (nextStopName) nextStopName.textContent = bus.nextStop;
}

// Helper function to get current stop index
function getCurrentStopIndex(bus, route) {
    let closestIndex = 0;
    let minDistance = Infinity;

    route.stops.forEach((stop, index) => {
        const distance = calculateDistance(
            bus.currentLat, bus.currentLng,
            stop.lat, stop.lng
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });

    return closestIndex;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Enhanced Tracker Integration Functions
function setUpdateFrequency() {
    const frequency = document.getElementById('updateFrequency').value;
    if (window.busTracker) {
        busTracker.updateFrequency = parseInt(frequency);
        busTracker.stopRealTimeTracking();
        busTracker.startRealTimeTracking();
        busTracker.showNotification(`Update frequency set to ${frequency/1000} seconds`, 'info');
    }
}

function centerMapOnUser() {
    if (window.busTracker && busTracker.userLocation && map) {
        map.setView([busTracker.userLocation.lat, busTracker.userLocation.lng], 15);

        // Add user location marker if not exists
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<i class="fas fa-user-circle text-primary"></i>',
            iconSize: [20, 20]
        });

        L.marker([busTracker.userLocation.lat, busTracker.userLocation.lng], {icon: userIcon})
         .addTo(map)
         .bindPopup('Your Location');
    }
}

function followBus() {
    const routeSelect = document.getElementById('routeSelect');
    if (!routeSelect.value) {
        alert('Please select a route first');
        return;
    }

    const bus = appData.buses.find(b => b.route === routeSelect.value);
    if (bus && map) {
        map.setView([bus.currentLat, bus.currentLng], 16);
        if (window.busTracker) {
            busTracker.showNotification(`Now following Bus ${bus.id}`, 'info');
        }
    }
}

// Update tracking statistics
function updateTrackingStats() {
    const activeBuses = appData.buses.filter(bus => bus.status === 'On Time').length;
    const delayedBuses = appData.buses.filter(bus => bus.status.includes('Delayed')).length;
    const averageSpeed = Math.round(appData.buses.reduce((sum, bus) => sum + (bus.speed || 0), 0) / appData.buses.length);

    const elements = {
        activeBusCount: `${activeBuses}/${appData.buses.length}`,
        averageSpeed: averageSpeed,
        delayedCount: delayedBuses
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

// Section Management
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Add active class to corresponding nav link
    const navLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (navLink) {
        navLink.classList.add('active');
    }

    // Initialize section-specific functionality
    if (sectionName === 'dashboard') {
        initializeDashboard();
    } else if (sectionName === 'tracking') {
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
            }
        }, 100);
    } else if (sectionName === 'booking') {
        // Check authentication for booking
        if (!window.authSystem || (!window.authSystem.isAuthenticated && window.authSystem.userType === 'guest')) {
            const authAlert = document.getElementById('authRequiredAlert');
            if (authAlert) {
                authAlert.style.display = 'block';
            }
        } else {
            const authAlert = document.getElementById('authRequiredAlert');
            if (authAlert) {
                authAlert.style.display = 'none';
            }
        }
    } else if (sectionName === 'profile') {
        showProfileTab('bookings');
    }
}

// Authentication integration functions
function checkAuthAndShowBooking() {
    if (window.authSystem && window.authSystem.isAuthenticated && window.authSystem.userType === 'user') {
        showSection('booking');
        const authAlert = document.getElementById('authRequiredAlert');
        if (authAlert) {
            authAlert.style.display = 'none';
        }
    } else {
        showSection('booking');
        const authAlert = document.getElementById('authRequiredAlert');
        if (authAlert) {
            authAlert.style.display = 'block';
        }
    }
}

function checkAuthAndShowProfile() {
    showSection('profile');
}

// Booking System (existing functionality)
function selectBookingRoute() {
    const routeSelect = document.getElementById('bookingRoute');
    const selectedRouteId = routeSelect.value.split('(')[0].trim();

    if (selectedRouteId) {
        const route = appData.routes.find(r => r.id === selectedRouteId);
        if (route) {
            bookingData.selectedRoute = route;
            
            // Display occupancy information for buses on this route
            const buses = appData.buses.filter(b => b.route === selectedRouteId);
            const occupancyContainer = document.getElementById('routeOccupancyInfo') || createOccupancyContainer();
            
            if (buses.length > 0) {
                let occupancyHtml = '<div class="mt-3"><strong>Available Buses on this Route:</strong>';
                buses.forEach(bus => {
                    if (typeof getBusOccupancy === 'function') {
                        const occupancyData = getBusOccupancy(bus.id);
                        occupancyHtml += `
                            <div class="card card-sm mt-2" style="font-size: 0.9em;">
                                <div class="card-body p-2">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Bus ${bus.id}</strong> - 
                                            <span class="text-muted">Driver: ${bus.driver}</span>
                                        </div>
                                        ${getOccupancyBadge(occupancyData.percentFull)}
                                    </div>
                                    <small class="text-muted d-block mt-1">
                                        ${occupancyData.occupancy}/${occupancyData.capacity} seats occupied 
                                        • ${occupancyData.availableSeats} seats available
                                    </small>
                                    <div class="progress mt-2" style="height: 12px;">
                                        <div class="progress-bar ${occupancyData.percentFull >= 90 ? 'bg-danger' : occupancyData.percentFull >= 75 ? 'bg-warning' : 'bg-info'}" 
                                             style="width: ${occupancyData.percentFull}%;" role="progressbar">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                });
                occupancyHtml += '</div>';
                occupancyContainer.innerHTML = occupancyHtml;
                occupancyContainer.style.display = 'block';
            }
        }
    }
}

function createOccupancyContainer() {
    const container = document.createElement('div');
    container.id = 'routeOccupancyInfo';
    container.style.marginTop = '15px';
    const proceedBtn = document.querySelector('button[onclick="proceedToSeatSelection()"]');
    if (proceedBtn && proceedBtn.parentElement) {
        proceedBtn.parentElement.insertBefore(container, proceedBtn);
    }
    return container;
}

function proceedToSeatSelection() {
    const routeSelect = document.getElementById('bookingRoute');
    const travelDate = document.getElementById('travelDate');

    if (!routeSelect.value || !travelDate.value) {
        alert('Please select route and travel date');
        return;
    }

    bookingData.travelDate = travelDate.value;

    document.getElementById('bookingStep1').style.display = 'none';
    document.getElementById('bookingStep2').style.display = 'block';

    generateSeatLayout();
}

function generateSeatLayout() {
    const routeId = document.getElementById('bookingRoute').value.split('(')[0].trim();
    const bus = appData.buses.find(b => b.route === routeId);

    if (!bus) return;

    const seatLayout = appData.seatLayouts[bus.capacity];
    const occupied = occupiedSeats[bus.id] || [];

    let layoutHtml = '<div class="bus-front">Driver</div>';

    seatLayout.forEach((row, rowIndex) => {
        layoutHtml += '<div class="seat-row">';

        // Left side seats
        const leftSeats = row.slice(0, 2);
        layoutHtml += '<div class="seat-side">';
        leftSeats.forEach(seat => {
            if (seat) {
                const isOccupied = occupied.includes(seat);
                const isSelected = selectedSeats.includes(seat);
                layoutHtml += `<div class="seat ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}" 
                               onclick="${isOccupied ? '' : 'toggleSeat("' + seat + '")'}" 
                               data-seat="${seat}">${seat}</div>`;
            }
        });
        layoutHtml += '</div>';

        // Aisle
        layoutHtml += '<div class="aisle">||</div>';

        // Right side seats
        const rightSeats = row.slice(2);
        layoutHtml += '<div class="seat-side">';
        rightSeats.forEach(seat => {
            if (seat) {
                const isOccupied = occupied.includes(seat);
                const isSelected = selectedSeats.includes(seat);
                layoutHtml += `<div class="seat ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}" 
                               onclick="${isOccupied ? '' : 'toggleSeat("' + seat + '")'}" 
                               data-seat="${seat}">${seat}</div>`;
            }
        });
        layoutHtml += '</div>';

        layoutHtml += '</div>';
    });

    // Add legend
    layoutHtml += `
        <div class="seat-legend">
            <div class="legend-item">
                <div class="legend-seat" style="background: white; border: 2px solid #dee2e6;"></div>
                <span>Available</span>
            </div>
            <div class="legend-item">
                <div class="legend-seat" style="background: #198754; border: 2px solid #198754;"></div>
                <span>Selected</span>
            </div>
            <div class="legend-item">
                <div class="legend-seat" style="background: #dc3545; border: 2px solid #dc3545;"></div>
                <span>Occupied</span>
            </div>
        </div>
    `;

    document.getElementById('seatLayout').innerHTML = layoutHtml;
    updateSelectedSeats();
}

function toggleSeat(seatNumber) {
    const seatIndex = selectedSeats.indexOf(seatNumber);

    if (seatIndex > -1) {
        selectedSeats.splice(seatIndex, 1);
    } else {
        if (selectedSeats.length < 4) {
            selectedSeats.push(seatNumber);
        } else {
            alert('Maximum 4 seats can be selected');
            return;
        }
    }

    updateSeatDisplay();
    updateSelectedSeats();
}

function selectSeat(button) {
    const seatNumber = button.getAttribute('data-seat');
    
    // Check if seat is booked
    if (button.classList.contains('booked')) {
        alert('This seat is already booked');
        return;
    }

    const seatIndex = selectedSeats.indexOf(seatNumber);

    if (seatIndex > -1) {
        selectedSeats.splice(seatIndex, 1);
        button.classList.remove('selected');
    } else {
        if (selectedSeats.length < 4) {
            selectedSeats.push(seatNumber);
            button.classList.add('selected');
        } else {
            alert('Maximum 4 seats can be selected');
            return;
        }
    }

    updateSelectedSeats();
}

function updateSeatDisplay() {
    document.querySelectorAll('.seat').forEach(seat => {
        const seatNumber = seat.getAttribute('data-seat');
        if (seatNumber && !seat.classList.contains('occupied')) {
            if (selectedSeats.includes(seatNumber)) {
                seat.classList.add('selected');
            } else {
                seat.classList.remove('selected');
            }
        }
    });
}

function updateSelectedSeats() {
    const selectedSeatsSpan = document.getElementById('selectedSeats');
    selectedSeatsSpan.textContent = selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None';
}

function proceedToPayment() {
    if (selectedSeats.length === 0) {
        alert('Please select at least one seat');
        return;
    }

    bookingData.selectedSeats = [...selectedSeats];

    document.getElementById('bookingStep2').style.display = 'none';
    document.getElementById('bookingStep3').style.display = 'block';

    updatePaymentSummary();
}

function updatePaymentSummary() {
    const route = bookingData.selectedRoute;
    const baseFare = route.fare;
    const seatCount = selectedSeats.length;
    const subtotal = baseFare * seatCount;
    // Determine tax rate: prefer per-route `taxRate`, otherwise derive from route distance
    const DEFAULT_TAX = 0.05;
    const HIGH_TAX = 0.12; // apply for longer routes (example rule)
    const taxRate = (typeof route.taxRate === 'number') ? route.taxRate : ((route.distance && route.distance > 5) ? HIGH_TAX : DEFAULT_TAX);
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    document.getElementById('paymentRoute').textContent = route.name;
    document.getElementById('paymentDate').textContent = bookingData.travelDate;
    document.getElementById('paymentSeats').textContent = selectedSeats.join(', ');
    document.getElementById('baseFare').textContent = baseFare;
    document.getElementById('seatCount').textContent = seatCount;
    document.getElementById('subtotal').textContent = subtotal;
    document.getElementById('taxAmount').textContent = taxAmount.toFixed(2);
    // Update tax label to reflect route-specific percentage
    const taxLabelEl = document.getElementById('taxLabel');
    if (taxLabelEl) {
        taxLabelEl.textContent = (taxRate * 100).toFixed(0) + '%';
    }
    document.getElementById('totalAmount').textContent = totalAmount;
    
    // Store for invoice generation
    bookingData.subtotal = subtotal;
    bookingData.taxAmount = taxAmount;
    bookingData.taxRate = taxRate;
    bookingData.totalAmount = totalAmount;
}

function confirmBooking() {
    const bookingId = 'BK' + Date.now();

    // Use authentication-aware booking confirmation
    if (typeof confirmBookingWithAuth === 'function') {
        confirmBookingWithAuth();
    } else {
        alert(`Booking Confirmed!\nBooking ID: ${bookingId}\nSeats: ${selectedSeats.join(', ')}\nAmount: ₹${document.getElementById('totalAmount').textContent}`);
        resetBookingProcess();
    }
}

function resetBookingProcess() {
    selectedSeats = [];
    bookingData = {};

    document.getElementById('bookingStep1').style.display = 'block';
    document.getElementById('bookingStep2').style.display = 'none';
    document.getElementById('bookingStep3').style.display = 'none';

    document.getElementById('bookingRoute').value = '';
    document.getElementById('travelDate').value = new Date().toISOString().split('T')[0];
}

function backToRouteSelection() {
    document.getElementById('bookingStep1').style.display = 'block';
    document.getElementById('bookingStep2').style.display = 'none';
    selectedSeats = [];
    // Clear visual state of seat buttons
    document.querySelectorAll('.seat-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
    });
}

function backToSeatSelection() {
    document.getElementById('bookingStep2').style.display = 'block';
    document.getElementById('bookingStep3').style.display = 'none';
}

// Invoice Generation Function
function generateInvoice(bookingId, userEmail = 'guest') {
    const route = bookingData.selectedRoute;
    const date = bookingData.travelDate;
    const seats = selectedSeats.join(', ');
    const baseFare = route.fare;
    const subtotal = bookingData.subtotal || (baseFare * selectedSeats.length);
    // Determine tax rate for invoice: prefer stored booking taxRate, else derive from route
    const DEFAULT_TAX = 0.05;
    const HIGH_TAX = 0.12;
    const taxRate = (typeof bookingData.taxRate === 'number') ? bookingData.taxRate : ((route.distance && route.distance > 5) ? HIGH_TAX : DEFAULT_TAX);
    const taxAmount = bookingData.taxAmount || Math.round(subtotal * taxRate * 100) / 100;
    const totalAmount = bookingData.totalAmount || (subtotal + taxAmount);
    
    const invoiceContent = `
        <html>
        <head>
            <title>Ticket Invoice - ${bookingId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; border-bottom: 3px solid #0d6efd; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { color: #0d6efd; margin: 0 0 10px 0; font-size: 2em; }
                .header p { margin: 5px 0; color: #666; }
                .booking-id { background: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
                .booking-id p { margin: 5px 0; font-size: 1.1em; font-weight: bold; color: #0d6efd; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .detail-section { background: #f9f9f9; padding: 15px; border-radius: 5px; }
                .detail-section h3 { color: #0d6efd; margin-top: 0; font-size: 0.95em; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                .detail-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ddd; }
                .detail-item:last-child { border-bottom: none; }
                .detail-label { color: #666; font-weight: 500; }
                .detail-value { color: #333; font-weight: 600; }
                .payment-summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 5px; margin-bottom: 20px; }
                .fare-section { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                .fare-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 1.1em; }
                .fare-row.subtotal { border-bottom: 1px solid #ccc; padding-bottom: 15px; }
                .fare-row.tax { color: #ff9933; font-weight: 600; }
                .fare-row.total { border-top: 2px solid #0d6efd; padding-top: 15px; font-size: 1.3em; font-weight: bold; color: #0d6efd; }
                .fare-label { font-weight: 600; }
                .fare-value { font-weight: 700; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 0.9em; }
                .status-badge { background: #198754; color: white; padding: 8px 15px; border-radius: 20px; display: inline-block; font-weight: 600; }
                @media print {
                    body { background: white; }
                    .invoice-container { box-shadow: none; border: 1px solid #ddd; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <h1>🚌 Smart Campus Transit Authority</h1>
                    <p>Real-time Public Transport Tracking</p>
                    <p>Official Ticket Invoice</p>
                </div>
                
                <div class="booking-id">
                    <p>Booking ID: ${bookingId}</p>
                    <p style="font-size: 0.9em; color: #666; margin: 10px 0 0 0;">Generated on: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="details-grid">
                    <div class="detail-section">
                        <h3>Journey Details</h3>
                        <div class="detail-item">
                            <span class="detail-label">Route:</span>
                            <span class="detail-value">${route.name}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Travel Date:</span>
                            <span class="detail-value">${date}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Seats:</span>
                            <span class="detail-value">${seats}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">No. of Seats:</span>
                            <span class="detail-value">${selectedSeats.length}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Passenger Details</h3>
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${userEmail}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Booking Time:</span>
                            <span class="detail-value">${new Date().toLocaleTimeString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span style="font-weight: 600;"><span class="status-badge">CONFIRMED</span></span>
                        </div>
                    </div>
                </div>
                
                <div class="payment-summary">
                    <h3 style="margin-top: 0; text-transform: uppercase; font-size: 1.1em;">💳 Payment Summary</h3>
                    <p style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 5px; text-align: center; font-size: 1.1em;">
                        Amount to be paid: <strong>₹${totalAmount.toFixed(2)}</strong>
                    </p>
                </div>
                
                <div class="fare-section">
                    <div class="fare-row subtotal">
                        <span class="fare-label">Base Fare (₹${baseFare} × ${selectedSeats.length} seats)</span>
                        <span class="fare-value">₹${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="fare-row tax">
                        <span class="fare-label">Tax (${(taxRate * 100).toFixed(0)}% GST)</span>
                        <span class="fare-value">₹${taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="fare-row total">
                        <span class="fare-label">TOTAL AMOUNT</span>
                        <span class="fare-value">₹${totalAmount.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Thank you for booking with Smart Campus Transit Authority!</p>
                    <p>Please keep this invoice for your records.</p>
                    <p>For support: support@smartcampustransit.com</p>
                    <p style="margin-top: 20px; color: #ccc;">This is a computer-generated invoice. No signature required.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return invoiceContent;
}

function downloadInvoice(bookingId, userEmail = 'guest') {
    const invoiceHTML = generateInvoice(bookingId, userEmail);
    const newWindow = window.open('', '', 'width=900,height=1000');
    newWindow.document.write(invoiceHTML);
    newWindow.document.close();
    
    // Auto-print dialog
    setTimeout(() => {
        newWindow.print();
    }, 250);
}

// Cost Calculator
function calculateCost() {
    const routeSelect = document.getElementById('calcRoute');
    const passengerCount = parseInt(document.getElementById('passengerCount').value) || 0;
    const selectedRouteId = routeSelect.value;
    
    let baseFare = 0;
    if (selectedRouteId) {
        const route = appData.routes.find(r => r.id === selectedRouteId);
        baseFare = route ? route.fare : 0;
    }
    
    const total = baseFare * passengerCount;

    document.getElementById('calcBaseFare').textContent = `₹${baseFare}`;
    document.getElementById('calcPassengers').textContent = passengerCount;
    document.getElementById('calcTotal').textContent = `₹${total}`;
}

// Dashboard Management
function initializeDashboard() {
    populateFleetTable();
    createCharts();
}

function populateFleetTable() {
    const tableBody = document.getElementById('fleetStatusTable');

    const fleetHtml = appData.buses.map(bus => {
        const route = appData.routes.find(r => r.id === bus.route);
        return `
            <tr>
                <td>${bus.id}</td>
                <td>${route ? route.name : 'Unknown'}</td>
                <td>${bus.driver}</td>
                <td><span class="badge bg-${bus.status.includes('Delayed') ? 'warning' : 'success'}">${bus.status}</span></td>
                <td>${bus.occupancy}/${bus.capacity}</td>
                <td>${bus.nextStop}</td>
                <td>${bus.eta} min</td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = fleetHtml;
}

function createCharts() {
    // Ridership Chart
    const ridershipCtx = document.getElementById('ridershipChart');
    if (ridershipCtx) {
        if (ridershipChart) {
            ridershipChart.destroy();
        }

        ridershipChart = new Chart(ridershipCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Daily Ridership',
                    data: appData.analytics.dailyTrend,
                    borderColor: 'rgb(13, 110, 253)',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Ridership Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        if (revenueChart) {
            revenueChart.destroy();
        }

        const routes = Object.keys(appData.analytics.revenueByRoute);
        const revenues = Object.values(appData.analytics.revenueByRoute);

        revenueChart = new Chart(revenueCtx, {
            type: 'doughnut',
            data: {
                labels: routes.map(routeId => {
                    const route = appData.routes.find(r => r.id === routeId);
                    return route ? route.name.split(' - ')[0] : routeId;
                }),
                datasets: [{
                    data: revenues,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Revenue Distribution by Route'
                    }
                }
            }
        });
    }
}

// Profile Management Functions (authentication integration)
function showUserBookings() {
    if (window.authSystem && window.authSystem.isAuthenticated) {
        showSection('profile');
        showProfileTab('bookings');
    } else {
        alert('Please login to view your bookings');
        if (window.authSystem && window.authSystem.showLogin) {
            window.authSystem.showLogin();
        }
    }
}

function showUserSettings() {
    if (window.authSystem && window.authSystem.isAuthenticated) {
        showSection('profile');
        showProfileTab('preferences');
    } else {
        alert('Please login to access settings');
        if (window.authSystem && window.authSystem.showLogin) {
            window.authSystem.showLogin();
        }
    }
}

function showProfileTab(tabName) {
    const contentMap = {
        bookings: document.getElementById('bookingsContentTab') || document.getElementById('bookingHistoryTab'),
        preferences: document.getElementById('preferencesContentTab'),
        activity: document.getElementById('activityContentTab')
    };

    Object.values(contentMap).forEach(tab => {
        if (tab) tab.style.display = 'none';
    });

    ['bookingsTab', 'preferencesTab', 'activityTab'].forEach(id => {
        const link = document.getElementById(id);
        if (link) link.classList.remove('active');
    });

    const targetTab = contentMap[tabName];
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    const activeLinkId = tabName === 'bookings' ? 'bookingsTab' : `${tabName}Tab`;
    const activeLink = document.getElementById(activeLinkId);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// Error Handling
window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
});

// PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    });
}

function updateRouteOptionTexts() {
  const map = [
    { id: 'routeSelect', mode: 'route' },
    { id: 'bookingRoute', mode: 'route' },
    { id: 'calcRoute', mode: 'route' }
  ];
  map.forEach(({id, mode}) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    for (let i = 0; i < sel.options.length; i++) {
      const opt = sel.options[i];
      if (!opt.value) continue;
      let route = null;
      if (mode === 'route' && /^R\d{3}$/.test(opt.value)) {
        route = (window.appData.routes || []).find(r => r.id === opt.value);
      }
      if (route) {
        const name = getLocalizedRouteName(route.id);
        opt.text = `🚌 ${name}`;
      }
    }
  });
}


function __t(key){
  const trc = (window.appData && window.appData.translations && window.appData.translations[currentLanguage]) || {};
  const enc = (window.appData && window.appData.translations && window.appData.translations['english']) || {};
  return (trc && trc[key]) || (enc && enc[key]) || key;
}
function refreshStaticLabels(){
  const map = [
    ['startTrackingBtn','startTrackingBtn'],
    ['stopTrackingBtn','stopTrackingBtn'],
    ['exportDataBtn','exportDataBtn'],
    ['myLocationBtn','myLocationBtn'],
    ['followBusBtn','followBusBtn'],
    ['trackingControlsTitle','trackingControlsTitle'],
    ['liveTrackingStatusTitle','liveTrackingStatusTitle'],
    ['routeSelectionTitle','routeSelectionTitle'],
    ['liveBusMapTitle','liveBusMapTitle'],
    ['updateFrequencyLabel','updateFrequencyLabel'],
    ['trackingOptionsLabel','trackingOptionsLabel'],
    ['proximityAlertsLabel','proximityAlertsLabel'],
    ['trafficSimulationLabel','trafficSimulationLabel'],
    ['avgSpeedLabel','avgSpeedLabel'],
    ['accuracyLabel','accuracyLabel'],
    ['activeBusesLabel','activeBusesLabel'],
    ['delayedLabel','delayedLabel'],
    ['onTimeBadge','onTimeBadge'],
    ['driverLabel','driverLabel'],
    ['capacityLabel','capacityLabel'],
    ['nextStopLabel','nextStopLabel'],
    ['minEtaLabel','minEtaLabel'],
    ['occupiedLabel','occupiedLabel']
  ];
  map.forEach(([id,key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = __t(key);
  });
}
(function(){
  const _prev = updateLanguageContent;
  window.updateLanguageContent = function(){
    try { if (typeof _prev === 'function') _prev(); } catch(e){}
    refreshStaticLabels();
  };
  document.addEventListener('DOMContentLoaded', refreshStaticLabels);
})();

// Feature Modal Functions
function showFeatureModal(featureType) {
  const featureData = {
    realtime: {
      title: 'Real-time Bus Tracking',
      icon: '<i class="fas fa-map-marked-alt fa-4x text-primary mb-3"></i>',
      description: '',
      features: [
        '<i class="fas fa-check-circle text-success me-2"></i>Live GPS tracking of buses with 50-meter accuracy',
        '<i class="fas fa-clock text-info me-2"></i>Real-time Estimated Time of Arrival (ETA) to stops',
        '<i class="fas fa-route text-warning me-2"></i>Complete route map visualization with bus locations',
        '<i class="fas fa-bell text-danger me-2"></i>Proximity alerts when buses approach your stop',
        '<i class="fas fa-tachometer-alt text-success me-2"></i>Live speed and traffic condition monitoring',
        '<i class="fas fa-history text-primary me-2"></i>Historical tracking data and analytics'
      ],
      benefits: [
        'Never miss your bus again with accurate arrival times',
        'Plan your journey with confidence',
        'Reduce wait times at bus stops',
        'Track your bus from anywhere using the app',
        'Get notified when your bus is nearby'
      ]
    },
    demand: {
      title: 'Demand Insights & Analytics',
      icon: '<i class="fas fa-chart-area fa-4x text-success mb-3"></i>',
      description: '',
      features: [
        '<i class="fas fa-qrcode text-success me-2"></i>QR Code-based Rider Intent Collection',
        '<i class="fas fa-fire text-danger me-2"></i>Real-time Demand Heatmaps for popular routes',
        '<i class="fas fa-object-group text-info me-2"></i>Intelligent Trip Clustering and Pattern Analysis',
        '<i class="fas fa-lightbulb text-warning me-2"></i>AI-powered Route Optimization Suggestions',
        '<i class="fas fa-mobile-alt text-primary me-2"></i>Driver Alerts via WhatsApp Integration',
        '<i class="fas fa-chart-bar text-secondary me-2"></i>Comprehensive Government Analytics Dashboard'
      ],
      benefits: [
        'Help transit authority understand rider preferences',
        'Identify high-demand routes and peak timings',
        'Enable data-driven route optimization',
        'Improve overall transit service quality',
        'Contribute to smart city development',
        'Receive personalized insights based on demand patterns'
      ]
    },
    multilang: {
      title: 'Multi-Language Support',
      icon: '<i class="fas fa-language fa-4x text-info mb-3"></i>',
      description: '',
      features: [
        '<i class="fas fa-globe text-info me-2"></i>Complete interface in English',
        '<i class="fas fa-globe text-danger me-2"></i>Full support for Hindi (हिंदी)',
        '<i class="fas fa-globe text-success me-2"></i>Campus-specific Campusian language',
        '<i class="fas fa-comments text-primary me-2"></i>Real-time language switching',
        '<i class="fas fa-map text-warning me-2"></i>Route names and descriptions in multiple languages',
        '<i class="fas fa-headset text-secondary me-2"></i>Accessible interface for all users'
      ],
      benefits: [
        'Access the platform in your preferred language',
        'Better understanding of routes and services',
        'Inclusive design for diverse user communities',
        'Seamless experience regardless of language preference',
        'Support for local and campus-specific language needs',
        'Easy switching between languages on the fly'
      ]
    }
  };

  const feature = featureData[featureType];
  if (!feature) return;

  const modalTitle = document.getElementById('featureModalTitle');
  const modalBody = document.getElementById('featureModalBody');
  const modalHeader = document.getElementById('featureModalHeader');

  modalTitle.textContent = feature.title;
  
  let html = `
    <div class="text-center mb-4">
      ${feature.icon}
      <h4 class="text-primary">${feature.title}</h4>
    </div>

    <div class="row">
      <div class="col-md-6">
        <h6 class="text-primary mb-3"><i class="fas fa-star me-2"></i>Key Features</h6>
        <ul class="list-unstyled">
  `;

  feature.features.forEach(f => {
    html += `<li class="mb-3">${f}</li>`;
  });

  html += `
        </ul>
      </div>
      <div class="col-md-6">
        <h6 class="text-success mb-3"><i class="fas fa-heart me-2"></i>Benefits</h6>
        <ul class="list-unstyled">
  `;

  feature.benefits.forEach(b => {
    html += `<li class="mb-3"><i class="fas fa-check-circle text-success me-2"></i>${b}</li>`;
  });

  html += `
        </ul>
      </div>
    </div>

    <div class="alert alert-light border border-primary mt-4">
      <h6 class="text-primary mb-2"><i class="fas fa-info-circle me-2"></i>Learn More</h6>
      <p class="mb-0">Explore this feature by navigating to the relevant section in the application to see it in action.</p>
    </div>
  `;

  modalBody.innerHTML = html;

  // Apply gradient to modal header based on feature type
  const colors = {
    realtime: 'linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%)',
    demand: 'linear-gradient(135deg, #198754 0%, #ffc107 100%)',
    multilang: 'linear-gradient(135deg, #0dcaf0 0%, #6f42c1 100%)'
  };

  modalHeader.style.background = colors[featureType] || 'linear-gradient(135deg, #0d6efd 0%, #ff9933 100%)';
  modalHeader.style.color = 'white';

  const modal = new bootstrap.Modal(document.getElementById('featureModal'));
  modal.show();
}

// ==================== SOS EMERGENCY SERVICES ====================

let lastKnownEmergencyLocation = null;

const DEFAULT_CAMPUS_SECURITY_CONTACT = Object.freeze({
    name: 'Campus Security',
    number: '1800-121-4242'
});

window.DEFAULT_CAMPUS_SECURITY_NUMBER = DEFAULT_CAMPUS_SECURITY_CONTACT.number;

function getCampusSecurityContact() {
    try {
        const savedNumber = localStorage.getItem('campusSecurityNumber') || '';
        const safeNumber = /^[+\d\s()-]{7,20}$/.test(savedNumber)
            ? savedNumber
            : DEFAULT_CAMPUS_SECURITY_CONTACT.number;

        return {
            name: DEFAULT_CAMPUS_SECURITY_CONTACT.name,
            number: safeNumber,
            smsNumber: safeNumber.replace(/[^\d+]/g, '') || DEFAULT_CAMPUS_SECURITY_CONTACT.number.replace(/[^\d+]/g, '')
        };
    } catch (e) {
        return {
            name: DEFAULT_CAMPUS_SECURITY_CONTACT.name,
            number: DEFAULT_CAMPUS_SECURITY_CONTACT.number,
            smsNumber: DEFAULT_CAMPUS_SECURITY_CONTACT.number.replace(/[^\d+]/g, '')
        };
    }
}

function syncSOSContactLabels() {
    const contact = getCampusSecurityContact();

    ['campusSecurityNumberLabel', 'campusSecurityInlineNumber'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = contact.number;
        }
    });

    const callBtn = document.getElementById('callCampusSecurityBtn');
    if (callBtn) {
        callBtn.innerHTML = `<i class="fas fa-building me-1"></i>Call Security (${contact.number})`;
    }
}

// Show SOS Modal
function showSOSModal() {
    const modalElement = document.getElementById('sosModal');
    if (!modalElement || typeof bootstrap === 'undefined') return;

    syncSOSContactLabels();
    updateSOSStatus('Emergency services are ready. Tap any option below to call or auto-send an SMS.', 'danger');
    renderEmergencyHistory();

    const sosModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    sosModal.show();

    // Refresh location silently so it is ready if the rider needs help.
    shareSOSLocation(false);
}

function updateSOSStatus(message, tone = 'info') {
    const statusText = document.getElementById('sosStatusText');
    if (!statusText) return;

    const toneClassMap = {
        danger: 'text-danger',
        warning: 'text-warning',
        success: 'text-success',
        info: 'text-muted'
    };

    statusText.textContent = message;
    statusText.className = `small ${toneClassMap[tone] || 'text-muted'}`;
}

function requestEmergencyLocation(showToast = true) {
    const preview = document.getElementById('sosLocationPreview');
    const shareBtn = document.getElementById('shareLocationBtn');

    return new Promise(function(resolve, reject) {
        if (!navigator.geolocation) {
            if (preview) preview.textContent = 'Location sharing is not supported on this device.';
            updateSOSStatus('Location sharing is not supported on this device.', 'warning');
            if (showToast) showNotification('Location sharing is not supported on this device.', 'warning');
            reject(new Error('Geolocation not supported'));
            return;
        }

        if (shareBtn) {
            shareBtn.disabled = true;
            shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Getting Location';
        }

        if (preview) {
            preview.innerHTML = '<i class="fas fa-location-dot me-1 text-danger"></i>Fetching your current location...';
        }
        updateSOSStatus('Fetching your live location for faster assistance...', 'warning');

        navigator.geolocation.getCurrentPosition(
            function(position) {
                const latitude = Number(position.coords.latitude.toFixed(6));
                const longitude = Number(position.coords.longitude.toFixed(6));
                const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

                lastKnownEmergencyLocation = {
                    latitude,
                    longitude,
                    mapsUrl,
                    capturedAt: new Date().toLocaleString(),
                    capturedAtMs: Date.now()
                };

                if (preview) {
                    preview.innerHTML = `
                        <i class="fas fa-circle-check text-success me-1"></i>
                        Live location ready: <a href="${mapsUrl}" target="_blank" rel="noopener">Open in Google Maps</a>
                        <div class="text-muted mt-1">Lat: ${latitude}, Lng: ${longitude} • ${lastKnownEmergencyLocation.capturedAt}</div>
                    `;
                }

                updateSOSStatus('Location is ready to share with emergency responders.', 'success');
                if (showToast) showNotification('📍 Live location captured for SOS support.', 'success');

                if (shareBtn) {
                    shareBtn.disabled = false;
                    shareBtn.innerHTML = '<i class="fas fa-location-crosshairs me-1"></i>Refresh Location';
                }

                resolve(lastKnownEmergencyLocation);
            },
            function(error) {
                const errorMessage = error && error.code === 1
                    ? 'Location permission denied. You can still place the call or send SMS normally.'
                    : 'Could not fetch your location right now. You can still contact emergency services.';

                if (preview) preview.textContent = errorMessage;
                updateSOSStatus(errorMessage, 'warning');
                if (showToast) showNotification(errorMessage, 'warning');

                if (shareBtn) {
                    shareBtn.disabled = false;
                    shareBtn.innerHTML = '<i class="fas fa-location-crosshairs me-1"></i>Try Again';
                }

                reject(error || new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

function shareSOSLocation(showToast = true) {
    requestEmergencyLocation(showToast).catch(function() {
        return null;
    });
}

function callCampusSecurity() {
    const contact = getCampusSecurityContact();
    callEmergency(contact.number, contact.name);
}

function buildEmergencySMSMessage(serviceName, locationDetails = lastKnownEmergencyLocation) {
    const riderName = (window.currentUser && (window.currentUser.fullName || window.currentUser.name)) || 'A transit rider';
    const requestedService = serviceName || 'Campus Security';
    const messageParts = [
        'SOS ALERT',
        `${riderName} needs immediate help.`,
        `Requested support: ${requestedService}.`,
        `Time: ${new Date().toLocaleString()}.`
    ];

    if (locationDetails && locationDetails.mapsUrl) {
        messageParts.push(`Live location: ${locationDetails.mapsUrl}`);
    } else {
        messageParts.push('Live location was unavailable. Please call back urgently.');
    }

    return messageParts.join(' ');
}

async function sendEmergencySMS(number, serviceName = 'Campus Security') {
    const contact = getCampusSecurityContact();
    const label = serviceName || contact.name;
    const smsNumber = String(number || contact.smsNumber || contact.number).trim();

    if (!smsNumber) {
        showNotification('Campus security SMS number is not available right now.', 'warning');
        return;
    }

    updateSOSStatus(`Preparing emergency SMS for ${label}...`, 'warning');

    let locationDetails = lastKnownEmergencyLocation;
    const isFreshLocation = Boolean(locationDetails && locationDetails.capturedAtMs && (Date.now() - locationDetails.capturedAtMs < 5 * 60 * 1000));

    if (!isFreshLocation) {
        try {
            locationDetails = await requestEmergencyLocation(false);
        } catch (e) {
            console.warn('sendEmergencySMS location fallback:', e);
        }
    }

    const message = buildEmergencySMSMessage(label, locationDetails);
    const cleanSmsNumber = smsNumber.replace(/[^\d+]/g, '');
    const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent || '') ? '&' : '?';
    const smsUrl = `sms:${cleanSmsNumber}${separator}body=${encodeURIComponent(message)}`;
    const isMobileLikeDevice = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || '');

    logEmergencyCall(smsNumber, `${label} SMS`, locationDetails ? 'sms-with-location' : 'sms-ready');
    renderEmergencyHistory();

    try {
        const smsLink = document.createElement('a');
        smsLink.href = smsUrl;
        smsLink.style.display = 'none';
        document.body.appendChild(smsLink);
        smsLink.click();
        smsLink.remove();
    } catch (e) {
        console.error('Unable to open SMS app automatically:', e);
    }

    if (!isMobileLikeDevice) {
        try {
            const fallbackText = `${label} (${smsNumber})\n${message}`;
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(fallbackText);
            }
        } catch (e) {
            console.error('sendEmergencySMS copy fallback failed:', e);
        }
    }

    updateSOSStatus(`Emergency SMS prepared for ${label}.`, 'success');
    showNotification(
        `✉️ ${label}: ${isMobileLikeDevice ? 'SMS app opening with your location.' : 'SMS text and number copied for quick sending.'}`,
        'warning'
    );
}

// Call Emergency Service
function callEmergency(number, serviceName) {
    const cleanNumber = String(number || '').trim();
    if (!cleanNumber) {
        showNotification('Emergency number is not available right now.', 'warning');
        return;
    }

    console.log(`Emergency service: ${serviceName} (${cleanNumber})`);

    updateSOSStatus(`Opening dialer for ${serviceName} (${cleanNumber})...`, 'danger');
    logEmergencyCall(cleanNumber, serviceName, 'initiated');
    renderEmergencyHistory();

    const telUrl = `tel:${cleanNumber.replace(/[^\d+]/g, '')}`;
    const isMobileLikeDevice = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || '');

    try {
        const telLink = document.createElement('a');
        telLink.href = telUrl;
        telLink.style.display = 'none';
        document.body.appendChild(telLink);
        telLink.click();
        telLink.remove();

        setTimeout(() => {
            window.location.href = telUrl;
        }, 60);
    } catch (e) {
        console.error('Unable to open dialer automatically:', e);
    }

    if (!isMobileLikeDevice) {
        copyEmergencyNumber(cleanNumber, false);
    }

    showNotification(
        `📞 ${serviceName}: ${cleanNumber}. ${isMobileLikeDevice ? 'Dialer opening now.' : 'If your desktop dialer does not open, the number has been copied.'}`,
        'danger'
    );

    const sosModal = bootstrap.Modal.getInstance(document.getElementById('sosModal'));
    if (sosModal) {
        setTimeout(() => sosModal.hide(), 400);
    }
}

async function copyEmergencyNumber(number = '112', showToast = true) {
    const cleanNumber = String(number || '112').trim();

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(cleanNumber);
        } else {
            const tempInput = document.createElement('input');
            tempInput.value = cleanNumber;
            document.body.appendChild(tempInput);
            tempInput.focus();
            tempInput.select();
            document.execCommand('copy');
            tempInput.remove();
        }

        if (showToast) {
            showNotification(`Emergency number ${cleanNumber} copied.`, 'info');
        }
    } catch (e) {
        console.error('copyEmergencyNumber', e);
        if (showToast) {
            showNotification(`Dial this number manually: ${cleanNumber}`, 'warning');
        }
    }
}

function renderEmergencyHistory() {
    const historyEl = document.getElementById('emergencyHistoryList');
    if (!historyEl) return;

    try {
        const emergencyLog = JSON.parse(localStorage.getItem('emergencyLog') || '[]');
        const records = Array.isArray(emergencyLog) ? emergencyLog : [];

        if (records.length === 0) {
            historyEl.innerHTML = '<div class="text-muted">No recent emergency activity yet.</div>';
            return;
        }

        historyEl.innerHTML = records.slice(-5).reverse().map(record => `
            <div class="history-entry">
                <div class="d-flex justify-content-between align-items-start gap-2">
                    <div>
                        <strong>${escapeHtml(record.service || 'Emergency')}</strong> • ${escapeHtml(record.number || '')}
                        <div class="text-muted">${escapeHtml(record.timestamp || '')}</div>
                    </div>
                    <span class="badge bg-light text-dark text-uppercase">${escapeHtml(record.status || 'initiated')}</span>
                </div>
                ${record.locationUrl ? `<div class="mt-1"><a href="${record.locationUrl}" target="_blank" rel="noopener">View shared location</a></div>` : '<div class="mt-1 text-muted">Location not shared</div>'}
            </div>
        `).join('');
    } catch (e) {
        console.error('renderEmergencyHistory', e);
        historyEl.innerHTML = '<div class="text-danger">Unable to load SOS history.</div>';
    }
}

function clearEmergencyHistory() {
    try {
        localStorage.removeItem('emergencyLog');
        renderEmergencyHistory();
        showNotification('SOS history cleared.', 'info');
    } catch (e) {
        console.error('clearEmergencyHistory', e);
    }
}

// Log Emergency Call
function logEmergencyCall(number, serviceName, status = 'initiated') {
    try {
        const emergencyLog = JSON.parse(localStorage.getItem('emergencyLog') || '[]');
        const records = Array.isArray(emergencyLog) ? emergencyLog : [];

        records.push({
            timestamp: new Date().toLocaleString(),
            service: serviceName,
            number: number,
            status,
            locationUrl: lastKnownEmergencyLocation ? lastKnownEmergencyLocation.mapsUrl : '',
            coordinates: lastKnownEmergencyLocation ? `${lastKnownEmergencyLocation.latitude}, ${lastKnownEmergencyLocation.longitude}` : ''
        });

        if (records.length > 50) {
            records.shift();
        }

        localStorage.setItem('emergencyLog', JSON.stringify(records));
    } catch (e) {
        console.log('Logging error: ' + e.message);
    }
}

// Show specific emergency service details
function showEmergencyDetails(serviceType) {
    const details = {
        police: {
            title: 'Police Emergency (100)',
            services: [
                'Crime reporting',
                'Personal safety',
                'Traffic incidents',
                'General emergencies'
            ],
            available: '24/7',
            helpText: 'Call if you need police assistance for any crime or emergency situation.'
        },
        ambulance: {
            title: 'Medical Emergency (102)',
            services: [
                'Ambulance service',
                'Medical assistance',
                'First aid',
                'Hospital referral'
            ],
            available: '24/7',
            helpText: 'Call for any medical emergency or if you need an ambulance urgently.'
        },
        women: {
            title: 'Women Helpline (181)',
            services: [
                'Women safety support',
                'Harassment complaints',
                'Counseling services',
                'Emergency assistance'
            ],
            available: '24/7',
            helpText: 'Call for any situation where you need immediate support or assistance.'
        }
    };
    
    const service = details[serviceType];
    if (service) {
        let detailsHtml = `
            <h5 class="text-primary mb-3">${service.title}</h5>
            <p class="mb-3"><strong>Available:</strong> ${service.available}</p>
            <h6 class="mb-2">Services Provided:</h6>
            <ul class="mb-3">
                ${service.services.map(s => `<li class="mb-2"><i class="fas fa-check-circle text-success me-2"></i>${s}</li>`).join('')}
            </ul>
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                <strong>Note:</strong> ${service.helpText}
            </div>
        `;
        
        // You could display this in a modal or notification
        console.log(detailsHtml);
    }
}


