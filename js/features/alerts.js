// Driver alerts: open WhatsApp / SMS links or simulate send
const AlertsModule = (function(){
  function sendWhatsApp(phone, text){
    // phone should be in international format without +
    const p = phone.replace(/[^0-9]/g,'');
    const url = `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
    window.open(url,'_blank');
  }

  function sendSMS(phone, text){
    const p = phone.replace(/[^0-9]/g,'');
    const url = `sms:${p}?body=${encodeURIComponent(text)}`;
    window.location.href = url;
  }

  function initUI(){
    const btn = document.getElementById('sendAlertBtn');
    btn && btn.addEventListener('click', ()=>{
      const phone = document.getElementById('alertPhone').value;
      const text = document.getElementById('alertMsg').value || 'Please be advised.';
      if(!phone){ alert('Enter driver phone'); return; }
      // prefer WhatsApp
      sendWhatsApp(phone, text);
    });
  }

  return {sendWhatsApp, sendSMS, initUI};
})();

document.addEventListener('DOMContentLoaded', ()=>{ if(window.AlertsModule) AlertsModule.initUI(); });
