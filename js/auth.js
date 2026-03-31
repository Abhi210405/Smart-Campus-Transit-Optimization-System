// Smart Campus Transit Authority - Authentication System
// Complete Login/Registration functionality

// Global authentication state
let currentUser = null;
let isAuthenticated = false;
let userType = 'guest'; // 'guest', 'user', 'admin'
const AUTH_DB_KEY = 'scta_user_database';
const otpVerificationState = {
    login: { phone: '', verified: false },
    register: { phone: '', verified: false }
};
let smsDeliveryStatus = {
    checked: false,
    configured: false,
    mode: 'demo'
};

function persistUserDatabase() {
    try {
        localStorage.setItem(AUTH_DB_KEY, JSON.stringify(userDatabase));
    } catch (error) {
        console.warn('Could not persist user database:', error);
    }
}

function loadUserDatabase() {
    try {
        const rawDatabase = localStorage.getItem(AUTH_DB_KEY);
        if (!rawDatabase) {
            persistUserDatabase();
            return;
        }

        const parsedDatabase = JSON.parse(rawDatabase);
        if (Array.isArray(parsedDatabase) && parsedDatabase.length) {
            userDatabase = parsedDatabase;
        }
    } catch (error) {
        console.warn('Could not load user database:', error);
    }
}

function syncAuthSystem() {
    window.currentUser = currentUser;
    window.authSystem = {
        currentUser,
        isAuthenticated,
        userType,
        showLogin,
        showRegistration,
        hideAuthModal,
        handleLogout,
        showAdminLogin,
        checkAuthAndShowBooking,
        checkAuthAndShowProfile
    };
}

// Sample user database (in real app, this would be server-side)
let userDatabase = [
    {
        id: 1,
        name: "Rajpreet Singh",
        email: "rajpreet@example.com",
        phone: "+919876543210",
        password: "password123", // In real app, this would be hashed
        city: "patiala",
        gender: "male",
        dob: "1995-05-15",
        joinDate: "2025-01-15",
        bookings: [
            { id: "BK001234", route: "Boys Hostel 1 - Galgotias University", date: "2025-09-15", amount: 20, status: "Completed" }
        ],
        preferences: {
            language: "english",
            notifications: { email: true, sms: true, push: true },
            seatPreference: "window",
            paymentMethod: "upi"
        }
    }
];

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

function initializeAuth() {
    loadUserDatabase();
    bindOtpFieldListeners();
    loadSmsDeliveryStatus();

    // Check if user was previously logged in
    const savedUser = localStorage.getItem('scta_user') || sessionStorage.getItem('scta_user');

    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAuthenticated = true;
            userType = currentUser && currentUser.email === 'admin@local' ? 'admin' : 'user';
            updateAuthUI();
            return;
        } catch (error) {
            console.warn('Could not restore saved user session:', error);
            localStorage.removeItem('scta_user');
            sessionStorage.removeItem('scta_user');
        }
    }

    syncAuthSystem();
    // Show login modal for new users
    showAuthModal();
}

function showAuthModal() {
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    authModal.show();
}

function showLogin() {
    showAuthModal();
    showAuthForm('login');
}

function showRegistration() {
    showAuthModal();
    showAuthForm('register');
}

function hideAuthModal() {
    const modalElement = document.getElementById('authModal');
    if (!modalElement) return;

    const authModal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    authModal.hide();
    showSection('home');
}

function closeAuthModal() {
    hideAuthModal();
}

// Switch between login/register/guest forms
function showAuthForm(formType) {
    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.style.display = 'none';
    });

    // Remove active class from all tabs
    document.querySelectorAll('#authTabs .nav-link').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected form and activate tab
    if (formType === 'login') {
        const loginForm = document.getElementById('loginForm');
        const loginTab = document.getElementById('loginTab');
        if (loginForm) loginForm.style.display = 'block';
        if (loginTab) loginTab.classList.add('active');
    } else if (formType === 'register') {
        const registerForm = document.getElementById('registerForm');
        const registerTab = document.getElementById('registerTab');
        if (registerForm) registerForm.style.display = 'block';
        if (registerTab) registerTab.classList.add('active');

        // Set maximum date for DOB (18+ only)
        const dobInput = document.getElementById('regDOB');
        if (dobInput) {
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() - 18);
            dobInput.max = maxDate.toISOString().split('T')[0];
        }
    } else if (formType === 'guest') {
        const guestForm = document.getElementById('guestForm');
        const guestTab = document.getElementById('guestTab');
        if (guestForm) guestForm.style.display = 'block';
        if (guestTab) guestTab.classList.add('active');
    }
}

// Simple admin sign-in helper (local/dev use). Prompts for admin password.
function showAdminLogin() {
    const pwd = prompt('Enter admin password to sign in as admin:');
    if (!pwd) return;
    const expected = window.ADMIN_PASSWORD || 'adminpass';
    if (pwd === expected) {
        isAuthenticated = true;
        userType = 'admin';
        currentUser = { id: 0, name: 'Administrator', email: 'admin@local' };
        localStorage.setItem('scta_user', JSON.stringify(currentUser));
        updateAuthUI();
        showNotificationAuth('Signed in as admin', 'success');
    } else {
        showNotificationAuth('Invalid admin password', 'danger');
    }
}

function showForgotPassword() {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.style.display = 'none';
    });
    document.getElementById('forgotPasswordForm').style.display = 'block';
}

function normalizeIndianPhone(rawPhone) {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    const tenDigitNumber = digits.length >= 10 ? digits.slice(-10) : digits;
    return tenDigitNumber.length === 10 ? `+91${tenDigitNumber}` : '';
}

function getOtpElements(flowType) {
    return flowType === 'register'
        ? {
            phoneInput: document.getElementById('regPhone'),
            otpInput: document.getElementById('regOtp'),
            statusEl: document.getElementById('regOtpStatus'),
            sendBtn: document.getElementById('sendRegOtpBtn'),
            verifyBtn: document.getElementById('verifyRegOtpBtn')
        }
        : {
            phoneInput: document.getElementById('loginPhone'),
            otpInput: document.getElementById('loginOtp'),
            statusEl: document.getElementById('loginOtpStatus'),
            sendBtn: document.getElementById('sendLoginOtpBtn'),
            verifyBtn: document.getElementById('verifyLoginOtpBtn')
        };
}

function setOtpStatus(statusEl, message, type = 'muted') {
    if (!statusEl) return;

    const classMap = {
        success: 'text-success',
        danger: 'text-danger',
        warning: 'text-warning',
        muted: 'text-muted'
    };

    statusEl.className = `form-text ${classMap[type] || classMap.muted}`;
    statusEl.textContent = message;
}

function getOtpInstructionMessage(flowType) {
    const baseMessage = flowType === 'register'
        ? 'Phone number verify karne ke baad hi account create hoga.'
        : 'Enter your mobile number to receive OTP for login.';

    if (!smsDeliveryStatus.checked) {
        return baseMessage;
    }

    const setupMessage = smsDeliveryStatus.configured
        ? `Real SMS OTP is active (${smsDeliveryStatus.mode}).`
        : 'Demo OTP mode is active. Add Direct SMS API details in server/.env for real SMS delivery.';

    return `${baseMessage} ${setupMessage}`;
}

function resetOtpFlowState(flowType) {
    otpVerificationState[flowType] = { phone: '', verified: false };

    const { statusEl } = getOtpElements(flowType);
    setOtpStatus(
        statusEl,
        getOtpInstructionMessage(flowType),
        smsDeliveryStatus.checked ? (smsDeliveryStatus.configured ? 'success' : 'warning') : 'muted'
    );
}

async function loadSmsDeliveryStatus() {
    try {
        const response = await fetch('/api/sms-status');
        if (!response.ok) {
            throw new Error('status_unavailable');
        }

        const data = await response.json();
        smsDeliveryStatus = {
            checked: true,
            configured: !!data.configured,
            mode: data.mode || 'demo'
        };

        setOtpStatus(document.getElementById('loginOtpStatus'), getOtpInstructionMessage('login'), smsDeliveryStatus.configured ? 'success' : 'warning');
        setOtpStatus(document.getElementById('regOtpStatus'), getOtpInstructionMessage('register'), smsDeliveryStatus.configured ? 'success' : 'warning');
    } catch (error) {
        console.warn('Could not load SMS delivery status:', error);
    }
}

function bindOtpFieldListeners() {
    [['login', 'loginPhone', 'loginOtp'], ['register', 'regPhone', 'regOtp']].forEach(([flowType, phoneId, otpId]) => {
        const phoneInput = document.getElementById(phoneId);
        const otpInput = document.getElementById(otpId);

        if (phoneInput && !phoneInput.dataset.otpBound) {
            phoneInput.addEventListener('input', () => {
                otpVerificationState[flowType] = { phone: '', verified: false };
                const { statusEl } = getOtpElements(flowType);
                setOtpStatus(
                    statusEl,
                    getOtpInstructionMessage(flowType),
                    smsDeliveryStatus.checked ? (smsDeliveryStatus.configured ? 'success' : 'warning') : 'muted'
                );
            });
            phoneInput.dataset.otpBound = 'true';
        }

        if (otpInput && !otpInput.dataset.otpDigitsOnly) {
            otpInput.addEventListener('input', () => {
                otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
            });
            otpInput.dataset.otpDigitsOnly = 'true';
        }
    });

    resetOtpFlowState('login');
    resetOtpFlowState('register');
}

async function requestOtp(flowType) {
    const { phoneInput, statusEl, sendBtn } = getOtpElements(flowType);
    if (!phoneInput) return;

    const phone = normalizeIndianPhone(phoneInput.value);
    if (!phone) {
        setOtpStatus(statusEl, 'Please enter a valid 10-digit mobile number.', 'danger');
        showNotificationAuth('Please enter a valid 10-digit mobile number', 'warning');
        phoneInput.focus();
        return;
    }

    const originalButtonMarkup = sendBtn ? sendBtn.innerHTML : '';
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Sending';
    }

    otpVerificationState[flowType] = { phone, verified: false };
    setOtpStatus(statusEl, 'Sending OTP...', 'warning');

    try {
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                message: flowType === 'register'
                    ? 'Your Smart Campus Transit Authority registration OTP'
                    : 'Your Smart Campus Transit Authority login OTP'
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Could not send OTP');
        }

        if (data.configured && (data.sentVia === 'twilio-message' || data.sentVia === 'twilio-verify')) {
            smsDeliveryStatus = { checked: true, configured: true, mode: data.sentVia };
            setOtpStatus(statusEl, `OTP sent to ${phone} via real SMS.`, 'success');
            showNotificationAuth(`OTP sent successfully to ${phone}`, 'success');
        } else {
            smsDeliveryStatus = { checked: true, configured: false, mode: 'demo' };
            setOtpStatus(statusEl, `Demo OTP: ${data.otp} (real SMS ke liye server/.env me SMS API details add karo).`, 'warning');
            showNotificationAuth(`Demo mode OTP: ${data.otp}`, 'info');
        }
    } catch (error) {
        console.error('OTP send failed:', error);
        otpVerificationState[flowType] = { phone: '', verified: false };
        setOtpStatus(statusEl, 'OTP send failed. Please try again.', 'danger');
        showNotificationAuth(`OTP send failed: ${error.message || 'Make sure the local server is running.'}`, 'danger');
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalButtonMarkup;
        }
    }
}

async function verifyOtpCode(flowType) {
    const { phoneInput, otpInput, statusEl, verifyBtn } = getOtpElements(flowType);
    if (!phoneInput || !otpInput) return;

    const phone = normalizeIndianPhone(phoneInput.value);
    const otp = (otpInput.value || '').trim();

    if (!phone) {
        setOtpStatus(statusEl, 'Please enter your mobile number first.', 'danger');
        showNotificationAuth('Please enter your mobile number first', 'warning');
        phoneInput.focus();
        return;
    }

    if (!/^\d{6}$/.test(otp)) {
        setOtpStatus(statusEl, 'Please enter a valid 6-digit OTP.', 'danger');
        showNotificationAuth('Please enter a valid 6-digit OTP', 'warning');
        otpInput.focus();
        return;
    }

    const originalButtonMarkup = verifyBtn ? verifyBtn.innerHTML : '';
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Verifying';
    }

    setOtpStatus(statusEl, 'Verifying OTP...', 'warning');

    try {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            otpVerificationState[flowType] = { phone, verified: true };
            setOtpStatus(statusEl, 'Mobile number verified successfully.', 'success');
            showNotificationAuth('OTP verified successfully', 'success');
        } else {
            otpVerificationState[flowType] = { phone, verified: false };
            setOtpStatus(statusEl, 'Invalid or expired OTP. Please request a new one.', 'danger');
            showNotificationAuth('Invalid or expired OTP', 'danger');
        }
    } catch (error) {
        console.error('OTP verify failed:', error);
        otpVerificationState[flowType] = { phone, verified: false };
        setOtpStatus(statusEl, 'OTP verification failed. Please try again.', 'danger');
        showNotificationAuth('OTP verification failed. Please try again.', 'danger');
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = originalButtonMarkup;
        }
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleBtn = passwordInput.nextElementSibling.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.classList.remove('fa-eye');
        toggleBtn.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleBtn.classList.remove('fa-eye-slash');
        toggleBtn.classList.add('fa-eye');
    }
}

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginPhoneInput = document.getElementById('loginPhone');
    const loginOtpInput = document.getElementById('loginOtp');
    const loginPhone = normalizeIndianPhone(loginPhoneInput ? loginPhoneInput.value : '');

    let user = null;

    if (loginPhone) {
        if (!otpVerificationState.login.verified || otpVerificationState.login.phone !== loginPhone) {
            showNotificationAuth('Please verify the OTP sent to your mobile number before logging in', 'warning');
            return;
        }

        user = userDatabase.find(u => normalizeIndianPhone(u.phone) === loginPhone);
        if (!user) {
            showNotificationAuth('This mobile number is not registered yet. Please create an account first.', 'warning');
            showAuthForm('register');
            return;
        }
    } else {
        if (!email || !password) {
            showNotificationAuth('Enter email/password or use mobile OTP login', 'warning');
            return;
        }

        user = userDatabase.find(u => u.email === email && u.password === password);
    }

    if (!user) {
        showNotificationAuth('Invalid login details', 'danger');
        return;
    }

    currentUser = { ...user };
    delete currentUser.password;
    isAuthenticated = true;
    userType = 'user';

    if (rememberMe) {
        localStorage.setItem('scta_user', JSON.stringify(currentUser));
        sessionStorage.removeItem('scta_user');
    } else {
        sessionStorage.setItem('scta_user', JSON.stringify(currentUser));
        localStorage.removeItem('scta_user');
    }

    const authModalElement = document.getElementById('authModal');
    const authModal = bootstrap.Modal.getInstance(authModalElement) || new bootstrap.Modal(authModalElement);
    authModal.hide();

    resetOtpFlowState('login');
    if (loginPhoneInput) loginPhoneInput.value = '';
    if (loginOtpInput) loginOtpInput.value = '';

    updateAuthUI();
    showNotificationAuth('Welcome back, ' + currentUser.name + '!', 'success');
}

// Handle registration form submission
function handleRegistration(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        phone: normalizeIndianPhone(document.getElementById('regPhone').value),
        dob: document.getElementById('regDOB').value,
        gender: document.getElementById('regGender').value,
        city: document.getElementById('regCity').value.trim(),
        password: document.getElementById('regPassword').value,
        confirmPassword: document.getElementById('regConfirmPassword').value
    };

    if (!validateRegistrationForm(formData)) {
        return;
    }

    if (!otpVerificationState.register.verified || otpVerificationState.register.phone !== formData.phone) {
        showNotificationAuth('Please verify the OTP sent to your mobile number before creating your account', 'warning');
        return;
    }

    if (userDatabase.find(u => u.email === formData.email || normalizeIndianPhone(u.phone) === formData.phone)) {
        showNotificationAuth('Email or phone number is already registered. Please login instead.', 'warning');
        return;
    }

    const newUser = {
        id: userDatabase.length + 1,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        city: formData.city,
        gender: formData.gender,
        dob: formData.dob,
        joinDate: new Date().toISOString().split('T')[0],
        bookings: [],
        preferences: {
            language: 'english',
            notifications: {
                email: document.getElementById('notifyEmail').checked,
                sms: document.getElementById('notifySMS').checked,
                push: true
            },
            seatPreference: 'window',
            paymentMethod: 'upi'
        }
    };

    userDatabase.push(newUser);
    persistUserDatabase();

    currentUser = { ...newUser };
    delete currentUser.password;
    isAuthenticated = true;
    userType = 'user';

    localStorage.setItem('scta_user', JSON.stringify(currentUser));
    sessionStorage.removeItem('scta_user');

    const authModalElement = document.getElementById('authModal');
    const authModal = bootstrap.Modal.getInstance(authModalElement) || new bootstrap.Modal(authModalElement);
    authModal.hide();

    resetOtpFlowState('register');
    const regOtpInput = document.getElementById('regOtp');
    if (regOtpInput) regOtpInput.value = '';

    updateAuthUI();
    showNotificationAuth('Account created successfully! Welcome to Smart Campus Transit Authority!', 'success');
}

function validateRegistrationForm(formData) {
    // Check required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.dob || 
        !formData.gender || !formData.city || !formData.password || !formData.confirmPassword) {
        showNotificationAuth('Please fill in all required fields', 'warning');
        return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showNotificationAuth('Please enter a valid email address', 'warning');
        return false;
    }

    // Validate phone number
    if (!/^[0-9]{10}$/.test(formData.phone.replace('+91', ''))) {
        showNotificationAuth('Please enter a valid 10-digit phone number', 'warning');
        return false;
    }

    // Validate password
    if (formData.password.length < 8) {
        showNotificationAuth('Password must be at least 8 characters long', 'warning');
        return false;
    }

    // Check password confirmation
    if (formData.password !== formData.confirmPassword) {
        showNotificationAuth('Passwords do not match', 'warning');
        return false;
    }

    // Check age (must be 18+)
    const birthDate = new Date(formData.dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
        showNotificationAuth('You must be at least 18 years old to register', 'warning');
        return false;
    }

    // Check terms acceptance
    if (!document.getElementById('agreeTerms').checked) {
        showNotificationAuth('Please accept the Terms of Service and Privacy Policy', 'warning');
        return false;
    }

    return true;
}

// Continue as guest
function continueAsGuest() {
    isAuthenticated = false;
    userType = 'guest';
    currentUser = {
        name: 'Guest User',
        type: 'guest'
    };

    const authModal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
    authModal.hide();

    updateAuthUI();
    showNotificationAuth('Continuing as guest. Some features may be limited.', 'info');
}

// Handle forgot password
function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById('forgotEmail').value;

    if (!email) {
        showNotificationAuth('Please enter your email address', 'warning');
        return;
    }

    // Check if email exists
    const user = userDatabase.find(u => u.email === email);
    if (user) {
        // Simulate sending reset email
        showNotificationAuth('Password reset link sent to your email!', 'success');
        setTimeout(() => {
            showAuthForm('login');
        }, 2000);
    } else {
        showNotificationAuth('Email not found. Please check your email address.', 'warning');
    }
}

// Update UI based on authentication state
function updateAuthUI() {
    syncAuthSystem();

    const userInfo = document.getElementById('userInfo');
    const guestLogin = document.getElementById('guestLogin');
    const registerNav = document.getElementById('registerNav');
    const adminNav = document.getElementById('adminNav');
    const userName = document.getElementById('userName');
    const guestMessage = document.getElementById('guestProfileMessage');
    const loggedInProfile = document.getElementById('loggedInProfile');

    if (isAuthenticated && currentUser) {
        // Show user info, hide guest/login actions
        if (userInfo) userInfo.style.display = 'block';
        if (guestLogin) guestLogin.style.display = 'none';
        if (registerNav) registerNav.style.display = 'none';
        if (adminNav) adminNav.style.display = userType === 'admin' ? 'none' : 'block';
        if (userName) {
            userName.textContent = userType === 'admin'
                ? 'Admin'
                : (currentUser.name || 'User').split(' ')[0];
        }

        updateProfileUI();

        if (guestMessage) guestMessage.style.display = 'none';
        if (loggedInProfile) loggedInProfile.style.display = 'block';
    } else {
        // Show guest actions, hide authenticated UI
        if (userInfo) userInfo.style.display = 'none';
        if (guestLogin) guestLogin.style.display = 'block';
        if (registerNav) registerNav.style.display = 'block';
        if (adminNav) adminNav.style.display = 'block';
        if (guestMessage) guestMessage.style.display = 'block';
        if (loggedInProfile) loggedInProfile.style.display = 'none';
    }
}

function updateProfileUI() {
    if (!currentUser || userType === 'guest') return;

    const bookings = Array.isArray(currentUser.bookings) ? currentUser.bookings : [];
    const joinDate = currentUser.joinDate || new Date().toISOString().split('T')[0];

    // Update profile elements
    const elements = {
        'profileName': currentUser.name || (userType === 'admin' ? 'Administrator' : 'User Name'),
        'profileEmail': currentUser.email || 'user@example.com',
        'profilePhone': currentUser.phone || 'Not provided',
        'memberSince': 'Member since ' + new Date(joinDate).getFullYear(),
        'totalBookings': bookings.length,
        'moneySpent': '₹' + (bookings.reduce((sum, b) => sum + (b.amount || 0), 0) || '0'),
        'favoriteRoute': bookings[0]?.route || 'Not set'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    // Set profile preferences
    if (currentUser.preferences) {
        const prefElements = {
            'prefLanguage': currentUser.preferences.language || 'english',
            'prefCity': currentUser.city || 'patiala',
            'prefSeat': currentUser.preferences.seatPreference || 'window',
            'prefPayment': currentUser.preferences.paymentMethod || 'upi'
        };

        Object.entries(prefElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });

        // Set notification preferences
        if (currentUser.preferences.notifications) {
            const notifElements = {
                'emailNotifications': currentUser.preferences.notifications.email,
                'smsNotifications': currentUser.preferences.notifications.sms,
                'pushNotifications': currentUser.preferences.notifications.push
            };

            Object.entries(notifElements).forEach(([id, checked]) => {
                const element = document.getElementById(id);
                if (element) element.checked = checked;
            });
        }
    }
}

// Check authentication for protected features
function checkAuthAndShowBooking() {
    if (isAuthenticated && userType === 'user') {
        showSection('booking');
    } else {
        // Show authentication required alert
        showSection('booking');
        const authAlert = document.getElementById('authRequiredAlert');
        if (authAlert) {
            authAlert.style.display = 'block';
        }
    }
}

function checkAuthAndShowProfile() {
    showSection('profile');
}

// Handle logout
function handleLogout() {
    // Clear stored data
    localStorage.removeItem('scta_user');
    sessionStorage.removeItem('scta_user');

    // Reset auth state
    currentUser = null;
    isAuthenticated = false;
    userType = 'guest';

    // Update UI
    updateAuthUI();

    // Show login modal
    setTimeout(() => {
        showAuthModal();
    }, 500);

    showNotificationAuth('Logged out successfully', 'info');
}

// Profile management functions
function editProfile() {
    // Create edit profile modal (implementation would go here)
    alert('Edit profile functionality - would open modal with editable fields');
}

function changeProfilePicture() {
    // Handle profile picture change
    alert('Profile picture change - would open file picker');
}

function changePassword() {
    // Handle password change
    alert('Change password - would open password change form');
}

function notificationSettings() {
    // Handle notification settings
    alert('Notification settings - would open settings panel');
}

function privacySettings() {
    // Handle privacy settings
    alert('Privacy settings - would open privacy panel');
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        // Handle account deletion
        alert('Account deletion - would require confirmation and server request');
    }
}

function savePreferences(event) {
    event.preventDefault();

    if (!currentUser || userType === 'guest') {
        showNotificationAuth('Please login to save preferences', 'warning');
        return;
    }

    // Update user preferences
    currentUser.preferences = {
        language: document.getElementById('prefLanguage').value,
        city: document.getElementById('prefCity').value,
        seatPreference: document.getElementById('prefSeat').value,
        paymentMethod: document.getElementById('prefPayment').value,
        notifications: {
            email: document.getElementById('emailNotifications').checked,
            sms: document.getElementById('smsNotifications').checked,
            push: document.getElementById('pushNotifications').checked
        }
    };

    // Save to storage
    localStorage.setItem('scta_user', JSON.stringify(currentUser));

    // Update database
    const userIndex = userDatabase.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        userDatabase[userIndex].preferences = currentUser.preferences;
        userDatabase[userIndex].city = currentUser.preferences.city;
        persistUserDatabase();
    }

    showNotificationAuth('Preferences saved successfully!', 'success');
}

function downloadBookingHistory() {
    if (!currentUser || userType === 'guest') {
        showNotificationAuth('Please login to download booking history', 'warning');
        return;
    }

    // Create and download booking history CSV
    const bookings = currentUser.bookings || [];
    if (bookings.length === 0) {
        showNotificationAuth('No bookings found to download', 'info');
        return;
    }

    let csv = 'Booking ID,Date,Route,Seats,Amount,Status\n';
    bookings.forEach(booking => {
        csv += `${booking.id},${booking.date},${booking.route},${booking.seats || 'N/A'},₹${booking.amount},${booking.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scta-bookings-${currentUser.name.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showNotificationAuth('Booking history downloaded successfully!', 'success');
}

function viewTicket(bookingId) {
    alert(`View ticket functionality for booking ${bookingId} - would show ticket details`);
}

function cancelBooking(bookingId) {
    // Check if occupancy module is available
    if (typeof showCancellationDialog === 'function') {
        // Find the booking details
        if (window.currentUser && window.currentUser.bookings) {
            const booking = window.currentUser.bookings.find(b => b.id === bookingId);
            if (booking) {
                // Use occupancy-aware cancellation dialog
                showCancellationDialog(bookingId, booking);
            }
        }
    } else {
        // Fallback to simple confirmation if module not loaded
        if (confirm('Are you sure you want to cancel this booking?')) {
            alert(`Cancel booking ${bookingId} - would process cancellation`);
        }
    }
}

// Show notifications for auth system
function showNotificationAuth(message, type = 'info') {
    // Use the existing notification system from tracker
    if (window.busTracker && busTracker.showNotification) {
        busTracker.showNotification(message, type);
    } else {
        // Fallback alert
        alert(message);
    }
}

// Override booking confirmation to save to user profile
function confirmBookingWithAuth() {
    if (isAuthenticated && userType === 'user' && currentUser) {
        // Create booking record
        const booking = {
            id: 'BK' + Date.now(),
            date: document.getElementById('travelDate').value,
            route: bookingData.selectedRoute.name,
            seats: selectedSeats.join(', '),
            amount: parseInt(document.getElementById('totalAmount').textContent),
            status: 'Confirmed'
        };

        // Add to user bookings
        currentUser.bookings = currentUser.bookings || [];
        currentUser.bookings.push(booking);

        // Update storage
        localStorage.setItem('scta_user', JSON.stringify(currentUser));

        // Update database
        const userIndex = userDatabase.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            userDatabase[userIndex].bookings = currentUser.bookings;
            persistUserDatabase();
        }

        // Show success message with invoice download
        alert(`✅ Booking Confirmed!\n\nBooking ID: ${booking.id}\nSeats: ${selectedSeats.join(', ')}\nAmount: ₹${booking.amount}\n\nYour invoice will open for download.`);

        // Generate and download invoice
        downloadInvoice(booking.id, currentUser.email || 'user@smartcampustransit.com');

        // Update UI
        updateProfileUI();
    } else {
        // Guest booking (limited functionality)
        const bookingId = 'BK' + Date.now();
        alert(`✅ Booking Confirmed!\n\nBooking ID: ${bookingId}\nSeats: ${selectedSeats.join(', ')}\nAmount: ₹${document.getElementById('totalAmount').textContent}\n\nYour invoice will open for download.\n\nNote: Login to save booking history`);
        
        // Generate and download invoice for guest
        downloadInvoice(bookingId, 'guest@smartcampustransit.com');
    }

    resetBookingProcess();
}

// Export functions for global access
syncAuthSystem();
