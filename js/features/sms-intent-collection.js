// SMS-based Rider Intent Collection
const SMSIntentCollection = (function(){
  
  function parseIntentFromSMS(message){
    // Simple parsing: expects format like "from Boys Hostel to Galgotias 2 seats"
    const patterns = {
      from: /(?:from|at|starting)\s+([^,\n]+)/i,
      to: /(?:to|going|destination)\s+([^,\n]+)/i,
      seats: /(\d+)\s+(?:seats?|people|persons)/i,
      time: /(\d{1,2}):?(\d{2})?\s*(?:am|pm)?/i
    };

    const intent = {
      ts: Date.now(),
      smsReceived: true
    };

    // Extract origin
    const fromMatch = message.match(patterns.from);
    if(fromMatch) intent.origin = fromMatch[1].trim();

    // Extract destination
    const toMatch = message.match(patterns.to);
    if(toMatch) intent.dest = toMatch[1].trim();

    // Extract seats
    const seatsMatch = message.match(patterns.seats);
    intent.seats = seatsMatch ? parseInt(seatsMatch[1]) : 1;

    // Extract time slot
    const timeMatch = message.match(patterns.time);
    if(timeMatch){
      let hour = parseInt(timeMatch[1]);
      const min = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      intent.timeSlot = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }

    // Auto-assign common locations if recognized
    intent.lat = getLatForLocation(intent.origin) || 0;
    intent.lng = getLngForLocation(intent.origin) || 0;

    return intent;
  }

  function getLatForLocation(location){
    const coords = {
      'Boys Hostel': 30.33,
      'Girls Hostel': 30.327,
      'PG Block': 30.3285,
      'Library': 30.327,
      'University': 30.33,
      'Galgotias': 30.33
    };
    
    for(let key in coords){
      if(location && location.toLowerCase().includes(key.toLowerCase())){
        return coords[key];
      }
    }
    return null;
  }

  function getLngForLocation(location){
    const coords = {
      'Boys Hostel': 76.385,
      'Girls Hostel': 76.3855,
      'PG Block': 76.384,
      'Library': 76.3855,
      'University': 76.385,
      'Galgotias': 76.385
    };
    
    for(let key in coords){
      if(location && location.toLowerCase().includes(key.toLowerCase())){
        return coords[key];
      }
    }
    return null;
  }

  function submitSMSIntent(){
    const messageEl = document.getElementById('smsMessageInput');
    const fromEl = document.getElementById('smsFrom');
    const toEl = document.getElementById('smsTo');
    const seatsEl = document.getElementById('smsSeats');
    const timeEl = document.getElementById('smsTime');

    if(!messageEl && (!fromEl || !toEl)){
      alert('Please enter required fields');
      return;
    }

    let intent = {};

    // Try to parse from free-text message first
    if(messageEl && messageEl.value){
      intent = parseIntentFromSMS(messageEl.value);
    }

    // Override with form fields if provided
    if(fromEl && fromEl.value) intent.origin = fromEl.value;
    if(toEl && toEl.value) intent.dest = toEl.value;
    if(seatsEl && seatsEl.value) intent.seats = parseInt(seatsEl.value) || 1;
    if(timeEl && timeEl.value) intent.timeSlot = timeEl.value;

    // Validate
    if(!intent.origin || !intent.dest){
      alert('Please provide both origin and destination');
      return;
    }

    // Add date
    intent.date = document.querySelector('input[type="date"]')?.value || new Date().toISOString().split('T')[0];

    // Save via QRIntent if available
    if(window.QRIntent && typeof QRIntent.saveIntent === 'function'){
      const saved = QRIntent.saveIntent(intent);
      if(window.showNotification) window.showNotification('✅ Your demand has been recorded! Thank you.', 'success');
      
      // Clear form
      if(messageEl) messageEl.value = '';
      if(fromEl) fromEl.value = '';
      if(toEl) toEl.value = '';
      if(seatsEl) seatsEl.value = '1';
      if(timeEl) timeEl.value = '09:00';

      // Refresh dashboard
      if(window.DemandDashboard && typeof DemandDashboard.renderDashboard === 'function'){
        const container = document.getElementById('demandDashboard');
        if(container) DemandDashboard.renderDashboard(container);
      }

      return true;
    }
  }

  function initUI(){
    const submitBtn = document.getElementById('submitSMSIntentBtn');
    const messageEl = document.getElementById('smsMessageInput');

    if(submitBtn){
      submitBtn.addEventListener('click', submitSMSIntent);
    }

    // Allow submit on Enter
    if(messageEl){
      messageEl.addEventListener('keypress', (e) => {
        if(e.key === 'Enter' && e.ctrlKey){
          submitSMSIntent();
        }
      });
    }
  }

  return { 
    parseIntentFromSMS, 
    submitSMSIntent, 
    initUI 
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if(window.SMSIntentCollection && typeof SMSIntentCollection.initUI === 'function'){
      SMSIntentCollection.initUI();
    }
  }, 300);
});

document.addEventListener('DOMContentLoaded', () => {
  if(window.SMSIntentCollection && typeof SMSIntentCollection.initUI === 'function'){
    SMSIntentCollection.initUI();
  }
});
