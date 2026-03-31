// AI Chatbot for Smart Campus Transit Authority
// Handles bus availability queries and basic AI responses

const chatbotKnowledge = {
    busRoutes: [
        { id: 1, name: 'Boys Hostel 1 - Galgotias University', occupancy: '40%', eta: '8 mins', driver: { name: 'Rajesh Kumar', id: 'DRV-001', verified: true, experience: '8 years', rating: '4.8' } },
        { id: 2, name: 'PG Block - Girls Hostel 1', occupancy: '80%', eta: '12 mins', driver: { name: 'Priya Singh', id: 'DRV-002', verified: true, experience: '6 years', rating: '4.9' } },
        { id: 3, name: 'Faculty Residence - Staff Quarters', occupancy: '96%', eta: '5 mins', driver: { name: 'Amit Patel', id: 'DRV-003', verified: true, experience: '5 years', rating: '4.7' } },
        { id: 4, name: 'Library - Central Campus', occupancy: '35%', eta: '15 mins', driver: { name: 'Vikram Sharma', id: 'DRV-004', verified: true, experience: '10 years', rating: '4.9' } },
        { id: 5, name: 'Sports Complex - Medical Center', occupancy: '60%', eta: '10 mins', driver: { name: 'Sneha Gupta', id: 'DRV-005', verified: true, experience: '4 years', rating: '4.6' } },
        { id: 6, name: 'Cafeteria - Parking Lot', occupancy: '25%', eta: '18 mins', driver: { name: 'Arjun Verma', id: 'DRV-006', verified: true, experience: '7 years', rating: '4.8' } }
    ],
    emergencyServices: {
        police: { number: '100', name: 'Police', icon: 'fa-shield-alt', color: 'danger' },
        ambulance: { number: '102', name: 'Ambulance', icon: 'fa-ambulance', color: 'warning' },
        women: { number: '181', name: 'Women Helpline', icon: 'fa-female', color: 'info' },
        campus: { number: window.DEFAULT_CAMPUS_SECURITY_NUMBER || '1800-121-4242', name: 'Campus Security', icon: 'fa-building', color: 'secondary' }
    },
    faqs: {
        'booking': 'To book a ticket, go to the home section, select your route, pick seats, and pay using UPI, Credit Card, or Net Banking.',
        'cancellation': 'You can cancel bookings up to 1 hour before departure. Refunds are processed within 24 hours.',
        'refund': 'Refunds are automatically credited to your original payment method within 24 hours of cancellation.',
        'occupancy': 'Bus occupancy shows real-time seat availability. Green means low occupancy, yellow means moderate, and red means high.',
        'payment': 'We accept UPI, Credit Cards, Debit Cards, and Net Banking. All transactions are secure and encrypted.',
        'app': 'This is the official Smart Campus Transit Authority app for real-time bus tracking and ticketing.',
        'safety': 'All buses are equipped with GPS tracking, emergency buttons, and CCTV cameras for your safety.',
        'discount': 'Monthly passes available at 20% discount. Student ID holders get additional 10% off on all tickets.',
        'lost': 'If you lose something on a bus, contact our support team with your booking ID and we will help locate it.',
        'help': 'I can help you with: bus availability, booking info, cancellation, routes, payments, and general questions.'
    }
};

// Simple conversation context to support follow-ups
window.chatbotContext = {
    lastRoutes: [], // array of route objects the user asked about most recently
    nightModeSafetyPromptShown: false, // track if night mode prompt was shown
    liveLocationEnabled: false, // track if user enabled location sharing
    nightModeActive: false, // track if night mode is currently active
    monitoringActive: false // track if extra monitoring is active
};

// Helper: find matching routes from a user query (partial match)
function findRoutesFromQuery(query) {
    const q = query.toLowerCase();
    const matches = chatbotKnowledge.busRoutes.filter(r => {
        const name = r.name.toLowerCase();
        // direct substring
        if (name.includes(q)) return true;
        // split into tokens and check any token match
        const tokens = q.split(/\s+/).filter(Boolean);
        return tokens.some(t => t.length > 2 && name.includes(t));
    });
    // If no matches and query contains short tokens like 'hostel' or 'library', try keyword match
    if (matches.length === 0) {
        const keywords = ['hostel', 'library', 'faculty', 'sports', 'cafeteria', 'parking', 'medical', 'library', 'campus'];
        for (const k of keywords) {
            if (q.includes(k)) {
                return chatbotKnowledge.busRoutes.filter(r => r.name.toLowerCase().includes(k));
            }
        }
    }
    return matches;
}

// Check if it's night time (after 8 PM)
function isNightTime() {
    const hour = new Date().getHours();
    return hour >= 20; // 8 PM = 20:00
}

// Open the chatbot modal
function openChatbot() {
    const modal = new bootstrap.Modal(document.getElementById('chatbotModal'));
    modal.show();
    // Focus on input after modal is shown
    setTimeout(() => {
        document.getElementById('chatbotInput').focus();
    }, 500);
    
    // Check for night mode safety prompt
    setTimeout(() => {
        checkAndShowNightModeSafetyPrompt();
    }, 1000);
}

// Check and show night mode safety prompt
function checkAndShowNightModeSafetyPrompt() {
    if (isNightTime() && !window.chatbotContext.nightModeSafetyPromptShown) {
        window.chatbotContext.nightModeActive = true;
        window.chatbotContext.nightModeSafetyPromptShown = true;
        
        const safetyPrompt = `<div class="alert alert-warning alert-dismissible fade show" role="alert">
            <i class="fas fa-moon me-2"></i><strong>🌙 Night Travel Mode Activated</strong>
            <hr>
            <p class="mb-2">For your safety during late-night travel, we can enable live location sharing with Campus Security.</p>
            <p class="mb-3"><small>Your location will be monitored in real-time to ensure your safety. You can disable this anytime.</small></p>
            <div class="d-grid gap-2">
                <button class="btn btn-warning btn-sm" onclick="enableNightLocationSharing()">
                    <i class="fas fa-location-dot me-2"></i>Enable Location Sharing
                </button>
                <button class="btn btn-secondary btn-sm" onclick="skipNightLocationSharing()">
                    Skip for Now
                </button>
            </div>
        </div>`;
        
        displayMessage(safetyPrompt, 'bot');
    }
}

// Enable live location sharing for night mode
function enableNightLocationSharing() {
    window.chatbotContext.liveLocationEnabled = true;
    window.chatbotContext.monitoringActive = true;
    
    // Request location permission
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
            function(position) {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date().toISOString()
                };
                
                // Store location for monitoring
                let nightLocationLog = JSON.parse(localStorage.getItem('nightLocationLog') || '[]');
                const records = Array.isArray(nightLocationLog) ? nightLocationLog : [];
                records.push(coords);
                
                // Keep only last 100 records
                if (records.length > 100) {
                    records.shift();
                }
                localStorage.setItem('nightLocationLog', JSON.stringify(records));
                
                console.log('Night mode location captured:', coords);
            },
            function(error) {
                console.warn('Could not get location:', error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    }
    
    displayMessage(`<div class="alert alert-success alert-dismissible fade show" role="alert">
        <i class="fas fa-check-circle me-2"></i><strong>✓ Location Sharing Enabled</strong>
        <hr>
        <p class="mb-1">Your live location is now being monitored and shared with Campus Security.</p>
        <p class="mb-1"><small>🔐 Your privacy is protected. Data is encrypted and only accessible by authorized personnel.</small></p>
        <p class="mb-0"><small>📍 Emergency contacts have been notified of your night travel. If you need help, type "Help" or click the SOS button.</small></p>
    </div>`, 'bot');
    
    // Show monitoring status
    showNotification('🌙 Night Mode Activated - Location Sharing Enabled', 'warning');
    
    // Log night mode activation
    logNightModeActivation();
}

// Skip night location sharing
function skipNightLocationSharing() {
    displayMessage(`<div class="alert alert-info alert-dismissible fade show" role="alert">
        <i class="fas fa-info-circle me-2"></i><strong>ℹ️ Night Mode Info</strong>
        <hr>
        <p class="mb-1">You can enable location sharing anytime by typing "Enable location" or "Night mode".</p>
        <p class="mb-0"><small>⚠️ For safety during night travel, we recommend enabling location sharing. Emergency contacts can help quickly if needed.</small></p>
    </div>`, 'bot');
}

// Log night mode activation
function logNightModeActivation() {
    try {
        let nightModeLog = JSON.parse(localStorage.getItem('nightModeLog') || '[]');
        const records = Array.isArray(nightModeLog) ? nightModeLog : [];
        records.push({
            timestamp: new Date().toLocaleString(),
            event: 'Night Mode Activated',
            locationEnabled: true,
            monitoringStatus: 'ACTIVE'
        });
        localStorage.setItem('nightModeLog', JSON.stringify(records));
    } catch (e) {
        console.log('Logging error: ' + e.message);
    }
}

// Disable night mode tracking
function disableNightModeTracking() {
    window.chatbotContext.liveLocationEnabled = false;
    window.chatbotContext.monitoringActive = false;
    
    displayMessage(`<div class="alert alert-info alert-dismissible fade show" role="alert">
        <i class="fas fa-location-dot-slash me-2"></i><strong>Location Sharing Disabled</strong>
        <hr>
        <p class="mb-1">Location sharing has been disabled. You can enable it anytime by asking about night mode.</p>
        <p class="mb-0"><small>⚠️ For your safety, we still recommend keeping location sharing enabled during late-night travel.</small></p>
    </div>`, 'bot');
    
    logNightModeDisable();
    return '';
}

// Log night mode disable
function logNightModeDisable() {
    try {
        let nightModeLog = JSON.parse(localStorage.getItem('nightModeLog') || '[]');
        const records = Array.isArray(nightModeLog) ? nightModeLog : [];
        records.push({
            timestamp: new Date().toLocaleString(),
            event: 'Night Mode Disabled',
            locationEnabled: false,
            monitoringStatus: 'INACTIVE'
        });
        localStorage.setItem('nightModeLog', JSON.stringify(records));
    } catch (e) {
        console.log('Logging error: ' + e.message);
    }
}

// Handle night mode query
function handleNightModeQuery() {
    const monitoringStatus = window.chatbotContext.monitoringActive ? 'ACTIVE ✓' : 'INACTIVE';
    
    return `<div class="alert alert-info">
        <i class="fas fa-moon me-2"></i><strong>🌙 Night Travel Safety Mode</strong>
        <hr>
        <p class="mb-2"><strong>Current Status:</strong> ${window.chatbotContext.nightModeActive ? '🌙 Active' : '⚪ Inactive (After 8 PM)'}</p>
        <p class="mb-2"><strong>Location Monitoring:</strong> ${monitoringStatus}</p>
        <p class="mb-3"><small>Night Mode provides extra safety features:</small></p>
        <ul style="font-size: 0.9rem; margin-bottom: 1rem;">
            <li>✓ Real-time location sharing with Campus Security</li>
            <li>✓ Emergency alert monitoring</li>
            <li>✓ Faster response for safety incidents</li>
            <li>✓ Encrypted data protection</li>
        </ul>
        <div class="d-grid gap-2">
            ${!window.chatbotContext.liveLocationEnabled ? `<button class="btn btn-warning btn-sm" onclick="enableNightLocationSharing()">
                <i class="fas fa-location-dot me-2"></i>Enable Location Sharing
            </button>` : `<button class="btn btn-danger btn-sm" onclick="disableNightModeTracking()">
                <i class="fas fa-location-dot-slash me-2"></i>Disable Location Sharing
            </button>`}
        </div>
    </div>`;
}
function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Display user message
    displayMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Simulate typing delay
    setTimeout(() => {
        const response = generateAIResponse(message);
        displayMessage(response, 'bot');
    }, 800);
}
// Display message in chat
function displayMessage(message, sender) {
    const messagesContainer = document.getElementById('chatbotMessages');

    // Clear the initial greeting if it's the first real message
    if (messagesContainer.children.length === 1 && 
        messagesContainer.querySelector('.text-center')) {
        messagesContainer.innerHTML = '';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-3 d-flex ${sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`;

    const messageContent = document.createElement('div');
    messageContent.className = `p-3 rounded-lg ${
        sender === 'user' 
            ? 'bg-primary text-white rounded-end' 
            : 'bg-light text-dark rounded-start border'
    }`;
    messageContent.style.maxWidth = '85%';
    messageContent.style.wordWrap = 'break-word';

    if (sender === 'bot') {
        messageContent.innerHTML = message; // Allow HTML for bot responses
    } else {
        messageContent.textContent = message;
    }

    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Generate AI response based on user input
function generateAIResponse(userMessage) {
    // Split into sentences so multiple questions are handled individually
    const parts = userMessage.split(/[\.\?!;]+/).map(p => p.trim()).filter(Boolean);

    const answers = parts.map(p => answerSingleQuestion(p));

    // remember last question's explicit routes if any (already handled inside helpers)
    if (answers.length === 0) return `I didn't quite get that. Ask about bus availability, occupancy, routes, or bookings.`;
    return answers.join('<hr>');
}

// Answer a single question string precisely
function answerSingleQuestion(q) {
    const message = q.toLowerCase().trim();

    // Extract explicit routes
    const explicitRoutes = findRoutesFromQuery(message);
    if (explicitRoutes.length > 0) window.chatbotContext.lastRoutes = explicitRoutes;

    // *** PRIORITY CHECK: Emergency/Distress Detection (checked FIRST before other intents) ***
    const distressIntent = {
        distress: /\b(i feel unsafe|unsafe|danger|threatened|scared|panic|help)\b/,
        emergency: /\b(emergency|distress|sos|urgent help|immediate help|critical|help me|need help)\b/
    };
    
    if (distressIntent.distress.test(message) || distressIntent.emergency.test(message)) {
        triggerSOSAndLocation();
        return generateEmergencyResponse();
    }

    // Intent regexes
    const intent = {
        greeting: /\b(hii|hi|hello|hey|good morning|good afternoon|good evening)\b/,
        howareyou: /\b(how are you|how r you|how are you sir|how are u|how are you doing)\b/,
        availability: /\b(bus|buses|available|available to|which bus|which buses)\b/,
        live: /\b(live track(ing)?|live tracking|track live|live location|track location|open live tracker)\b/,
        occupancy: /\b(occupancy|occupancy status|full|seats|empty|how many seats)\b/,
        eta: /\b(eta|arrive|arriving|when will|what time|when)\b/,
        booking: /\b(book|booking|reserve|how to book|buy ticket|buy a ticket)\b/,
        cancellation: /\b(cancel|cancellation)\b/,
        refund: /\b(refund|refunded)\b/,
        payment: /\b(payment|pay|upi|credit card|debit card|net banking)\b/,
        lost: /\b(lost|lost item|left|forgot)\b/,
        discount: /\b(discount|pass|monthly pass|student)\b/,
        help: /\b(help|support|how can you help|what can you do)\b/,
        thanks: /\b(thank you|thanks|thanks a lot|thanks!)\b/,
        route: /\b(route|routes|destination|where does)\b/,
        leastCrowded: /\b(least crowded|least busy|least occupancy|emptiest|least packed|which bus is the least crowded)\b/,
        closest: /\b(closest|nearest|close to|closest to my location|which bus is closest)\b/,
        allEta: /\b(eta of every|eta of all|all routes eta|what is the eta|what is the eta of every route)\b/,
        distress: /\b(i feel unsafe|unsafe|danger|threatened|scared|panic)\b/,
        emergency: /\b(emergency|distress|sos|urgent help|immediate help|critical|help me|need help)\b/,
        driver: /\b(driver|who is the driver|driver verification|verify driver|driver details|driver information|driver of this bus|driver of the bus)\b/,
        nightMode: /\b(night mode|enable location|disable location|location sharing|night safety|night travel)\b/
    };

    // Availability
    if (intent.availability.test(message)) {

        // Helper: concise availability for single route
        function generateBusAvailabilityResponseForSingle(route) {
            return `<i class="fas fa-bus text-primary"></i> <strong>${route.name}</strong><br>&nbsp;&nbsp;Occupancy: ${route.occupancy} | ETA: ${route.eta}`;
        }

        // Helper: summary for multiple or top routes
        function generateBusAvailabilitySummary(routes) {
            return `<i class="fas fa-info-circle text-info"></i> <strong>Available Routes (sample):</strong><br>` +
                routes.map(r => `• <strong>${r.name}</strong> — ${r.occupancy}, ETA: ${r.eta}`).join('<br>');
        }
        // If specific route mentioned, pass the query to availability generator
        if (explicitRoutes.length) return generateBusAvailabilityResponse(message);
        // else general availability
        if (message.includes('near me') || message.includes('available now')) {
            return generateBusAvailabilityResponse(message);
        }
        return generateBusAvailabilityResponse(message);
    }

    // Occupancy
    if (intent.occupancy.test(message)) {
        return generateOccupancyResponse(message, explicitRoutes);
    }

    // Least Crowded Bus
    if (intent.leastCrowded.test(message)) {
        return generateLeastCrowdedResponse();
    }

    // Closest Bus
    if (intent.closest.test(message)) {
        return generateClosestBusResponse();
    }

    // All Routes ETA
    if (intent.allEta.test(message)) {
        return generateAllRoutesETAResponse();
    }

    // Driver Verification
    if (intent.driver.test(message)) {
        return generateDriverVerificationResponse(message, explicitRoutes);
    }

    // Night Mode / Location Sharing
    if (intent.nightMode.test(message)) {
        if (message.includes('disable') || message.includes('turn off')) {
            return disableNightModeTracking();
        }
        return handleNightModeQuery();
    }

    // Live tracking typed intent
    if (intent.live.test(message)) {
        openLiveTrackingFromChat();
        return 'Opening live tracker — switching to live map.';
    }

    // How are you small-talk
    if (intent.howareyou.test(message)) {
        return `I'm good — thanks for asking! How about you?`;
    }

    // Greeting
    if (intent.greeting.test(message)) {
        return `👋 Hello! I'm your AI Bus Assistant. You can ask me about:<br>
            • <strong>Bus availability</strong><br>
            • <strong>Occupancy & ETAs</strong><br>
            • <strong>Booking / cancellation</strong><br>
            • <strong>Payments & refunds</strong><br>
            <div class="mt-2">
                <button class="btn btn-sm btn-primary me-2" onclick="openLiveTrackingFromChat()">Track Bus</button>
                <small class="text-muted">Or ask a question like: "Is the Library bus available?"</small>
            </div>`;
    }

    // Thanks / small talk
    if (intent.thanks.test(message)) {
        return `You're welcome! 😊 Need anything else?`;
    }

    // ETA / time
    if (intent.eta.test(message)) {
        return generateTimeResponse(message, explicitRoutes);
    }

    // Booking / cancellation / refund / payment / lost / discount
    if (intent.booking.test(message)) return chatbotKnowledge.faqs['booking'];
    if (intent.cancellation.test(message)) return chatbotKnowledge.faqs['cancellation'];
    if (intent.refund.test(message)) return chatbotKnowledge.faqs['refund'];
    if (intent.payment.test(message)) return chatbotKnowledge.faqs['payment'];
    if (intent.lost.test(message)) return chatbotKnowledge.faqs['lost'];
    if (intent.discount.test(message)) return chatbotKnowledge.faqs['discount'];

    if (intent.help.test(message)) return chatbotKnowledge.faqs['help'];

    if (intent.route.test(message)) return generateRouteResponse(message);

    // Direct FAQ keyword match (word boundary)
    for (const key of Object.keys(chatbotKnowledge.faqs)) {
        const re = new RegExp('\\b' + key + '\\b', 'i');
        if (re.test(message)) return chatbotKnowledge.faqs[key];
    }

    // If user asked about a specific route name directly (e.g., 'boys hostel 1'), show availability
    if (explicitRoutes.length) return generateBusAvailabilityResponse(message);

    // Last resort: guided fallback
    return `I couldn't find a precise answer to "${q}". I can help with: availability, occupancy, ETA, booking, cancellation, refunds, payments, lost items, and routes. Try asking a specific route or one topic at a time.`;
}

// Live tracking helper triggered from chatbot
function openLiveTrackingFromChat() {
    // Inform user in chat
    displayMessage('Opening live tracker — showing real-time bus locations.', 'bot');
    // Small delay so user sees the message, then open tracking section
    setTimeout(() => {
        try {
            if (typeof showSection === 'function') {
                showSection('tracking');
            } else if (typeof openChatbot === 'function') {
                // fallback: close chatbot
                // nothing to do
            }
        } catch (e) {
            console.warn('Could not open tracking section from chatbot:', e);
        }
    }, 400);
}

// Generate bus availability response
function generateBusAvailabilityResponse(query) {
    // Extract route keywords from query
    let relevantBuses = chatbotKnowledge.busRoutes;
    // refine using helper
    const matches = findRoutesFromQuery(query);
    if (matches.length > 0) relevantBuses = matches;
    
    if (relevantBuses.length === 0) {
        return `<i class="fas fa-info-circle text-info"></i> <strong>Available Routes:</strong><br>
        ${chatbotKnowledge.busRoutes.map(b => 
            `• <strong>${b.name}</strong> - Occupancy: ${b.occupancy}, ETA: ${b.eta}`
        ).join('<br>')}`;
    }
    
    return `<i class="fas fa-bus text-primary"></i> <strong>Available Buses:</strong><br>
    ${relevantBuses.map(b => 
        `• <strong>${b.name}</strong><br>
        &nbsp;&nbsp;Occupancy: ${b.occupancy} | ETA: ${b.eta}`
    ).join('<br>')}`;
}

// Generate occupancy response
function generateOccupancyResponse(query, explicitRoutes) {
    const target = (explicitRoutes && explicitRoutes.length) ? explicitRoutes : window.chatbotContext.lastRoutes;
    let responseHTML = '<i class="fas fa-chart-pie text-warning"></i> <strong>Current Bus Occupancy:</strong><br>';

    const routeList = (target && target.length) ? target : chatbotKnowledge.busRoutes;
    routeList.forEach(bus => {
        const occupancy = parseInt(bus.occupancy);
        let status = '🟢 Low';
        if (occupancy > 75) status = '🔴 High';
        else if (occupancy > 50) status = '🟡 Moderate';

        responseHTML += `• <strong>${bus.name}</strong><br>
        &nbsp;&nbsp;${status} (${bus.occupancy})<br>`;
    });

    return responseHTML;
}

// Generate route response
function generateRouteResponse(query) {
    const routes = chatbotKnowledge.busRoutes;
    return `<i class="fas fa-map-signs text-success"></i> <strong>Popular Routes:</strong><br>
    ${routes.map((r, i) => `${i + 1}. ${r.name}`).join('<br>')}<br><br>
    You can book any of these routes from the home section. Ask me specific route details or availability!`;
}

// Generate time-related response
function generateTimeResponse(query, explicitRoutes) {
    const target = (explicitRoutes && explicitRoutes.length) ? explicitRoutes : window.chatbotContext.lastRoutes;
    let response = '<i class="fas fa-clock text-secondary"></i> <strong>ETA Information:</strong><br>';

    const list = (target && target.length) ? target : chatbotKnowledge.busRoutes.slice(0, 3);
    list.forEach(bus => {
        response += `• <strong>${bus.name}</strong><br>
        &nbsp;&nbsp;ETA: ${bus.eta}<br>`;
    });

    response += '<br>ETAs are updated every minute based on real-time GPS tracking.';
    return response;
}

// Generate least crowded bus response
function generateLeastCrowdedResponse() {
    const routes = chatbotKnowledge.busRoutes;
    const leastCrowded = routes.reduce((min, bus) => {
        const minOcc = parseInt(min.occupancy);
        const busOcc = parseInt(bus.occupancy);
        return busOcc < minOcc ? bus : min;
    });

    return `<i class="fas fa-check-circle text-success"></i> <strong>Least Crowded Bus Right Now:</strong><br>
    <strong>${leastCrowded.name}</strong><br>
    &nbsp;&nbsp;Occupancy: <span class="badge bg-success">${leastCrowded.occupancy}</span><br>
    &nbsp;&nbsp;ETA: ${leastCrowded.eta}<br><br>
    <small class="text-muted">This bus has the most available seats. You can book a seat now.</small>`;
}

// Generate closest bus response
function generateClosestBusResponse() {
    const routes = chatbotKnowledge.busRoutes;
    const sortedByETA = [...routes].sort((a, b) => {
        const aETA = parseInt(a.eta);
        const bETA = parseInt(b.eta);
        return aETA - bETA;
    });

    return `<i class="fas fa-map-marker-alt text-danger"></i> <strong>Buses Closest to Your Location:</strong><br>
    ${sortedByETA.slice(0, 3).map((bus, idx) => 
        `${idx + 1}. <strong>${bus.name}</strong><br>
        &nbsp;&nbsp;Distance ETA: ${bus.eta} | Occupancy: ${bus.occupancy}<br>`
    ).join('')}
    <small class="text-muted">These are the nearest buses to you based on real-time GPS. Enable location services for more accurate results.</small>`;
}

// Generate all routes ETA response
function generateAllRoutesETAResponse() {
    const routes = chatbotKnowledge.busRoutes;
    let response = '<i class="fas fa-list text-info"></i> <strong>ETA for All Routes:</strong><br><table class="table table-sm mt-2"><thead><tr><th>Route</th><th>ETA</th><th>Occupancy</th></tr></thead><tbody>';
    
    routes.forEach(bus => {
        response += `<tr><td><strong>${bus.name}</strong></td><td>${bus.eta}</td><td>${bus.occupancy}</td></tr>`;
    });
    
    response += `</tbody></table>
    <small class="text-muted">All ETAs are updated in real-time. Click "Live Tracking" to see buses on the map.</small>`;
    return response;
}

// Generate emergency response with SOS options
function generateEmergencyResponse() {
    const services = chatbotKnowledge.emergencyServices;
    
    let emergencyHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
        <i class="fas fa-exclamation-triangle me-2"></i><strong>⚠️ EMERGENCY DETECTED</strong>
        <hr>
        <p class="mb-2">Your current location has been shared with Campus Security and Admin.</p>
        <p class="mb-3"><small>Emergency services are being alerted. Please stay calm and safe.</small></p>
        
        <strong>Contact Emergency Services:</strong><br>
        <div class="d-grid gap-2 mt-3">`;
    
    // Add emergency service buttons
    emergencyHTML += `<button class="btn btn-danger btn-sm" onclick="callEmergencyService('100', 'Police')">
        <i class="fas fa-shield-alt me-2"></i>Police Emergency (100)
    </button>`;
    
    emergencyHTML += `<button class="btn btn-warning btn-sm" onclick="callEmergencyService('102', 'Ambulance')">
        <i class="fas fa-ambulance me-2"></i>Ambulance (102)
    </button>`;
    
    emergencyHTML += `<button class="btn btn-info btn-sm" onclick="callEmergencyService('181', 'Women Helpline')">
        <i class="fas fa-female me-2"></i>Women Helpline (181)
    </button>`;
    
    emergencyHTML += `<button class="btn btn-secondary btn-sm" onclick="callEmergencyService('${services.campus.number}', '${services.campus.name}')">
        <i class="fas fa-building me-2"></i>${services.campus.name} (${services.campus.number})
    </button>`;

    emergencyHTML += `<button class="btn btn-outline-secondary btn-sm" onclick="sendEmergencySMS('${services.campus.number}', '${services.campus.name}')">
        <i class="fas fa-comment-dots me-2"></i>Auto-SMS ${services.campus.name}
    </button>`;
    
    emergencyHTML += `<button class="btn btn-dark btn-sm mt-2" onclick="showSOSModal()">
        <i class="fas fa-phone me-2"></i>More Emergency Options
    </button>`;
    
    emergencyHTML += `</div>
        <hr>
        <p class="mb-0"><small class="text-muted">If you are safe, you can close this message. Your location will still be shared with authorities for your safety.</small></p>
    </div>`;
    
    return emergencyHTML;
}

// Trigger SOS and send location to admin/security
function triggerSOSAndLocation() {
    try {
        // Get current location
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Store distress info in localStorage for admin access
                    let distressLog = JSON.parse(localStorage.getItem('distressLog') || '[]');
                    const records = Array.isArray(distressLog) ? distressLog : [];
                    records.push({
                        timestamp: new Date().toLocaleString(),
                        location: coords,
                        status: 'ACTIVE',
                        type: 'Chatbot SOS'
                    });
                    localStorage.setItem('distressLog', JSON.stringify(records));
                    
                    console.log('Emergency location captured and logged:', coords);
                },
                function(error) {
                    console.warn('Could not get location:', error);
                    // Log without location if permission denied
                    let distressLog = JSON.parse(localStorage.getItem('distressLog') || '[]');
                    const records = Array.isArray(distressLog) ? distressLog : [];
                    records.push({
                        timestamp: new Date().toLocaleString(),
                        location: null,
                        status: 'LOCATION_PERMISSION_DENIED',
                        type: 'Chatbot SOS'
                    });
                    localStorage.setItem('distressLog', JSON.stringify(records));
                }
            );
        }
        
        // Log emergency call
        let emergencyLog = JSON.parse(localStorage.getItem('emergencyLog') || '[]');
        const eRecords = Array.isArray(emergencyLog) ? emergencyLog : [];
        eRecords.push({
            timestamp: new Date().toLocaleString(),
            service: 'Chatbot SOS Triggered',
            status: 'CRITICAL',
            channel: 'Chatbot AI'
        });
        localStorage.setItem('emergencyLog', JSON.stringify(eRecords));
        
        // Flash notification to user
        showNotification('🚨 SOS Activated! Location shared with Campus Security.', 'danger');
    } catch (e) {
        console.error('Error in emergency response:', e);
    }
}

// Call emergency service from chatbot
function callEmergencyService(number, serviceName) {
    if (typeof callEmergency === 'function') {
        // Use existing emergency function from app.js
        callEmergency(number, serviceName);
    } else {
        // Fallback
        alert(`📞 Calling ${serviceName}...\n\nNumber: ${number}`);
        const telLink = document.createElement('a');
        telLink.href = `tel:${number}`;
        telLink.click();
    }
}

// Generate driver verification response
function generateDriverVerificationResponse(query, explicitRoutes) {
    let targetRoutes = (explicitRoutes && explicitRoutes.length) ? explicitRoutes : window.chatbotContext.lastRoutes;
    
    // If no specific route mentioned, show all drivers
    if (!targetRoutes || targetRoutes.length === 0) {
        let driverHTML = '<i class="fas fa-id-card text-primary"></i> <strong>All Verified Drivers:</strong><br><table class="table table-sm mt-2"><thead><tr><th>Route</th><th>Driver Name</th><th>ID</th><th>Status</th><th>Rating</th></tr></thead><tbody>';
        
        chatbotKnowledge.busRoutes.forEach(bus => {
            const driver = bus.driver;
            const statusBadge = driver.verified ? '<span class="badge bg-success">✓ Verified</span>' : '<span class="badge bg-warning">⚠ Pending</span>';
            driverHTML += `<tr>
                <td><small>${bus.name}</small></td>
                <td><strong>${driver.name}</strong></td>
                <td>${driver.id}</td>
                <td>${statusBadge}</td>
                <td>⭐ ${driver.rating}</td>
            </tr>`;
        });
        
        driverHTML += `</tbody></table>
        <small class="text-muted">All drivers are verified by Campus Transport Authority. Click on a route to see detailed driver info.</small>`;
        return driverHTML;
    }
    
    // Show specific driver for selected routes
    let driverHTML = '<i class="fas fa-user-tie text-info"></i> <strong>Driver Information:</strong><br><hr>';
    
    targetRoutes.forEach(bus => {
        const driver = bus.driver;
        const statusBadge = driver.verified ? '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Verified</span>' : '<span class="badge bg-warning"><i class="fas fa-exclamation-circle me-1"></i>Pending</span>';
        
        driverHTML += `<div class="card mb-3" style="border-left: 4px solid #28a745;">
            <div class="card-body p-3">
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-2"><strong>Route:</strong> ${bus.name}</p>
                        <p class="mb-2"><strong>Driver Name:</strong> ${driver.name}</p>
                        <p class="mb-2"><strong>Driver ID:</strong> <code>${driver.id}</code></p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-2"><strong>Verification Status:</strong> ${statusBadge}</p>
                        <p class="mb-2"><strong>Experience:</strong> ${driver.experience}</p>
                        <p class="mb-0"><strong>Passenger Rating:</strong> ⭐ ${driver.rating} / 5.0</p>
                    </div>
                </div>
                <hr class="my-2">
                <small class="text-muted"><i class="fas fa-shield-alt me-1"></i>All drivers are background-checked and verified by Campus Transport Authority. Report any concerns via emergency SOS.</small>
            </div>
        </div>`;
    });
    
    return driverHTML;
}

// Add chat suggestion buttons
function addChatSuggestions() {
    const messagesContainer = document.getElementById('chatbotMessages');
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'mb-3 text-center';
    suggestionsDiv.innerHTML = `
        <p class="text-muted mb-2" style="font-size: 0.85rem;">Quick suggestions:</p>
        <button class="btn btn-sm btn-outline-primary me-2 mb-2" onclick="suggestQuery('What buses are available?')">
            Available Buses
        </button>
        <button class="btn btn-sm btn-outline-primary me-2 mb-2" onclick="suggestQuery('Which bus is the least crowded right now?')">
            Least Crowded
        </button>
        <button class="btn btn-sm btn-outline-primary me-2 mb-2" onclick="suggestQuery('Which bus is closest to my location?')">
            Closest Bus
        </button>
        <button class="btn btn-sm btn-outline-primary me-2 mb-2" onclick="suggestQuery('What is the ETA of every route buses?')">
            All Routes ETA
        </button>
        <button class="btn btn-sm btn-outline-info me-2 mb-2" onclick="suggestQuery('Who is the driver of this bus?')">
            Driver Info
        </button>
        <button class="btn btn-sm btn-outline-primary me-2 mb-2" onclick="suggestQuery('How do I book a ticket?')">
            How to Book
        </button>
        <button class="btn btn-sm btn-outline-warning me-2 mb-2" onclick="suggestQuery('Night mode')">
            🌙 Night Safety
        </button>
        <button class="btn btn-sm btn-outline-danger me-2 mb-2" onclick="suggestQuery('Help')">
            🚨 Emergency
        </button>
        <button class="btn btn-sm btn-outline-success mb-2" onclick="openLiveTrackingFromChat()">
            Live Tracking
        </button>
    `;
    messagesContainer.appendChild(suggestionsDiv);
}

// Handle suggestion click
function suggestQuery(query) {
    document.getElementById('chatbotInput').value = query;
    document.getElementById('chatbotInput').focus();
    sendChatMessage();
}

// Initialize chatbot when profile section loads
window.addEventListener('DOMContentLoaded', () => {
    // Chatbot is ready to be used
    console.log('Chatbot module loaded successfully');
});

// ----------------------
// Speech-to-Text Support
// ----------------------
window.speechRecognitionSupported = false;
window.chatbotRecognition = null;
window.chatbotListening = false;

function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        window.speechRecognitionSupported = false;
        return;
    }

    window.speechRecognitionSupported = true;
    chatbotRecognition = new SpeechRecognition();
    chatbotRecognition.lang = 'en-IN';
    chatbotRecognition.interimResults = true;
    chatbotRecognition.continuous = false;

    let interimTranscript = '';

    chatbotRecognition.onstart = () => {
        chatbotListening = true;
        updateMicButton(true);
    };

    chatbotRecognition.onerror = (e) => {
        console.warn('Speech recognition error', e);
        chatbotListening = false;
        updateMicButton(false);
    };

    chatbotRecognition.onend = () => {
        chatbotListening = false;
        updateMicButton(false);
    };

    chatbotRecognition.onresult = (event) => {
        interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) finalTranscript += res[0].transcript;
            else interimTranscript += res[0].transcript;
        }

        const input = document.getElementById('chatbotInput');
        if (input) {
            // Show interim + final in input while speaking
            input.value = (finalTranscript + ' ' + interimTranscript).trim();
            input.focus();
        }
    };
}

function toggleSpeechRecognition() {
    if (!window.speechRecognitionSupported) {
        showNotification('Speech recognition is not supported in this browser.', 'warning');
        return;
    }

    if (!chatbotRecognition) initializeSpeechRecognition();

    if (chatbotListening) {
        try { chatbotRecognition.stop(); } catch(e){}
        chatbotListening = false;
        updateMicButton(false);
    } else {
        try { chatbotRecognition.start(); } catch(e) { console.warn(e); }
    }
}

function updateMicButton(active) {
    const btn = document.getElementById('chatbotMicBtn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (active) {
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-danger');
        btn.title = 'Listening — click to stop';
        if (icon) { icon.classList.remove('fa-microphone'); icon.classList.add('fa-microphone-slash'); }
    } else {
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-outline-secondary');
        btn.title = 'Start voice input';
        if (icon) { icon.classList.remove('fa-microphone-slash'); icon.classList.add('fa-microphone'); }
    }
}

// Initialize recognition on load so button works quickly
initializeSpeechRecognition();
