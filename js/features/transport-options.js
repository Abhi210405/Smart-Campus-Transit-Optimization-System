// Transport Options feature - suggests transportation modes for a given region or route
(function(){
  const STORAGE_KEY = 'scta_last_region';
  // Basic list of Indian states/UTs and sample major cities per state for autocomplete
  const STATES = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry'
  ];

  const STATE_CITIES = {
    'Uttar Pradesh': ['Greater Noida','Lucknow','Kanpur','Varanasi','Agra','Ghaziabad','Noida'],
    'Delhi': ['New Delhi','Central Delhi','South Delhi','Noida','Gurgaon'],
    'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Thane'],
    'Karnataka': ['Bengaluru','Mysore','Mangalore','Hubli'],
    'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Salem'],
    'West Bengal': ['Kolkata','Howrah','Durgapur','Siliguri'],
    'Telangana': ['Hyderabad','Warangal'],
    'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot'],
    'Rajasthan': ['Jaipur','Jodhpur','Udaipur'],
    'Punjab': ['Chandigarh','Ludhiana','Amritsar'],
    'Haryana': ['Gurgaon','Faridabad','Panipat'],
    'Madhya Pradesh': ['Bhopal','Indore','Gwalior'],
    'Bihar': ['Patna','Gaya'],
    'Odisha': ['Bhubaneswar','Cuttack'],
    'Assam': ['Guwahati'],
    'Kerala': ['Thiruvananthapuram','Kozhikode','Kochi'],
    'Jharkhand': ['Ranchi','Jamshedpur'],
    'Punjab': ['Chandigarh','Ludhiana','Amritsar']
  };

  function nearestPlaceMatch(name){
    const places = JSON.parse(localStorage.getItem('scta_places') || '[]');
    if(!name || places.length === 0) return null;
    name = name.toLowerCase();
    // find exact or partial match
    for(const p of places){ if(p.name && p.name.toLowerCase() === name) return p; }
    for(const p of places){ if(p.name && p.name.toLowerCase().includes(name)) return p; }
    return null;
  }

  function analyzeRouteOptions(state, city, origin, dest){
    // Heuristic-driven options
    const intents = (window.QRIntent && QRIntent.listIntents && QRIntent.listIntents()) || [];
    const options = new Set();

    // Base options always available
    options.add('Campus Shuttle');
    options.add('Walking (if short)');
    options.add('Cycle / Bike');
    options.add('Ride-hailing / Cab');
    options.add('Shared Auto / Tuk-tuk');

    // If origin/dest or city/state present in intents, prefer pooling and shuttle
    const matching = intents.filter(i => {
      const o = (i.origin||'').toLowerCase();
      const d = (i.dest||'').toLowerCase();
      const cityMatch = (city && ((i.pickupLocation||'').toLowerCase().includes(city.toLowerCase())));
      const stateMatch = false; // state rarely present in intents, kept for future
      return (origin && (o.includes(origin.toLowerCase())||o===origin.toLowerCase())) || (dest && (d.includes(dest.toLowerCase())||d===dest.toLowerCase())) || cityMatch || stateMatch;
    });
    if(matching.length >= 3){
      options.add('Shuttle Pooling (High demand)');
    }

    // If any place has coordinates, compute approximate distance
    const originPlace = nearestPlaceMatch(origin);
    const destPlace = nearestPlaceMatch(dest);
    if(originPlace && destPlace && originPlace.lat && destPlace.lat){
      const dKm = haversineKm(originPlace.lat, originPlace.lng, destPlace.lat, destPlace.lng);
      if(dKm < 1){ // under 1km - walking/cycle
        options.add('Walking (Recommended)');
        options.add('Cycle / Bike (Quick)');
      } else if(dKm < 5){
        options.add('Cycle + Short Transfer');
        options.add('E-scooter / Bike-share');
      } else if(dKm < 15){
        options.add('Shuttle / Minibus');
        options.add('Ride-hailing');
      } else {
        options.add('Inter-campus Shuttle (Long)');
        options.add('Cab / Carpool');
      }
    }

    // If seats requested high, prioritize shuttle/carpool
    const totalSeats = matching.reduce((s,i)=>s+(i.seats||1),0);
    if(totalSeats >= 8) options.add('Deploy Extra Shuttle');

    // Return array
    return {options: Array.from(options), sampleMatches: matching.slice(0,6)};
  }

  function populateStateDatalist(){
    const dl = document.getElementById('stateList');
    if(!dl) return;
    dl.innerHTML = '';
    STATES.forEach(s => { const o = document.createElement('option'); o.value = s; dl.appendChild(o); });
  }

  function populateCityDatalistForState(state){
    const dl = document.getElementById('cityList');
    if(!dl) return;
    dl.innerHTML = '';
    const cities = (STATE_CITIES[state] || []);
    // also include saved places' cities
    const places = JSON.parse(localStorage.getItem('scta_places')||'[]');
    const extra = new Set();
    places.forEach(p=>{ if(p.name) extra.add(p.name); });
    cities.forEach(c => { const o = document.createElement('option'); o.value = c; dl.appendChild(o); });
    extra.forEach(e => { const o = document.createElement('option'); o.value = e; dl.appendChild(o); });
  }

  function haversineKm(lat1, lon1, lat2, lon2){
    function toRad(x){ return x * Math.PI / 180; }
    const R = 6371; // km
    const dLat = toRad(lat2-lat1);
    const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function renderResults(container, state, city, origin, dest){
    const out = document.getElementById('transportOptionsOutput');
    if(!out) return;
    out.innerHTML = '<div class="text-muted small">Calculating options...</div>';
    setTimeout(()=>{
      const res = analyzeRouteOptions(state, city, origin, dest);
      let html = '<div class="small">';
      html += `<div><strong>Suggested transport options for <em>${state ? state + ' / ' : ''}${city ? city + ' — ' : ''}${origin||'(any)'} → ${dest||'(any)'}</em>:</strong></div>`;
      // render each option with Travel and Reroute actions
      html += '<div class="mt-2">';
      res.options.forEach((o, idx)=>{
        html += `<div class="d-flex align-items-center mb-1"><div class="flex-grow-1">• ${o}</div><div class="btn-group btn-group-sm ms-2" role="group"><button class="btn btn-outline-success" id="transport_travel_${idx}">Travel</button><button class="btn btn-outline-warning" id="transport_reroute_${idx}">Reroute</button></div></div>`;
      });
      html += '</div>';
      if(res.sampleMatches && res.sampleMatches.length>0){
        html += '<div class="mt-2"><strong>Recent matching intents (sample):</strong><ul class="ps-3">';
        res.sampleMatches.forEach(s=>{ html += `<li>${s.origin} → ${s.dest} — ${s.seats} seats @ ${s.timeSlot||'N/A'}</li>`; });
        html += '</ul></div>';
      }
      html += '<div class="mt-2"><button class="btn btn-sm btn-outline-primary" id="transportNotifyDriversBtn">Notify Drivers</button> <button class="btn btn-sm btn-outline-secondary ms-2" id="transportShowOnMapBtn">Show on Map</button></div>';
      html += '</div>';
      out.innerHTML = html;

      // wire actions
      const notifyBtn = document.getElementById('transportNotifyDriversBtn');
      if(notifyBtn){ notifyBtn.addEventListener('click', ()=>{
        const msg = `Demand alert (${state||'N/A'}, ${city||'N/A'}): Suggested transport options for ${origin || 'region'} → ${dest || 'region'}: ${res.options.join(', ')}.`;
        const enc = encodeURIComponent(msg);
        window.open(`https://wa.me/?text=${enc}`, '_blank');
        if(window.showNotification) window.showNotification('WhatsApp composer opened to notify drivers', 'info');
      }); }

      const mapBtn = document.getElementById('transportShowOnMapBtn');
      if(mapBtn){ mapBtn.addEventListener('click', async ()=>{
        const statusEl = document.getElementById('transportGeoStatus');
        if(statusEl) statusEl.textContent = 'Resolving coordinates...';
        if(!window.map || !window.L){ if(statusEl) statusEl.textContent = 'Map not available.'; alert('Map not available in this environment.'); return; }

        // cleanup previous temporary layers for transport options
        if(!window._transportTempLayers) window._transportTempLayers = [];
        function clearTempLayers(){ try{ (window._transportTempLayers||[]).forEach(x=>{ if(window.map && x) { window.map.removeLayer(x); } }); window._transportTempLayers = []; }catch(e){} }
        clearTempLayers();

        async function resolveCoords(query, city, state){
          if(!query) return null;
          const p = nearestPlaceMatch(query);
          if(p && p.lat && p.lng) return {lat: parseFloat(p.lat), lng: parseFloat(p.lng), source: 'local'};
          // Nominatim geocoding fallback with small retries
          const variants = [query, query + (city ? (', ' + city) : ''), query + (city ? (', ' + city) : '') + (state ? (', ' + state) : '')];
          for(const qRaw of variants){
            try{
              if(statusEl) statusEl.textContent = `Geocoding "${qRaw}"...`;
              const q = encodeURIComponent(qRaw);
              const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`;
              const resp = await fetch(url, {headers: {'Accept':'application/json'}});
              if(resp.ok){
                const data = await resp.json();
                if(data && data.length>0){
                  return {lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), source: 'nominatim'};
                }
              }
            }catch(e){ console.warn('Geocode error', e); }
            // small pause between attempts
            await new Promise(r=>setTimeout(r, 200));
          }
          return null;
        }

        try{
          if(statusEl) statusEl.textContent = 'Resolving origin...';
          let oCoords = await resolveCoords(origin, city, state);
          if(statusEl) statusEl.textContent = 'Resolving destination...';
          let dCoords = await resolveCoords(dest, city, state);

          // If both missing, try to infer from sampleMatches in analyzeRouteOptions
          if(!oCoords || !dCoords){
            const res = analyzeRouteOptions(state, city, origin, dest);
            if((!oCoords) && res.sampleMatches && res.sampleMatches.length>0){
              const rep = res.sampleMatches.find(s=>s.lat && s.lng) || res.sampleMatches[0];
              if(rep){ oCoords = rep.lat && rep.lng ? {lat: parseFloat(rep.lat), lng: parseFloat(rep.lng), source: 'intent'} : oCoords; }
            }
            if((!dCoords) && res.sampleMatches && res.sampleMatches.length>0){
              const repD = res.sampleMatches.slice().reverse().find(s=>s.lat && s.lng) || res.sampleMatches[0];
              if(repD){ dCoords = repD.lat && repD.lng ? {lat: parseFloat(repD.lat), lng: parseFloat(repD.lng), source: 'intent'} : dCoords; }
            }
          }

          // If still missing, try geocoding city center as fallback
          if(!oCoords && city){ if(statusEl) statusEl.textContent = 'Resolving city center for origin...'; oCoords = await resolveCoords(city, city, state); }
          if(!dCoords && city){ if(statusEl) statusEl.textContent = 'Resolving city center for destination...'; dCoords = await resolveCoords(city, city, state); }

          if(oCoords && dCoords){
            if(statusEl) statusEl.textContent = 'Both coordinates resolved. Rendering on map...';
            const poly = L.polyline([[oCoords.lat, oCoords.lng], [dCoords.lat, dCoords.lng]], {color:'blue'}).addTo(window.map);
            const mo = L.marker([oCoords.lat, oCoords.lng]).addTo(window.map); mo.bindPopup(origin || 'Origin');
            const md = L.marker([dCoords.lat, dCoords.lng]).addTo(window.map); md.bindPopup(dest || 'Destination');
            window._transportTempLayers.push(poly, mo, md);
            try{ mo.openPopup(); }catch(e){}
            window.map.fitBounds(poly.getBounds(), {maxZoom:15});
            setTimeout(()=>{ clearTempLayers(); if(statusEl) statusEl.textContent = ''; }, 14000);
            return;
          }

          if(oCoords){
            if(statusEl) statusEl.textContent = 'Origin resolved. Showing on map.';
            const m = L.marker([oCoords.lat, oCoords.lng]).addTo(window.map); m.bindPopup(origin || 'Origin').openPopup(); window._transportTempLayers.push(m);
            window.map.setView([oCoords.lat, oCoords.lng], 15);
            setTimeout(()=>{ clearTempLayers(); if(statusEl) statusEl.textContent = ''; }, 10000); return;
          }
          if(dCoords){
            if(statusEl) statusEl.textContent = 'Destination resolved. Showing on map.';
            const m = L.marker([dCoords.lat, dCoords.lng]).addTo(window.map); m.bindPopup(dest || 'Destination').openPopup(); window._transportTempLayers.push(m);
            window.map.setView([dCoords.lat, dCoords.lng], 15);
            setTimeout(()=>{ clearTempLayers(); if(statusEl) statusEl.textContent = ''; }, 10000); return;
          }

          if(statusEl) statusEl.textContent = 'No coordinates found for origin/destination.';
          alert('No coordinates available for the provided region. Try adding places or a more specific name.');
        }catch(err){ console.error('Show on map failed', err); clearTempLayers(); if(statusEl) statusEl.textContent = 'Failed to show route on map'; alert('Failed to show route on map'); }
      }); }

      // helper: show inline booking form
      function showBookingForm(option, idx){
        // remove existing form
        const existing = document.getElementById('transportBookingForm'); if(existing) existing.remove();
        const form = document.createElement('div'); form.id = 'transportBookingForm';
        form.className = 'card card-body mt-3 p-2 small';
        form.innerHTML = `
          <div class="mb-2"><strong>Book: ${option}</strong></div>
          <div class="row g-2">
            <div class="col-6"><input class="form-control form-control-sm" id="bookingName" placeholder="Your name"></div>
            <div class="col-6"><input class="form-control form-control-sm" id="bookingPhone" placeholder="Phone number"></div>
            <div class="col-4 mt-2"><input class="form-control form-control-sm" id="bookingSeats" type="number" min="1" value="1" placeholder="Seats"></div>
            <div class="col-8 mt-2"><input class="form-control form-control-sm" id="bookingTime" type="text" placeholder="Preferred time (e.g. 08:30)"></div>
          </div>
          <div class="mt-2"><button class="btn btn-sm btn-primary me-2" id="bookingSaveBtn">Save Booking</button><button class="btn btn-sm btn-secondary" id="bookingCancelBtn">Cancel</button></div>
        `;
        const outEl = document.getElementById('transportOptionsOutput'); if(!outEl) return; outEl.appendChild(form);
        document.getElementById('bookingCancelBtn').addEventListener('click', ()=>{ form.remove(); });
        document.getElementById('bookingSaveBtn').addEventListener('click', ()=>{
          const name = (document.getElementById('bookingName').value||'').trim();
          const phone = (document.getElementById('bookingPhone').value||'').trim();
          const seats = parseInt(document.getElementById('bookingSeats').value||'1');
          const time = (document.getElementById('bookingTime').value||'').trim();
          if(!name || !phone){ alert('Please provide name and phone'); return; }
          try{
            const bookings = JSON.parse(localStorage.getItem('scta_bookings')||'[]');
            const booking = {mode: option, name, phone, seats, time, origin: origin||null, dest: dest||null, city: city||null, state: state||null, ts: new Date().toISOString()};
            bookings.push(booking);
            localStorage.setItem('scta_bookings', JSON.stringify(bookings));
            if(window.showNotification) window.showNotification('Booking saved', 'success');
            form.remove();
            const msgEl = document.createElement('div'); msgEl.className='small text-success mt-2'; msgEl.textContent = `Booking saved for ${option}`; outEl.appendChild(msgEl);
            // open WhatsApp to the entered contact number with a confirmation message
            try{
              const message = `Booking confirmed: ${option} ${origin||''} → ${dest||''} for ${name}. Seats:${seats}. Time:${time || 'TBD'}`;
              const enc = encodeURIComponent(message);
              // normalize phone: remove non-digits
              let digits = (phone || '').replace(/\D/g, '');
              if(digits.length === 10){ digits = '91' + digits; }
              else if(digits.length > 10 && digits.startsWith('0')){ digits = digits.replace(/^0+/, ''); }
              // fallback: if still empty, open generic wa.me composer
              let url;
              if(digits && digits.length >= 8){
                url = `https://wa.me/${digits}?text=${enc}`;
              } else {
                url = `https://wa.me/?text=${enc}`;
              }
              // open a blank window first to reduce popup-blocking
              const win = window.open('about:blank', '_blank');
              try{ if(win) win.location = url; else window.open(url, '_blank'); }catch(e){ window.open(url, '_blank'); }
            }catch(e){ console.warn('Could not open WhatsApp composer', e); }
          }catch(e){ console.error('Booking save failed', e); alert('Could not save booking'); }
        });
      }

      // wire travel, reroute and book buttons
      res.options.forEach((opt, idx) => {
        const idTravel = `transport_travel_${idx}`;
        const idReroute = `transport_reroute_${idx}`;
        const idBook = `transport_book_${idx}`;
        const travelBtn = document.getElementById(idTravel);
        const rerouteBtn = document.getElementById(idReroute);
        const bookBtn = document.getElementById(idBook);
        if(travelBtn){
          travelBtn.addEventListener('click', ()=>{
            // map option to travelmode
            const mapMode = (function(option){
              const o = option.toLowerCase();
              if(o.includes('walk')) return 'walking';
              if(o.includes('cycle') || o.includes('bike') || o.includes('bicycle')) return 'bicycling';
              if(o.includes('shuttle') || o.includes('transit') || o.includes('minibus')) return 'transit';
              return 'driving';
            })(opt);

            function paramFor(q){
              if(!q) return '';
              const p = nearestPlaceMatch(q);
              if(p && p.lat && p.lng) return `${p.lat},${p.lng}`;
              return encodeURIComponent(q + (city ? (', ' + city) : '') + (state ? (', ' + state) : ''));
            }

            const oParam = paramFor(origin) || '';
            const dParam = paramFor(dest) || '';
            if(!oParam || !dParam){
              alert('Origin or destination missing or unresolved for travel link');
              return;
            }
            const url = `https://www.google.com/maps/dir/?api=1&origin=${oParam}&destination=${dParam}&travelmode=${mapMode}`;
            window.open(url, '_blank');
          });
        }

        if(rerouteBtn){
          rerouteBtn.addEventListener('click', ()=>{
            try{
              const proposals = JSON.parse(localStorage.getItem('scta_route_changes')||'[]');
              const proposal = {action: 'reroute', route: `${origin||'(any)'} → ${dest||'(any)'}`, option: opt, state: state||null, city: city||null, ts: new Date().toISOString()};
              proposals.push(proposal);
              localStorage.setItem('scta_route_changes', JSON.stringify(proposals));
              if(window.showNotification) window.showNotification('Reroute proposal saved', 'success');
              const outEl = document.getElementById('transportOptionsOutput'); if(outEl) outEl.insertAdjacentHTML('beforeend', `<div class="small text-success mt-2">Reroute proposed: ${opt}</div>`);
              try{ if(window.RouteChangeAdminRefresh && typeof window.RouteChangeAdminRefresh === 'function') window.RouteChangeAdminRefresh(); }catch(e){}
            }catch(e){ console.error('Save reroute failed', e); alert('Could not save reroute proposal'); }
          });
        }
        if(bookBtn){
          bookBtn.addEventListener('click', ()=>{ showBookingForm(opt, idx); });
        }
      });
    }, 200);
  }

  function initUI(){
    const openBtn = document.getElementById('openTransportOptionsBtn');
    const widget = document.getElementById('transportOptionsModal');
    const modalOpen = document.getElementById('transportOptionsModal');
    const stateEl = document.getElementById('transportState');
    const cityEl = document.getElementById('transportCity');
    const originEl = document.getElementById('transportOrigin');
    const destEl = document.getElementById('transportDest');
    const submitBtn = document.getElementById('transportFindBtn');
    const out = document.getElementById('transportOptionsOutput');

    if(openBtn){ openBtn.addEventListener('click', ()=>{ try{ showTransportModal(); }catch(e){ alert('Could not open transport options'); } }); }

    function showTransportModal(){
      let modal = document.getElementById('transportOptionsModal');
      if(!modal) return;
      modal.style.display = 'block';
      modal.classList.add('show');
      const last = localStorage.getItem(STORAGE_KEY);
      if(last){ try{ const obj = JSON.parse(last); if(obj.state) stateEl.value = obj.state; if(obj.city) cityEl.value = obj.city; if(obj.origin) originEl.value = obj.origin; if(obj.dest) destEl.value = obj.dest; }catch(e){} }
      originEl.focus();
      // populate state/city datalists
      try{ populateStateDatalist(); if(stateEl && stateEl.value) populateCityDatalistForState(stateEl.value); }catch(e){}
    }

    // close handlers
    document.addEventListener('click', function(e){ if(e.target && e.target.id === 'transportOptionsClose'){
      const modal = document.getElementById('transportOptionsModal'); if(modal){ modal.style.display='none'; modal.classList.remove('show'); }
    }});

    // when state input changes, populate city suggestions
    if(stateEl){ stateEl.addEventListener('input', (e)=>{ try{ populateCityDatalistForState(stateEl.value.trim()); }catch(err){} }); }

    if(submitBtn){ submitBtn.addEventListener('click', ()=>{
      const state = stateEl.value.trim(); const city = cityEl.value.trim();
      const origin = originEl.value.trim(); const dest = destEl.value.trim();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({state,city,origin,dest}));
      renderResults(out, state, city, origin, dest);
    }); }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(initUI, 300); });
})();
