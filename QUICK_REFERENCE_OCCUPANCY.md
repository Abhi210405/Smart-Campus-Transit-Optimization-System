# Occupancy Feature - Quick Reference Guide

## 🎯 What Users See

### At Booking Time
```
Route Selection:
├─ Select Route (Dropdown)
└─ NEW: Available Buses with Occupancy Info
   ├─ Bus ID: CB01
   ├─ Driver: Raj Kumar
   ├─ Occupancy: 12/30 (40%) [GREEN BADGE]
   ├─ Available Seats: 18
   └─ Progress Bar: [____      ]
```

### At Booking History
```
Table Columns:
├─ Booking ID
├─ Date
├─ Route
├─ Seats
├─ Amount
├─ NEW: Bus Occupancy (with color badge)
├─ Status
└─ Action (Cancel button)

Cancel Button:
└─ Shows smart occupancy-aware dialog
```

### At Cancellation
```
Dialog:
├─ Header: "Cancel Booking [ID]"
├─ Booking Details
│  ├─ Route: [name]
│  ├─ Date: [date]
│  ├─ Seats: [seats]
│  └─ Amount: ₹[amount]
├─ NEW: Bus Occupancy Card
│  ├─ Progress Bar (colored)
│  ├─ Occupancy Badge: [LOW/MEDIUM/HIGH/CRITICAL]
│  └─ Available Seats: [count]
├─ Refund Information
│  ├─ Refund Status: [message]
│  └─ Refund Amount: ₹[amount] ([percent]%)
└─ Action: [Cancel] [Back]
```

## 💻 For Developers

### Import the Module
```javascript
// Automatically loaded by index.html
// Available globally after page load
window.getBusOccupancy
window.canCancelBooking
window.getOccupancyBadge
window.getOccupancyInfoHTML
window.showCancellationDialog
window.confirmCancellation
window.OCCUPANCY_CONFIG
```

### Configuration
```javascript
// Edit OCCUPANCY_CONFIG in occupancy-cancellation.js
OCCUPANCY_CONFIG = {
    criticalThreshold: 0.90,           // ≥ 90% = critical
    highThreshold: 0.75,               // ≥ 75% = high
    mediumThreshold: 0.50,             // ≥ 50% = medium
    cancellationDeadlineHours: 24,     // Free cancel before this
    cancellationChargePercent: 10      // Late charge: 10%
};
```

### Usage Examples

#### 1. Get Bus Occupancy
```javascript
const occupancy = getBusOccupancy('CB01');
// Returns:
{
    occupancy: 12,           // Current passengers
    capacity: 30,            // Max capacity
    percentFull: 40,         // 40%
    status: 'low',           // low|medium|high|critical
    busId: 'CB01',
    route: 'R101',
    availableSeats: 18
}
```

#### 2. Check Cancellation Eligibility
```javascript
const booking = {
    id: 'BK001236',
    date: '2025-09-20',
    route: 'Faculty Residence - Staff Quarters',
    seats: 'C3',
    amount: 120
};
const bus = window.appData.buses.find(b => b.id === 'CB03');

const result = canCancelBooking(booking, bus);
// Returns:
{
    canCancel: true,
    reason: 'normal_cancellation',  // or 'late_cancellation', 'past_trip'
    message: 'You can cancel for full refund.',
    refundPercent: 100,  // 0-100%
    occupancyData: {...},
    isLateBooking: false  // optional
}
```

#### 3. Display Occupancy Badge
```javascript
const badgeHtml = getOccupancyBadge(95);
// Returns HTML: <span class="badge bg-danger">CRITICALLY FULL (95%)</span>
```

#### 4. Display Full Occupancy Card
```javascript
const occupancyData = getBusOccupancy('CB02');
const cardHtml = getOccupancyInfoHTML(occupancyData);
// Returns formatted card with progress bar and info
```

#### 5. Show Cancellation Dialog
```javascript
showCancellationDialog('BK001236', {
    date: '2025-09-20',
    route: 'Faculty Residence - Staff Quarters',
    seats: 'C3',
    amount: 120
});
```

#### 6. Confirm Cancellation
```javascript
confirmCancellation('BK001236', 100);  // 100% refund
// Updates booking status to 'Cancelled'
// Shows success notification
// Refreshes booking history
```

## 🎨 CSS Classes

```css
/* Occupancy Info Card */
.occupancy-info                    /* Main container */
.occupancy-info .progress          /* Progress bar container */
.occupancy-info .progress-bar      /* Colored bar inside */
.occupancy-info .badge             /* Status badge */

/* Occupancy Indicators */
.occupancy-indicator               /* Badge in booking table */
.occupancy-indicator.low           /* Green */
.occupancy-indicator.medium        /* Blue */
.occupancy-indicator.high          /* Yellow */
.occupancy-indicator.critical      /* Red */

/* Cancellation Dialog */
.modal-header.bg-danger            /* Red header for risks */
.modal-header.bg-warning           /* Yellow header for warnings */
.booking-details                   /* Booking info section */
.refund-info                       /* Refund amount display */

/* Animations */
@keyframes occupancyPulse          /* Pulse animation for critical */
@keyframes slideInFromTop          /* Dialog slide animation */
```

## 📊 Data Flow

```
User Starts Booking
    ↓
selectBookingRoute()
    ↓
Display occupancy for buses on that route
    ├─ For each bus: getBusOccupancy()
    ├─ Format: getOccupancyBadge()
    └─ Show: getOccupancyInfoHTML()
    ↓
User Selects Seats & Pays
    ↓
Booking Stored in currentUser.bookings
    ↓
User Goes to Profile → Booking History
    ↓
Show bookings with occupancy info
    ├─ For past bookings: Show occupancy at booking time
    └─ For upcoming: Show occupancy at display time
    ↓
User Clicks Cancel
    ↓
showCancellationDialog()
    ├─ Find corresponding bus
    ├─ Get current occupancy: getBusOccupancy()
    ├─ Check eligibility: canCancelBooking()
    ├─ Calculate refund
    └─ Display modal
    ↓
User Confirms
    ↓
confirmCancellation()
    ├─ Update booking status
    ├─ Calculate refund
    ├─ Save to localStorage
    ├─ Show notification
    └─ Refresh display
```

## 🔄 Integration Points

### With Global Data
```javascript
// Access bus data
window.appData.buses              // Array of bus objects
window.appData.routes             // Array of route objects

// Access user data
window.currentUser                // Logged-in user object
window.currentUser.bookings       // Array of bookings

// Access auth system
window.isAuthenticated            // Boolean
window.userType                   // 'guest', 'user', 'admin'
```

### With Auth System
```javascript
// cancelBooking() in auth.js calls:
showCancellationDialog()          // New occupancy-aware version

// confirmBookingWithAuth() saves booking with:
currentUser.bookings.push(booking)
localStorage.setItem('scta_user', ...)
```

### With App.js
```javascript
// selectBookingRoute() enhanced to:
createOccupancyContainer()        // Creates display area
getOccupancyBadge()              // Shows badge
getBusOccupancy()                // Gets data
```

## 🐛 Troubleshooting

### occupancy-cancellation.js not loading
```javascript
// Check in console:
typeof getBusOccupancy === 'function'  // Should be true

// If false:
// 1. Check if script tag is in HTML
// 2. Check script order (must load after data.js)
// 3. Check browser console for errors
```

### Occupancy showing 0%
```javascript
// Check bus data:
window.appData.buses[0].occupancy      // Check value
window.appData.buses[0].capacity       // Check value

// If occupancy is 0, no passengers shown (expected)
// If capacity is 0, something wrong with bus data
```

### Wrong refund amount
```javascript
// Check cancellation info:
const info = canCancelBooking(booking, bus);
console.log({
    hourUntilDepart: (new Date(booking.date) - new Date()) / 3600000,
    percentFull: info.occupancyData.percentFull,
    refundPercent: info.refundPercent,
    message: info.message
});

// Verify against OCCUPANCY_CONFIG thresholds
```

### Dialog not showing
```javascript
// Check prerequisites:
typeof showCancellationDialog === 'function'  // true?
window.currentUser                             // logged in?
booking object exists                          // valid?
bus object exists                              // found bus for route?

// If all true but dialog doesn't show:
// 1. Check browser console for JavaScript errors
// 2. Check if Bootstrap modal is available
// 3. Verify dialog HTML structure hasn't changed
```

## 🚀 Performance Tips

### Optimize Occupancy Displays
```javascript
// Only call getBusOccupancy() when needed, not on every render
// Cache results if frequently accessed:
const occupancyCache = new Map();

function getOccupancyWithCache(busId) {
    if (occupancyCache.has(busId)) {
        return occupancyCache.get(busId);
    }
    const data = getBusOccupancy(busId);
    occupancyCache.set(busId, data);
    return data;
}
```

### Batch Occupancy Lookups
```javascript
// Instead of multiple calls:
const occupancies = buses.map(b => getBusOccupancy(b.id));

// Combine into single data structure if needed
const occupancyMap = new Map(
    occupancies.map(o => [o.busId, o])
);
```

## 📈 Key Metrics

Monitor these for reliability:
- Dialog render time < 100ms
- Occupancy calculation < 10ms
- Dialog close smoothness (60fps)
- Mobile responsiveness on all devices
- Touch interactions on mobile (min 44px buttons)

## 🎓 Learning Path

1. **Basic Understanding**
   - Read: OCCUPANCY_FEATURE_DOCUMENTATION.md
   - Review: occupancy-cancellation.js line-by-line comments

2. **API Usage**
   - Run: runAllOccupancyTests() in console
   - Try: Each test function individually
   - Modify: Test values to see different scenarios

3. **Integration**
   - Study: How selectBookingRoute() uses functions
   - Study: How cancelBooking() calls dialog
   - Trace: Data flow from booking to cancellation

4. **Extension**
   - Add new threshold levels
   - Create new refund rules
   - Add email notifications
   - Integrate with real occupancy data

---

**Version**: 1.0
**Last Updated**: February 15, 2026
**Status**: Production Ready
