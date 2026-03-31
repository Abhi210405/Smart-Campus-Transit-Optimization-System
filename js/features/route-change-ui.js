// Route Change UI - add places and propose route changes
(function(){
  function savePlace(place){
    const key = 'scta_places';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push(place);
    localStorage.setItem(key, JSON.stringify(arr));
    return arr;
  }

  function listPlaces(){
    return JSON.parse(localStorage.getItem('scta_places') || '[]');
  }

  function populateRouteSelect(){
    const sel = document.getElementById('routeSelectForChange');
    if(!sel) return;
    sel.innerHTML = '<option value="">-- Select Route --</option>';
    const intents = (window.QRIntent && QRIntent.listIntents && QRIntent.listIntents()) || [];
    const pairs = {};
    intents.forEach(i=>{
      const key = `${i.origin||'Unknown'} → ${i.dest||'Unknown'}`;
      pairs[key] = (pairs[key]||0) + (i.seats||1);
    });
    const routeList = Object.keys(pairs).sort((a,b)=> pairs[b]-pairs[a]).slice(0,30);
    routeList.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = `${r} (${pairs[r]} seats)`;
      sel.appendChild(opt);
    });
    // also render the routes list
    renderRoutesList(pairs, routeList);
  }

  function renderRoutesList(routePairs, routeList){
    const out = document.getElementById('routesListOutput');
    if(!out) return;
    if(!routeList || routeList.length === 0){ out.innerHTML = '<div class="text-muted small">No routes available</div>'; return; }
    let html = '<div class="small"><strong>Available Routes:</strong><ul class="ps-3 mb-0 mt-2">';
    routeList.forEach(r=>{ 
      html += `<li>${r} — <strong>${routePairs[r]}</strong> ride requests</li>`; 
    });
    html += '</ul></div>';
    out.innerHTML = html;
  }


  function addPlaceFromUI(){
    const name = document.getElementById('placeNameInput')?.value?.trim();
    const lat = parseFloat(document.getElementById('placeLatInput')?.value) || null;
    const lng = parseFloat(document.getElementById('placeLngInput')?.value) || null;
    if(!name){ alert('Please enter a place name'); return; }
    const place = {name, lat, lng, addedAt: new Date().toISOString()};
    savePlace(place);
    if(window.showNotification) window.showNotification('Place added', 'success');
    document.getElementById('placeNameInput').value = '';
    document.getElementById('placeLatInput').value = '';
    document.getElementById('placeLngInput').value = '';
    renderPlacesList();
  }

  function renderPlacesList(){
    const places = listPlaces();
    const out = document.getElementById('placesListOutput');
    if(!out) return;
    if(places.length === 0){ out.innerHTML = '<div class="text-muted small">No places added yet</div>'; return; }
    let html = '<div class="small"><strong>Saved Places:</strong><ul class="ps-3 mb-0 mt-2">';
    places.slice().reverse().forEach((p, i)=>{ 
      html += `<li>${p.name}${p.lat && p.lng ? ` — (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})` : ''}</li>`; 
    });
    html += '</ul></div>';
    out.innerHTML = html;
  }

  function suggestMergeForSelected(){
    const sel = document.getElementById('routeSelectForChange');
    const out = document.getElementById('routeChangeOutput');
    if(!sel || !out) return;
    const route = sel.value;
    if(!route){ alert('Select a route first'); return; }
    const intents = (window.QRIntent && QRIntent.listIntents && QRIntent.listIntents()) || [];
    const candidates = (window.RouteSuggester && RouteSuggester.suggestMerges) ? RouteSuggester.suggestMerges(intents,1) : [];
    const match = candidates.find(c => c.pair.replace('|',' → ') === route || c.pair.replace('|',' → ') === route);
    if(match){
      out.innerHTML = `<div class="alert alert-success small mb-0">Suggested merge: <strong>${route}</strong> — ${match.count} intents. Consider merging trips or scheduling an extra shuttle.</div>`;
    } else {
      out.innerHTML = `<div class="alert alert-info small mb-0">No merge suggestion found for <strong>${route}</strong>. You can still propose adding stops or notifying drivers.</div>`;
    }
  }

  function addStopToRoute(){
    const sel = document.getElementById('routeSelectForChange');
    const places = listPlaces();
    const out = document.getElementById('routeChangeOutput');
    if(!sel || !out) return;
    const route = sel.value; if(!route){ alert('Select a route first'); return; }
    if(places.length === 0){ alert('No saved places to add. Add a place first.'); return; }
    // pick last saved place as selected
    const place = places[places.length-1];
    // store proposal
    const proposals = JSON.parse(localStorage.getItem('scta_route_changes')||'[]');
    proposals.push({route, action: 'add_stop', place, ts: new Date().toISOString()});
    localStorage.setItem('scta_route_changes', JSON.stringify(proposals));
    out.innerHTML = `<div class="alert alert-success small mb-0">Proposed to add stop <strong>${place.name}</strong> to route <strong>${route}</strong>. Proposal saved.</div>`;
    // show on map if available
    if(window.map && place.lat && place.lng && window.L){
      const m = L.marker([place.lat, place.lng]).addTo(window.map);
      m.bindPopup(`${place.name} (proposed stop)`).openPopup();
      setTimeout(()=>{ try{ window.map.removeLayer(m); }catch(e){} }, 8000);
    }
  }

  function suggestAlternateMode(){
    const sel = document.getElementById('routeSelectForChange');
    const out = document.getElementById('routeChangeOutput');
    if(!sel || !out) return;
    const route = sel.value; if(!route){ alert('Select a route first'); return; }
    // Provide options
    const modes = ['Shuttle Pooling','Walk+Short Transfer','Cycle+Park','Cab/Ride-hailing','Metro+Feeder'];
    let html = '<div class="small">Suggested alternate modes for <strong>' + route + '</strong>:<ul class="ps-3 mb-0">';
    modes.forEach(m=>{ html += `<li>${m} — <button class="btn btn-sm btn-outline-secondary ms-2" onclick="(function(){window.routeChangeAction && window.routeChangeAction('${route}','${m}');})();">Plan</button></li>`; });
    html += '</ul></div>';
    out.innerHTML = html;
    // expose a helper to handle plan clicks
    window.routeChangeAction = function(routeStr, mode){
      const proposals = JSON.parse(localStorage.getItem('scta_route_changes')||'[]');
      proposals.push({route: routeStr, action: 'switch_mode', mode: mode, ts: new Date().toISOString()});
      localStorage.setItem('scta_route_changes', JSON.stringify(proposals));
      if(window.showNotification) window.showNotification('Alternate mode suggested: ' + mode, 'info');
      document.getElementById('routeChangeOutput').innerHTML = `<div class="alert alert-success small">Alternate mode <strong>${mode}</strong> suggested for <strong>${routeStr}</strong>.</div>`;
    };
  }

  function showRouteOnMap(){
    const sel = document.getElementById('routeSelectForChange');
    const out = document.getElementById('routeChangeOutput');
    if(!sel || !out) return;
    const route = sel.value; if(!route){ alert('Select a route first'); return; }
    const parts = route.split(' → ');
    const origin = parts[0]; const dest = parts[1];
    const intents = (window.QRIntent && QRIntent.listIntents && QRIntent.listIntents()) || [];
    // find a representative intent for origin/dest with coords
    const rep = intents.find(i => (i.origin === origin && i.dest === dest) && i.lat && i.lng);
    if(rep && window.map && window.L){
      try{
        const oLat = rep.lat; const oLng = rep.lng;
        const d = intents.find(i => i.dest === dest && i.lat && i.lng);
        const dLat = d ? d.lat : oLat + 0.001; const dLng = d ? d.lng : oLng + 0.001;
        const poly = L.polyline([[oLat,oLng],[dLat,dLng]], {color:'blue'}).addTo(window.map);
        window.map.fitBounds(poly.getBounds(), {maxZoom:15});
        setTimeout(()=>{ try{ window.map.removeLayer(poly); }catch(e){} }, 12000);
        out.innerHTML = `<div class="alert alert-success small mb-0">Route shown on map briefly.</div>`;
      }catch(e){ out.innerHTML = '<div class="alert alert-danger small">Could not render route on map</div>'; }
    } else {
      out.innerHTML = '<div class="alert alert-info small">Coordinates not available to show this route on map.</div>';
    }
  }

  function notifyDriversOfChange(){
    const sel = document.getElementById('routeSelectForChange');
    const out = document.getElementById('routeChangeOutput');
    if(!sel || !out) return;
    const route = sel.value; if(!route){ alert('Select a route first'); return; }
    // Create a short message and open WhatsApp compose with no number
    const message = `Proposed route change for ${route}: please review and confirm.\nReply with CONFIRM or QUERY.`;
    const encoded = encodeURIComponent(message);
    // open WhatsApp Web to let admin paste and send
    const url = `https://wa.me/?text=${encoded}`;
    try{
      window.open(url, '_blank');
      out.innerHTML = `<div class="alert alert-success small">WhatsApp composer opened for broadcasting the proposed change.</div>`;
    }catch(e){ out.innerHTML = `<div class="alert alert-danger small">Could not open WhatsApp composer.</div>`; }
  }

  function initUI(){
    const addBtn = document.getElementById('addPlaceBtn');
    const suggestBtn = document.getElementById('suggestMergeBtn');
    const addStopBtn = document.getElementById('addStopToRouteBtn');
    const modeBtn = document.getElementById('switchModeBtn');
    const showBtn = document.getElementById('showOnMapBtn');
    const notifyBtn = document.getElementById('notifyDriversOfChangeBtn');

    if(addBtn) addBtn.addEventListener('click', addPlaceFromUI);
    if(suggestBtn) suggestBtn.addEventListener('click', suggestMergeForSelected);
    if(addStopBtn) addStopBtn.addEventListener('click', addStopToRoute);
    if(modeBtn) modeBtn.addEventListener('click', suggestAlternateMode);
    if(showBtn) showBtn.addEventListener('click', showRouteOnMap);
    if(notifyBtn) notifyBtn.addEventListener('click', notifyDriversOfChange);

    populateRouteSelect();
    renderPlacesList();

    // refresh route list periodically
    setInterval(populateRouteSelect, 15*1000);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>{ initUI(); }, 300);
  });
})();
