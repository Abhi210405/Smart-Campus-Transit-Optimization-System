// Demand Insights Module
const DemandInsights = (function(){
  function summarizeIntents(intents){
    const metrics = {
      totalIntents: intents.length,
      totalSeats: 0,
      byRoutePair: {},
      byTimeSlot: {},
      byPickup: {},
      timestamp: new Date().toISOString()
    };

    intents.forEach(i => {
      const seats = i.seats || 1;
      metrics.totalSeats += seats;

      const pair = `${i.origin||'Unknown'} → ${i.dest||'Unknown'}`;
      metrics.byRoutePair[pair] = (metrics.byRoutePair[pair]||0) + seats;

      const slot = i.timeSlot || 'Not specified';
      metrics.byTimeSlot[slot] = (metrics.byTimeSlot[slot]||0) + seats;

      const pickup = i.pickupLocation || (i.origin || 'Unknown');
      metrics.byPickup[pickup] = (metrics.byPickup[pickup]||0) + seats;
    });

    return metrics;
  }

  function mapDemandToRoutes(metrics){
    // Try to map top route pairs to known route IDs and estimate capacity vs demand
    const routes = window.appData && window.appData.routes || [];
    const buses = window.appData && window.appData.buses || [];

    const results = [];
    Object.entries(metrics.byRoutePair).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([pair,seats])=>{
      const [origin, dest] = pair.split('→').map(s=>s.trim());
      // match by origin/destination strings to routes
      const matched = routes.find(r => (r.origin===origin && r.destination===dest) || (r.origin===origin && r.stops && r.stops.some(s=>s.name===dest)) );
      const routeId = matched ? matched.id : null;
      const capacity = routeId ? buses.filter(b=>b.route===routeId).reduce((s,b)=>s+(b.capacity||0),0) : 0;
      const shortfall = Math.max(0, seats - capacity);
      results.push({pair, seats, routeId, capacity, shortfall});
    });

    return results;
  }

  function renderInsights(container, metrics, mapped){
    if(!container) return;
    if(metrics.totalIntents===0){ container.innerHTML = '<div class="small text-muted">No intents available to compute insights</div>'; return; }

    let html = '';
    html += `<div class="mb-2"><strong>Total intents:</strong> ${metrics.totalIntents} — <strong>Seats requested:</strong> ${metrics.totalSeats}</div>`;

    html += '<div class="mb-2"><strong>Top route demand (seats):</strong><div class="small mt-1">';
    mapped.forEach(m => {
      html += `<div>🔹 ${m.pair} ${m.routeId?`(route ${m.routeId})`:'(no matching route)'} — seats: ${m.seats} — capacity: ${m.capacity} — shortfall: ${m.shortfall}</div>`;
    });
    html += '</div></div>';

    // Top time slots
    const topSlots = Object.entries(metrics.byTimeSlot).sort((a,b)=>b[1]-a[1]).slice(0,6);
    html += '<div class="mb-2"><strong>Peak time slots:</strong><div class="small mt-1">';
    topSlots.forEach(([slot, seats])=>{ html += `<div>🕒 ${slot}: ${seats} seats</div>`; });
    html += '</div></div>';

    // Top pickup locations
    const topPickups = Object.entries(metrics.byPickup).sort((a,b)=>b[1]-a[1]).slice(0,6);
    html += '<div class="mb-2"><strong>Top pickup locations:</strong><div class="small mt-1">';
    topPickups.forEach(([loc, seats])=>{ html += `<div>📍 ${loc}: ${seats} seats</div>`; });
    html += '</div></div>';

    html += `<div class="text-muted small">Updated: ${metrics.timestamp}</div>`;

    container.innerHTML = html;
  }

  function refresh(){
    const intents = (window.QRIntent && typeof QRIntent.listIntents === 'function') ? QRIntent.listIntents() : [];
    const metrics = summarizeIntents(intents);
    const mapped = mapDemandToRoutes(metrics);
    const out = document.getElementById('demandInsightsOutput');
    renderInsights(out, metrics, mapped);
    try{ if(window.showNotification) window.showNotification('Demand insights refreshed','success'); }catch(e){}
    return {metrics, mapped};
  }

  function initUI(){
    const runBtn = document.getElementById('runClusteringBtn');
    const refreshBtn = document.getElementById('refreshDemandBtn');
    if(runBtn) runBtn.addEventListener('click', ()=>{ setTimeout(()=>{ refresh(); }, 100); });
    if(refreshBtn) refreshBtn.addEventListener('click', ()=>{ refresh(); });

    // also refresh on DOM ready
    document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(()=>{ refresh(); }, 200); });
  }

  return { initUI, refresh };
})();

document.addEventListener('DOMContentLoaded', ()=>{ if(window.DemandInsights && typeof DemandInsights.initUI==='function') DemandInsights.initUI(); });
