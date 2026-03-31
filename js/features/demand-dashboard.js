// Comprehensive Demand Prediction Dashboard
const DemandDashboard = (function(){
  let analyticsChart = null;
  let demandForecastChart = null;
  
  // Sample data generator for testing
  function generateSampleData(){
    const locations = {
      'Boys Hostel 1': {lat: 30.33, lng: 76.385},
      'Boys Hostel 2': {lat: 30.33, lng: 76.386},
      'Girls Hostel': {lat: 30.33, lng: 76.387},
      'Main Campus': {lat: 30.33, lng: 76.38},
      'Galgotias University': {lat: 30.33, lng: 76.38}
    };
    
    const locationList = Object.keys(locations);
    const timeSlots = ['8:00-9:00 AM', '9:00-10:00 AM', '4:00-5:00 PM', '5:00-6:00 PM', '6:00-7:00 PM'];
    
    const sampleIntents = [];
    for(let i = 0; i < 12; i++){
      const origin = locationList[Math.floor(Math.random() * locationList.length)];
      const dest = locationList[Math.floor(Math.random() * locationList.length)];
      sampleIntents.push({
        id: 'sample_' + i,
        origin: origin,
        dest: dest,
        seats: Math.floor(Math.random() * 4) + 1,
        pickupLocation: origin,
        timeSlot: timeSlots[Math.floor(Math.random() * timeSlots.length)],
        timestamp: new Date().toISOString()
      });
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('scta_intents', JSON.stringify(sampleIntents));
    } catch(e) {
      console.log('Could not save sample data:', e);
    }
    
    return sampleIntents;
  }

  function collectAllMetrics(){
    let intents = [];
    try {
      const stored = localStorage.getItem('scta_intents');
      intents = stored ? JSON.parse(stored) : [];
    } catch(e) {
      console.log('Error reading intents:', e);
      intents = [];
    }
    
    if(intents.length === 0) return null;

    const metrics = {
      totalIntents: intents.length,
      totalSeatsRequested: intents.reduce((sum, i) => sum + (i.seats || 1), 0),
      uniqueOrigins: new Set(intents.map(i => i.origin)).size,
      uniqueDestinations: new Set(intents.map(i => i.dest)).size,
      peakTimeSlot: getPeakTimeSlot(intents),
      peakPickupLocation: getPeakPickupLocation(intents),
      demandHeatmap: generateDemandHeatmap(intents),
      routePairs: analyzeRoutePairs(intents),
      timeWindowClusters: clusterByTimeWindow(intents),
      predictions: generateDemandForecast(intents),
      mergeOpportunities: identifyMergeOpportunities(intents),
      averageOccupancy: intents.length > 0 ? (intents.reduce((sum, i) => sum + (i.seats || 1), 0) / intents.length).toFixed(2) : 0,
      timestamp: new Date().toISOString()
    };

    return metrics;
  }

  function getPeakTimeSlot(intents){
    const slots = {};
    intents.forEach(i => {
      const slot = i.timeSlot || 'Not specified';
      slots[slot] = (slots[slot] || 0) + 1;
    });
    return Object.entries(slots).sort((a, b) => b[1] - a[1])[0] || ['Not available', 0];
  }

  function getPeakPickupLocation(intents){
    const locations = {};
    intents.forEach(i => {
      const loc = i.pickupLocation || 'Not specified';
      locations[loc] = (locations[loc] || 0) + (i.seats || 1);
    });
    return Object.entries(locations).sort((a, b) => b[1] - a[1])[0] || ['Not available', 0];
  }


  function generateDemandHeatmap(intents){
    const heatmap = {};
    intents.forEach(i => {
      const key = `${i.timeSlot || 'Unknown'}`;
      heatmap[key] = (heatmap[key] || 0) + (i.seats || 1);
    });
    return heatmap;
  }

  function analyzeRoutePairs(intents){
    const pairs = {};
    intents.forEach(i => {
      const key = `${i.origin || 'Unknown'} → ${i.dest || 'Unknown'}`;
      pairs[key] = (pairs[key] || 0) + (i.seats || 1);
    });
    return Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  function clusterByTimeWindow(intents, windowMinutes = 60){
    const clusters = {};
    intents.forEach(i => {
      const timeSlot = i.timeSlot || '09:00';
      clusters[timeSlot] = clusters[timeSlot] || [];
      clusters[timeSlot].push(i);
    });
    return clusters;
  }

  function generateDemandForecast(intents){
    const timeSlots = {};
    intents.forEach(i => {
      const slot = i.timeSlot || 'Not specified';
      timeSlots[slot] = (timeSlots[slot] || 0) + 1;
    });

    // Predict future demand based on current patterns
    const forecast = {};
    Object.entries(timeSlots).forEach(([slot, count]) => {
      // Simple prediction: increase based on trend
      forecast[slot] = {
        current: count,
        predicted: Math.ceil(count * 1.15), // 15% growth prediction
        recommendation: count > 5 ? 'High Priority' : 'Standard'
      };
    });

    return forecast;
  }

  function identifyMergeOpportunities(intents){
    const routes = {};
    intents.forEach(i => {
      const pair = `${i.origin || 'Unknown'} → ${i.dest || 'Unknown'}`;
      routes[pair] = (routes[pair] || []);
      routes[pair].push(i);
    });

    const opportunities = [];
    Object.entries(routes).forEach(([pair, items]) => {
      if(items.length >= 3) {
        const totalSeats = items.reduce((sum, i) => sum + (i.seats || 1), 0);
        const timeSlots = new Set(items.map(i => i.timeSlot || 'Not specified')).size;
        
        opportunities.push({
          route: pair,
          trips: items.length,
          totalSeats: totalSeats,
          timeWindows: timeSlots,
          priority: totalSeats > 15 ? 'URGENT' : totalSeats > 10 ? 'HIGH' : 'MEDIUM',
          savings: Math.ceil(items.length * 0.3) + ' trips can be merged'
        });
      }
    });

    return opportunities.sort((a, b) => {
      const priorityMap = { 'URGENT': 3, 'HIGH': 2, 'MEDIUM': 1 };
      return priorityMap[b.priority] - priorityMap[a.priority];
    });
  }

  // Suggest simple route optimization: find low-demand and high-demand routes and recommend merges
  function suggestRouteOptimizations(intents){
    const pairCounts = {};
    intents.forEach(i=>{ const key = `${i.origin||'Unknown'} → ${i.dest||'Unknown'}`; pairCounts[key] = (pairCounts[key]||0) + (i.seats||1); });
    const pairs = Object.entries(pairCounts).sort((a,b)=>a[1]-b[1]); // ascending
    if(pairs.length < 2) return null;
    const low = pairs[0];
    const high = pairs[pairs.length-1];
    // Only suggest if low is meaningfully lower than high
    if(high[1] >= (low[1] + 6)){
      return { suggestion: `Merge ${low[0]} with ${high[0]}`, reason: `${low[0]} low demand (${low[1]}), ${high[0]} high demand (${high[1]})` };
    }
    return null;
  }

  // Detect overcrowding risk: flag routes or time slots likely to exceed capacity threshold
  function detectOvercrowding(intents, busCapacity = 20, thresholdFraction = 0.75){
    const alerts = [];
    // per-route seats
    const routes = {};
    intents.forEach(i=>{ const k = `${i.origin||'Unknown'} → ${i.dest||'Unknown'}`; routes[k] = (routes[k]||0) + (i.seats||1); });
    Object.entries(routes).forEach(([route, seats])=>{
      if(seats >= busCapacity * thresholdFraction){
        alerts.push({type: 'route', route, seats, message: `Increase frequency on ${route}`});
      }
    });
    // per-time-slot predicted occupancy (use generateDemandForecast)
    const forecast = generateDemandForecast(intents);
    Object.entries(forecast).forEach(([slot, f])=>{
      if(f.predicted >= busCapacity * thresholdFraction){
        alerts.push({type: 'timeslot', slot, predicted: f.predicted, message: `High demand around ${slot}`});
      }
    });
    return alerts;
  }

  function renderDashboard(container){
    if(!container) return;

    const metrics = collectAllMetrics();
    
    if(!metrics){
      container.innerHTML = `
        <div class="alert alert-info mb-3">
          <h6 class="mb-2">📊 Demand Dashboard Ready</h6>
          <p class="mb-2">No rider intents collected yet. Data will appear here once riders submit requests.</p>
          <button class="btn btn-sm btn-primary" id="loadSampleDataBtn" style="margin-top: 10px;">📋 Load Sample Data (Testing)</button>
        </div>
      `;
      
      setTimeout(() => {
        const btn = document.getElementById('loadSampleDataBtn');
        if(btn) {
          btn.addEventListener('click', () => {
            generateSampleData();
            renderDashboard(container);
            if(window.showNotification) window.showNotification('Sample data loaded!', 'success');
          });
        }
      }, 100);
      return;
    }

    let html = `
      <div class="demand-dashboard">
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card bg-primary text-white">
              <div class="card-body text-center">
                <h6 class="card-title">Total Intents</h6>
                <h3>${metrics.totalIntents}</h3>
                <small>Rider requests collected</small>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-success text-white">
              <div class="card-body text-center">
                <h6 class="card-title">Total Seats</h6>
                <h3>${metrics.totalSeatsRequested}</h3>
                <small>Capacity needed</small>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-warning text-dark">
              <div class="card-body text-center">
                <h6 class="card-title">Peak Time</h6>
                <h3>${metrics.peakTimeSlot[0]}</h3>
                <small>${metrics.peakTimeSlot[1]} requests</small>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-danger text-white">
              <div class="card-body text-center">
                <h6 class="card-title">Avg Occupancy</h6>
                <h3>${metrics.averageOccupancy} seats/trip</h3>
                <small>Per rider request</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Routes -->
        <div class="card mb-3">
          <div class="card-header">
            <h6 class="mb-0">🔥 Top Demand Routes</h6>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Requests</th>
                    <th>Total Seats</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
    `;

    metrics.routePairs.slice(0, 8).forEach(([route, seats]) => {
      const status = seats > 15 ? '<span class="badge bg-danger">Critical</span>' : 
                     seats > 10 ? '<span class="badge bg-warning">High</span>' : 
                     '<span class="badge bg-info">Standard</span>';
      html += `<tr><td>${route}</td><td>${Math.ceil(seats / 1.5)}</td><td>${seats}</td><td>${status}</td></tr>`;
    });

    html += `
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Merge Opportunities -->
        <div class="card mb-3">
          <div class="card-header">
            <h6 class="mb-0">⚡ Route Merge Opportunities</h6>
          </div>
          <div class="card-body">
    `;

    if(metrics.mergeOpportunities.length > 0){
      metrics.mergeOpportunities.slice(0, 5).forEach(opp => {
        const priorityClass = opp.priority === 'URGENT' ? 'bg-danger' : opp.priority === 'HIGH' ? 'bg-warning' : 'bg-info';
        html += `
          <div class="alert mb-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>${opp.route}</strong>
                <span class="badge ${priorityClass} ms-2">${opp.priority}</span>
                <div class="small text-muted mt-1">
                  ${opp.trips} trips | ${opp.totalSeats} seats | ${opp.timeWindows} time window(s)
                </div>
                <div class="small text-success mt-1">💡 ${opp.savings}</div>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      html += '<p class="text-muted">No merge opportunities identified yet</p>';
    }

    html += `
        </div>

        <!-- Demand Forecast -->
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0">📊 Demand Forecast by Time</h6>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    <th>Current</th>
                    <th>Predicted</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
    `;

    Object.entries(metrics.predictions).slice(0, 10).forEach(([slot, pred]) => {
      const priorityClass = pred.recommendation === 'High Priority' ? 'text-danger' : 'text-success';
      html += `
        <tr>
          <td><strong>${slot}</strong></td>
          <td>${pred.current}</td>
          <td>${pred.predicted} <i class="fas fa-arrow-up text-warning"></i></td>
          <td><span class="${priorityClass}">${pred.recommendation}</span></td>
        </tr>
      `;
    });

    html += `
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="text-muted small mt-3">
          Last updated: ${new Date(metrics.timestamp).toLocaleTimeString()}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Compact home widget renderer
  function renderCompact(container){
    if(!container) return;
    const metrics = collectAllMetrics();
    if(!metrics){
      container.innerHTML = `<div class="d-flex justify-content-between align-items-center">
        <div><strong>No demand data</strong><div class="small text-muted">Load sample data or collect intents</div></div>
        <div><button class="btn btn-sm btn-primary" id="homeLoadSampleBtn">Load Sample</button>
        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="showSection('demand')">Open Dashboard</button></div>
      </div>`;
      setTimeout(()=>{
        const btn = document.getElementById('homeLoadSampleBtn'); if(btn) btn.addEventListener('click', ()=>{ generateSampleData(); renderCompact(container); if(window.showNotification) window.showNotification('Sample data loaded','success'); });
      },100);
      return;
    }

    const topRoutes = metrics.routePairs.slice(0,3);
    // build enhanced snapshot with peak times, top stops, optimizations and overcrowding alerts
    const intentsAll = (JSON.parse(localStorage.getItem('scta_intents')||'[]')) || [];
    const peakTimes = getTopPeakTimeSlots(intentsAll, 3);
    const topStops = getTopPickupLocations((JSON.parse(localStorage.getItem('scta_intents')||'[]')) || [], 3);
    const optimization = suggestRouteOptimizations((JSON.parse(localStorage.getItem('scta_intents')||'[]')) || []);
    const overcrowdAlerts = detectOvercrowding((JSON.parse(localStorage.getItem('scta_intents')||'[]')) || [] , 20, 0.75);

    let html = `<div class="row">
      <div class="col-md-4">
        <div><strong>Total intents</strong><div class="h4">${metrics.totalIntents}</div></div>
        <div class="mt-2"><strong>Total seats</strong><div class="h5">${metrics.totalSeatsRequested}</div></div>
      </div>
      <div class="col-md-5">
        <div><strong>Peak time</strong><div class="h5">${metrics.peakTimeSlot[0]} (${metrics.peakTimeSlot[1]})</div></div>
        <div class="mt-2"><strong>Peak ranges</strong>
          <div class="small mt-1">
            ${(() => {
              if(!peakTimes || peakTimes.length===0) return '';
              const maxCount = peakTimes[0][1] || 1;
              return peakTimes.map((pt, i)=>{
                const label = (pt[1] >= Math.ceil(maxCount * 0.75)) ? 'High demand' : 'Low demand';
                return `• ${pt[0]} → ${pt[1]} requests — ${label}`;
              }).join('<br>');
            })()}
          </div>
        </div>
        <div class="mt-2"><strong>Avg occupancy</strong><div class="h6">${metrics.averageOccupancy}</div></div>
      </div>
      <div class="col-md-3">
        <div><strong>Top routes</strong></div>`;

    topRoutes.forEach(([route, seats]) => {
      html += `<div class="small mt-1">• ${route} — ${seats} seats</div>`;
    });

    // High-demand stops
    html += `</div></div><div class="mt-3"><div><strong>High-demand stops</strong><div class="small mt-1">${topStops.map(s=>`• ${s[0]} → ${s[1]} ride requests`).join('<br>')}</div></div>`;

    // Optimization suggestion
    if(optimization){
      html += `<div class="mt-2"><strong>Suggestion</strong><div class="small text-success">${optimization.suggestion} — ${optimization.reason}</div></div>`;
    }

    // Overcrowding alerts
    if(overcrowdAlerts && overcrowdAlerts.length>0){
      html += `<div class="mt-2"><strong>Alerts</strong><div class="small text-danger">${overcrowdAlerts.map(a=> a.type==='route' ? `• ${a.route} → ${a.seats} seats — ${a.message}` : `• ${a.slot} → ${a.predicted} predicted — ${a.message}`).join('<br>')}</div>`;
      // persist alerts briefly for admin panel
      try{ localStorage.setItem('scta_alerts', JSON.stringify(overcrowdAlerts)); }catch(e){}
      // add notify button
      const combined = overcrowdAlerts.map(a=> a.type==='route' ? `${a.route}: ${a.seats} seats` : `${a.slot}: ${a.predicted} predicted`).join(' ; ');
      html += `<div class="mt-2"><button class="btn btn-sm btn-outline-danger" id="notifyAdminOvercrowdBtn">Notify Admin via WhatsApp</button></div>`;
      html += '</div>';
      // attach notifier after render
      setTimeout(()=>{
        const nb = document.getElementById('notifyAdminOvercrowdBtn');
        if(nb){ nb.addEventListener('click', ()=>{
          try{ const msg = encodeURIComponent('Overcrowding alert: ' + combined + '. Please deploy resources.'); window.open(`https://wa.me/?text=${msg}`, '_blank'); }catch(e){ console.warn(e); }
        }); }
      }, 100);
    }

    html += `<div class="mt-3"><button class="btn btn-sm btn-outline-primary" onclick="showSection('demand')">Open Full Insights</button></div>`;

    container.innerHTML = html;
  }


  function initUI(){
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    const dashboardContainer = document.getElementById('demandDashboard');
    const smokeBtn = document.getElementById('runSmokeTestsBtn');

    function runSmokeTest(){
      try{
        // clear existing intents then load sample data
        localStorage.removeItem('scta_intents');
        const samples = generateSampleData();
        // update other components
        if(window.QRIntent && typeof QRIntent.renderIntentList === 'function'){
          try{ QRIntent.renderIntentList(); }catch(e){}
        }
        renderDashboard(dashboardContainer);
        if(window.SmartDriverNotifications && typeof SmartDriverNotifications.initUI === 'function'){
          // refresh driver preview if present
          try{ const preview = document.getElementById('demandRecommendationPreview'); if(preview) { SmartDriverNotifications.initUI(); } }catch(e){}
        }
        if(window.showNotification) window.showNotification('Smoke test completed — sample intents loaded', 'success');
        return samples;
      }catch(e){ console.error('Smoke test failed', e); if(window.showNotification) window.showNotification('Smoke test failed','danger'); }
    }

    if(refreshBtn){
      refreshBtn.addEventListener('click', () => {
        renderDashboard(dashboardContainer);
        if(window.showNotification) window.showNotification('Dashboard refreshed', 'success');
      });
    }

    if(smokeBtn){
      smokeBtn.addEventListener('click', () => {
        runSmokeTest();
      });
    }

    // Auto-refresh every 30 seconds
    setInterval(() => {
      renderDashboard(dashboardContainer);
    }, 30000);

    // Initial render
    setTimeout(() => renderDashboard(dashboardContainer), 500);


  }

  return { renderDashboard, collectAllMetrics, initUI, generateSampleData };
})();

document.addEventListener('DOMContentLoaded', () => {
  // Wait for dependencies
  setTimeout(() => {
    if(window.DemandDashboard && typeof DemandDashboard.initUI === 'function'){
      DemandDashboard.initUI();
    }
  }, 300);
});
