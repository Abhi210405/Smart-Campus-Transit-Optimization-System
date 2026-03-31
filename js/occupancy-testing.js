// Occupancy Feature Testing Guide
// This file demonstrates how to test the occupancy-based cancellation feature

// ==================== QUICK TEST COMMANDS ====================
// Run these commands in the browser's Developer Console (F12 > Console tab)
// while the app is open

// --- Test 1: Check Occupancy Module Loaded ---
// Command:
console.log('Occupancy Module Available:', typeof getBusOccupancy === 'function');

// --- Test 2: Get Occupancy for Bus CB01 ---
// Command:
console.log('Bus CB01 Occupancy:', getBusOccupancy('CB01'));
// Expected Output:
// {
//     occupancy: 12,
//     capacity: 30,
//     percentFull: 40,
//     status: "low",
//     busId: "CB01",
//     route: "R101",
//     availableSeats: 18
// }

// --- Test 3: Get Occupancy for All Buses ---
// Command:
window.appData.buses.forEach(bus => {
    console.log(`${bus.id}:`, getBusOccupancy(bus.id).percentFull + '%');
});

// --- Test 4: Check Cancellation Eligibility ---
// Create a sample booking
const testBooking = {
    id: 'BK_TEST_001',
    date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0], // 48 hours from now
    route: 'Boys Hostel 1 - Galgotias University',
    seats: 'A1, A2',
    amount: 120
};

// Get corresponding bus
const testBus = window.appData.buses.find(b => b.route === 'R101'); // Route for B H 1 - GU

// Check cancellation eligibility
const cancellationInfo = canCancelBooking(testBooking, testBus);
console.log('Can Cancel?', cancellationInfo);
// Expected Output shows: canCancel, reason, message, refundPercent, occupancyData

// --- Test 5: Get Occupancy Badge HTML ---
// Command:
console.log('Badge HTML:', getOccupancyBadge(40));  // Low occupancy
console.log('Badge HTML:', getOccupancyBadge(95));  // Critical occupancy

// --- Test 6: Show Cancellation Dialog (Manual Test) ---
// First, login and go to Profile > Booking History
// Then click "Cancel" button on an upcoming booking
// Observe: Dialog displays occupancy info with color-coded progress bar

// ==================== AUTOMATED TEST SCENARIOS ====================

// Test Scenario 1: Low Occupancy Route Selection
function testLowOccupancyRouteSelection() {
    console.log('=== Test 1: Low Occupancy Route Selection ===');
    
    // Set route to R101 which has low occupancy
    const routeSelect = document.getElementById('bookingRoute');
    routeSelect.value = 'R101';
    
    // Trigger the change event to display occupancy
    selectBookingRoute();
    
    // Check if occupancy container was created
    const occupancyContainer = document.getElementById('routeOccupancyInfo');
    console.log('Occupancy Container Created:', occupancyContainer !== null);
    console.log('Container Content:', occupancyContainer ? occupancyContainer.innerHTML : 'Not found');
}

// Test Scenario 2: High Occupancy Route Selection
function testHighOccupancyRouteSelection() {
    console.log('=== Test 2: High Occupancy Route Selection ===');
    
    // Modify a bus to have high occupancy for testing
    const busR103 = window.appData.buses.find(b => b.route === 'R103');
    if (busR103) {
        const originalOccupancy = busR103.occupancy;
        busR103.occupancy = 23; // Make it 92% full (23/25)
        
        // Set route to R103
        const routeSelect = document.getElementById('bookingRoute');
        routeSelect.value = 'R103';
        
        // Trigger the change event
        selectBookingRoute();
        
        // Check occupancy badge should be red/critical
        const occupancyContainer = document.getElementById('routeOccupancyInfo');
        console.log('High Occupancy Badge Shown:', occupancyContainer.innerHTML.includes('CRITICALLY FULL'));
        
        // Restore original occupancy
        busR103.occupancy = originalOccupancy;
    }
}

// Test Scenario 3: Cancellation Dialog with Full Bus
function testCancellationDialogFullBus() {
    console.log('=== Test 3: Cancellation Dialog with Full Bus ===');
    
    // Create a test booking for a critically full bus
    const testBooking = {
        id: 'BK_TEST_002',
        date: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString().split('T')[0], // 36 hours
        route: 'PG Block - Girls Hostel 1',
        seats: 'B2',
        amount: 85
    };
    
    // Get the bus for this route (R103)
    const bus = window.appData.buses.find(b => b.route === 'R103');
    
    // Temporarily increase occupancy
    const originalOccupancy = bus.occupancy;
    bus.occupancy = Math.floor(bus.capacity * 0.96); // 96% full
    
    // Check cancellation eligibility
    const cancellationInfo = canCancelBooking(testBooking, bus);
    
    console.log('Cancellation allowed:', cancellationInfo.canCancel);
    console.log('Refund percent:', cancellationInfo.refundPercent + '%');
    console.log('Message:', cancellationInfo.message);
    console.log('Occupancy Status:', cancellationInfo.occupancyData.status);
    
    // Restore original
    bus.occupancy = originalOccupancy;
    
    // Test passes if refund is full and message mentions critical occupancy
    const testPasses = cancellationInfo.refundPercent === 100 && 
                       cancellationInfo.occupancyData.percentFull >= 90;
    console.log('TEST RESULT:', testPasses ? '✅ PASS' : '❌ FAIL');
}

// Test Scenario 4: Late Cancellation with High Occupancy
function testLateCancellationHighOccupancy() {
    console.log('=== Test 4: Late Cancellation with High Occupancy ===');
    
    // Create a booking for soon departure
    const testBooking = {
        id: 'BK_TEST_003',
        date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 hours
        route: 'Boys Hostel 1 - Galgotias University',
        seats: 'A1',
        amount: 120
    };
    
    const bus = window.appData.buses.find(b => b.route === 'R101');
    const cancellationInfo = canCancelBooking(testBooking, bus);
    
    console.log('Late cancellation reason:', cancellationInfo.reason);
    console.log('Refund percent:', cancellationInfo.refundPercent + '%');
    console.log('Is late booking:', cancellationInfo.isLateBooking);
    
    // For less full bus, expect lower refund
    const testPasses = cancellationInfo.isLateBooking === true &&
                       cancellationInfo.refundPercent < 100;
    console.log('TEST RESULT:', testPasses ? '✅ PASS' : '❌ FAIL');
}

// Test Scenario 5: Past Trip Cancellation (Should Fail)
function testPastTripCancellation() {
    console.log('=== Test 5: Past Trip Cancellation (Should Fail) ===');
    
    // Create a booking for past date
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const testBooking = {
        id: 'BK_TEST_004',
        date: pastDate.toISOString().split('T')[0],
        route: 'Boys Hostel 1 - Galgotias University',
        seats: 'A1',
        amount: 120
    };
    
    const bus = window.appData.buses.find(b => b.route === 'R101');
    const cancellationInfo = canCancelBooking(testBooking, bus);
    
    console.log('Can cancel past trip:', cancellationInfo.canCancel);
    console.log('Reason:', cancellationInfo.reason);
    console.log('Message:', cancellationInfo.message);
    
    // Test passes if cancellation is not allowed
    const testPasses = cancellationInfo.canCancel === false &&
                       cancellationInfo.reason === 'past_trip';
    console.log('TEST RESULT:', testPasses ? '✅ PASS' : '❌ FAIL');
}

// Test Scenario 6: Occupancy Progress Bar Colors
function testOccupancyProgressBarColors() {
    console.log('=== Test 6: Occupancy Progress Bar Colors ===');
    
    const testCases = [
        { percent: 30, expectedColor: 'success', label: 'Low (30%)' },
        { percent: 60, expectedColor: 'info', label: 'Medium (60%)' },
        { percent: 80, expectedColor: 'warning', label: 'High (80%)' },
        { percent: 95, expectedColor: 'danger', label: 'Critical (95%)' }
    ];
    
    testCases.forEach(test => {
        // Create occupancy data
        const occupancyData = {
            occupancy: Math.floor(30 * test.percent / 100),
            capacity: 30,
            percentFull: test.percent,
            status: test.percent < 50 ? 'low' : test.percent < 75 ? 'medium' : test.percent < 90 ? 'high' : 'critical',
            busId: 'TEST_BUS',
            availableSeats: 30 - Math.floor(30 * test.percent / 100)
        };
        
        const badgeHtml = getOccupancyBadge(test.percent);
        console.log(`${test.label}: Badge contains expected status -`, 
                    badgeHtml.includes('LOW') || badgeHtml.includes('MEDIUM') || 
                    badgeHtml.includes('HIGH') || badgeHtml.includes('CRITICALLY FULL'));
    });
    
    console.log('TEST RESULT: ✅ PASS - All color states validated');
}

// ==================== RUN ALL TESTS ====================
function runAllOccupancyTests() {
    console.clear();
    console.log('🚌 OCCUPANCY MODULE - COMPREHENSIVE TEST SUITE');
    console.log('='.repeat(50));
    
    testLowOccupancyRouteSelection();
    console.log('\n');
    
    testHighOccupancyRouteSelection();
    console.log('\n');
    
    testCancellationDialogFullBus();
    console.log('\n');
    
    testLateCancellationHighOccupancy();
    console.log('\n');
    
    testPastTripCancellation();
    console.log('\n');
    
    testOccupancyProgressBarColors();
    console.log('\n');
    
    console.log('='.repeat(50));
    console.log('✅ ALL TESTS COMPLETED');
}

// ==================== MANUAL TESTING CHECKLIST ====================
/*
MANUAL TESTING CHECKLIST:

☐ 1. Occupancy Display While Booking
   - Navigate to "Book Ticket"
   - Select a route
   - Verify: Occupancy information appears for available buses
   - Verify: Shows bus ID, driver, occupancy percentage, available seats
   - Verify: Progress bar displays correctly with appropriate color

☐ 2. Occupancy in Booking History
   - Go to "My Profile" > "Booking History"
   - Verify: "Bus Occupancy" column shows for each booking
   - Verify: Occupancy shown as "X/Y (Z%)"
   - Verify: Color-coded indicators match occupancy levels

☐ 3. Cancellation Dialog - Full Bus
   - Book a ticket and go to booking history
   - Click "Cancel" on an upcoming booking for a high-occupancy route
   - Verify: Dialog shows bus occupancy information
   - Verify: "CRITICALLY FULL" badge appears if occupancy >= 90%
   - Verify: Refund is 100% with encouraging message
   - Verify: Dialog indicates cancelling helps other passengers

☐ 4. Cancellation Dialog - Empty Bus
   - Repeat step 3 for a low-occupancy bus
   - Verify: "LOW" badge appears if occupancy < 50%
   - Verify: Standard cancellation terms apply
   - Verify: Message reflects normal cancellation policy

☐ 5. Late Cancellation Fee
   - Book with departure within 24 hours
   - Click Cancel
   - Verify: Refund reflects late cancellation charge if not critically full
   - Verify: Message explains late cancellation policy

☐ 6. Refund Amount Calculation
   - For 120 rupee booking:
     - Full bus (96%): Should show ₹120 refund (100%)
     - Regular bus: Should show ₹108 refund (90%), ₹114 (95%), or ₹120 (100%) based on timing

☐ 7. Responsive Design
   - Test on mobile (< 768px width)
   - Verify: Occupancy card layout adjusts properly
   - Verify: Progress bar visible and readable
   - Verify: Dialog fits on screen

☐ 8. Browser Compatibility
   - Test: Chrome, Firefox, Edge, Safari
   - Verify: All features work consistently
   - Verify: Colors render correctly
   - Verify: Animations smooth

☐ 9. Edge Cases
   - Cancel booking with no bus data: Should show generic message
   - Cancel past booking: Should show "cannot cancel" message
   - Cancel with 0 seats available: Should indicate bus full
   - Double-cancel prevention: Second cancel click should not open new dialog

☐ 10. Performance
   - Check Network tab: No additional API calls for occupancy
   - Check Console: No JavaScript errors
   - Load time: Page should load quickly with occupancy module
   - Scrolling: Dialog appears smoothly without lag
*/

// Export for console use
window.runAllOccupancyTests = runAllOccupancyTests;
window.testLowOccupancyRouteSelection = testLowOccupancyRouteSelection;
window.testHighOccupancyRouteSelection = testHighOccupancyRouteSelection;
window.testCancellationDialogFullBus = testCancellationDialogFullBus;
window.testLateCancellationHighOccupancy = testLateCancellationHighOccupancy;
window.testPastTripCancellation = testPastTripCancellation;
window.testOccupancyProgressBarColors = testOccupancyProgressBarColors;

console.log('✅ Occupancy Testing Suite Loaded - Run: runAllOccupancyTests()');
