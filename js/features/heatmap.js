// Heatmap generator using leaflet and leaflet.heat
const HeatmapModule = (function(){
  let heatLayer = null;

  function pointsFromIntents(intents){
    return intents.map(i=>[i.lat||0, i.lng||0, 0.6]);
  }

  function refresh(map){
    if(!map) return;
    const intents = (window.QRIntent && QRIntent.listIntents && QRIntent.listIntents()) || [];
    const points = pointsFromIntents(intents).filter(p=>p[0]!==0 || p[1]!==0);
    if(heatLayer){ map.removeLayer(heatLayer); heatLayer=null; }
    if(points.length>0 && window.L && window.heatLayer){
      heatLayer = L.heatLayer(points, {radius: 25, blur: 15}).addTo(map);
    } else if(points.length>0 && window.L){
      // try loading plugin global
      if(window.L.heatLayer){ heatLayer = window.L.heatLayer(points).addTo(map); }
    }
  }

  return {refresh};
})();

document.addEventListener('DOMContentLoaded', ()=>{ if(window.map && window.HeatmapModule) HeatmapModule.refresh(window.map); });
