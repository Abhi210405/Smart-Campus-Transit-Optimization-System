// Smart Campus Transit Authority - Enhanced Data Module with Tracker Support
window.appData = {
    routes: [
        {
            id: "R101",
            name: "Boys Hostel 1 - Galgotias University",
            origin: "Boys Hostel 1",
            destination: "Galgotias University",
            distance: 5,
            duration: 15,
            fare: 45,
            stops: [
                {name: "Boys Hostel 1", lat: 30.3300, lng: 76.3850, time: "00:00"},
                {name: "PG Block", lat: 30.3285, lng: 76.3840, time: "00:05"},
                {name: "Galgotias University", lat: 30.3255, lng: 76.3834, time: "00:15"}
            ]
        },
        {
            id: "R102",
            name: "Boys Hostel 2 - Galgotias University",
            origin: "Boys Hostel 2",
            destination: "Galgotias University",
            distance: 6,
            duration: 18,
            fare: 50,
            stops: [
                {name: "Boys Hostel 2", lat: 30.3310, lng: 76.3860, time: "00:00"},
                {name: "PG Block", lat: 30.3285, lng: 76.3840, time: "00:06"},
                {name: "Galgotias University", lat: 30.3255, lng: 76.3834, time: "00:18"}
            ]
        },
        {
            id: "R103",
            name: "PG Block - Girls Hostel 1",
            origin: "PG Block",
            destination: "Girls Hostel 1",
            distance: 2,
            duration: 8,
            fare: 40,
            stops: [
                {name: "PG Block", lat: 30.3285, lng: 76.3840, time: "00:00"},
                {name: "Girls Hostel 1", lat: 30.3270, lng: 76.3855, time: "00:08"}
            ]
        },
        {
            id: "R104",
            name: "PG Block - Girls Hostel 2",
            origin: "PG Block",
            destination: "Girls Hostel 2",
            distance: 2.5,
            duration: 9,
            fare: 42,
            stops: [
                {name: "PG Block", lat: 30.3285, lng: 76.3840, time: "00:00"},
                {name: "Girls Hostel 2", lat: 30.3265, lng: 76.3860, time: "00:09"}
            ]
        },
        {
            id: "R105",
            name: "Faculty Residence - Staff Quarters",
            origin: "Faculty Residence",
            destination: "Staff Quarters",
            distance: 3,
            duration: 12,
            fare: 40,
            stops: [
                {name: "Faculty Residence", lat: 30.3290, lng: 76.3820, time: "00:00"},
                {name: "Staff Quarters", lat: 30.3275, lng: 76.3810, time: "00:12"}
            ]
        },
        {
            id: "R106",
            name: "Galgotias University - Girls Hostel 1",
            origin: "Galgotias University",
            destination: "Girls Hostel 1",
            distance: 4,
            duration: 12,
            fare: 45,
            stops: [
                {name: "Galgotias University", lat: 30.3255, lng: 76.3834, time: "00:00"},
                {name: "Girls Hostel 1", lat: 30.3270, lng: 76.3855, time: "00:12"}
            ]
        }
        ,
        {
            id: "R107",
            name: "Central Library - Sports Complex",
            origin: "Central Library",
            destination: "Sports Complex",
            distance: 3,
            duration: 10,
            fare: 40,
            stops: [
                {name: "Central Library", lat: 30.3275, lng: 76.3825, time: "00:00"},
                {name: "Lecture Hall Block", lat: 30.3268, lng: 76.3832, time: "00:05"},
                {name: "Sports Complex", lat: 30.3258, lng: 76.3840, time: "00:10"}
            ]
        },
        {
            id: "R108",
            name: "Administrative Block - Student Centre",
            origin: "Administrative Block",
            destination: "Student Centre",
            distance: 2.5,
            duration: 9,
            fare: 40,
            stops: [
                {name: "Administrative Block", lat: 30.3280, lng: 76.3815, time: "00:00"},
                {name: "Cafeteria", lat: 30.3270, lng: 76.3820, time: "00:04"},
                {name: "Student Centre", lat: 30.3260, lng: 76.3828, time: "00:09"}
            ]
        },
        {
            id: "R109",
            name: "Girls Hostel 1 - Galgotias University - Girls Hostel 2",
            origin: "Girls Hostel 1",
            destination: "Girls Hostel 2",
            distance: 6,
            duration: 18,
            fare: 50,
            stops: [
                {name: "Girls Hostel 1", lat: 30.3270, lng: 76.3855, time: "00:00"},
                {name: "Galgotias University", lat: 30.3255, lng: 76.3834, time: "00:10"},
                {name: "Girls Hostel 2", lat: 30.3265, lng: 76.3860, time: "00:18"}
            ]
        },
        {
            id: "R110",
            name: "Girls Hostel 2 - Galgotias University",
            origin: "Girls Hostel 2",
            destination: "Galgotias University",
            distance: 4,
            duration: 12,
            fare: 45,
            stops: [
                {name: "Girls Hostel 2", lat: 30.3265, lng: 76.3860, time: "00:00"},
                {name: "Galgotias University", lat: 30.3255, lng: 76.3834, time: "00:12"}
            ]
        }
    ],

    buses: [
        {
            id: "CB01",
            route: "R101",
            driver: "Raj Kumar",
            driverPhone: "919876543210",
            capacity: 30,
            currentLat: 30.3300,
            currentLng: 76.3850,
            speed: 25,
            nextStop: "PG Block",
            eta: 8,
            status: "On Time",
            amenities: ["AC", "GPS"],
            occupancy: 12,
            alertSent: false
        },
        {
            id: "CB02",
            route: "R103",
            driver: "Arjun Singh",
            driverPhone: "919876543211",
            capacity: 25,
            currentLat: 30.3285,
            currentLng: 76.3840,
            speed: 18,
            nextStop: "Girls Hostel 1",
            eta: 5,
            status: "On Time",
            amenities: ["USB Charging"],
            occupancy: 20,
            alertSent: false
        },
        {
            id: "CB03",
            route: "R105",
            driver: "Vikram Patel",
            driverPhone: "919876543212",
            capacity: 28,
            currentLat: 30.3290,
            currentLng: 76.3820,
            speed: 20,
            nextStop: "Staff Quarters",
            eta: 9,
            status: "On Time",
            amenities: ["AC", "CCTV"],
            occupancy: 10,
            alertSent: false
        }
        ,
        {
            id: "CB04",
            route: "R107",
            driver: "Rohan Patel",
            driverPhone: "919876543213",
            capacity: 26,
            currentLat: 30.3275,
            currentLng: 76.3825,
            speed: 22,
            nextStop: "Lecture Hall Block",
            eta: 6,
            status: "On Time",
            amenities: ["GPS"],
            occupancy: 8,
            alertSent: false
        },
        {
            id: "CB05",
            route: "R108",
            driver: "Aman Verma",
            driverPhone: "919876543214",
            capacity: 24,
            currentLat: 30.3280,
            currentLng: 76.3815,
            speed: 18,
            nextStop: "Cafeteria",
            eta: 7,
            status: "On Time",
            amenities: ["USB Charging"],
            occupancy: 6,
            alertSent: false
        }
    ],

    analytics: {
        dailyRidership: 1250,
        monthlyRevenue: 450000,
        fuelEfficiency: 6.8,
        onTimePercentage: 87,
        totalRoutes: 15,
        activeBuses: 12,
        averageDelay: 8.5,
        customerSatisfaction: 4.2,
        dailyTrend: [1100, 1200, 1300, 1250, 1180, 1350, 1400],
        revenueByRoute: {
            "R101": 12000,
            "R102": 8000,
            "R103": 6000,
            "R104": 5000,
            "R105": 7000,
            "R106": 9000
            ,"R107": 4000,
            "R108": 3500
        }
    },

    translations: {
        english: {
            appName: "Smart Campus Transit Authority",
            onTimeBadge: "On Time",
minEtaLabel: "min ETA",
occupiedLabel: "occupied",
nextStopLabel: "Next Stop",
capacityLabel: "Capacity",
driverLabel: "Driver",
liveActiveLabel: "Live Tracking Active",
delayedLabel: "Delayed",
activeBusesLabel: "Active Buses",
followBusBtn: "Follow Bus",
myLocationBtn: "My Location",
liveBusMapTitle: "Live Bus Tracking Map",
trafficSimulationLabel: "Traffic Simulation",
proximityAlertsLabel: "Proximity Alerts",
trackingOptionsLabel: "Tracking Options:",
updateFrequencyLabel: "Update Frequency:",
routeSelectionTitle: "Route Selection & Live Data",
exportDataBtn: "Export Data",
stopTrackingBtn: "Stop Tracking",
startTrackingBtn: "Start Tracking",
trackingControlsTitle: "Tracking Controls",
accuracyLabel: "Accuracy",
avgSpeedLabel: "Avg Speed (km/h)",
liveTrackingStatusTitle: "Live Tracking Status",
    welcome: "Welcome to Smart Campus Transit Authority",
            trackBus: "Track Bus",
            bookTicket: "Book Ticket", 
            dashboard: "Government Dashboard",
            profile: "My Profile",
                        routeNames: {
    R101: { en: "Boys Hostel 1 - Galgotias University", hi: "बॉयज़ हॉस्टल 1 - गलगोटियास यूनिवर्सिटी", pa: "ਬੋਇਜ਼ ਹੋਸਟਲ 1 - ਗਲਗੋਟਿਯਾਸ ਯੂਨੀਵਰਸਿਟੀ" },
    R102: { en: "Boys Hostel 2 - Galgotias University", hi: "बॉयज़ हॉस्टल 2 - गलगोटियास यूनिवर्सिटी", pa: "ਬੋਇਜ਼ ਹੋਸਟਲ 2 - ਗਲਗੋਟਿਯਾਸ ਯੂਨੀਵਰਸਿਟੀ" },
    R103: { en: "PG Block - Girls Hostel 1", hi: "पीजी ब्लॉक - गर्ल्स हॉस्टल 1", pa: "ਪੀਜੀ ਬਲੌਕ - ਗਰਲਜ਼ ਹੋਸਟਲ 1" },
    R104: { en: "PG Block - Girls Hostel 2", hi: "पीजी ब्लॉक - गर्ल्स हॉस्टल 2", pa: "ਪੀਜੀ ਬਲੌਕ - ਗਰਲਜ਼ ਹੋਸਟਲ 2" },
    R105: { en: "Faculty Residence - Staff Quarters", hi: "फैकल्टी रेसिडेंस - स्टाफ क्वार्टर", pa: "ਫੈਕਲਟੀ ਰੇਜ਼ਿਡੈਂਸ - ਸਟਾਫ ਕਵਾਰਟਰ" },
    R106: { en: "Galgotias University - Girls Hostel 1", hi: "गलगोटियास यूनिवर्सिटी - गर्ल्स हॉस्टल 1", pa: "ਗਲਗੋਟਿਯਾਸ ਯੂਨੀਵਰਸਿਟੀ - ਗਰਲਜ਼ ਹੋਸਟਲ 1" },
    R107: { en: "Central Library - Sports Complex", hi: "सेंट्रल लाइब्रेरी - स्पोर्ट्स कॉम्प्लेक्स", pa: "ਸੈਂਟਰਲ ਲਾਇਬ੍ਰੇਰੀ - ਸਪੋਰਟਸ ਕੰਪਲੈਕਸ" },
    R108: { en: "Administrative Block - Student Centre", hi: "प्रशासनिक ब्लॉक - स्टूडेंट सेंटर", pa: "प्रਸ਼ਾਸ਼ਨਿਕ ਬਲਾਕ - ਸਟੂਡੈਂਟ ਸੈਂਟਰ" }
},
selectRoute: "Select Route",
            liveTracking: "Live Bus Tracking",
            bookingHistory: "Booking History",
            analytics: "Fleet Analytics",
            settings: "Settings",
            home: "Home",
            busInfo: "Bus Information",
            routeStops: "Route Stops",
            bookingTitle: "Book Your Ticket",
            costCalc: "Cost Calculator",
            dashboardTitle: "Government Dashboard",
            dashboardSubtitle: "Fleet Analytics & Operational Insights",
            profileTitle: "My Profile",
            quickStats: "Quick Stats",
            bookings: "Booking History",
            preferences: "Preferences",
            editProfile: "Edit Profile",
            heroTitle: "Welcome to Smart Campus Transit Authority",
            heroSubtitle: "Real-time public transport tracking for CampusLand's smart cities",
            featureTitle1: "Real-time Tracking",
            featureDesc1: "Live bus locations with accurate ETAs",
            featureTitle2: "Easy Booking",
            featureDesc2: "Simple ticket booking with seat selection",
            featureTitle3: "Multi-language",
            featureDesc3: "Available in English, Hindi, and Campusian"
        },
        hindi: {
            appName: "ट्रांजिटफ्लो", 
            onTimeBadge: "समय पर",
minEtaLabel: "मिनट ETA",
occupiedLabel: "भरा हुआ",
nextStopLabel: "अगला स्टॉप",
capacityLabel: "क्षमता",
driverLabel: "ड्राइवर",
liveActiveLabel: "लाइव ट्रैकिंग चालू",
delayedLabel: "विलंबित",
activeBusesLabel: "सक्रिय बसें",
followBusBtn: "बस का अनुसरण करें",
myLocationBtn: "मेरा स्थान",
liveBusMapTitle: "लाइव बस ट्रैकिंग मानचित्र",
trafficSimulationLabel: "यातायात सिमुलेशन",
proximityAlertsLabel: "निकटता अलर्ट",
trackingOptionsLabel: "ट्रैकिंग विकल्प:",
updateFrequencyLabel: "अपडेट आवृत्ति:",
routeSelectionTitle: "रूट चयन और लाइव डेटा",
exportDataBtn: "डेटा निर्यात करें",
stopTrackingBtn: "ट्रैकिंग रोकें",
startTrackingBtn: "ट्रैकिंग शुरू करें",
trackingControlsTitle: "ट्रैकिंग नियंत्रण",
accuracyLabel: "सटीकता",
avgSpeedLabel: "औसत गति (किमी/घं)",
liveTrackingStatusTitle: "लाइव ट्रैकिंग स्थिति",
welcome: "ट्रांजिटफ्लो में आपका स्वागत है",
            trackBus: "बस ट्रैक करें",
            bookTicket: "टिकट बुक करें",
            dashboard: "सरकारी डैशबोर्ड", 
            profile: "मेरी प्रोफ़ाइल",
                        routeNames: {
    R101: { en: "Boys Hostel 1 - Galgotias University", hi: "बॉयज़ हॉस्टल 1 - गलगोटियास यूनिवर्सिटी", pa: "ਬੋਇਜ਼ ਹੋਸਟਲ 1 - ਗਲਗੋਟਿਯਾਸ ਯੂਨੀਵਰਸਿਟੀ" },
    R102: { en: "Boys Hostel 2 - Galgotias University", hi: "बॉयज़ हॉस्टल 2 - गलगोटियास यूनिवर्सिटी", pa: "ਬੋਇਜ਼ ਹੋਸਟਲ 2 - ਗਲਗੋਟਿਯਾਸ ਯੂਨੀਵਰਸਿਟੀ" },
    R103: { en: "PG Block - Girls Hostel 1", hi: "पीजी ब्लॉक - गर्ल्स हॉस्टल 1", pa: "ਪੀਜੀ ਬਲੌਕ - ਗਰਲਜ਼ ਹੋਸਟਲ 1" },
    R104: { en: "PG Block - Girls Hostel 2", hi: "पीजी ब्लॉक - गर्ल्स हॉस्टल 2", pa: "ਪੀਜੀ ਬਲੌਕ - ਗਰਲਜ਼ ਹੋस्टਲ 2" },
    R105: { en: "Faculty Residence - Staff Quarters", hi: "फैकल्टी रेसिडेंस - स्टाफ क्वार्टर", pa: "ਫੈਕਲਟੀ ਰੇਜ਼ਿਡੈਂਸ - ਸਟਾਫ ਕਵਾਰਟਰ" },
    R106: { en: "Galgotias University - Girls Hostel 1", hi: "गलगोटियास यूनिवर्सिटी - गर्ल्स हॉस्टल 1", pa: "ਗਲਗੋਟਿਯਾਸ ਯੂਨੀਵਰਸਿਟੀ - ਗਰਲਜ਼ ਹੋਸਟਲ 1" },
    R107: { en: "Central Library - Sports Complex", hi: "सेंट्रल लाइब्रेरी - स्पोर्ट्स कॉम्प्लेक्स", pa: "ਸੈਂਟਰਲ ਲਾਇਬ੍ਰੇਰੀ - ਸਪੋਰਟਸ ਕੰਪਲੈਕਸ" },
    R108: { en: "Administrative Block - Student Centre", hi: "प्रशासनिक ब्लॉक - स्टूडेंट सेंटर", pa: "प्रਸ਼ਾਸ਼ਨਿਕ ਬਲਾਕ - ਸਟੂਡੈਂਟ ਸੈਂਟਰ" }
},
selectRoute: "रूट चुनें",
            liveTracking: "लाइव बस ट्रैकिंग",
            bookingHistory: "बुकिंग इतिहास",
            analytics: "फ्लीट एनालिटिक्स",
            settings: "सेटिंग्स",
            home: "होम",
            busInfo: "बस की जानकारी",
            routeStops: "रूट स्टॉप्स",
            bookingTitle: "अपना टिकट बुक करें",
            costCalc: "लागत कैलकुलेटर",
            dashboardTitle: "सरकारी डैशबोर्ड",
            dashboardSubtitle: "फ्लीट एनालिटिक्स और परिचालन अंतर्दृष्टि",
            profileTitle: "मेरी प्रोफ़ाइल",
            quickStats: "त्वरित आंकड़े",
            bookings: "बुकिंग इतिहास",
            preferences: "प्राथमिकताएं",
            editProfile: "प्रोफ़ाइल संपादित करें",
            heroTitle: "ट्रांजिटफ्लो में आपका स्वागत है",
            heroSubtitle: "रीयल-टाइम पब्लिक ट्रांसपोर्ट ट्रैकिंग",
            featureTitle1: "रियल-टाइम ट्रैकिंग",
            featureDesc1: "सटीक ETA के साथ लाइव बस स्थान",
            featureTitle2: "आसान बुकिंग",
            featureDesc2: "सीट चयन के साथ सरल टिकट बुकिंग",
            featureTitle3: "बहुभाषी",
            featureDesc3: "अंग्रेजी और हिंदी में उपलब्ध"
        }
    },

    // Enhanced seat layouts for different bus capacities
    seatLayouts: {
        45: [
            ['A1', 'A2', '', 'A3'],
            ['B1', 'B2', '', 'B3'],
            ['C1', 'C2', '', 'C3'],
            ['D1', 'D2', '', 'D3'],
            ['E1', 'E2', '', 'E3'],
            ['F1', 'F2', '', 'F3'],
            ['G1', 'G2', '', 'G3'],
            ['H1', 'H2', '', 'H3'],
            ['I1', 'I2', '', 'I3'],
            ['J1', 'J2', '', 'J3'],
            ['K1', 'K2', '', 'K3'],
            ['L1', 'L2', '', 'L3'],
            ['M1', 'M2', '', 'M3', 'M4'],
            ['N1', 'N2', '', 'N3', 'N4'],
            ['O1', 'O2', '', 'O3', 'O4']
        ],
        52: [
            ['A1', 'A2', '', 'A3', 'A4'],
            ['B1', 'B2', '', 'B3', 'B4'],
            ['C1', 'C2', '', 'C3', 'C4'],
            ['D1', 'D2', '', 'D3', 'D4'],
            ['E1', 'E2', '', 'E3', 'E4'],
            ['F1', 'F2', '', 'F3', 'F4'],
            ['G1', 'G2', '', 'G3', 'G4'],
            ['H1', 'H2', '', 'H3', 'H4'],
            ['I1', 'I2', '', 'I3', 'I4'],
            ['J1', 'J2', '', 'J3', 'J4'],
            ['K1', 'K2', '', 'K3', 'K4'],
            ['L1', 'L2', '', 'L3', 'L4'],
            ['M1', 'M2', '', 'M3', 'M4']
        ],
        40: [
            ['A1', 'A2', '', 'A3'],
            ['B1', 'B2', '', 'B3'],
            ['C1', 'C2', '', 'C3'],
            ['D1', 'D2', '', 'D3'],
            ['E1', 'E2', '', 'E3'],
            ['F1', 'F2', '', 'F3'],
            ['G1', 'G2', '', 'G3'],
            ['H1', 'H2', '', 'H3'],
            ['I1', 'I2', '', 'I3'],
            ['J1', 'J2', '', 'J3'],
            ['K1', 'K2', '', 'K3'],
            ['L1', 'L2', '', 'L3'],
            ['M1', 'M2', '', 'M3'],
            ['N1', 'N2', '', 'N3']
        ]
    }
};

// Enhanced occupied seats for demonstration
const occupiedSeats = {
    'PB01A2021': ['A1', 'B2', 'C1', 'D3', 'E2', 'F1', 'G3', 'H2'],
    'PB02B2020': ['A1', 'A2', 'B1', 'C2', 'D1', 'D2', 'E3', 'F1', 'G2', 'H4'],
    'PB03C2022': ['A2', 'B1', 'C3', 'D2', 'E1', 'F3', 'G1', 'H2']
};