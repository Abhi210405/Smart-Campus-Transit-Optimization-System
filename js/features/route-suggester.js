// Route merge suggestions based on intent overlap with enhanced demand insights
const RouteSuggester = (function(){
  function suggestMerges(intents, threshold=5){
    // group by origin-dest combination
    const pairs = {};
    intents.forEach(i=>{
      const key = `${i.origin||'unknown'}|${i.dest||'unknown'}`;
      pairs[key] = (pairs[key]||0)+1;
    });
    const candidates = Object.keys(pairs).filter(k=>pairs[k]>=threshold).map(k=>({pair:k,count:pairs[k]}));
    return candidates;
  }

  function analyzeRoutesByDate(intents){
    const dateRoutes = {};
    intents.forEach(i=>{
      const date = i.date || 'Not specified';
      const route = `${i.origin||'Unknown'} → ${i.dest||'Unknown'}`;
      const key = `${date}|${route}`;
      dateRoutes[key] = (dateRoutes[key]||0)+1;
    });
    return dateRoutes;
  }

  function analyzeRoutesByTimeSlot(intents){
    const timeRoutes = {};
    intents.forEach(i=>{
      const time = i.timeSlot || 'Not specified';
      const route = `${i.origin||'Unknown'} → ${i.dest||'Unknown'}`;
      const key = `${time}|${route}`;
      timeRoutes[key] = (timeRoutes[key]||0)+1;
    });
    return timeRoutes;
  }

  function initUI(){
    const btn = document.getElementById('suggestRoutesBtn');
    const out = document.getElementById('suggestions');
    
    if(!btn || !out) return;
    
    btn.addEventListener('click', ()=>{
      try {
        const intents = (window.QRIntent && window.QRIntent.listIntents && window.QRIntent.listIntents()) || [];
        
        if(intents.length === 0){
          out.innerHTML = '<div class="alert alert-info small mb-0">No intents to analyze</div>';
          return;
        }

        const cand = suggestMerges(intents, 1);
        const dateRoutes = analyzeRoutesByDate(intents);
        const timeRoutes = analyzeRoutesByTimeSlot(intents);

        let html = '<div>';
        
        if(cand.length === 0){
          html += '<div class="alert alert-info small mb-2">No route patterns found yet</div>';
        } else {
          html += '<div class="mb-3"><strong class="text-success">🔀 Route Patterns:</strong><div class="small mt-2">';
          cand.slice(0, 5).forEach(c=>{
            html += `<div>🔹 ${c.pair.replace('|',' → ')} (${c.count} intents)</div>`;
          });
          html += '</div></div>';
        }

        html += '<div class="mb-3"><strong class="text-info">📅 Peak Routes by Date:</strong><div class="small mt-2">';
        Object.entries(dateRoutes)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([key, count])=>{
            const parts = key.split('|');
            const date = parts[0];
            const route = parts.slice(1).join('|');
            html += `<div>📌 ${date}: ${route} (${count})</div>`;
          });
        html += '</div></div>';

        html += '<div><strong class="text-warning">⏰ Peak Routes by Time:</strong><div class="small mt-2">';
        Object.entries(timeRoutes)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([key, count])=>{
            const parts = key.split('|');
            const time = parts[0];
            const route = parts.slice(1).join('|');
            html += `<div>🕐 ${time}: ${route} (${count})</div>`;
          });
        html += '</div></div></div>';
        
        out.innerHTML = html;
        try{ if(window.showNotification) window.showNotification('Route suggestions generated','success'); }catch(e){}
      } catch(e) {
        console.error('Route suggestion error:', e);
        out.innerHTML = '<div class="alert alert-danger small mb-0">Error analyzing routes</div>';
      }
    });
  }

  return {suggestMerges, analyzeRoutesByDate, analyzeRoutesByTimeSlot, initUI};
})();

document.addEventListener('DOMContentLoaded', ()=>{ if(window.RouteSuggester && typeof window.RouteSuggester.initUI === 'function') RouteSuggester.initUI(); });
