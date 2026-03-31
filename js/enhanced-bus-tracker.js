// Enhanced Real-Time Bus Tracker for Smart Campus Transit Authority
// This implements advanced tracking features including GPS simulation, route prediction, and real-time updates

class BusTracker {
    constructor() {
        this.trackingInterval = null;
        this.updateFrequency = 3000; // 3 seconds
        this.busMovementSpeed = 0.0005; // Degrees per update (realistic speed)
        this.trackingHistory = {};
        this.userLocation = null;
        this.notifications = [];
        this.isTracking = false;
    }

    // Initialize tracking system
    init() {
        this.startGPSTracking();
        this.initializeWebSocket();
        this.setupNotificationSystem();
        console.log('Enhanced Bus Tracker initialized');
    }

    // Start GPS-based tracking simulation
    startGPSTracking() {
        // Get user's current location (simulated for demo)
        this.getUserLocation()
            .then(position => {
                this.userLocation = position;
                this.startRealTimeTracking();
            })
            .catch(error => {
                console.warn('GPS not available, using default location');
                this.userLocation = { lat: 30.3398, lng: 76.3869 }; // Patiala
                this.startRealTimeTracking();
            });
    }

    // Simulate getting user location
    getUserLocation() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    error => {
                        // Fallback to CampusLand coordinates for demo
                        resolve({ lat: 30.3398, lng: 76.3869, accuracy: 100 });
                    }
                );
            } else {
                resolve({ lat: 30.3398, lng: 76.3869, accuracy: 100 });
            }
        });
    }

    // Start real-time tracking updates
    startRealTimeTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
        }

        this.isTracking = true;
        this.trackingInterval = setInterval(() => {
            this.updateBusPositions();
            this.calculateETAs();
            this.checkProximityAlerts();
            this.updateTrackingUI();
        }, this.updateFrequency);

        console.log('Real-time tracking started');
        this.showNotification('Real-time tracking activated', 'success');
    }

    // Stop tracking
    stopRealTimeTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
        this.isTracking = false;
        console.log('Real-time tracking stopped');
    }

    // Update bus positions with realistic movement
    updateBusPositions() {
        appData.buses.forEach((bus, index) => {
            const route = appData.routes.find(r => r.id === bus.route);
            if (!route) return;

            // Store previous position for tracking history
            if (!this.trackingHistory[bus.id]) {
                this.trackingHistory[bus.id] = [];
            }

            this.trackingHistory[bus.id].push({
                lat: bus.currentLat,
                lng: bus.currentLng,
                timestamp: Date.now(),
                speed: bus.speed,
                heading: this.calculateHeading(bus, route)
            });

            // Keep only last 50 positions
            if (this.trackingHistory[bus.id].length > 50) {
                this.trackingHistory[bus.id] = this.trackingHistory[bus.id].slice(-50);
            }

            // Move bus along route
            this.moveBusAlongRoute(bus, route);

            // Update bus status based on movement
            this.updateBusStatus(bus);
        });
    }

    // Move bus along predefined route with realistic physics
    moveBusAlongRoute(bus, route) {
        const currentStopIndex = this.getCurrentStopIndex(bus, route);
        const nextStop = route.stops[currentStopIndex + 1];

        if (!nextStop) {
            // Bus reached end, restart from beginning
            bus.currentLat = route.stops[0].lat;
            bus.currentLng = route.stops[0].lng;
            return;
        }

        // Calculate direction to next stop
        const latDiff = nextStop.lat - bus.currentLat;
        const lngDiff = nextStop.lng - bus.currentLng;
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        if (distance > 0.001) { // Still moving toward stop
            // Add realistic movement with traffic simulation
            const trafficFactor = this.getTrafficFactor();
            const actualSpeed = this.busMovementSpeed * trafficFactor;

            // Normalize direction and apply speed
            const moveRatio = actualSpeed / distance;
            bus.currentLat += latDiff * moveRatio;
            bus.currentLng += lngDiff * moveRatio;

            // Update bus speed (km/h simulation)
            bus.speed = Math.round(35 + (Math.random() * 20 - 10)); // 25-45 km/h
        } else {
            // Reached stop, move to next
            bus.currentLat = nextStop.lat;
            bus.currentLng = nextStop.lng;
            bus.nextStop = route.stops[currentStopIndex + 2]?.name || route.stops[0].name;
        }
    }

    // Get current stop index for bus
    getCurrentStopIndex(bus, route) {
        let closestIndex = 0;
        let minDistance = Infinity;

        route.stops.forEach((stop, index) => {
            const distance = this.calculateDistance(
                bus.currentLat, bus.currentLng,
                stop.lat, stop.lng
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    }

    // Calculate realistic traffic factor
    getTrafficFactor() {
        const hour = new Date().getHours();
        let baseFactor = 1.0;

        // Rush hour simulation (7-9 AM, 5-7 PM)
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            baseFactor = 0.6; // Slower in rush hour
        } else if (hour >= 22 || hour <= 5) {
            baseFactor = 1.3; // Faster at night
        }

        // Add random traffic events
        const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
        return baseFactor * randomFactor;
    }

    // Calculate heading direction for bus icon
    calculateHeading(bus, route) {
        const history = this.trackingHistory[bus.id];
        if (history && history.length >= 2) {
            const prev = history[history.length - 2];
            const curr = { lat: bus.currentLat, lng: bus.currentLng };

            const latDiff = curr.lat - prev.lat;
            const lngDiff = curr.lng - prev.lng;

            // Convert to degrees (0 = North, 90 = East, etc.)
            let heading = Math.atan2(lngDiff, latDiff) * 180 / Math.PI;
            if (heading < 0) heading += 360;

            return Math.round(heading);
        }
        return 0;
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Calculate accurate ETAs based on distance and traffic
    calculateETAs() {
        appData.buses.forEach(bus => {
            const route = appData.routes.find(r => r.id === bus.route);
            if (!route) return;

            const currentStopIndex = this.getCurrentStopIndex(bus, route);
            const nextStop = route.stops[currentStopIndex + 1];

            if (nextStop) {
                const distance = this.calculateDistance(
                    bus.currentLat, bus.currentLng,
                    nextStop.lat, nextStop.lng
                );

                // Calculate ETA considering current speed and traffic
                const averageSpeed = bus.speed || 35; // km/h
                const trafficFactor = this.getTrafficFactor();
                const effectiveSpeed = averageSpeed * trafficFactor;

                // Convert to minutes - vary between 2-8 mins based on distance and speed
                const calculatedEta = Math.round((distance / effectiveSpeed) * 60);
                
                // Map to different values based on route for variety
                if (bus.route === "R101") bus.eta = Math.max(2, Math.min(calculatedEta, 8));
                else if (bus.route === "R103") bus.eta = Math.max(3, Math.min(calculatedEta, 7));
                else if (bus.route === "R105") bus.eta = Math.max(4, Math.min(calculatedEta, 9));
                else if (bus.route === "R107") bus.eta = Math.max(2, Math.min(calculatedEta, 6));
                else if (bus.route === "R108") bus.eta = Math.max(3, Math.min(calculatedEta, 7));
                else bus.eta = Math.max(2, Math.min(calculatedEta, 8));
            }
        });
    }

    // Update bus status based on performance
    updateBusStatus(bus) {
        const randomDelay = Math.random();

        if (randomDelay < 0.1) { // 10% chance of delay
            const delayMinutes = Math.floor(Math.random() * 15) + 5;
            bus.status = `Delayed ${delayMinutes}min`;
            // Update ETA to reflect the delay
            bus.eta = Math.max(bus.eta, (bus.eta || 5) + delayMinutes);
        } else if (randomDelay < 0.05) { // 5% chance of breakdown
            bus.status = 'Maintenance Required';
            // Significantly increase ETA for maintenance
            bus.eta = Math.max(bus.eta, (bus.eta || 5) + 20);
        } else {
            bus.status = 'On Time';
        }
    }

    // Check proximity alerts for users
    checkProximityAlerts() {
        if (!this.userLocation) return;

        appData.buses.forEach(bus => {
            const distance = this.calculateDistance(
                this.userLocation.lat, this.userLocation.lng,
                bus.currentLat, bus.currentLng
            );

            // Alert if bus is within 500m
            if (distance < 0.5 && !bus.alertSent) {
                this.showNotification(
                    `Bus ${bus.id} is approaching your location (${Math.round(distance * 1000)}m away)`,
                    'info'
                );
                bus.alertSent = true;

                // Reset alert after 5 minutes
                setTimeout(() => {
                    bus.alertSent = false;
                }, 300000);
            }
        });
    }

    // Update tracking UI elements
    updateTrackingUI() {
        // Update tracking status indicator
        const trackingStatus = document.getElementById('trackingStatus');
        if (trackingStatus) {
            trackingStatus.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-grow spinner-grow-sm text-success me-2" role="status"></div>
                    <span class="text-success">Live Tracking Active</span>
                    <small class="text-muted ms-2">(Updated ${new Date().toLocaleTimeString()})</small>
                </div>
            `;
        }

        // Refresh map if visible
        if (typeof loadEnhancedRoute === 'function') {
            const routeSelect = document.getElementById('routeSelect');
            if (routeSelect && routeSelect.value) {
                loadEnhancedRoute();
            }
        }
    }

    // Initialize WebSocket simulation for real-time data
    initializeWebSocket() {
        // Simulate WebSocket connection for real-time updates
        this.simulateWebSocket();
    }

    simulateWebSocket() {
        // Simulate receiving real-time updates
        setInterval(() => {
            if (this.isTracking) {
                const event = {
                    type: 'bus_update',
                    timestamp: Date.now(),
                    data: appData.buses.map(bus => ({
                        id: bus.id,
                        lat: bus.currentLat,
                        lng: bus.currentLng,
                        speed: bus.speed,
                        status: bus.status,
                        eta: bus.eta
                    }))
                };

                // Dispatch custom event
                document.dispatchEvent(new CustomEvent('busDataUpdate', { detail: event }));
            }
        }, 5000);
    }

    // Setup notification system
    setupNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
    }

    // Show notification to user
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show mb-2`;
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Get tracking statistics
    getTrackingStats() {
        return {
            activeBuses: appData.buses.filter(bus => bus.status === 'On Time').length,
            totalBuses: appData.buses.length,
            delayedBuses: appData.buses.filter(bus => bus.status.includes('Delayed')).length,
            averageSpeed: Math.round(appData.buses.reduce((sum, bus) => sum + (bus.speed || 0), 0) / appData.buses.length),
            trackingAccuracy: '±50m',
            lastUpdate: new Date().toLocaleTimeString()
        };
    }

    // Export tracking data for analysis
    exportTrackingData() {
        const data = {
            timestamp: Date.now(),
            buses: appData.buses.map(bus => ({
                ...bus,
                history: this.trackingHistory[bus.id] || []
            })),
            userLocation: this.userLocation,
            stats: this.getTrackingStats()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scta-data-${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize enhanced tracker
const busTracker = new BusTracker();

// Auto-start when page loads
document.addEventListener('DOMContentLoaded', function() {
    busTracker.init();
});

// Export for global access
window.busTracker = busTracker;
