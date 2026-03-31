// QR-based rider intent collection (client-side)
const QRIntent = (function(){
  const intentsKey = 'scta_intents';
  let pendingIntent = null;

  function notifyDriverOfDemand(intent){
    // Find the bus/driver for this demand's route
    const buses = (window.appData && window.appData.buses) || [];
    const route = intent.route || intent.origin && intent.dest ? `${intent.origin} → ${intent.dest}` : null;
    const bus = buses.find(b => b.route === route || (intent.origin && intent.dest && b.route === `${intent.origin} → ${intent.dest}`));
    
    if(!bus || !bus.driverPhone){
      console.log('Driver not found or no WhatsApp number available for route:', route);
      return;
    }

    // Format demand details for WhatsApp message
    const seats = intent.seats || 1;
    const name = intent.name || 'Anonymous Rider';
    const origin = intent.origin || 'Unknown';
    const dest = intent.dest || 'Unknown';
    const specialNeeds = intent.specialNeeds || 'None';
    
    const timestamp = new Date(intent.ts).toLocaleTimeString();
    
    const message = `🚌 *New Demand Alert*
    
Rider: ${name}
Route: ${origin} → ${dest}
Seats: ${seats}
Special Needs: ${specialNeeds}
Time: ${timestamp}

*Action:* Check demand dashboard & adjust route if needed.`;

    // Open WhatsApp with pre-filled message
    try{
      const driver = bus.driver || 'Driver';
      const phone = bus.driverPhone; // Format: 919876543210
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      // Don't auto-open (too intrusive), just log it
      console.log(`📱 WhatsApp notification ready for ${driver}:`, waUrl);
      // Optional: You can uncomment to auto-open
      // window.open(waUrl, '_blank');
    }catch(e){
      console.error('Error preparing WhatsApp notification:', e);
    }
  }

  function saveIntent(intent){
    const arr = JSON.parse(localStorage.getItem(intentsKey) || '[]');
    const fullIntent = Object.assign({ts: Date.now()}, intent);
    arr.push(fullIntent);
    localStorage.setItem(intentsKey, JSON.stringify(arr));
    renderIntentList();
    // notify driver via WhatsApp with demand details
    notifyDriverOfDemand(fullIntent);
    // trigger demand insights refreshes if available
    try{
      // trigger clustering and route suggestions (by simulating clicks)
      const runClusteringBtn = document.getElementById('runClusteringBtn');
      const suggestRoutesBtn = document.getElementById('suggestRoutesBtn');
      if(runClusteringBtn) runClusteringBtn.click();
      if(suggestRoutesBtn) suggestRoutesBtn.click();
      // refresh heatmap if present
      if(window.HeatmapModule && window.map) { try{ window.HeatmapModule.refresh(window.map); }catch(e){} }
      if(window.showNotification) window.showNotification('Intent saved & driver notified', 'success');
      // refresh demand dashboard if available
      try{
        const dashboardContainer = document.getElementById('demandDashboard');
        if(window.DemandDashboard && typeof DemandDashboard.renderDashboard === 'function' && dashboardContainer){
          DemandDashboard.renderDashboard(dashboardContainer);
        }
      }catch(e){ /* non-fatal */ }
    }catch(e){ console.warn('Post-save hooks failed', e); }
    return arr;
  }

  function listIntents(){
    return JSON.parse(localStorage.getItem(intentsKey) || '[]');
  }

  function generateQrForIntent(intent){
    const payload = encodeURIComponent(JSON.stringify(intent));
    const url = `${location.origin}${location.pathname}#intent:${payload}`;
    const qr = document.createElement('img');
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=200x200`;
    qr.alt = 'Rider Intent QR';
    return qr;
  }

  function showAdditionalFieldsForm(scannedIntent){
    pendingIntent = scannedIntent;
    const modal = document.getElementById('qrIntentModal');
    if(!modal) {
      console.error('Modal not found');
      return;
    }
    
    try {
      // Pre-fill from scanned intent if available
      const pickupEl = document.getElementById('pickupLocation');
      const timeEl = document.getElementById('timeSlot');
      const seatsEl = document.getElementById('seats');
      const dateEl = document.getElementById('intentDate');
      
      if(pickupEl) pickupEl.value = scannedIntent.origin || '';
      if(timeEl) timeEl.value = scannedIntent.timeSlot || '09:00';
      if(seatsEl) seatsEl.value = scannedIntent.seats || 1;
      if(dateEl) dateEl.value = scannedIntent.date || new Date().toISOString().split('T')[0];
      
      // Show the modal with proper display
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('show');
      
    } catch(e) {
      console.error('Error showing form:', e);
      saveIntent(scannedIntent);
    }
  }

  function submitAdditionalFields(){
    if(!pendingIntent) return;
    
    try {
      const pickupEl = document.getElementById('pickupLocation');
      const timeEl = document.getElementById('timeSlot');
      const seatsEl = document.getElementById('seats');
      const dateEl = document.getElementById('intentDate');
      
      pendingIntent.pickupLocation = pickupEl ? pickupEl.value : '';
      pendingIntent.timeSlot = timeEl ? timeEl.value : '09:00';
      pendingIntent.seats = seatsEl ? parseInt(seatsEl.value) || 1 : 1;
      pendingIntent.date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
      
      saveIntent(pendingIntent);
      if(window.showNotification) window.showNotification('Intent saved with details', 'success');
      
      closeAdditionalFieldsForm();
    } catch(e) {
      console.error('Error submitting:', e);
      saveIntent(pendingIntent);
      closeAdditionalFieldsForm();
    }
  }

  function closeAdditionalFieldsForm(){
    const modal = document.getElementById('qrIntentModal');
    if(modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('show');
    }
    pendingIntent = null;
  }

  function refreshAdditionalFieldsForm(){
    if(!pendingIntent) return;
    
    // Reload form with scanned intent data
    const pickupEl = document.getElementById('pickupLocation');
    const timeEl = document.getElementById('timeSlot');
    const seatsEl = document.getElementById('seats');
    const dateEl = document.getElementById('intentDate');
    
    if(pickupEl) pickupEl.value = pendingIntent.origin || '';
    if(timeEl) timeEl.value = pendingIntent.timeSlot || '09:00';
    if(seatsEl) seatsEl.value = pendingIntent.seats || 1;
    if(dateEl) dateEl.value = pendingIntent.date || new Date().toISOString().split('T')[0];
    
    // Visual feedback
    showRefreshFeedback();
  }

  function showRefreshFeedback(){
    const btn = document.getElementById('refreshIntentFieldsBtn');
    if(!btn) return;
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check me-1"></i>Refreshed';
    btn.classList.add('btn-success');
    btn.classList.remove('btn-outline-secondary');
    
    setTimeout(()=>{
      btn.innerHTML = originalHTML;
      btn.classList.remove('btn-success');
      btn.classList.add('btn-outline-secondary');
    }, 2000);
  }

  function renderIntentList(){
    const intents = listIntents();
    const container = document.getElementById('intentList');
    if(!container) return;
    if(!intents || intents.length===0){
      container.textContent = 'No intents yet';
      return;
    }

    container.innerHTML = '';
    // show most recent first
    intents.slice().reverse().forEach((it, idx)=>{
      const el = document.createElement('div');
      el.className = 'intent-item mb-3 p-2 border rounded';
      const ts = it.ts ? new Date(it.ts).toLocaleString() : '';
      
      let detailsHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div><strong>${it.origin||'Origin'}</strong> → <strong>${it.dest||'Destination'}</strong></div>
            <div class="small text-muted mt-1">
              📍 Pickup: ${it.pickupLocation || 'Not specified'} | 
              🕒 Time: ${it.timeSlot || 'Not specified'} | 
              👥 Seats: ${it.seats || 1}
            </div>
            <div class="small text-muted">
              📅 Date: ${it.date || 'Not specified'} | ${ts}
            </div>
          </div>
        </div>
      `;
      
      el.innerHTML = detailsHTML;
      el.style.cursor = 'pointer';
      el.addEventListener('click', ()=>{
        if(window.map && it.lat && it.lng){
          window.map.setView([it.lat, it.lng], 16);
          if(window.L){
            const m = L.marker([it.lat, it.lng]).addTo(window.map);
            setTimeout(()=>{ try{ window.map.removeLayer(m); }catch(e){} }, 8000);
          }
        }
      });
      container.appendChild(el);
    });
  }

    function resetToSampleData(){
      try{
        // remove stored intents
        localStorage.removeItem(intentsKey);
        // reinitialize sample data (uses QRIntent.saveIntent)
        if(window.initializeSampleDemandData) {
          window.initializeSampleDemandData();
        } else {
          // fallback: add a few sample intents
          const sampleIntents = [
            {origin: 'Boys Hostel 1', dest: 'Galgotias University', pickupLocation: 'Main Gate', timeSlot: '09:00', seats: 2, date: new Date().toISOString().split('T')[0], lat: 30.33, lng: 76.385},
            {origin: 'PG Block', dest: 'Girls Hostel 1', pickupLocation: 'Block A', timeSlot: '10:00', seats: 2, date: new Date().toISOString().split('T')[0], lat: 30.3285, lng: 76.384}
          ];
          sampleIntents.forEach(intent => saveIntent(intent));
        }

        // refresh UI components
        renderIntentList();
        if(window.HeatmapModule && window.map){
          try{ window.HeatmapModule.refresh(window.map); }catch(e){}
        }
        const suggestionsEl = document.getElementById('suggestions');
        if(suggestionsEl) suggestionsEl.innerHTML = '<div class="small text-muted">Data reset to sample intents</div>';

        // navigate to home
        if(typeof showSection === 'function') showSection('home');
        if(window.showNotification) window.showNotification('Stored intents reset to sample data','info');
      }catch(e){ console.error('Reset error', e); }
    }

  function initUI(){
    const genBtn = document.getElementById('showGenerateQrBtn');
    const scanBtn = document.getElementById('showScanQrBtn');
    const qrContainer = document.getElementById('qrContainer');
    const readerEl = document.getElementById('html5qr-reader');
    const submitBtn = document.getElementById('submitIntentFieldsBtn');
    const refreshBtn = document.getElementById('refreshIntentFieldsBtn');
    const cancelBtns = document.querySelectorAll('.cancelIntentFields');

    if(submitBtn) {
      submitBtn.addEventListener('click', submitAdditionalFields);
    }
    
    if(refreshBtn) {
      refreshBtn.addEventListener('click', refreshAdditionalFieldsForm);
    }
    const resetBtn = document.getElementById('resetDataBtn');
    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        if(!confirm('Reset stored intents to sample data? This will overwrite existing stored intents.')) return;
        resetToSampleData();
      });
    }
    
    cancelBtns.forEach(btn => {
      btn.addEventListener('click', closeAdditionalFieldsForm);
    });

    genBtn && genBtn.addEventListener('click', ()=>{
      if(!qrContainer) return;
      qrContainer.innerHTML = '';
      const sample = {origin: 'Nearby Stop', lat: 0, lng:0, dest: 'Unknown', time: new Date().toISOString(), pickupLocation: '', timeSlot: '09:00', seats: 1, date: new Date().toISOString().split('T')[0]};
      const qr = generateQrForIntent(sample);
      // ensure QR is visible and centered
      qr.style.maxWidth = '240px';
      qr.style.display = 'block';
      qr.style.margin = '0 auto';
      qrContainer.appendChild(qr);
      // navigate to Demand Insights so user sees the generated QR
      if(typeof showSection === 'function') showSection('demand');
    });

    scanBtn && scanBtn.addEventListener('click', ()=>{
      if (!window.Html5Qrcode) {
          if(window.showNotification) window.showNotification('QR scanner library not loaded', 'warning');
        return;
      }
      if(!readerEl) return;
      readerEl.style.display='block';
      const html5QrCode = new Html5Qrcode("html5qr-reader");
      Html5Qrcode.getCameras().then(cameras=>{
        const camId = cameras && cameras[0] && cameras[0].id;
        html5QrCode.start(camId, {fps:10, qrbox:250}, qrCodeMessage=>{
          try{
            if (qrCodeMessage.startsWith(location.origin+location.pathname+"#intent:")){
              const payload = qrCodeMessage.split('#intent:')[1];
              const intent = JSON.parse(decodeURIComponent(payload));
              html5QrCode.stop();
              readerEl.style.display='none';
              // Show form to collect additional fields
              showAdditionalFieldsForm(intent);
            }
          }catch(e){ console.error(e); }
        }).catch(err=>{ console.warn(err); if(window.showNotification) window.showNotification('Could not start camera','warning'); });
      }).catch(err=>{ if(window.showNotification) window.showNotification('No camera available','warning'); });
    });

    // initial render
    renderIntentList();
  }

  function broadcastAllDemandsToDrivers(){
    const intents = listIntents();
    if(intents.length === 0){
      alert('No demands to broadcast');
      return;
    }

    // Group demands by route and driver
    const buses = (window.appData && window.appData.buses) || [];
    const demandsByBus = {};
    
    intents.forEach(intent => {
      const route = intent.route || (intent.origin && intent.dest ? `${intent.origin} → ${intent.dest}` : null);
      const bus = buses.find(b => b.route === route || (intent.origin && intent.dest && b.route === `${intent.origin} → ${intent.dest}`));
      
      if(bus){
        if(!demandsByBus[bus.id]) demandsByBus[bus.id] = {bus, demands: []};
        demandsByBus[bus.id].demands.push(intent);
      }
    });

    // Create messages for each driver and open WhatsApp
    const messages = [];
    Object.values(demandsByBus).forEach(({bus, demands}) => {
      const driverPhone = bus.driverPhone;
      if(!driverPhone) return;

      // Create detailed demand summary
      let demandSummary = `📋 *Demand Summary for ${bus.driver}*\n\n`;
      demandSummary += `Route: ${bus.route}\n`;
      demandSummary += `Total Riders: ${demands.length}\n`;
      demandSummary += `Total Seats: ${demands.reduce((s, d) => s + (d.seats || 1), 0)}\n\n`;
      demandSummary += `*Breakdown:*\n`;
      
      demands.forEach((d, i) => {
        const name = d.name || 'Rider ' + (i+1);
        const seats = d.seats || 1;
        demandSummary += `${i+1}. ${name} - ${seats} seat(s)\n`;
        if(d.specialNeeds) demandSummary += `   Special: ${d.specialNeeds}\n`;
      });

      demandSummary += `\n*Action:* Adjust route/timing as needed`;

      const waUrl = `https://wa.me/${driverPhone}?text=${encodeURIComponent(demandSummary)}`;
      messages.push({driver: bus.driver, phone: driverPhone, url: waUrl, message: demandSummary});
    });

    if(messages.length === 0){
      alert('No drivers found for current demands');
      return;
    }

    // Show options to user
    let html = `<div class="modal-body small"><p><strong>${messages.length} drivers will receive demand updates:</strong></p><ul class="ps-3">`;
    messages.forEach(m => {
      html += `<li>${m.driver} (${m.phone.slice(-4)})</li>`;
    });
    html += `</ul><p class="mt-3 text-muted">Click below to open WhatsApp for each driver:</p><div class="d-flex flex-wrap gap-2">`;
    messages.forEach((m, i) => {
      html += `<a href="${m.url}" target="_blank" class="btn btn-sm btn-outline-success">Message ${m.driver}</a>`;
    });
    html += `</div><p class="mt-3 text-muted small"><i>Each driver will receive details of all riders for their route</i></p></div>`;

    // Show in alert or modal
    const modal = document.createElement('div');
    modal.className = 'modal fade show d-block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">${html}</div></div>`;
    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);

    if(window.showNotification) window.showNotification(`Broadcasting ${messages.length} driver notifications`, 'success');
  }

  return {saveIntent, listIntents, generateQrForIntent, initUI, showAdditionalFieldsForm, submitAdditionalFields, closeAdditionalFieldsForm, refreshAdditionalFieldsForm, resetToSampleData, broadcastAllDemandsToDrivers};
})();

// Initialize with sample data if empty
function initializeSampleDemandData(){
  if(typeof QRIntent === 'undefined') return;
  const intents = QRIntent.listIntents();
  if(intents.length === 0){
    const sampleIntents = [
      {origin: 'Boys Hostel 1', dest: 'Galgotias University', pickupLocation: 'Main Gate', timeSlot: '09:00', seats: 2, date: new Date().toISOString().split('T')[0], lat: 30.33, lng: 76.385, ts: Date.now() - 3600000},
      {origin: 'Boys Hostel 2', dest: 'Galgotias University', pickupLocation: 'North Wing', timeSlot: '09:15', seats: 1, date: new Date().toISOString().split('T')[0], lat: 30.331, lng: 76.386, ts: Date.now() - 3000000},
      {origin: 'PG Block', dest: 'Girls Hostel 1', pickupLocation: 'Block A', timeSlot: '10:00', seats: 3, date: new Date().toISOString().split('T')[0], lat: 30.3285, lng: 76.384, ts: Date.now() - 2400000},
      {origin: 'Girls Hostel 1', dest: 'Library', pickupLocation: 'Main Entrance', timeSlot: '10:30', seats: 2, date: new Date().toISOString().split('T')[0], lat: 30.327, lng: 76.3855, ts: Date.now() - 1800000},
      {origin: 'Boys Hostel 1', dest: 'Galgotias University', pickupLocation: 'Main Gate', timeSlot: '09:00', seats: 1, date: new Date().toISOString().split('T')[0], lat: 30.33, lng: 76.385, ts: Date.now() - 1200000},
      {origin: 'PG Block', dest: 'Girls Hostel 1', pickupLocation: 'Block A', timeSlot: '10:00', seats: 2, date: new Date().toISOString().split('T')[0], lat: 30.3285, lng: 76.384, ts: Date.now() - 600000}
    ];
    sampleIntents.forEach(intent => QRIntent.saveIntent(intent));
  }
}

// Demand Insights QR Generation
const DemandQRModule = (function(){
  function generateDemandInsightsQr(){
    const intents = (window.QRIntent && typeof QRIntent.listIntents === 'function') ? QRIntent.listIntents() : [];
    
    // Calculate demand metrics
    const metrics = {
      totalIntents: intents.length,
      totalSeats: intents.reduce((sum, i) => sum + (i.seats || 1), 0),
      timeSlots: {},
      pickupLocations: {},
      destinations: {},
      timestamp: new Date().toISOString()
    };
    
    // Analyze demand by time slot
    intents.forEach(i => {
      const slot = i.timeSlot || 'Not specified';
      metrics.timeSlots[slot] = (metrics.timeSlots[slot] || 0) + 1;
      
      const loc = i.pickupLocation || 'Not specified';
      metrics.pickupLocations[loc] = (metrics.pickupLocations[loc] || 0) + (i.seats || 1);
      
      const dest = i.dest || 'Not specified';
      metrics.destinations[dest] = (metrics.destinations[dest] || 0) + 1;
    });
    
    // Create shareable QR data
    const payload = encodeURIComponent(JSON.stringify(metrics));
    const url = `${location.origin}${location.pathname}#demand:${payload}`;
    const qrImage = document.createElement('img');
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=240x240`;
    qrImage.alt = 'Demand Insights QR';
    qrImage.style.maxWidth = '240px';
    qrImage.style.display = 'block';
    qrImage.style.margin = '0 auto';
    
    return qrImage;
  }
  
  function initUI(){
    const btn = document.getElementById('generateDemandQrBtn');
    const container = document.getElementById('demandQrContainer');
    
    if(!btn || !container) return;
    
    btn.addEventListener('click', ()=>{
      try {
        const intents = (window.QRIntent && typeof QRIntent.listIntents === 'function') ? QRIntent.listIntents() : [];
        
        if(intents.length === 0) {
          if(window.showNotification) window.showNotification('No demand data to generate QR. Run clustering first!', 'warning');
          return;
        }
        
        container.innerHTML = '';
        const qrImage = generateDemandInsightsQr();
        container.appendChild(qrImage);
        
        // Add info text about the QR
        const info = document.createElement('div');
        info.className = 'small text-muted text-center mt-2';
        info.innerHTML = '📱 Demand Insights QR - Share the current demand analysis data';
        container.appendChild(info);
        
        // Add download button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-sm btn-outline-primary mt-2 w-100';
        downloadBtn.innerHTML = '<i class="fas fa-download me-1"></i>Download QR';
        downloadBtn.addEventListener('click', ()=>{
          // Download the QR image
          const link = document.createElement('a');
          link.href = qrImage.src;
          link.download = `demand-insights-qr-${new Date().getTime()}.png`;
          link.click();
        });
        container.appendChild(downloadBtn);
        
        if(window.showNotification) window.showNotification('Demand Insights QR generated!', 'success');
      } catch(e) {
        console.error('Error generating demand QR:', e);
        if(window.showNotification) window.showNotification('Error generating QR code', 'danger');
      }
    });
  }
  
  return { generateDemandInsightsQr, initUI };
})();

document.addEventListener('DOMContentLoaded', ()=>{ 
  if(window.QRIntent && typeof QRIntent.initUI==='function') {
    QRIntent.initUI();
    initializeSampleDemandData();
  }
  // Initialize demand QR functionality
  if(window.DemandQRModule && typeof DemandQRModule.initUI === 'function') {
    DemandQRModule.initUI();
  }
  // Handle track hash for location-based tracking
  try {
    handleLocationHash();
    // watch for hash changes (in case QR opens the app when already loaded)
    window.addEventListener('hashchange', handleLocationHash);
  } catch(e) { /* non-fatal */ }
});



function handleLocationHash(){
  const h = window.location.hash || '';
  if(h.startsWith('#track:')){
    const busId = decodeURIComponent(h.split('#track:')[1] || '');
    if(!busId) return;
    // Ensure tracking UI is visible
    if(typeof showSection === 'function') showSection('tracking');
    const bus = (window.appData && appData.buses) ? appData.buses.find(b => b.id === busId) : null;
    if(!bus){ console.warn('Bus for tracking not found:', busId); return; }
    const routeSelect = document.getElementById('routeSelect');
    if(routeSelect){ routeSelect.value = bus.route; try{ loadEnhancedRoute(); }catch(e){} }
    if(window.map && typeof map.setView === 'function'){
      map.setView([bus.currentLat, bus.currentLng], 16);
      if(window.L){ const marker = L.marker([bus.currentLat, bus.currentLng]).addTo(map); marker.bindPopup(`Bus ${bus.id} — Driver: ${bus.driver}`).openPopup(); setTimeout(()=>{ try{ map.removeLayer(marker); }catch(e){} }, 15000); }
    } else { setTimeout(handleLocationHash, 500); }
    return;
  }

}
}


