// Simple trip clustering by time window with enhanced demand insights
const ClusteringModule = (function(){
  function clusterByWindow(intents, windowMinutes = 30){
    const buckets = {};
    intents.forEach(i=>{
      const ts = i.ts || Date.now();
      const bucket = Math.floor(ts / (windowMinutes*60*1000));
      buckets[bucket] = buckets[bucket] || [];
      buckets[bucket].push(i);
    });
    return Object.keys(buckets).map(k=>({windowStart: Number(k)*(windowMinutes*60*1000), items: buckets[k]}));
  }

  function analyzeTimeSlotDemand(intents){
    const timeSlots = {};
    intents.forEach(i=>{
      const slot = i.timeSlot || 'Not specified';
      timeSlots[slot] = (timeSlots[slot] || 0) + 1;
    });
    return timeSlots;
  }

  function analyzePickupLocationDemand(intents){
    const locations = {};
    intents.forEach(i=>{
      const loc = i.pickupLocation || 'Not specified';
      locations[loc] = (locations[loc] || 0) + (i.seats || 1);
    });
    return locations;
  }

  function calculateTotalSeatsNeeded(intents){
    return intents.reduce((sum, i) => sum + (i.seats || 1), 0);
  }

  function initUI(){
    const btn = document.getElementById('runClusteringBtn');
    const out = document.getElementById('suggestions');
    
    if(!btn || !out) return;
    
    btn.addEventListener('click', ()=>{
      try {
        const intents = (window.QRIntent && window.QRIntent.listIntents && window.QRIntent.listIntents()) || [];
        
        if(intents.length === 0){
          out.innerHTML = '<div class="alert alert-info small mb-0">No intents collected yet</div>';
          return;
        }

      const clusters = clusterByWindow(intents, 30);
      const timeSlotDemand = analyzeTimeSlotDemand(intents);
      const locationDemand = analyzePickupLocationDemand(intents);
      const totalSeats = calculateTotalSeatsNeeded(intents);

      let html = `<div class="mb-3"><strong class="text-success">📊 Demand Analysis</strong><div class="small mt-2"><div>🔹 Total Intents: ${intents.length}</div><div>🔹 Time Windows: ${clusters.length}</div><div>🔹 Total Seats Required: ${totalSeats}</div></div></div><div class="mb-3"><strong class="text-info">🕒 Time Slot Demand:</strong><div class="small mt-2">`;
      
      Object.entries(timeSlotDemand)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([slot, count]) => {
          html += `<div>⏰ ${slot}: ${count} requests</div>`;
        });

      html += `</div></div><div class="mb-3"><strong class="text-warning">📍 Pickup Location Demand:</strong><div class="small mt-2">`;

      Object.entries(locationDemand)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([loc, seats]) => {
          html += `<div>📌 ${loc}: ${seats} seats needed</div>`;
        });

      html += `</div></div><div><strong class="text-secondary">⏱️ Time Windows:</strong><div class="small mt-2">`;

      clusters.slice(0, 5).forEach(c => {
        html += `<div>Window: ${new Date(c.windowStart).toLocaleString()} - ${c.items.length} intents</div>`;
      });

      html += `</div></div>`;
      
      out.innerHTML = html;
      try{ if(window.showNotification) window.showNotification('Demand analysis complete','success'); }catch(e){}
      } catch(e) {
        console.error('Clustering error:', e);
        out.innerHTML = '<div class="alert alert-danger small mb-0">Error analyzing data</div>';
      }
    });
  }

  return {clusterByWindow, analyzeTimeSlotDemand, analyzePickupLocationDemand, calculateTotalSeatsNeeded, initUI};
})();

document.addEventListener('DOMContentLoaded', ()=>{ if(window.ClusteringModule) ClusteringModule.initUI(); });
