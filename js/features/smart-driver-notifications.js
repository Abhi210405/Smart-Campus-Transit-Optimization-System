// Smart Driver Notification System - Auto-generates route recommendations
const SmartDriverNotifications = (function(){
  
  function generateDriverRecommendation(){
    const intents = (window.QRIntent && QRIntent.listIntents && QRIntent.listIntents()) || [];
    
    if(intents.length < 3) return null;

    // Analyze current demand
    const routeData = {};
    intents.forEach(i => {
      const route = `${i.origin || 'Unknown'} → ${i.dest || 'Unknown'}`;
      routeData[route] = routeData[route] || [];
      routeData[route].push(i);
    });

    // Find routes with high demand
    const topRoutes = Object.entries(routeData)
      .map(([route, items]) => ({
        route,
        count: items.length,
        seats: items.reduce((sum, i) => sum + (i.seats || 1), 0),
        timeSlots: new Set(items.map(i => i.timeSlot)),
        locations: new Set(items.map(i => i.pickupLocation))
      }))
      .filter(r => r.seats >= 8)
      .sort((a, b) => b.seats - a.seats)
      .slice(0, 3);

    return {
      topRoutes,
      timestamp: new Date().toISOString(),
      urgentRoutes: topRoutes.filter(r => r.seats > 12)
    };
  }

  function formatNotificationMessage(recommendation){
    if(!recommendation || recommendation.topRoutes.length === 0){
      return 'No urgent rerouting needed at this time.';
    }

    let message = '🚌 DEMAND UPDATE - SUGGESTED REROUTES:\n\n';
    
    recommendation.topRoutes.forEach((route, idx) => {
      const priority = route.seats > 12 ? '🔴 URGENT' : '🟡 HIGH';
      message += `${idx + 1}. ${priority}\n`;
      message += `Route: ${route.route}\n`;
      message += `Demand: ${route.seats} seats (${route.count} riders)\n`;
      message += `Times: ${Array.from(route.timeSlots).join(', ')}\n`;
      message += `Action: Route additional bus or merge trips\n\n`;
    });

    message += 'Reply with confirmation or questions.';
    return message;
  }

  function sendRecommendationToDriver(phoneNumber){
    const recommendation = generateDriverRecommendation();
    if(!recommendation){
      if(window.showNotification) window.showNotification('No urgent recommendations at this time', 'info');
      return;
    }

    const message = formatNotificationMessage(recommendation);
    
    // Normalize phone for WhatsApp: digits only, no leading + or 0s; add country code if missing
    function normalizePhone(p){
      if(!p) return null;
      let s = String(p).trim();
      // remove all non-digits
      s = s.replace(/\D/g, '');
      // remove leading zeros
      while(s.length > 0 && s.charAt(0) === '0') s = s.slice(1);
      // if 10 digits assume country code 91 (India)
      if(s.length === 10) s = '91' + s;
      // if shorter than 10 or unreasonable, return null
      if(s.length < 11) return null;
      return s;
    }

    const cleanPhone = normalizePhone(phoneNumber || '');
    if(!cleanPhone){
      alert('Please enter a valid phone number (include country code or 10-digit number).');
      return;
    }

    try {
      // Use native whatsapp protocol on mobile to open app, fallback to web URL
      const encoded = encodeURIComponent(message);
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      const urlWeb = `https://wa.me/${cleanPhone}?text=${encoded}`;
      const urlMobile = `whatsapp://send?phone=${cleanPhone}&text=${encoded}`;
      const primaryUrl = isMobile ? urlMobile : urlWeb;

      console.log('WhatsApp URL (primary):', primaryUrl);

      // Open a blank window first to avoid popup blockers, then set location
      let win = null;
      try { win = window.open('about:blank', '_blank'); } catch(e) { win = null; }

      if(win){
        try {
          win.location.href = primaryUrl;
        } catch(e){
          // some browsers restrict setting location on a newly opened window; fallback
          try { win.location.href = urlWeb; } catch(err){ win.close(); window.open(urlWeb, '_blank'); }
        }
      } else {
        // As a last resort try opening directly (may be blocked)
        const opened = window.open(primaryUrl, '_blank');
        if(!opened && isMobile){
          window.open(urlWeb, '_blank');
        }
      }

      if(window.showNotification) window.showNotification('Recommendation opened in WhatsApp', 'success');
    } catch(e){
      console.error('Error sending notification:', e);
      alert('Could not open WhatsApp. Please ensure WhatsApp is installed or accessible.');
    }
  }

  function broadcastToAllDrivers(drivers){
    if(!drivers || drivers.length === 0){
      alert('No drivers configured. Add drivers to the system first.');
      return;
    }

    const recommendation = generateDriverRecommendation();
    if(!recommendation){
      if(window.showNotification) window.showNotification('No urgent recommendations to broadcast', 'info');
      return;
    }

    const message = formatNotificationMessage(recommendation);
    let successCount = 0;

    drivers.forEach(driver => {
      try {
        // normalize driver phone
        const dp = (driver.phone || '');
        const norm = (function(p){
          if(!p) return null;
          let s = String(p).trim().replace(/\D/g, '');
          while(s.length > 0 && s.charAt(0) === '0') s = s.slice(1);
          if(s.length === 10) s = '91' + s;
          if(s.length < 11) return null;
          return s;
        })(dp);
        if(!norm) return;
        const urlWeb = `https://wa.me/${norm}?text=${encodeURIComponent(message)}`;
        const urlMobile = `whatsapp://send?phone=${norm}&text=${encodeURIComponent(message)}`;
        const primary = (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) ? urlMobile : urlWeb;
        // Delay to avoid blocking
        setTimeout(() => {
          try {
            let w = null;
            try { w = window.open('about:blank', '_blank'); } catch(e){ w = null; }
            if(w){
              try{ w.location.href = primary; } catch(e){ try{ w.location.href = urlWeb; }catch(err){ w.close(); window.open(urlWeb, '_blank'); } }
            } else {
              window.open(primary, '_blank');
            }
          } catch(e){ console.error('Broadcast open failed', e); }
        }, successCount * 600);
        successCount++;
      } catch(e){
        console.error('Error sending to driver:', e);
      }
    });

    if(window.showNotification) window.showNotification(`Notification sent to ${successCount} driver(s)`, 'success');
  }

  function initUI(){
    const sendBtn = document.getElementById('sendDriverRecommendationBtn');
    const broadcastDemandsBtn = document.getElementById('broadcastAllDemandsBtn');
    const driverPhoneInput = document.getElementById('driverPhone');

    const previewEl = document.getElementById('demandRecommendationPreview');

    function updatePreview(){
      try{
        const rec = generateDriverRecommendation();
        if(!previewEl) return;
        if(!rec || !rec.topRoutes || rec.topRoutes.length === 0){
          previewEl.innerHTML = '<div class="alert alert-secondary">No high-demand routes detected right now.</div>';
          return;
        }
        let html = '';
        rec.topRoutes.forEach((r, idx) => {
          const priority = r.seats > 12 ? '🔴 URGENT' : r.seats > 10 ? '🟠 HIGH' : '🟡 MEDIUM';
          html += `<div class="mb-2"><strong>${idx+1}. ${r.route}</strong> <span class="small text-muted">(${Array.from(r.timeSlots).join(', ')})</span><div>${priority} — ${r.seats} seats requested</div></div>`;
        });
        previewEl.innerHTML = html;
      }catch(e){ console.error('Preview update failed', e); }
    }

    if(sendBtn){
      sendBtn.addEventListener('click', () => {
        const phone = driverPhoneInput ? driverPhoneInput.value : '';
        if(!phone){
          alert('Please enter driver phone number');
          return;
        }
        // update preview immediately before sending
        updatePreview();
        sendRecommendationToDriver(phone);
      });
    }

    if(broadcastDemandsBtn){
      broadcastDemandsBtn.addEventListener('click', () => {
        if(window.QRIntent && typeof QRIntent.broadcastAllDemandsToDrivers === 'function'){
          QRIntent.broadcastAllDemandsToDrivers();
        } else {
          alert('Broadcast feature not available');
        }
      });
    }

    // update preview on load and periodically
    setTimeout(updatePreview, 200);
    setInterval(updatePreview, 30 * 1000);

    // Optional: Auto-generate summary every 5 minutes
    setInterval(() => {
      const recommendation = generateDriverRecommendation();
      if(recommendation && recommendation.urgentRoutes && recommendation.urgentRoutes.length > 0){
        if(window.showNotification){
          window.showNotification(`🔴 Urgent: ${recommendation.urgentRoutes.length} routes need rerouting`, 'warning');
        }
      }
    }, 5 * 60 * 1000);
  }

  return { 
    generateDriverRecommendation, 
    formatNotificationMessage, 
    sendRecommendationToDriver,
    broadcastToAllDrivers,
    initUI 
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if(window.SmartDriverNotifications && typeof SmartDriverNotifications.initUI === 'function'){
    SmartDriverNotifications.initUI();
  }
});
