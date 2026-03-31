// Integration script for Enhanced Bus Tracker
// Add this to your existing app.js or create a new file

// Enhanced route loading function
function loadEnhancedRoute() {
    const routeSelect = document.getElementById('routeSelect');
    const selectedRouteId = routeSelect.value;

    if (!selectedRouteId) {
        clearMapData();
        updateEnhancedBusInfo(null, null);
        return;
    }

    const route = appData.routes.find(r => r.id === selectedRouteId);
    const bus = appData.buses.find(b => b.route === selectedRouteId);

    if (route && bus) {
        displayEnhancedRouteOnMap(route, bus);
        updateEnhancedBusInfo(bus, route);
        updateRouteProgress(bus, route);
        updatePassengerInsights(bus);
    }
}

// Set update frequency
function setUpdateFrequency() {
    const frequency = document.getElementById('updateFrequency').value;
    if (window.busTracker) {
        busTracker.updateFrequency = parseInt(frequency);
        busTracker.stopRealTimeTracking();
        busTracker.startRealTimeTracking();
        busTracker.showNotification(`Update frequency set to ${frequency/1000} seconds`, 'info');
    }
}

// Center map on user location
function centerMapOnUser() {
    if (window.busTracker && busTracker.userLocation && map) {
        map.setView([busTracker.userLocation.lat, busTracker.userLocation.lng], 15);

        // Add user location marker if not exists
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<i class="fas fa-user-circle text-primary"></i>',
            iconSize: [20, 20]
        });

        L.marker([busTracker.userLocation.lat, busTracker.userLocation.lng], {icon: userIcon})
         .addTo(map)
         .bindPopup('Your Location');
    }
}

// Follow bus on map
function followBus() {
    const routeSelect = document.getElementById('routeSelect');
    if (!routeSelect.value) {
        alert('Please select a route first');
        return;
    }

    const bus = appData.buses.find(b => b.route === routeSelect.value);
    if (bus && map) {
        map.setView([bus.currentLat, bus.currentLng], 16);
        if (window.busTracker) {
            busTracker.showNotification(`Now following Bus ${bus.id}`, 'info');
        }
    }
}
