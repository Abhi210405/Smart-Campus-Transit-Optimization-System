# Occupancy-Based Ticket Cancellation Feature

## Overview
This feature enables users to view real-time bus occupancy information and conditionally cancel tickets based on occupancy levels. The system intelligently handles refunds based on occupancy status and cancellation timing.

## Features Implemented

### 1. **Occupancy Information Display**
   - Shows current occupancy percentage for each bus
   - Displays available seats count
   - Visual progress bar with color-coded occupancy levels
   - Occupancy badges indicating status (Low, Medium, High, Critically Full)

### 2. **Booking Journey with Occupancy Awareness**
   - When selecting a route during booking, users see available buses with occupancy info
   - Shows occupancy percentage, available seats, and driver information
   - Color-coded visual indicators help users choose less crowded buses

### 3. **Occupancy-Based Cancellation Policy**
   - **Critically Full (≥90% occupancy)**: Free cancellation allowed
   - **High Occupancy (75-89%)**: Normal late cancellation charges apply
   - **Medium Occupancy (50-74%)**: Normal cancellation terms
   - **Low Occupancy (<50%)**: Normal cancellation terms

### 4. **Smart Cancellation Dialog**
   - Shows bus occupancy information before confirming cancellation
   - Calculates refund amount based on occupancy level and timing
   - Provides clear messaging about cancellation policies
   - Highlights benefits of cancelling when bus is full (helps other passengers)

### 5. **Booking History with Occupancy Metrics**
   - Displays occupancy information for each booking
   - Color-coded occupancy indicators in the booking table
   - Cancel button shown only for upcoming trips
   - Shows refund information before confirming cancellation

## Occupancy Configuration

Located in `js/occupancy-cancellation.js`:

```javascript
const OCCUPANCY_CONFIG = {
    criticalThreshold: 0.90,      // 90% = critically full
    highThreshold: 0.75,           // 75% = high occupancy
    mediumThreshold: 0.50,         // 50% = medium occupancy
    cancellationDeadlineHours: 24, // 24 hours before departure
    cancellationChargePercent: 10  // 10% charge for late cancellations
};
```

## User Workflow

### Step 1: Booking Selection
1. User navigates to "Book Ticket" section
2. Selects a route
3. **NEW**: Sees occupancy information for all available buses on that route
4. Reviews available seats and chooses based on preference

### Step 2: Seat Selection
1. User selects preferred seats
2. Proceeds to payment
3. Confirms booking

### Step 3: Viewing Bookings
1. User navigates to "My Profile" → "Booking History"
2. Sees all bookings with occupancy information
3. For upcoming trips: sees Cancel button with occupancy-aware refund terms

### Step 4: Cancelling a Booking
1. User clicks Cancel button for an upcoming trip
2. **NEW**: Smart cancellation dialog appears showing:
   - Current occupancy of the bus
   - Occupancy status badge
   - Refund amount and percentage
   - Reason why cancellation is allowed/disallowed
3. User confirms or cancels the action
4. Booking status updated to "Cancelled" with refund processed

## Occupancy Status Indicators

### Color Coding
- **Green (Low)**: < 50% full - plenty of seats available
- **Blue (Medium)**: 50-74% full - moderate capacity
- **Yellow (High)**: 75-89% full - limited seats
- **Red (Critical)**: ≥ 90% full - excellent time to cancel

### Badge Display
Each occupancy indicator shows:
- Status level (Low/Medium/High/CRITICALLY FULL)
- Percentage filled
- Icon indicating status
- Encouraging message when critically full

## API Functions

All functions are exported to global scope for use throughout the application:

### `getBusOccupancy(busId)`
Returns occupancy data for a bus:
```javascript
{
    occupancy: 12,
    capacity: 30,
    percentFull: 40,
    status: 'low',
    busId: 'CB01',
    route: 'R101',
    availableSeats: 18
}
```

### `canCancelBooking(booking, bus)`
Determines if a booking can be cancelled and returns:
```javascript
{
    canCancel: true,
    reason: 'normal_cancellation',
    message: 'You can cancel this booking for a full refund.',
    refundPercent: 100,
    occupancyData: {...}
}
```

### `getOccupancyBadge(percentFull)`
Returns HTML badge for occupancy display

### `getOccupancyInfoHTML(occupancyData)`
Returns formatted HTML card with occupancy information

### `showCancellationDialog(bookingId, booking)`
Displays the smart cancellation dialog with occupancy info

### `confirmCancellation(bookingId, refundPercent)`
Processes the cancellation and updates booking record

## Test Scenarios

### Scenario 1: Full Bus Cancellation
- Setup: Bus at 95% occupancy (27/30 seats)
- Action: User clicks cancel within 12 hours of departure
- Expected: 
  - Dialog shows "CRITICALLY FULL" badge
  - 100% refund offered
  - Message emphasizes importance of cancellation for other passengers
  - Booking status: Cancelled with Full refund

### Scenario 2: Moderately Full Bus Late Cancellation
- Setup: Bus at 82% occupancy (20/25 seats)
- Action: User clicks cancel within 6 hours of departure
- Expected:
  - Dialog shows "HIGH" occupancy badge
  - 95% refund offered (5% late cancellation charge)
  - Clear explanation of late cancellation policy
  - Booking status: Cancelled with 95% refund

### Scenario 3: Past Trip Cancellation
- Setup: Trip date is in the past
- Action: User tries to cancel
- Expected:
  - Dialog shows "Cannot cancel past trips"
  - No refund option available
  - Cancellation disabled

### Scenario 4: Route Selection with Multiple Buses
- Setup: Route "R101" has 2 available buses:
  - Bus CB01: 12/30 seats (40% full)
  - Bus CB02: 24/25 seats (96% full)
- Action: User selects route
- Expected:
  - Both buses shown with occupancy info
  - CB01 shows green progress bar (40%)
  - CB02 shows red progress bar with "CRITICALLY FULL" badge
  - User can make informed choice

## Database Integration Points

The feature integrates with:
- `window.appData.buses` - for occupancy data
- `window.appData.routes` - for route information
- `window.currentUser.bookings` - for user's booking history
- `localStorage` - for persistent booking data

## CSS Styling

All occupancy-related styles are in `css/style.css`:
- `.occupancy-info` - container styling
- `.occupancy-indicator` - badge styling
- `.refund-info` - refund amount display
- Animation classes for visual feedback

## Error Handling

- Graceful fallback if occupancy module not loaded
- Validates booking existence before cancellation
- Checks date validity before processing cancellations
- Handles missing bus data gracefully

## Future Enhancements

Potential improvements:
1. Real-time occupancy updates (WebSocket integration)
2. Occupancy predictions using ML
3. Dynamic pricing based on occupancy
4. User preferences for avoiding full buses
5. Integration with seat availability system
6. Email/SMS notification on cancellation
7. Occupancy alerts - notify when bus emptied to target level
8. Route recommendations based on occupancy patterns

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Requires polyfills for some features

## Performance Notes

- All calculations performed client-side
- No additional API calls required
- Minimal memory overhead
- Dialog rendering optimized for mobile

## Security Considerations

- Booking validation before cancellation
- User authentication checked before access
- Refund amounts calculated server-side in production
- No sensitive data exposed in occupancy displays
