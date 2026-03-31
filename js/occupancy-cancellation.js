// Smart Campus Transit Authority - Occupancy-Based Ticket Cancellation Module
// This module handles displaying occupancy info and allowing/disallowing ticket cancellation based on bus occupancy levels

// Occupancy thresholds (configurable)
const OCCUPANCY_CONFIG = {
    criticalThreshold: 0.90, // 90% - critically full, allow free cancellation
    highThreshold: 0.75,     // 75% - high occupancy, allow cancellation with conditions
    mediumThreshold: 0.50,   // 50% - medium occupancy
    cancellationDeadlineHours: 24, // Cancellation allowed 24 hours before departure
    cancellationChargePercent: 10  // 10% charge for late cancellations
};

/**
 * Get bus occupancy percentage
 * @param {string} busId - The bus identifier
 * @returns {object} - {occupancy, capacity, percentFull, status}
 */
function getBusOccupancy(busId) {
    const buses = window.appData && window.appData.buses ? window.appData.buses : [];
    const bus = buses.find(b => b.id === busId);
    
    if (!bus) {
        return {
            occupancy: 0,
            capacity: 0,
            percentFull: 0,
            status: 'unavailable',
            busId: busId
        };
    }

    const percentFull = Math.round((bus.occupancy / bus.capacity) * 100);
    let status = 'low';
    
    if (percentFull >= (OCCUPANCY_CONFIG.criticalThreshold * 100)) {
        status = 'critical';
    } else if (percentFull >= (OCCUPANCY_CONFIG.highThreshold * 100)) {
        status = 'high';
    } else if (percentFull >= (OCCUPANCY_CONFIG.mediumThreshold * 100)) {
        status = 'medium';
    }

    return {
        occupancy: bus.occupancy,
        capacity: bus.capacity,
        percentFull: percentFull,
        status: status,
        busId: bus.id,
        route: bus.route,
        availableSeats: bus.capacity - bus.occupancy
    };
}

/**
 * Check if a booking can be cancelled based on occupancy
 * @param {object} booking - The booking object
 * @param {object} bus - The bus object
 * @returns {object} - {canCancel, reason, message, refundPercent}
 */
function canCancelBooking(booking, bus) {
    if (!bus) {
        return {
            canCancel: true,
            reason: 'no_bus_data',
            message: 'Bus information not available. You can cancel this booking.',
            refundPercent: 100
        };
    }

    const occupancyData = getBusOccupancy(bus.id);
    const percentFull = occupancyData.percentFull;

    // Check if booking is in past
    const bookingDate = new Date(booking.date);
    const now = new Date();
    if (bookingDate < now) {
        return {
            canCancel: false,
            reason: 'past_trip',
            message: 'Cannot cancel past trips.',
            refundPercent: 0,
            occupancyData: occupancyData
        };
    }

    // Calculate hours until departure
    const hoursUntilDeparture = (bookingDate - now) / (1000 * 60 * 60);

    // Check if within cancellation deadline
    if (hoursUntilDeparture < OCCUPANCY_CONFIG.cancellationDeadlineHours) {
        // Late cancellation - apply charge based on occupancy
        let refundPercent = 90; // Default 10% charge
        let message = `Late cancellation: You'll receive 90% refund.`;

        if (percentFull >= (OCCUPANCY_CONFIG.criticalThreshold * 100)) {
            refundPercent = 100; // Full refund if bus is critically full
            message = `Bus is ${percentFull}% full (critically full). Free cancellation allowed!`;
        } else if (percentFull >= (OCCUPANCY_CONFIG.highThreshold * 100)) {
            refundPercent = 95; // 5% charge
            message = `Bus is ${percentFull}% full. Late cancellation: 95% refund.`;
        }

        return {
            canCancel: true,
            reason: 'late_cancellation',
            message: message,
            refundPercent: refundPercent,
            occupancyData: occupancyData,
            isLateBooking: true
        };
    }

    // Normal cancellation
    let refundPercent = 100;
    let message = 'You can cancel this booking for a full refund.';

    // If bus is critically full, emphasize the importance of early cancellation
    if (percentFull >= (OCCUPANCY_CONFIG.criticalThreshold * 100)) {
        message = `Bus is ${percentFull}% full. Cancelling now helps other passengers find seats!`;
    } else if (percentFull >= (OCCUPANCY_CONFIG.highThreshold * 100)) {
        message = `Bus is ${percentFull}% full. You can cancel for a full refund.`;
    }

    return {
        canCancel: true,
        reason: 'normal_cancellation',
        message: message,
        refundPercent: refundPercent,
        occupancyData: occupancyData
    };
}

/**
 * Get occupancy status badge HTML
 * @param {number} percentFull - Occupancy percentage
 * @returns {string} - HTML badge
 */
function getOccupancyBadge(percentFull) {
    let badgeClass = 'bg-success';
    let icon = '<i class="fas fa-check-circle"></i>';
    let label = 'Low';

    if (percentFull >= (OCCUPANCY_CONFIG.criticalThreshold * 100)) {
        badgeClass = 'bg-danger';
        icon = '<i class="fas fa-exclamation-circle"></i>';
        label = 'CRITICALLY FULL';
    } else if (percentFull >= (OCCUPANCY_CONFIG.highThreshold * 100)) {
        badgeClass = 'bg-warning text-dark';
        icon = '<i class="fas fa-warning"></i>';
        label = 'HIGH';
    } else if (percentFull >= (OCCUPANCY_CONFIG.mediumThreshold * 100)) {
        badgeClass = 'bg-info';
        icon = '<i class="fas fa-info-circle"></i>';
        label = 'MEDIUM';
    }

    return `<span class="badge ${badgeClass}">${icon} ${label} (${percentFull}%)</span>`;
}

/**
 * Get occupancy info HTML for display
 * @param {object} occupancyData - Occupancy data from getBusOccupancy
 * @returns {string} - HTML content
 */
function getOccupancyInfoHTML(occupancyData) {
    const progressColor = occupancyData.percentFull >= 90 ? 'danger' : 
                         occupancyData.percentFull >= 75 ? 'warning' : 
                         occupancyData.percentFull >= 50 ? 'info' : 'success';

    return `
        <div class="occupancy-info card mt-2 mb-2" style="background: #f8f9fa; border: 1px solid #dee2e6;">
            <div class="card-body p-3">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <strong>Bus Occupancy:</strong>
                        <div class="mt-2">
                            <small class="text-muted">
                                ${occupancyData.occupancy}/${occupancyData.capacity} seats occupied
                            </small>
                            <div class="progress mt-1" style="height: 24px;">
                                <div class="progress-bar bg-${progressColor}" role="progressbar" 
                                     style="width: ${occupancyData.percentFull}%;" 
                                     aria-valuenow="${occupancyData.percentFull}" aria-valuemin="0" aria-valuemax="100">
                                    <small style="font-weight: 600;">${occupancyData.percentFull}%</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 text-center">
                        <div>
                            ${getOccupancyBadge(occupancyData.percentFull)}
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                <strong>${occupancyData.availableSeats}</strong> seats available
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Display cancellation dialog with occupancy info
 * @param {string} bookingId - Booking ID
 * @param {object} booking - Booking object
 */
function showCancellationDialog(bookingId, booking) {
    // Find the bus for this booking based on route
    const route = window.appData.routes.find(r => r.name === booking.route);
    const buses = window.appData.buses.filter(b => b.route === route.id);
    const bus = buses.length > 0 ? buses[0] : null;

    // Get cancellation eligibility
    const cancellationInfo = canCancelBooking(booking, bus);

    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'cancellationModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('data-bs-backdrop', 'static');
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header ${cancellationInfo.canCancel ? 'bg-danger' : 'bg-warning'} text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-${cancellationInfo.canCancel ? 'times-circle' : 'exclamation-triangle'} me-2"></i>
                        Cancel Booking ${bookingId}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="booking-details mb-3">
                        <p><strong>Route:</strong> ${booking.route}</p>
                        <p><strong>Date:</strong> ${booking.date}</p>
                        <p><strong>Seats:</strong> ${booking.seats}</p>
                        <p><strong>Amount:</strong> ₹${booking.amount}</p>
                    </div>

                    ${bus ? getOccupancyInfoHTML(cancellationInfo.occupancyData) : ''}

                    <div class="alert ${cancellationInfo.canCancel ? 'alert-info' : 'alert-warning'} mt-3">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>${cancellationInfo.reason === 'normal_cancellation' ? 'Cancellation Possible' : 'Important Notice'}:</strong>
                        <p class="mb-0">${cancellationInfo.message}</p>
                    </div>

                    ${cancellationInfo.canCancel ? `
                        <div class="refund-info bg-light p-3 rounded">
                            <p class="mb-2"><strong>Refund Amount:</strong></p>
                            <p style="font-size: 1.3em; color: #28a745; font-weight: 700;">
                                ₹${Math.round(booking.amount * cancellationInfo.refundPercent / 100)}
                                <small style="font-size: 0.7em; color: #999;">(${cancellationInfo.refundPercent}% of ₹${booking.amount})</small>
                            </p>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="fas fa-arrow-left me-2"></i>Back
                    </button>
                    ${cancellationInfo.canCancel ? `
                        <button type="button" class="btn btn-danger" onclick="confirmCancellation('${bookingId}', ${cancellationInfo.refundPercent})">
                            <i class="fas fa-check me-2"></i>Confirm Cancellation
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Remove old modal if exists
    const oldModal = document.getElementById('cancellationModal');
    if (oldModal) oldModal.remove();

    // Append and show
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Clean up modal after hide
    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}

/**
 * Confirm booking cancellation
 * @param {string} bookingId - Booking ID
 * @param {number} refundPercent - Refund percentage
 */
function confirmCancellation(bookingId, refundPercent) {
    if (window.currentUser && window.currentUser.bookings) {
        const booking = window.currentUser.bookings.find(b => b.id === bookingId);
        if (booking) {
            const refundAmount = Math.round(booking.amount * refundPercent / 100);
            
            // Update booking status
            booking.status = 'Cancelled';
            booking.cancellationRefund = refundAmount;
            booking.cancellationDate = new Date().toISOString();

            // Save to local storage and database
            localStorage.setItem('scta_user', JSON.stringify(window.currentUser));

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('cancellationModal'));
            if (modal) modal.hide();

            // Show success notification
            showNotification(`✅ Booking ${bookingId} cancelled successfully! Refund of ₹${refundAmount} will be processed within 5-7 business days.`, 'success');

            // Refresh bookings display
            if (typeof showProfileTab === 'function') {
                setTimeout(() => {
                    showProfileTab('bookings');
                }, 500);
            }
        }
    }
}

// Export functions to global scope
window.getBusOccupancy = getBusOccupancy;
window.canCancelBooking = canCancelBooking;
window.getOccupancyBadge = getOccupancyBadge;
window.getOccupancyInfoHTML = getOccupancyInfoHTML;
window.showCancellationDialog = showCancellationDialog;
window.confirmCancellation = confirmCancellation;
window.OCCUPANCY_CONFIG = OCCUPANCY_CONFIG;
