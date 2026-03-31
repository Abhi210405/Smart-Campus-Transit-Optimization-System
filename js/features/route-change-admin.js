// Admin panel to review route-change proposals saved in localStorage
(function(){
  const STORAGE_KEY = 'scta_route_changes';

  function listProposals(){
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  function renderProposals(){
    const container = document.getElementById('routeProposalsList');
    if(!container) return;
    const proposals = listProposals();
    if(proposals.length === 0){ container.innerHTML = '<div class="text-muted small">No proposals yet.</div>'; return; }
    let html = '<div class="list-group">';
    proposals.forEach((p, idx)=>{
      const summary = p.action === 'add_stop' ? `Add stop ${p.place.name} to ${p.route}` : p.action === 'switch_mode' ? `Switch ${p.route} to ${p.mode}` : `Proposal: ${p.action} on ${p.route}`;
      html += `<label class="list-group-item d-flex align-items-start"><input type="radio" name="proposalSel" value="${idx}" class="me-2 mt-1"> <div><strong>${summary}</strong><div class="small text-muted">${new Date(p.ts).toLocaleString()}</div></div></label>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function getSelectedIndex(){
    const el = document.querySelector('input[name="proposalSel"]:checked');
    return el ? parseInt(el.value, 10) : -1;
  }

  function acceptSelected(){
    const idx = getSelectedIndex();
    if(idx < 0){ alert('Select a proposal first'); return; }
    const proposals = listProposals();
    const p = proposals[idx];
    // For now, accepting will mark as accepted and remove from proposals list
    proposals.splice(idx,1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
    renderProposals();
    if(window.showNotification) window.showNotification('Proposal accepted — changes recorded', 'success');
    // Optionally persist accepted changes separately
    const accepted = JSON.parse(localStorage.getItem('scta_route_changes_accepted')||'[]');
    accepted.push(Object.assign({}, p, {acceptedAt: new Date().toISOString()}));
    localStorage.setItem('scta_route_changes_accepted', JSON.stringify(accepted));
  }

  function rejectSelected(){
    const idx = getSelectedIndex();
    if(idx < 0){ alert('Select a proposal first'); return; }
    const proposals = listProposals();
    const p = proposals.splice(idx,1)[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
    renderProposals();
    if(window.showNotification) window.showNotification('Proposal rejected', 'warning');
    const rejected = JSON.parse(localStorage.getItem('scta_route_changes_rejected')||'[]');
    rejected.push(Object.assign({}, p, {rejectedAt: new Date().toISOString()}));
    localStorage.setItem('scta_route_changes_rejected', JSON.stringify(rejected));
  }

  function sendSelectedToDriver(){
    const idx = getSelectedIndex();
    if(idx < 0){ alert('Select a proposal first'); return; }
    const proposals = listProposals();
    const p = proposals[idx];
    const message = `Proposed change: ${p.action} for ${p.route} — please review and respond.`;
    const encoded = encodeURIComponent(message);
    try{
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
      if(window.showNotification) window.showNotification('WhatsApp composer opened to send proposal', 'info');
    }catch(e){ console.error(e); alert('Could not open WhatsApp composer'); }
  }

  function initUI(){
    const accept = document.getElementById('acceptProposalBtn');
    const reject = document.getElementById('rejectProposalBtn');
    const send = document.getElementById('sendProposalToDriverBtn');
    if(accept) accept.addEventListener('click', acceptSelected);
    if(reject) reject.addEventListener('click', rejectSelected);
    if(send) send.addEventListener('click', sendSelectedToDriver);
    renderProposals();
    // refresh periodically
    setInterval(renderProposals, 10*1000);
  }

  document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(initUI, 300); });
})();
