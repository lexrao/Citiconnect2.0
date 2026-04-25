// ===================================
// LGU Portal - Complete JavaScript with Registration
// ===================================

// Authentication State
const AuthState = {
    isAuthenticated: false,
    currentUser: null,
    currentUserData: null,
    users: []
};

// ===================================
// Role Helper
// ===================================
function isAdmin() {
    return AuthState.currentUserData && AuthState.currentUserData.role === 'Administrator';
}

function isStaff() {
    return AuthState.currentUserData && AuthState.currentUserData.role !== 'Administrator';
}

// ===================================
// Initialize Default Users
// ===================================
function initializeDefaultUsers() {
    const storedUsers = localStorage.getItem('lguUsers');
    if (storedUsers) {
        try {
            AuthState.users = JSON.parse(storedUsers);
        } catch (e) {
            console.error('Error loading users');
            setDefaultUsers();
        }
    } else {
        setDefaultUsers();
    }
}

function setDefaultUsers() {
    AuthState.users = [
        { 
            username: 'admin', 
            password: 'admin123', 
            role: 'Administrator',
            fullName: 'System Administrator',
            email: 'admin@barangaydanao.gov.ph',
            position: 'System Admin',
            createdDate: new Date().toISOString(),
            status: 'Active'
        },
        { 
            username: 'staff', 
            password: 'staff123', 
            role: 'Staff',
            fullName: 'Staff Member',
            email: 'staff@barangaydanao.gov.ph',
            position: 'General Staff',
            createdDate: new Date().toISOString(),
            status: 'Active'
        }
    ];
    saveUsers();
}

function saveUsers() {
    localStorage.setItem('lguUsers', JSON.stringify(AuthState.users));
}

// ===================================
// Form Switching Functions
// ===================================
function showLoginForm() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById('registerForm').reset();
}

function showRegisterForm() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registerScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

// ===================================
// Authentication Functions
// ===================================
function initAuth() {
    // Initialize users
    initializeDefaultUsers();
    
    // Check if user is already logged in (from localStorage)
    const savedSession = localStorage.getItem('lguSession');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            if (session.timestamp && Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
                // Session valid for 24 hours
                const user = AuthState.users.find(u => u.username === session.username);
                if (user) {
                    AuthState.isAuthenticated = true;
                    AuthState.currentUser = session.username;
                    AuthState.currentUserData = user;
                    showDashboard();
                    return;
                }
            }
        } catch (e) {
            console.error('Invalid session data');
        }
    }
    
    // Show login screen
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    // Update username display with role badge
    if (AuthState.currentUser) {
        const userElement = document.getElementById('currentUser');
        if (userElement) {
            userElement.textContent = AuthState.currentUser;
        }
    }

    // Apply role-based UI restrictions
    applyRoleRestrictions();
    
    // Show pending approvals badge
    updatePendingApprovalsBadge();
    
    // Initialize the app
    initializeApp();
}

// ===================================
// Apply Role-Based Access Control
// ===================================
function applyRoleRestrictions() {
    const admin = isAdmin();

    // Role badge in header
    const roleBadge = document.getElementById('roleBadge');
    if (roleBadge) {
        roleBadge.textContent = admin ? '🔑 Administrator' : '👁️ Staff (View Only)';
        roleBadge.style.background = admin ? '#8B1538' : '#2563eb';
        roleBadge.style.color = 'white';
        roleBadge.style.padding = '3px 12px';
        roleBadge.style.borderRadius = '12px';
        roleBadge.style.fontSize = '0.8em';
        roleBadge.style.fontWeight = '600';
        roleBadge.style.display = 'inline-block';
    }

    // Admin-only element IDs - hide from staff
    const adminOnlyIds = [
        'clearAllDataBtn',
        'exportBtnDashboard',
        'exportBtnManage',
        'exportBtnTrack',
        'usersTab',
    ];
    adminOnlyIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = admin ? '' : 'none';
    });

    // Staff notice banner
    const staffNotice = document.getElementById('staffNoticeBanner');
    if (staffNotice) {
        staffNotice.style.display = admin ? 'none' : 'flex';
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validate credentials
    const user = AuthState.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Check if account is pending approval
        if (user.status === 'Pending') {
            showLoginAlert('⏳ Your account is awaiting admin approval. Please wait for confirmation.', 'error');
            return;
        }
        // Check if account is rejected
        if (user.status === 'Rejected') {
            showLoginAlert('✗ Your account registration was not approved. Please contact the Barangay admin.', 'error');
            return;
        }
        AuthState.isAuthenticated = true;
        AuthState.currentUser = username;
        AuthState.currentUserData = user;
        
        // Save session if remember me is checked
        if (rememberMe) {
            localStorage.setItem('lguSession', JSON.stringify({
                username: username,
                timestamp: Date.now()
            }));
        }
        
        // Show success message
        showLoginAlert('✓ Login successful! Welcome, ' + username, 'success');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
            showDashboard();
        }, 1000);
        
    } else {
        // Failed login
        showLoginAlert('✗ Invalid username or password. Please try again.', 'error');
    }
}

function handleRegister(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const role = document.getElementById('regRole').value;
    const position = document.getElementById('regPosition').value.trim();
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validation
    if (!agreeTerms) {
        showRegisterAlert('✗ You must agree to the terms and conditions', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showRegisterAlert('✗ Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showRegisterAlert('✗ Password must be at least 6 characters', 'error');
        return;
    }
    
    if (username.length < 4) {
        showRegisterAlert('✗ Username must be at least 4 characters', 'error');
        return;
    }
    
    // Check if username already exists
    if (AuthState.users.find(u => u.username === username)) {
        showRegisterAlert('✗ Username already exists. Please choose a different username.', 'error');
        return;
    }
    
    // Check if email already exists
    if (AuthState.users.find(u => u.email === email)) {
        showRegisterAlert('✗ Email already registered. Please use a different email.', 'error');
        return;
    }
    
    // Create new user — status Pending until admin approves
    const newUser = {
        username: username,
        password: password,
        fullName: fullName,
        email: email,
        role: role,
        position: position || 'N/A',
        createdDate: new Date().toISOString(),
        status: 'Pending'
    };
    
    // Add to users array
    AuthState.users.push(newUser);
    saveUsers();

    // Notify admin via badge
    updatePendingApprovalsBadge();
    
    // Show success message
    showRegisterAlert('✓ Registration submitted! Your account is awaiting admin approval. You will be able to login once approved.', 'success');
    
    // Redirect to login after delay
    setTimeout(() => {
        showLoginForm();
    }, 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session
        AuthState.isAuthenticated = false;
        AuthState.currentUser = null;
        AuthState.currentUserData = null;
        localStorage.removeItem('lguSession');
        
        // Reset forms
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        
        // Show login screen
        showLoginScreen();
    }
}

function showLoginAlert(message, type) {
    const alertDiv = document.getElementById('loginAlert');
    if (type === 'success') {
        alertDiv.className = 'alert alert-success show';
        alertDiv.style.background = '#d1fae5';
        alertDiv.style.color = '#065f46';
        alertDiv.style.borderLeft = '4px solid #10b981';
    } else {
        alertDiv.className = 'alert show';
        alertDiv.style.background = '#fee2e2';
        alertDiv.style.color = '#991b1b';
        alertDiv.style.borderLeft = '4px solid #ef4444';
    }
    alertDiv.textContent = message;
    alertDiv.style.display = 'flex';
    alertDiv.style.padding = '16px 20px';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.marginBottom = '20px';
    alertDiv.style.fontWeight = '500';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 3000);
}

function showRegisterAlert(message, type) {
    const alertDiv = document.getElementById('registerAlert');
    if (type === 'success') {
        alertDiv.className = 'alert alert-success show';
        alertDiv.style.background = '#d1fae5';
        alertDiv.style.color = '#065f46';
        alertDiv.style.borderLeft = '4px solid #10b981';
    } else {
        alertDiv.className = 'alert show';
        alertDiv.style.background = '#fee2e2';
        alertDiv.style.color = '#991b1b';
        alertDiv.style.borderLeft = '4px solid #ef4444';
    }
    alertDiv.textContent = message;
    alertDiv.style.display = 'flex';
    alertDiv.style.padding = '16px 20px';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.marginBottom = '20px';
    alertDiv.style.fontWeight = '500';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ===================================
// Pending Approvals Badge
// ===================================
function updatePendingApprovalsBadge() {
    const pending = AuthState.users.filter(u => u.status === 'Pending').length;
    const badge = document.getElementById('pendingApprovalsBadge');
    const usersTab = document.getElementById('usersTab');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'inline-flex' : 'none';
    }
    if (usersTab) {
        const existing = usersTab.querySelector('.tab-notif-dot');
        if (pending > 0 && !existing) {
            const dot = document.createElement('span');
            dot.className = 'tab-notif-dot';
            dot.textContent = pending;
            usersTab.appendChild(dot);
        } else if (pending === 0 && existing) {
            existing.remove();
        } else if (existing) {
            existing.textContent = pending;
        }
    }
}

// ===================================
// User Management Functions
// ===================================
function displayUsersList() {
    const container = document.getElementById('usersList');

    const pendingUsers = AuthState.users.filter(u => u.status === 'Pending');
    const activeUsers  = AuthState.users.filter(u => u.status === 'Active');
    const otherUsers   = AuthState.users.filter(u => u.status !== 'Pending' && u.status !== 'Active');

    let html = '';

    // ---- PENDING APPROVALS SECTION ----
    if (pendingUsers.length > 0) {
        html += `
        <div style="margin-bottom:28px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
                <h3 style="color:#8B1538;font-size:1.1em;font-weight:700;">⏳ Pending Approvals</h3>
                <span style="background:#fee2e2;color:#8B1538;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:700;">${pendingUsers.length} awaiting</span>
            </div>
            ${pendingUsers.map(user => `
            <div class="user-card" style="border-left-color:#f59e0b;background:linear-gradient(to right,#fffbeb,white);margin-bottom:14px;animation:fadeIn 0.4s;">
                <div class="user-avatar" style="background:linear-gradient(135deg,#f59e0b,#d97706);">${user.fullName.charAt(0)}</div>
                <div class="user-info">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <div class="user-name">${user.fullName}</div>
                        <span style="background:#fef3c7;color:#d97706;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;letter-spacing:.3px;">⏳ PENDING</span>
                    </div>
                    <div class="user-username">@${user.username}</div>
                    <div class="user-meta">
                        <span class="user-stat">📧 ${user.email}</span>
                        <span class="user-stat">💼 ${user.position}</span>
                        <span class="user-stat">🎭 ${user.role}</span>
                        <span class="user-stat">📅 Applied: ${new Date(user.createdDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="user-actions" style="gap:8px;">
                    <button class="btn btn-success" style="padding:8px 16px;font-size:0.85em;display:flex;align-items:center;gap:5px;" onclick="approveUser('${user.username}')">
                        ✅ Approve
                    </button>
                    <button class="btn btn-danger" style="padding:8px 16px;font-size:0.85em;display:flex;align-items:center;gap:5px;" onclick="rejectUser('${user.username}')">
                        ✗ Reject
                    </button>
                </div>
            </div>`).join('')}
        </div>
        <hr style="border:none;border-top:2px solid #e5e7eb;margin-bottom:24px;">`;
    } else {
        html += `
        <div style="margin-bottom:20px;padding:14px 18px;background:#f0fdf4;border-radius:10px;border-left:4px solid #10b981;display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.3em;">✅</span>
            <span style="color:#065f46;font-weight:600;font-size:0.9em;">No pending approvals — all accounts are up to date.</span>
        </div>`;
    }

    // ---- ACTIVE USERS SECTION ----
    if (activeUsers.length > 0 || otherUsers.length > 0) {
        html += `<div style="margin-bottom:12px;"><h3 style="color:#374151;font-size:1.05em;font-weight:700;margin-bottom:14px;">👥 Active Accounts (${activeUsers.length})</h3>`;
        html += [...activeUsers, ...otherUsers].map(user => {
            const statusColor = user.status === 'Active' ? '#10b981' : user.status === 'Rejected' ? '#ef4444' : '#f59e0b';
            const statusLabel = user.status === 'Active' ? '● Active' : user.status === 'Rejected' ? '✗ Rejected' : user.status;
            return `
            <div class="user-card" style="margin-bottom:12px;">
                <div class="user-avatar">${user.fullName.charAt(0)}</div>
                <div class="user-info">
                    <div class="user-name">${user.fullName}</div>
                    <div class="user-username">@${user.username}</div>
                    <div class="user-meta">
                        <span class="user-stat">📧 ${user.email}</span>
                        <span class="user-stat">💼 ${user.position}</span>
                        <span class="user-stat">📅 Joined: ${new Date(user.createdDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="user-actions">
                    <span class="badge-role badge-${user.role.toLowerCase().replace(/\s+/g,'-')}">${user.role}</span>
                    <small style="color:${statusColor};font-weight:600;">${statusLabel}</small>
                    ${isAdmin() && user.username !== AuthState.currentUser ? `
                    <button class="btn btn-danger" style="padding:5px 12px;font-size:0.8em;margin-top:6px;" onclick="deleteUser('${user.username}')">
                        🗑️ Delete
                    </button>` : isAdmin() && user.username === AuthState.currentUser ? `
                    <small style="color:#9ca3af;font-size:0.75em;margin-top:6px;display:block;">🔒 Current user</small>` : ''}
                </div>
            </div>`;
        }).join('');
        html += '</div>';
    }

    if (AuthState.users.length === 0) {
        html = `<div class="empty-state"><div class="empty-state-icon">👥</div><p>No users registered yet</p></div>`;
    }

    container.innerHTML = html;
}

function approveUser(username) {
    const user = AuthState.users.find(u => u.username === username);
    if (!user) return;

    // Show confirmation modal
    showApprovalModal(user, 'approve');
}

function rejectUser(username) {
    const user = AuthState.users.find(u => u.username === username);
    if (!user) return;
    showApprovalModal(user, 'reject');
}

function showApprovalModal(user, action) {
    // Remove existing
    const existing = document.getElementById('approvalModal');
    if (existing) existing.remove();

    const isApprove = action === 'approve';
    const overlay = document.createElement('div');
    overlay.id = 'approvalModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s;';

    overlay.innerHTML = `
    <div style="background:white;border-radius:16px;padding:36px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);">
        <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:3em;margin-bottom:10px;">${isApprove ? '✅' : '✗'}</div>
            <h2 style="color:${isApprove ? '#065f46' : '#991b1b'};font-size:1.4em;font-weight:700;margin-bottom:6px;">
                ${isApprove ? 'Approve Account' : 'Reject Account'}
            </h2>
            <p style="color:#6b7280;font-size:0.9em;">
                ${isApprove ? 'This will grant the user access to log in.' : 'This will deny the user access to the portal.'}
            </p>
        </div>

        <!-- User Summary Card -->
        <div style="background:${isApprove ? '#f0fdf4' : '#fef2f2'};border:1px solid ${isApprove ? '#bbf7d0' : '#fecaca'};border-radius:10px;padding:16px;margin-bottom:22px;">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#8B1538,#D4AF37);display:flex;align-items:center;justify-content:center;color:white;font-size:1.3em;font-weight:700;flex-shrink:0;">${user.fullName.charAt(0)}</div>
                <div>
                    <div style="font-weight:700;color:#1f2937;font-size:1em;">${user.fullName}</div>
                    <div style="color:#6b7280;font-size:0.85em;">@${user.username}</div>
                    <div style="margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;">
                        <span style="font-size:11px;background:#e5e7eb;padding:2px 8px;border-radius:8px;color:#374151;font-weight:600;">${user.role}</span>
                        <span style="font-size:11px;background:#e5e7eb;padding:2px 8px;border-radius:8px;color:#374151;">📧 ${user.email}</span>
                    </div>
                </div>
            </div>
        </div>

        ${!isApprove ? `
        <div style="margin-bottom:20px;">
            <label style="display:block;font-weight:600;color:#374151;margin-bottom:6px;font-size:14px;">Reason for rejection (optional)</label>
            <textarea id="rejectReason" placeholder="e.g. Incomplete information, Not a recognized staff member..." style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;resize:vertical;min-height:80px;font-family:inherit;"></textarea>
        </div>` : ''}

        <div style="display:flex;gap:12px;">
            <button onclick="confirmApprovalAction('${user.username}','${action}')" style="flex:1;padding:12px;border:none;border-radius:8px;background:${isApprove ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)'};color:white;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                ${isApprove ? '✅ Yes, Approve' : '✗ Yes, Reject'}
            </button>
            <button onclick="closeApprovalModal()" style="flex:1;padding:12px;border:2px solid #e5e7eb;border-radius:8px;background:white;color:#374151;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                Cancel
            </button>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeApprovalModal(); });
}

function closeApprovalModal() {
    const modal = document.getElementById('approvalModal');
    if (modal) modal.remove();
}

function confirmApprovalAction(username, action) {
    const user = AuthState.users.find(u => u.username === username);
    if (!user) return;

    const isApprove = action === 'approve';
    const reason = !isApprove ? (document.getElementById('rejectReason')?.value.trim() || '') : '';

    user.status     = isApprove ? 'Active' : 'Rejected';
    user.approvedBy = AuthState.currentUser;
    user.approvedDate = new Date().toISOString();
    if (reason) user.rejectReason = reason;

    saveUsers();
    closeApprovalModal();
    updatePendingApprovalsBadge();
    displayUsersList();

    // Toast notification
    const toast = document.createElement('div');
    toast.className = 'new-report-toast';
    toast.style.borderLeftColor = isApprove ? '#10b981' : '#ef4444';
    toast.innerHTML = (isApprove ? '✅' : '✗') + ' <span><strong>' + user.fullName + '</strong> has been ' + (isApprove ? 'approved and can now log in.' : 'rejected.') + '</span>';
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
}

window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.closeApprovalModal = closeApprovalModal;
window.confirmApprovalAction = confirmApprovalAction;

function deleteUser(username) {
    if (!isAdmin()) {
        alert('⛔ Access Denied\n\nOnly Administrators can delete users.');
        return;
    }
    if (username === AuthState.currentUser) {
        alert('⛔ You cannot delete your own account while logged in!');
        return;
    }
    if (confirm('Are you sure you want to delete user: ' + username + '?\nThis action cannot be undone.')) {
        AuthState.users = AuthState.users.filter(u => u.username !== username);
        saveUsers();
        updatePendingApprovalsBadge();
        displayUsersList();
        // Toast
        const toast = document.createElement('div');
        toast.className = 'new-report-toast';
        toast.style.borderLeftColor = '#ef4444';
        toast.innerHTML = `🗑️ <span>User <strong>${username}</strong> has been deleted.</span>`;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
    }
}
window.deleteUser = deleteUser;



// Application State Management
const AppState = {
    reports: [],
    reportCounter: 1,
    lguMap: null,
    markers: [],
    currentTab: 'track',
    db: null
};

// ===================================
// Firebase Configuration
// ===================================
const firebaseConfig = {
    apiKey: "AIzaSyAFKNK3RkyNE2pMNTbHfIQnCi2pKlZo6L0",
    authDomain: "citiconnect-66702.firebaseapp.com",
    projectId: "citiconnect-66702",
    storageBucket: "citiconnect-66702.firebasestorage.app",
    messagingSenderId: "901952262667",
    appId: "1:901952262667:web:18c8f477bbc9563d4e2d0e"
};

// Initialize Firebase (guard against double-init)
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ===================================
// Firebase Database Operations
// ===================================
function initDatabase() {
    // Firestore needs no setup — just resolve immediately
    AppState.db = db;
    return Promise.resolve(db);
}

function loadReportsFromDB() {
    return db.collection('reports')
        .orderBy('date', 'desc')
        .get()
        .then(snapshot => {
            const reports = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    date: data.date && data.date.toDate ? data.date.toDate() : new Date(data.date)
                };
            });
            console.log(`Loaded ${reports.length} reports from Firestore`);
            return reports;
        });
}

function updateReportInDB(report) {
    const reportToSave = {
        ...report,
        date: report.date instanceof Date
            ? firebase.firestore.Timestamp.fromDate(report.date)
            : report.date
    };
    // Remove undefined fields
    Object.keys(reportToSave).forEach(k => reportToSave[k] === undefined && delete reportToSave[k]);
    return db.collection('reports').doc(report.id).set(reportToSave, { merge: true })
        .then(() => console.log('Report updated in Firestore'));
}

function deleteAllReportsFromDB() {
    return db.collection('reports').get().then(snapshot => {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }).then(() => console.log('All reports deleted from Firestore'));
}

// ===================================
// Initialize Application
// ===================================
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
});

async function initializeApp() {
    try {
        await initDatabase();
        const savedReports = await loadReportsFromDB();
        AppState.reports = savedReports;
        
        // Seed known IDs so first refresh detects truly new ones
        savedReports.forEach(r => RefreshState.knownIds.add(r.id));

        console.log('LGU Portal initialized successfully');
        console.log('Loaded reports:', AppState.reports.length);
        
        updateHeaderStats();
        displayReports();
        startAutoPoll();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        AppState.reports = [];
        displayReports();
    }
}

// ===================================
// Update Header Statistics
// ===================================
function updateHeaderStats() {
    const total = AppState.reports.length;
    const resolved = AppState.reports.filter(r => r.status === 'Resolved').length;
    const active = total - resolved;
    
    document.getElementById('headerTotalReports').textContent = total;
    document.getElementById('headerActiveReports').textContent = active;
    document.getElementById('headerResolvedReports').textContent = resolved;
    // Sync mobile stats
    const mob = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    mob('headerTotalReportsMobile', total);
    mob('headerActiveReportsMobile', active);
    mob('headerResolvedReportsMobile', resolved);
    // Sync mobile user/role
    const uEl = document.getElementById('currentUserMobile');
    const uDesktop = document.getElementById('currentUser');
    if (uEl && uDesktop) uEl.textContent = uDesktop.textContent;
}

// ===================================
// Refresh Reports (check for new)
// ===================================
let RefreshState = {
    knownIds: new Set(),
    pollInterval: null,
    isRefreshing: false
};

async function refreshReports() {
    if (RefreshState.isRefreshing) return;
    RefreshState.isRefreshing = true;

    // Spin both buttons
    ['refreshBtn', 'refreshBtnPlain'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.add('spinning');
    });
    ['refreshIcon','refreshIconPlain'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '↻';
    });

    try {
        const freshReports = await loadReportsFromDB();
        const newReports = freshReports.filter(r => !RefreshState.knownIds.has(r.id));

        AppState.reports = freshReports;

        // Register all IDs now
        freshReports.forEach(r => RefreshState.knownIds.add(r.id));

        // Reset badge
        hideBadge();

        // Update all views
        updateHeaderStats();

        // Refresh whichever tab is active
        switch (AppState.currentTab) {
            case 'track':     displayReports();        break;
            case 'dashboard': updateDashboard(); if (AppState.lguMap) updateLGUMapMarkers(); break;
            case 'analytics': updateAnalytics();       break;
            case 'manage':    displayManageReports();  break;
        }

        // Highlight new cards + show toast
        if (newReports.length > 0) {
            showRefreshToast(newReports.length);
            setTimeout(() => {
                newReports.forEach(r => {
                    const card = document.querySelector('[data-report-id="' + r.id + '"]');
                    if (card) card.classList.add('new-report-highlight');
                });
            }, 200);
        } else {
            showRefreshToast(0);
        }

    } catch (e) {
        console.error('Refresh error:', e);
    }

    RefreshState.isRefreshing = false;
    ['refreshBtn','refreshBtnPlain'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('spinning');
    });
}

function showRefreshToast(count) {
    // Remove existing toasts
    document.querySelectorAll('.new-report-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'new-report-toast';
    if (count > 0) {
        toast.innerHTML = '✅ <span>' + count + ' new report' + (count > 1 ? 's' : '') + ' loaded!</span>';
        toast.style.borderLeftColor = '#10b981';
    } else {
        toast.innerHTML = '✓ <span>All reports are up to date</span>';
        toast.style.borderLeftColor = '#D4AF37';
    }
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

function hideBadge() {
    const wrap = document.getElementById('newReportsBadgeWrap');
    const plain = document.getElementById('refreshBtnPlain');
    if (wrap) wrap.style.display = 'none';
    if (plain) plain.style.display = '';
}

function showBadge(count) {
    const wrap = document.getElementById('newReportsBadgeWrap');
    const plain = document.getElementById('refreshBtnPlain');
    const badge = document.getElementById('newReportsBadge');
    if (wrap)  { wrap.style.display = ''; }
    if (plain) { plain.style.display = 'none'; }
    if (badge) { badge.textContent = count > 9 ? '9+' : count; }
}

// Auto-poll every 30 seconds for new reports
function startAutoPoll() {
    if (RefreshState.pollInterval) clearInterval(RefreshState.pollInterval);
    RefreshState.pollInterval = setInterval(async () => {
        if (!db) return;
        try {
            const fresh = await loadReportsFromDB();
            const newOnes = fresh.filter(r => !RefreshState.knownIds.has(r.id));
            if (newOnes.length > 0) {
                showBadge(newOnes.length);
            }
        } catch(e) { /* silent */ }
    }, 30000);
}

window.refreshReports = refreshReports;

// ===================================
// Tab Navigation
// ===================================
function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.nav-tab').classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    AppState.currentTab = tabName;
    
    switch(tabName) {
        case 'track':
            displayReports();
            break;
        case 'dashboard':
            updateDashboard();
            initializeLGUMap();
            break;
        case 'analytics':
            updateAnalytics();
            break;
        case 'manage':
            displayManageReports();
            break;
        case 'users':
            displayUsersList();
            updatePendingApprovalsBadge();
            break;
        case 'album':
            refreshAlbum();
            break;
    }
}

// ===================================
// Display Reports (Track Tab)
// ===================================
function displayReports() {
    const reportsList = document.getElementById('reportsList');
    const searchQuery = document.getElementById('searchQuery').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    
    let filteredReports = AppState.reports.filter(report => {
        const matchesSearch = !searchQuery || 
            report.id.toLowerCase().includes(searchQuery) ||
            report.category.toLowerCase().includes(searchQuery) ||
            report.location.toLowerCase().includes(searchQuery);
        const matchesStatus = !statusFilter || report.status === statusFilter;
        const matchesCategory = !categoryFilter || report.category === categoryFilter;
        const matchesPriority = !priorityFilter || report.priority === priorityFilter;
        
        return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });
    
    filteredReports.sort((a, b) => b.date - a.date);
    
    if (filteredReports.length === 0) {
        reportsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No reports found</h3>
                <p>Try adjusting your filters or check back later</p>
            </div>
        `;
        return;
    }
    
    reportsList.innerHTML = filteredReports.map(report => `
        <div class="report-card priority-${report.priority.toLowerCase()}" data-report-id="${report.id}">
            <div class="report-header">
                <span class="report-id">${report.id}</span>
                <div class="report-badges">
                    <span class="badge badge-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
                    <span class="badge badge-${report.priority.toLowerCase()}">${report.priority}</span>
                </div>
            </div>
            <div class="report-category">${report.category}</div>
            <div class="report-description">${report.description}</div>
            <div class="report-meta">
                <span>📍 ${report.location}</span>
                <span>📅 ${formatDate(report.date)}</span>
                <span>👤 ${report.name}</span>
                <span>📞 ${report.contact}</span>
                ${report.responseTime ? `<span>⏱️ Response: ${report.responseTime} days</span>` : ''}
            </div>
            <div class="report-actions">
                <button class="btn btn-primary" onclick="printReport('${report.id}')">
                    <span>🖨️</span> Print Report
                </button>
            </div>
        </div>
    `).join('');
}

// ===================================
// Dashboard Updates
// ===================================
function updateDashboard() {
    const total = AppState.reports.length;
    const pending = AppState.reports.filter(r => r.status === 'Pending').length;
    const inProgress = AppState.reports.filter(r => r.status === 'In Progress').length;
    const resolved = AppState.reports.filter(r => r.status === 'Resolved').length;
    
    document.getElementById('dashTotalReports').textContent = total;
    document.getElementById('dashPendingCount').textContent = pending;
    document.getElementById('dashInProgressCount').textContent = inProgress;
    document.getElementById('dashResolvedCount').textContent = resolved;
    
    updateCategoryChart();
    updateRecentActivity();
}

// ===================================
// Initialize LGU Map
// ===================================
function initializeLGUMap() {
    if (AppState.lguMap) {
        updateLGUMapMarkers();
        return;
    }
    
    AppState.lguMap = L.map('lguMap').setView([9.796891, 123.906304], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(AppState.lguMap);
    
    const barangayBounds = [
        [9.790, 123.900],
        [9.790, 123.912],
        [9.804, 123.912],
        [9.804, 123.900]
    ];
    
    L.polygon(barangayBounds, {
        color: '#8B1538',
        fillOpacity: 0,
        weight: 2
    }).addTo(AppState.lguMap);
    
    updateLGUMapMarkers();
    
    setTimeout(() => {
        AppState.lguMap.invalidateSize();
    }, 100);
}

// ===================================
// Update LGU Map Markers
// ===================================
function updateLGUMapMarkers() {
    if (!AppState.lguMap) return;
    
    AppState.markers.forEach(marker => marker.remove());
    AppState.markers = [];
    
    AppState.reports.forEach(report => {
        if (report.coordinates) {
            const color = getMarkerColor(report);
            
            const marker = L.marker([report.coordinates.lat, report.coordinates.lng], {
                icon: L.icon({
                    iconUrl: color.url,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(AppState.lguMap);
            
            marker.bindPopup(`
                <div class="popup-title">${report.id}</div>
                <div class="popup-content">
                    <strong>${report.category}</strong><br>
                    ${report.location}<br>
                    <span style="color: ${color.hex}; font-weight: bold;">${report.status}</span> - 
                    <span style="color: ${getPriorityColor(report.priority)};">${report.priority} Priority</span><br>
                    <small>${formatDate(report.date)}</small>
                </div>
            `);
            
            AppState.markers.push(marker);
        }
    });
}

// ===================================
// Get Marker Color
// ===================================
function getMarkerColor(report) {
    if (report.status === 'Resolved') {
        return {
            url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
            hex: '#6b7280'
        };
    }
    
    switch(report.priority) {
        case 'High':
            return {
                url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                hex: '#ef4444'
            };
        case 'Medium':
            return {
                url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                hex: '#f59e0b'
            };
        case 'Low':
            return {
                url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                hex: '#10b981'
            };
        default:
            return {
                url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                hex: '#2563eb'
            };
    }
}

function getPriorityColor(priority) {
    switch(priority) {
        case 'High': return '#ef4444';
        case 'Medium': return '#f59e0b';
        case 'Low': return '#10b981';
        default: return '#6b7280';
    }
}

// ===================================
// Update Category Chart
// ===================================
function updateCategoryChart() {
    const categoryChart = document.getElementById('categoryChart');
    
    const categories = {};
    AppState.reports.forEach(report => {
        categories[report.category] = (categories[report.category] || 0) + 1;
    });
    
    const total = AppState.reports.length;
    categoryChart.innerHTML = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => {
            const percentage = ((count / total) * 100).toFixed(1);
            return `
                <div class="chart-bar">
                    <div class="chart-bar-label">
                        <span>${category}</span>
                        <span class="chart-bar-value">${count} (${percentage}%)</span>
                    </div>
                    <div class="chart-bar-track">
                        <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
}

// ===================================
// Update Recent Activity
// ===================================
function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    const recentReports = AppState.reports
        .sort((a, b) => b.date - a.date)
        .slice(0, 10);
    
    recentActivity.innerHTML = recentReports.map(report => `
        <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: var(--primary-color);">${report.id}</strong> - 
                <span>${report.category}</span>
                <span style="margin-left: 10px; font-size: 0.9em; color: #6b7280;">📍 ${report.location}</span>
            </div>
            <span style="color: #6b7280; font-size: 0.9em;">${formatDate(report.date)}</span>
        </div>
    `).join('');
}

// ===================================
// Analytics Updates
// ===================================
function updateAnalytics() {
    const resolvedReports = AppState.reports.filter(r => r.status === 'Resolved' && r.responseTime);
    const avgTime = resolvedReports.length > 0
        ? (resolvedReports.reduce((sum, r) => sum + r.responseTime, 0) / resolvedReports.length).toFixed(1)
        : 'N/A';
    
    document.getElementById('avgResponseTime').textContent = avgTime !== 'N/A' ? `${avgTime} days` : avgTime;
    
    const resolutionRate = AppState.reports.length > 0
        ? ((AppState.reports.filter(r => r.status === 'Resolved').length / AppState.reports.length) * 100).toFixed(0)
        : 0;
    document.getElementById('resolutionRate').textContent = `${resolutionRate}%`;
    
    const uniqueReporters = new Set(AppState.reports.map(r => r.contact)).size;
    document.getElementById('activeUsers').textContent = uniqueReporters;
    
    const criticalIssues = AppState.reports.filter(r => r.priority === 'High' && r.status !== 'Resolved').length;
    document.getElementById('criticalIssues').textContent = criticalIssues;
    
    updatePriorityChart();
    updateLocationHotspots();
    renderCategoryChart(AnalyticsState.categoryChartType);
    renderStatusChart(AnalyticsState.statusChartType);
    renderTrendChart(AnalyticsState.trendChartType);
    populatePrintMonthSelect();
}

// ===================================
// Analytics Chart State
// ===================================
const AnalyticsState = {
    categoryChartType: 'bar',
    statusChartType: 'groupedBar',
    trendChartType: 'line',
    categoryChartInstance: null,
    statusChartInstance: null,
    trendChartInstance: null
};

// Category emoji + color mapping
const CATEGORY_META = {
    'Waste Management':        { emoji: '🗑️',  color: '#ef4444', light: 'rgba(239,68,68,0.15)' },
    'Infrastructure Damage':   { emoji: '🏗️',  color: '#f59e0b', light: 'rgba(245,158,11,0.15)' },
    'Environmental Violation': { emoji: '🌳',  color: '#10b981', light: 'rgba(16,185,129,0.15)' },
    'Public Safety':           { emoji: '🚨',  color: '#8B1538', light: 'rgba(139,21,56,0.15)' },
    'Water & Sanitation':      { emoji: '💧',  color: '#2563eb', light: 'rgba(37,99,235,0.15)' },
    'Street Lighting':         { emoji: '💡',  color: '#D4AF37', light: 'rgba(212,175,55,0.15)' },
    'Dog Issues':              { emoji: '🐕',  color: '#a16207', light: 'rgba(161,98,7,0.15)' },
    'Other':                   { emoji: '📋',  color: '#6b7280', light: 'rgba(107,114,128,0.15)' }
};

function getCategoryMeta(cat) {
    return CATEGORY_META[cat] || { emoji: '📋', color: '#6b7280', light: 'rgba(107,114,128,0.15)' };
}

// ===================================
// Category Chart
// ===================================
function switchCategoryChart(type) {
    AnalyticsState.categoryChartType = type;
    // Update active button
    document.querySelectorAll('#categorySwitcher .chart-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    renderCategoryChart(type);
}

function renderCategoryChart(type) {
    const canvas = document.getElementById('categoryChartCanvas');
    if (!canvas) return;

    const ALL_CATEGORIES = Object.keys(CATEGORY_META);
    const counts = {};
    ALL_CATEGORIES.forEach(c => counts[c] = 0);
    AppState.reports.forEach(r => {
        if (counts[r.category] !== undefined) counts[r.category]++;
        else counts['Other'] = (counts['Other'] || 0) + 1;
    });

    // Build sorted arrays
    const sorted = ALL_CATEGORIES
        .map(c => ({ cat: c, count: counts[c] }))
        .sort((a, b) => b.count - a.count);

    const labels = sorted.map(s => getCategoryMeta(s.cat).emoji + ' ' + s.cat);
    const data   = sorted.map(s => s.count);
    const colors = sorted.map(s => getCategoryMeta(s.cat).color);
    const lights = sorted.map(s => getCategoryMeta(s.cat).light);

    // Destroy previous
    if (AnalyticsState.categoryChartInstance) {
        AnalyticsState.categoryChartInstance.destroy();
        AnalyticsState.categoryChartInstance = null;
    }

    const ctx = canvas.getContext('2d');

    let chartType = type;
    let chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => ` ${ctx.parsed.y ?? ctx.parsed} reports`
                }
            }
        }
    };
    let chartData = {};

    if (type === 'bar') {
        chartType = 'bar';
        chartData = {
            labels,
            datasets: [{
                label: 'Reports',
                data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        };
        chartOptions.indexAxis = 'x';
        chartOptions.scales = {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
            x: { ticks: { font: { size: 11 } } }
        };
    } else if (type === 'horizontalBar') {
        chartType = 'bar';
        chartData = {
            labels,
            datasets: [{
                label: 'Reports',
                data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 4
            }]
        };
        chartOptions.indexAxis = 'y';
        chartOptions.scales = {
            x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
            y: { ticks: { font: { size: 11 } } }
        };
        chartOptions.plugins.tooltip.callbacks = { label: ctx => ` ${ctx.parsed.x} reports` };
    } else if (type === 'pie' || type === 'doughnut') {
        chartType = type;
        chartData = {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverOffset: 8
            }]
        };
        chartOptions.plugins.legend = { display: true, position: 'bottom', labels: { padding: 15, font: { size: 12 } } };
        chartOptions.plugins.tooltip.callbacks = {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} reports`
        };
        delete chartOptions.scales;
    } else if (type === 'polarArea') {
        chartType = 'polarArea';
        chartData = {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => c + 'cc'),
                borderColor: colors,
                borderWidth: 2
            }]
        };
        chartOptions.plugins.legend = { display: true, position: 'bottom', labels: { padding: 15, font: { size: 12 } } };
        chartOptions.scales = { r: { beginAtZero: true, ticks: { stepSize: 1 } } };
        chartOptions.plugins.tooltip.callbacks = { label: ctx => ` ${ctx.label}: ${ctx.parsed.r} reports` };
    }

    AnalyticsState.categoryChartInstance = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: chartOptions
    });

    // Legend pills
    const legendEl = document.getElementById('categoryChartLegend');
    if (legendEl) {
        const total = data.reduce((a, b) => a + b, 0);
        legendEl.innerHTML = sorted.map(s => {
            const meta = getCategoryMeta(s.cat);
            const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0.0';
            return `<span class="cat-legend-pill">
                <span class="cat-legend-dot" style="background:${meta.color};"></span>
                ${meta.emoji} ${s.cat}: <strong>${s.count}</strong> <span style="color:#9ca3af;">(${pct}%)</span>
            </span>`;
        }).join('');
    }
}

// ===================================
// Status (Pending/Resolved) Chart
// ===================================
function switchStatusChart(type) {
    AnalyticsState.statusChartType = type;
    document.querySelectorAll('#statusSwitcher .chart-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    renderStatusChart(type);
}

function renderStatusChart(type) {
    const canvas = document.getElementById('statusChartCanvas');
    if (!canvas) return;

    const ALL_CATEGORIES = Object.keys(CATEGORY_META);
    const pending  = {};
    const inProg   = {};
    const resolved = {};
    ALL_CATEGORIES.forEach(c => { pending[c] = 0; inProg[c] = 0; resolved[c] = 0; });

    AppState.reports.forEach(r => {
        const cat = ALL_CATEGORIES.includes(r.category) ? r.category : 'Other';
        if (r.status === 'Pending')     pending[cat]++;
        else if (r.status === 'In Progress') inProg[cat]++;
        else if (r.status === 'Resolved')    resolved[cat]++;
    });

    const labels        = ALL_CATEGORIES.map(c => getCategoryMeta(c).emoji + ' ' + c);
    const pendingData   = ALL_CATEGORIES.map(c => pending[c]);
    const inProgData    = ALL_CATEGORIES.map(c => inProg[c]);
    const resolvedData  = ALL_CATEGORIES.map(c => resolved[c]);
    const catColors     = ALL_CATEGORIES.map(c => getCategoryMeta(c).color);

    const totalPending  = pendingData.reduce((a, b) => a + b, 0);
    const totalInProg   = inProgData.reduce((a, b) => a + b, 0);
    const totalResolved = resolvedData.reduce((a, b) => a + b, 0);
    const grandTotal    = totalPending + totalInProg + totalResolved;

    if (AnalyticsState.statusChartInstance) {
        AnalyticsState.statusChartInstance.destroy();
        AnalyticsState.statusChartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    let chartConfig = {};

    const baseOpts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top', labels: { padding: 16, font: { size: 13, weight: '600' } } },
            tooltip: { mode: 'index', intersect: false }
        }
    };

    if (type === 'groupedBar') {
        chartConfig = {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '🕐 Pending',     data: pendingData,  backgroundColor: '#f59e0b', borderColor: '#f59e0b', borderWidth: 2, borderRadius: 4 },
                    { label: '🔄 In Progress', data: inProgData,   backgroundColor: '#2563eb', borderColor: '#2563eb', borderWidth: 2, borderRadius: 4 },
                    { label: '✅ Resolved',    data: resolvedData, backgroundColor: '#10b981', borderColor: '#10b981', borderWidth: 2, borderRadius: 4 }
                ]
            },
            options: { ...baseOpts, scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
                x: { ticks: { font: { size: 10 } } }
            }}
        };
    } else if (type === 'stackedBar') {
        chartConfig = {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '🕐 Pending',     data: pendingData,  backgroundColor: '#f59e0b', borderRadius: 0 },
                    { label: '🔄 In Progress', data: inProgData,   backgroundColor: '#2563eb', borderRadius: 0 },
                    { label: '✅ Resolved',    data: resolvedData, backgroundColor: '#10b981', borderRadius: 0 }
                ]
            },
            options: { ...baseOpts, scales: {
                y: { beginAtZero: true, stacked: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
                x: { stacked: true, ticks: { font: { size: 10 } } }
            }}
        };
    } else if (type === 'pie') {
        chartConfig = {
            type: 'pie',
            data: {
                labels: ['🕐 Pending', '🔄 In Progress', '✅ Resolved'],
                datasets: [{
                    data: [totalPending, totalInProg, totalResolved],
                    backgroundColor: ['#f59e0b', '#2563eb', '#10b981'],
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: { ...baseOpts,
                plugins: { ...baseOpts.plugins, legend: { display: true, position: 'bottom' },
                    tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} reports` } }
                }
            }
        };
    } else if (type === 'doughnut') {
        chartConfig = {
            type: 'doughnut',
            data: {
                labels: ['🕐 Pending', '🔄 In Progress', '✅ Resolved'],
                datasets: [{
                    data: [totalPending, totalInProg, totalResolved],
                    backgroundColor: ['#f59e0b', '#2563eb', '#10b981'],
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: { ...baseOpts,
                plugins: { ...baseOpts.plugins, legend: { display: true, position: 'bottom' },
                    tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} reports` } }
                }
            }
        };
    } else if (type === 'line') {
        chartConfig = {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '🕐 Pending',     data: pendingData,  borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',  tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 7 },
                    { label: '🔄 In Progress', data: inProgData,   borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)',   tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 7 },
                    { label: '✅ Resolved',    data: resolvedData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',  tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 7 }
                ]
            },
            options: { ...baseOpts, scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
                x: { ticks: { font: { size: 10 } } }
            }}
        };
    }

    AnalyticsState.statusChartInstance = new Chart(ctx, chartConfig);

    // Summary pills
    const summaryEl = document.getElementById('statusChartSummary');
    if (summaryEl) {
        const resRate = grandTotal > 0 ? ((totalResolved / grandTotal) * 100).toFixed(0) : 0;
        summaryEl.innerHTML = `
            <span class="status-summary-pill" style="background:#fef3c7; color:#92400e;">🕐 Pending: <strong style="margin-left:4px;">${totalPending}</strong></span>
            <span class="status-summary-pill" style="background:#dbeafe; color:#1e40af;">🔄 In Progress: <strong style="margin-left:4px;">${totalInProg}</strong></span>
            <span class="status-summary-pill" style="background:#d1fae5; color:#065f46;">✅ Resolved: <strong style="margin-left:4px;">${totalResolved}</strong></span>
            <span class="status-summary-pill" style="background:#f3f4f6; color:#374151;">📊 Resolution Rate: <strong style="margin-left:4px;">${resRate}%</strong></span>
        `;
    }
}

// Expose chart switchers globally
window.switchCategoryChart = switchCategoryChart;
window.switchStatusChart = switchStatusChart;
window.switchTrendChart = switchTrendChart;

// ===================================
// Monthly Trend Analysis — 12 months
// ===================================

// Build last-12-months labels based on current date
function getLast12Months() {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
            year: d.getFullYear(),
            month: d.getMonth()   // 0-indexed
        });
    }
    return months;
}

// Build trend data from real reports only
function buildTrendData() {
    const months = getLast12Months();
    const categories = Object.keys(CATEGORY_META);

    const data = {};
    categories.forEach(c => { data[c] = new Array(8).fill(0); });

    AppState.reports.forEach(r => {
        const rDate = r.date instanceof Date ? r.date : new Date(r.date);
        const idx = months.findIndex(m => m.year === rDate.getFullYear() && m.month === rDate.getMonth());
        if (idx === -1) return;
        const cat = categories.includes(r.category) ? r.category : 'Other';
        data[cat][idx]++;
    });

    const totals = months.map((_, i) => categories.reduce((s, c) => s + data[c][i], 0));
    return { months, data, totals, categories };
}

function switchTrendChart(type) {
    AnalyticsState.trendChartType = type;
    document.querySelectorAll('#trendSwitcher .chart-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    renderTrendChart(type);
}

function renderTrendChart(type) {
    const canvas = document.getElementById('trendChartCanvas');
    if (!canvas) return;

    const { months, data, totals, categories } = buildTrendData();
    const labels = months.map(m => m.label);

    if (AnalyticsState.trendChartInstance) {
        AnalyticsState.trendChartInstance.destroy();
        AnalyticsState.trendChartInstance = null;
    }

    const ctx = canvas.getContext('2d');

    const baseOpts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top', labels: { padding: 14, font: { size: 12, weight: '600' }, boxWidth: 14 } },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 5 }, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } }
        }
    };

    let chartConfig;

    if (type === 'line' || type === 'area') {
        const isFill = (type === 'area');
        chartConfig = {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: '📊 Total Reports',
                        data: totals,
                        borderColor: '#8B1538',
                        backgroundColor: isFill ? 'rgba(139,21,56,0.12)' : 'transparent',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: isFill,
                        pointRadius: 6,
                        pointHoverRadius: 9,
                        pointBackgroundColor: '#8B1538',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: '✅ Resolved',
                        data: months.map((m) => {
                            return AppState.reports.filter(r => {
                                const d = r.date instanceof Date ? r.date : new Date(r.date);
                                return d.getFullYear() === m.year && d.getMonth() === m.month && r.status === 'Resolved';
                            }).length;
                        }),
                        borderColor: '#10b981',
                        backgroundColor: isFill ? 'rgba(16,185,129,0.10)' : 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: isFill,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderDash: [],
                        yAxisID: 'y'
                    },
                    {
                        label: '🕐 Pending',
                        data: months.map((m) => {
                            return AppState.reports.filter(r => {
                                const d = r.date instanceof Date ? r.date : new Date(r.date);
                                return d.getFullYear() === m.year && d.getMonth() === m.month && r.status === 'Pending';
                            }).length;
                        }),
                        borderColor: '#f59e0b',
                        backgroundColor: isFill ? 'rgba(245,158,11,0.10)' : 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: isFill,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#f59e0b',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderDash: [5, 3],
                        yAxisID: 'y'
                    }
                ]
            },
            options: baseOpts
        };

    } else if (type === 'bar') {
        chartConfig = {
            type: 'bar',
            data: {
                labels,
                datasets: categories.map(cat => ({
                    label: getCategoryMeta(cat).emoji + ' ' + cat,
                    data: data[cat],
                    backgroundColor: getCategoryMeta(cat).color,
                    borderRadius: 4,
                    borderSkipped: false
                }))
            },
            options: { ...baseOpts, plugins: { ...baseOpts.plugins }, scales: {
                y: { beginAtZero: true, ticks: { stepSize: 5 }, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            }}
        };

    } else if (type === 'stackedBar') {
        chartConfig = {
            type: 'bar',
            data: {
                labels,
                datasets: categories.map(cat => ({
                    label: getCategoryMeta(cat).emoji + ' ' + cat,
                    data: data[cat],
                    backgroundColor: getCategoryMeta(cat).color,
                    borderRadius: 0
                }))
            },
            options: { ...baseOpts, scales: {
                y: { beginAtZero: true, stacked: true, ticks: { stepSize: 10 }, grid: { color: '#f3f4f6' } },
                x: { stacked: true, grid: { display: false } }
            }}
        };

    } else if (type === 'radar') {
        chartConfig = {
            type: 'radar',
            data: {
                labels,
                datasets: [
                    {
                        label: '📊 Total Reports',
                        data: totals,
                        borderColor: '#8B1538',
                        backgroundColor: 'rgba(139,21,56,0.15)',
                        borderWidth: 2,
                        pointRadius: 4
                    },
                    {
                        label: '🗑️ Waste Mgmt',
                        data: data['Waste Management'],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239,68,68,0.08)',
                        borderWidth: 2,
                        pointRadius: 3
                    },
                    {
                        label: '🏗️ Infrastructure',
                        data: data['Infrastructure Damage'],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245,158,11,0.08)',
                        borderWidth: 2,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { padding: 14, font: { size: 12 } } }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: { stepSize: 10, font: { size: 10 } },
                        pointLabels: { font: { size: 11 } }
                    }
                }
            }
        };
    }

    AnalyticsState.trendChartInstance = new Chart(ctx, chartConfig);

    // Monthly summary mini-cards
    const summaryEl = document.getElementById('trendMonthlySummary');
    if (summaryEl) {
        const peak = Math.max(...totals);
        summaryEl.innerHTML = months.map((m, i) => {
            const isPeak = totals[i] === peak;
            return `<div style="text-align:center; padding:10px 8px; border-radius:10px; background:${isPeak ? 'linear-gradient(135deg,#8B1538,#D4AF37)' : '#f9fafb'}; border:1px solid ${isPeak ? 'transparent' : '#e5e7eb'};">
                <div style="font-size:0.78em; font-weight:600; color:${isPeak ? 'rgba(255,255,255,0.85)' : '#6b7280'}; text-transform:uppercase; letter-spacing:.5px;">${m.label}</div>
                <div style="font-size:1.6em; font-weight:700; color:${isPeak ? '#fff' : '#1f2937'}; line-height:1.2; margin:4px 0;">${totals[i]}</div>
                <div style="font-size:0.72em; color:${isPeak ? 'rgba(255,255,255,0.75)' : '#9ca3af'};">${isPeak ? '🏆 Peak' : 'reports'}</div>
            </div>`;
        }).join('');
    }
}

// ===================================
// Populate Print Month Selector
// ===================================
function populatePrintMonthSelect() {
    const select = document.getElementById('printMonthSelect');
    if (!select) return;

    const months = getLast12Months();
    select.innerHTML = '<option value="">-- Choose Month --</option>';
    months.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = m.label + ' (' + new Date(m.year, m.month).toLocaleString('default', { month: 'long', year: 'numeric' }) + ')';
        select.appendChild(opt);
    });

    // Preview on change
    select.addEventListener('change', function() {
        const preview = document.getElementById('printMonthPreview');
        if (!preview) return;
        if (this.value === '') {
            preview.innerHTML = 'Select a month above to preview the report count before printing.';
            preview.style.color = '#6b7280';
            return;
        }
        const idx = parseInt(this.value);
        const m = months[idx];
        const { data, totals, categories } = buildTrendData();
        const total = totals[idx];
        const catBreakdown = categories.map(c => {
            const meta = getCategoryMeta(c);
            return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:16px;background:#f3f4f6;font-size:13px;font-weight:600;">
                <span style="width:10px;height:10px;border-radius:50%;background:${meta.color};display:inline-block;"></span>
                ${meta.emoji} ${c}: <strong style="color:${meta.color};">${data[c][idx]}</strong>
            </span>`;
        }).join('');

        // Real DB reports for this month
        const realReports = AppState.reports.filter(r => {
            const d = r.date instanceof Date ? r.date : new Date(r.date);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
        });

        preview.style.color = '#374151';
        preview.innerHTML = `
            <div style="margin-bottom:12px;">
                <strong style="font-size:1.1em; color:#8B1538;">📅 ${new Date(m.year, m.month).toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
                <span style="margin-left:12px; font-size:0.9em; color:#6b7280;">Total Reports: <strong style="color:#1f2937;">${total}</strong></span>
                ${realReports.length > 0 ? `<span style="margin-left:12px; font-size:0.85em; background:#d1fae5; color:#065f46; padding:2px 8px; border-radius:10px;">✅ ${realReports.length} real DB report(s)</span>` : ''}
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">${catBreakdown}</div>
        `;
    });
}

// ===================================
// Print Chart Card
// ===================================
function printChartCard(cardId, title) {
    const card = document.getElementById(cardId);
    if (!card) return;

    // Get chart canvas image
    let chartImgSrc = '';
    const canvas = card.querySelector('canvas');
    if (canvas) {
        chartImgSrc = canvas.toDataURL('image/png', 1.0);
    }

    // Get legend HTML (strip switcher buttons)
    const legendEl = card.querySelector('#categoryChartLegend, #statusChartSummary, #trendMonthlySummary');
    const legendHTML = legendEl ? legendEl.innerHTML : '';

    const now = new Date();
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title} — Barangay Danao</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #1f2937; }
        .print-header { display:flex; align-items:center; gap:20px; border-bottom: 3px solid #8B1538; padding-bottom:20px; margin-bottom:28px; }
        .print-header-text h1 { font-size:1.5em; color:#8B1538; font-weight:700; }
        .print-header-text p { color:#6b7280; font-size:0.9em; margin-top:4px; }
        .chart-title { font-size:1.25em; font-weight:700; color:#1f2937; margin-bottom:20px; padding: 10px 16px; background: linear-gradient(135deg, rgba(139,21,56,0.08), rgba(212,175,55,0.08)); border-left: 4px solid #8B1538; border-radius:4px; }
        .chart-img { width:100%; max-width:800px; display:block; margin:0 auto 24px; border:1px solid #e5e7eb; border-radius:8px; padding:12px; background:#fafafa; }
        .legend-area { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; padding-top:14px; border-top:1px solid #e5e7eb; }
        .legend-area span { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:16px; background:#f3f4f6; font-size:13px; font-weight:600; }
        .print-footer { margin-top:40px; padding-top:16px; border-top:1px solid #e5e7eb; color:#9ca3af; font-size:12px; display:flex; justify-content:space-between; }
        @media print { body { padding:16px; } button { display:none; } }
    </style>
</head>
<body>
    <div class="print-header">
        <div class="print-header-text">
            <h1>Barangay Danao — Analytics Report</h1>
            <p>Barangay Danao, Antequera, Bohol &nbsp;|&nbsp; Printed: ${now.toLocaleString()}</p>
        </div>
    </div>
    <div class="chart-title">📊 ${title}</div>
    ${chartImgSrc ? `<img class="chart-img" src="${chartImgSrc}" alt="${title} Chart">` : '<p style="color:#6b7280; text-align:center; padding:40px;">No chart image available</p>'}
    ${legendHTML ? `<div class="legend-area">${legendHTML}</div>` : ''}
    <div class="print-footer">
        <span>Barangay Danao Citizen Reporting Platform</span>
        <span>Page 1 of 1</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
}

// ===================================
// Print Monthly Report (all reports for chosen month)
// ===================================
function printMonthlyReport() {
    const select = document.getElementById('printMonthSelect');
    if (!select || select.value === '') {
        alert('⚠️ Please select a month first.');
        return;
    }
    const idx = parseInt(select.value);
    const months = getLast12Months();
    const m = months[idx];
    const { data, totals, categories } = buildTrendData();

    // Real DB reports for this month
    const realReports = AppState.reports.filter(r => {
        const d = r.date instanceof Date ? r.date : new Date(r.date);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
    });

    const monthLabel = new Date(m.year, m.month).toLocaleString('default', { month: 'long', year: 'numeric' });
    const now = new Date();

    // Category breakdown rows
    const catRows = categories.map(c => {
        const meta = getCategoryMeta(c);
        const count = data[c][idx];
        const pct = totals[idx] > 0 ? ((count / totals[idx]) * 100).toFixed(1) : '0.0';
        return `<tr>
            <td style="padding:10px 14px;">${meta.emoji} ${c}</td>
            <td style="padding:10px 14px; text-align:center; font-weight:700; color:${meta.color};">${count}</td>
            <td style="padding:10px 14px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="flex:1; background:#f3f4f6; border-radius:4px; height:10px; overflow:hidden;">
                        <div style="width:${pct}%; background:${meta.color}; height:100%; border-radius:4px;"></div>
                    </div>
                    <span style="font-size:12px; color:#6b7280; min-width:40px;">${pct}%</span>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Real report rows
    const reportRows = realReports.length > 0
        ? realReports.map(r => {
            const statusColor = r.status === 'Resolved' ? '#10b981' : r.status === 'In Progress' ? '#2563eb' : '#f59e0b';
            const prioColor = r.priority === 'High' ? '#ef4444' : r.priority === 'Medium' ? '#f59e0b' : '#10b981';
            return `<tr>
                <td style="padding:8px 12px; font-weight:600; color:#8B1538;">${r.id}</td>
                <td style="padding:8px 12px;">${r.name}</td>
                <td style="padding:8px 12px;">${r.category}</td>
                <td style="padding:8px 12px;">${r.location}</td>
                <td style="padding:8px 12px; text-align:center;"><span style="background:${statusColor}22; color:${statusColor}; padding:2px 8px; border-radius:10px; font-weight:600; font-size:12px;">${r.status}</span></td>
                <td style="padding:8px 12px; text-align:center;"><span style="background:${prioColor}22; color:${prioColor}; padding:2px 8px; border-radius:10px; font-weight:600; font-size:12px;">${r.priority}</span></td>
                <td style="padding:8px 12px; font-size:12px; color:#6b7280;">${r.date instanceof Date ? r.date.toLocaleDateString() : new Date(r.date).toLocaleDateString()}</td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="7" style="text-align:center; padding:30px; color:#9ca3af;">No reports recorded for this month yet</td></tr>`;

    // Get chart images
    const chartImgs = [
        { canvas: document.getElementById('categoryChartCanvas'), title: 'Reports by Category' },
        { canvas: document.getElementById('statusChartCanvas'),   title: 'Pending vs Resolved' },
        { canvas: document.getElementById('trendChartCanvas'),    title: 'Monthly Trend' }
    ].filter(c => c.canvas).map(c => `
        <div style="margin-bottom:32px; break-inside:avoid;">
            <div style="font-weight:700; color:#8B1538; margin-bottom:10px; font-size:1em;">📊 ${c.title}</div>
            <img style="width:100%; border:1px solid #e5e7eb; border-radius:6px; padding:8px; background:#fafafa;" src="${c.canvas.toDataURL('image/png',1.0)}" alt="${c.title}">
        </div>`).join('');

    const pending   = realReports.filter(r => r.status === 'Pending').length;
    const inProg    = realReports.filter(r => r.status === 'In Progress').length;
    const resolved  = realReports.filter(r => r.status === 'Resolved').length;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Monthly Report — ${monthLabel} — Barangay Danao</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:32px; color:#1f2937; font-size:14px; }
        .print-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:4px solid #8B1538; padding-bottom:20px; margin-bottom:28px; }
        .org-name { font-size:1.6em; font-weight:800; color:#8B1538; }
        .org-sub { color:#6b7280; font-size:0.9em; margin-top:4px; }
        .report-title { font-size:1.1em; color:#374151; font-weight:600; text-align:right; }
        .report-date { color:#9ca3af; font-size:0.85em; margin-top:4px; text-align:right; }
        .section-title { font-size:1.1em; font-weight:700; color:#8B1538; margin:28px 0 14px; padding:8px 14px; background:linear-gradient(135deg,rgba(139,21,56,0.07),rgba(212,175,55,0.07)); border-left:4px solid #8B1538; border-radius:4px; }
        .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
        .summary-box { text-align:center; padding:14px 10px; border-radius:10px; border:1px solid #e5e7eb; }
        .summary-box .val { font-size:2em; font-weight:800; }
        .summary-box .lbl { font-size:11px; text-transform:uppercase; letter-spacing:.5px; font-weight:600; color:#6b7280; margin-top:4px; }
        table { width:100%; border-collapse:collapse; margin-bottom:24px; }
        thead { background:linear-gradient(135deg,#8B1538,#D4AF37); color:white; }
        thead th { padding:10px 14px; text-align:left; font-size:13px; }
        tbody tr:nth-child(even) { background:#f9fafb; }
        tbody tr:hover { background:#fef3e6; }
        td { border-bottom:1px solid #f3f4f6; }
        .print-footer { margin-top:40px; padding-top:14px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; color:#9ca3af; font-size:12px; }
        .page-break { page-break-before:always; }
        @media print { button { display:none; } .page-break { page-break-before:always; } }
    </style>
</head>
<body>
    <div class="print-header">
        <div>
            <div class="org-name">Barangay Danao</div>
            <div class="org-sub">Antequera, Bohol — Citizen Reporting Platform</div>
        </div>
        <div>
            <div class="report-title">📅 Monthly Report: ${monthLabel}</div>
            <div class="report-date">Printed: ${now.toLocaleString()}</div>
            <div class="report-date">Prepared by: ${window.AuthState?.currentUserData?.fullName || 'LGU Staff'}</div>
        </div>
    </div>

    <div class="section-title">📊 Monthly Summary — ${monthLabel}</div>
    <div class="summary-grid">
        <div class="summary-box" style="background:#fef3e6; border-color:#8B153844;">
            <div class="val" style="color:#8B1538;">${totals[idx]}</div>
            <div class="lbl">Total Reports</div>
        </div>
        <div class="summary-box" style="background:#fef3c7; border-color:#f59e0b44;">
            <div class="val" style="color:#f59e0b;">${pending}</div>
            <div class="lbl">Pending</div>
        </div>
        <div class="summary-box" style="background:#dbeafe; border-color:#2563eb44;">
            <div class="val" style="color:#2563eb;">${inProg}</div>
            <div class="lbl">In Progress</div>
        </div>
        <div class="summary-box" style="background:#d1fae5; border-color:#10b98144;">
            <div class="val" style="color:#10b981;">${resolved}</div>
            <div class="lbl">Resolved</div>
        </div>
    </div>

    <div class="section-title">📋 Reports by Category</div>
    <table>
        <thead><tr><th>Category</th><th style="text-align:center;">Count</th><th>Distribution</th></tr></thead>
        <tbody>${catRows}</tbody>
    </table>

    <div class="section-title">📝 Detailed Report List</div>
    <table>
        <thead>
            <tr>
                <th>Report ID</th><th>Name</th><th>Category</th><th>Location</th><th>Status</th><th>Priority</th><th>Date</th>
            </tr>
        </thead>
        <tbody>${reportRows}</tbody>
    </table>

    <div class="page-break"></div>
    <div class="section-title">📈 Analytics Charts — ${monthLabel}</div>
    ${chartImgs}

    <div class="print-footer">
        <span>Barangay Danao Citizen Reporting Platform — Confidential</span>
        <span>${monthLabel} Monthly Report</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
}

// ===================================
// Print All Charts
// ===================================
function printAllChartsReport() {
    const now = new Date();
    const chartDefs = [
        { canvas: document.getElementById('categoryChartCanvas'), title: 'Reports by Category', legendId: 'categoryChartLegend' },
        { canvas: document.getElementById('statusChartCanvas'),   title: 'Pending vs Resolved by Category', legendId: 'statusChartSummary' },
        { canvas: document.getElementById('trendChartCanvas'),    title: 'Monthly Trend Analysis (12 Months)', legendId: 'trendMonthlySummary' }
    ];

    const chartSections = chartDefs.filter(c => c.canvas).map(c => {
        const imgSrc = c.canvas.toDataURL('image/png', 1.0);
        const legendEl = c.legendId ? document.getElementById(c.legendId) : null;
        const legendHTML = legendEl ? legendEl.innerHTML : '';
        return `
            <div style="break-inside:avoid; margin-bottom:40px;">
                <div style="font-size:1.1em; font-weight:700; color:#8B1538; padding:8px 14px; background:linear-gradient(135deg,rgba(139,21,56,0.07),rgba(212,175,55,0.07)); border-left:4px solid #8B1538; border-radius:4px; margin-bottom:16px;">📊 ${c.title}</div>
                <img style="width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:10px; background:#fafafa;" src="${imgSrc}" alt="${c.title}">
                ${legendHTML ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid #f3f4f6;">${legendHTML}</div>` : ''}
            </div>`;
    }).join('<div style="page-break-after:always;"></div>');

    const total    = AppState.reports.length;
    const resolved = AppState.reports.filter(r => r.status === 'Resolved').length;
    const pending  = AppState.reports.filter(r => r.status === 'Pending').length;
    const high     = AppState.reports.filter(r => r.priority === 'High' && r.status !== 'Resolved').length;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Analytics Report — Barangay Danao</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:32px; color:#1f2937; }
        .print-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:4px solid #8B1538; padding-bottom:20px; margin-bottom:28px; }
        .org-name { font-size:1.6em; font-weight:800; color:#8B1538; }
        .org-sub { color:#6b7280; font-size:0.9em; margin-top:4px; }
        .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
        .summary-box { text-align:center; padding:14px 10px; border-radius:10px; border:1px solid #e5e7eb; }
        .summary-box .val { font-size:2em; font-weight:800; }
        .summary-box .lbl { font-size:11px; text-transform:uppercase; letter-spacing:.5px; font-weight:600; color:#6b7280; margin-top:4px; }
        .print-footer { margin-top:40px; padding-top:14px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; color:#9ca3af; font-size:12px; }
        @media print { button { display:none; } }
    </style>
</head>
<body>
    <div class="print-header">
        <div>
            <div class="org-name">Barangay Danao</div>
            <div class="org-sub">Antequera, Bohol — Analytics Report</div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:1em; font-weight:600; color:#374151;">All Charts Summary</div>
            <div style="color:#9ca3af; font-size:0.85em; margin-top:4px;">Printed: ${now.toLocaleString()}</div>
        </div>
    </div>

    <div class="summary-grid">
        <div class="summary-box" style="background:#fef3e6; border-color:#8B153844;">
            <div class="val" style="color:#8B1538;">${total}</div>
            <div class="lbl">Total Reports</div>
        </div>
        <div class="summary-box" style="background:#fef3c7; border-color:#f59e0b44;">
            <div class="val" style="color:#f59e0b;">${pending}</div>
            <div class="lbl">Pending</div>
        </div>
        <div class="summary-box" style="background:#d1fae5; border-color:#10b98144;">
            <div class="val" style="color:#10b981;">${resolved}</div>
            <div class="lbl">Resolved</div>
        </div>
        <div class="summary-box" style="background:#fee2e2; border-color:#ef444444;">
            <div class="val" style="color:#ef4444;">${high}</div>
            <div class="lbl">Critical Issues</div>
        </div>
    </div>

    ${chartSections}

    <div class="print-footer">
        <span>Barangay Danao Citizen Reporting Platform — Confidential</span>
        <span>Analytics Report — ${now.toLocaleDateString()}</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
}

window.printChartCard = printChartCard;
window.printMonthlyReport = printMonthlyReport;
window.printAllChartsReport = printAllChartsReport;
function updatePriorityChart() {
    const priorityChart = document.getElementById('priorityChart');
    
    const priorities = { High: 0, Medium: 0, Low: 0 };
    AppState.reports.forEach(report => {
        priorities[report.priority]++;
    });
    
    const total = AppState.reports.length;
    priorityChart.innerHTML = Object.entries(priorities).map(([priority, count]) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        const color = getPriorityColor(priority);
        
        return `
            <div class="chart-bar">
                <div class="chart-bar-label">
                    <span>${priority} Priority</span>
                    <span class="chart-bar-value">${count} (${percentage}%)</span>
                </div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ===================================
// Update Location Hotspots
// ===================================
function updateLocationHotspots() {
    const locationHotspots = document.getElementById('locationHotspots');
    
    const locations = {};
    AppState.reports.forEach(report => {
        locations[report.location] = (locations[report.location] || 0) + 1;
    });
    
    const topLocations = Object.entries(locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (topLocations.length === 0) {
        locationHotspots.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No location data available yet</p>';
        return;
    }
    
    locationHotspots.innerHTML = topLocations.map(([location, count], index) => `
        <div style="padding: 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--primary-color);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 1.2em; color: var(--primary-color);">#${index + 1}</strong>
                    <span style="margin-left: 10px;">${location}</span>
                </div>
                <span style="font-size: 1.5em; font-weight: bold; color: var(--primary-color);">${count}</span>
            </div>
        </div>
    `).join('');
}

// ===================================
// Display Manage Reports
// ===================================
function displayManageReports() {
    const manageList = document.getElementById('manageReportsList');
    
    const sortedReports = [...AppState.reports].sort((a, b) => {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        if (a.status !== 'Resolved' && b.status === 'Resolved') return -1;
        if (a.status === 'Resolved' && b.status !== 'Resolved') return 1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.date - a.date;
    });
    
    manageList.innerHTML = sortedReports.map((report) => {
        const isVerified = report.autoVerified || false;
        const requiresReview = report.requiresReview && !report.autoVerified;
        
        return `
        <div class="manage-report-card priority-${report.priority.toLowerCase()}" style="${report.priority === 'High' && !report.autoVerified ? 'border: 2px solid #ef4444;' : ''}">
            <div class="manage-report-header">
                <div>
                    <span class="report-id">${report.id}</span>
                    <div class="report-badges" style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <span class="badge badge-${report.priority.toLowerCase()}">${report.priority}</span>
                        ${isVerified ? '<span class="badge" style="background: #d1fae5; color: #065f46;">✓ AUTO-VERIFIED</span>' : ''}
                        ${requiresReview ? '<span class="badge" style="background: #fef3c7; color: #92400e;">⚠️ NEEDS REVIEW</span>' : ''}
                    </div>
                    ${report.verificationReason ? `<div style="margin-top: 5px; font-size: 12px; color: #666;"><em>${report.verificationReason}</em></div>` : ''}
                </div>
                <span class="badge badge-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
            </div>
            <div class="manage-report-body">
                <div class="report-category">${report.category}</div>
                <div class="report-description">${report.description}</div>
                <div class="report-meta">
                    <span>📍 ${report.location}</span>
                    <span>📅 ${formatDate(report.date)}</span>
                    <span>👤 ${report.name}</span>
                </div>
            </div>
            <div class="manage-report-footer">
                ${isAdmin() ? `
                <div class="status-selector">
                    <select class="status-select" onchange="updateReportStatus('${report.id}', this.value)">
                        <option value="Pending" ${report.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Resolved" ${report.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                </div>
                ` : `
                <div class="status-selector">
                    <span class="badge badge-${report.status.toLowerCase().replace(' ', '-')}" style="font-size:0.95em;padding:8px 16px;">${report.status}</span>
                    <small style="color:#6b7280;margin-left:6px;">🔒 View Only</small>
                </div>
                `}
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary" onclick="viewReportDetails('${report.id}')">
                        View Details
                    </button>
                    <button class="btn btn-secondary" onclick="printReport('${report.id}')">
                        🖨️ Print
                    </button>
                    ${isAdmin() ? `
                    <button class="btn btn-danger" style="padding:8px 14px;font-size:0.85em;" onclick="deleteReport('${report.id}')">
                        🗑️ Delete
                    </button>` : ''}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// ===================================
// Delete Single Report (Admin Only)
// ===================================
async function deleteReport(reportId) {
    if (!isAdmin()) {
        alert('⛔ Access Denied\n\nOnly Administrators can delete reports.');
        return;
    }
    if (!confirm(`Are you sure you want to delete report ${reportId}?\nThis action cannot be undone.`)) return;

    try {
        await db.collection('reports').doc(reportId).delete();
        AppState.reports = AppState.reports.filter(r => r.id !== reportId);
        RefreshState.knownIds.delete(reportId);

        displayManageReports();
        displayReports();
        updateDashboard();
        updateAnalytics();
        updateHeaderStats();
        if (AppState.lguMap) updateLGUMapMarkers();

        // Toast
        const toast = document.createElement('div');
        toast.className = 'new-report-toast';
        toast.style.borderLeftColor = '#ef4444';
        toast.innerHTML = `🗑️ <span>Report <strong>${reportId}</strong> has been deleted.</span>`;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
    } catch (error) {
        console.error('Error deleting report:', error);
        alert('Error deleting report. Please try again.');
    }
}
window.deleteReport = deleteReport;

// ===================================
// NOTIFICATION SYSTEM
// ===================================

const NotificationConfig = {
    // EmailJS config — fill in via Settings panel
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    emailjsEnabled: false,

    // Semaphore SMS (PH) config — fill in via Settings panel
    semaphoreApiKey: '',
    semaphoreSenderName: 'BRNGY-DANAO',
    smsEnabled: false,
};

// Load saved config from localStorage
function loadNotificationConfig() {
    const saved = localStorage.getItem('notifConfig');
    if (saved) {
        try {
            Object.assign(NotificationConfig, JSON.parse(saved));
        } catch(e) {}
    }
}

function saveNotificationConfig() {
    localStorage.setItem('notifConfig', JSON.stringify(NotificationConfig));
}

// ---- Notification Log ----
function getNotificationLog() {
    try { return JSON.parse(localStorage.getItem('notifLog') || '[]'); } catch(e) { return []; }
}
function addNotificationLog(entry) {
    const log = getNotificationLog();
    log.unshift({ ...entry, timestamp: new Date().toISOString() });
    if (log.length > 200) log.splice(200);
    localStorage.setItem('notifLog', JSON.stringify(log));
}

// ---- Message Templates ----
function getNotificationMessages(report, newStatus) {
    const statusEmoji = { 'Pending': '🕐', 'In Progress': '🔧', 'Resolved': '✅' }[newStatus] || '📋';
    const barangay = 'Barangay Danao, Antequera, Bohol';

    const smsMessage =
        `${statusEmoji} ${barangay}\n` +
        `Report ${report.id} is now: ${newStatus.toUpperCase()}\n` +
        (newStatus === 'Pending'     ? `Your report has been received and is queued for review.` :
         newStatus === 'In Progress' ? `Our team is now actively working on your report.` :
                                       `Your report has been resolved. Thank you for helping improve our community!`) +
        `\nFor concerns, contact the Barangay Hall.`;

    const emailSubject = `[${barangay}] Report ${report.id} — Status Update: ${newStatus}`;
    const emailBody =
        `Dear ${report.name},\n\n` +
        `This is an official update regarding your community report.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `REPORT STATUS UPDATE\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Reference ID : ${report.id}\n` +
        `Category     : ${report.category}\n` +
        `Location     : ${report.location}\n` +
        `New Status   : ${statusEmoji} ${newStatus}\n` +
        `Updated On   : ${new Date().toLocaleString('en-PH')}\n\n` +
        (newStatus === 'Pending'
            ? `Your report has been received and is queued for processing. Our team will review it shortly.`
            : newStatus === 'In Progress'
            ? `Good news! Our barangay team is now actively working on resolving your concern. We will update you once it has been resolved.`
            : `We are pleased to inform you that your concern has been resolved. Thank you for taking the time to report this issue and for helping make Barangay Danao a better community.`) +
        `\n\nIf you have further concerns, please do not hesitate to visit or contact the Barangay Hall.\n\n` +
        `Respectfully,\nBarangay Danao Administration\nAntequera, Bohol\n`;

    return { smsMessage, emailSubject, emailBody };
}

// ---- Send Email via EmailJS ----
async function sendEmailNotification(report, newStatus) {
    if (!NotificationConfig.emailjsEnabled || !NotificationConfig.emailjsPublicKey) return { success: false, reason: 'Email not configured' };
    if (!report.email) return { success: false, reason: 'No email on report' };

    const { emailSubject, emailBody } = getNotificationMessages(report, newStatus);

    try {
        // Dynamically load EmailJS SDK if not loaded
        if (!window.emailjs) {
            await new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
                s.onload = res; s.onerror = rej;
                document.head.appendChild(s);
            });
            emailjs.init(NotificationConfig.emailjsPublicKey);
        }

        await emailjs.send(NotificationConfig.emailjsServiceId, NotificationConfig.emailjsTemplateId, {
            to_email:   report.email,
            to_name:    report.name,
            subject:    emailSubject,
            message:    emailBody,
            report_id:  report.id,
            status:     newStatus,
            category:   report.category,
            location:   report.location,
        });

        return { success: true };
    } catch (err) {
        return { success: false, reason: err?.text || err?.message || 'Unknown error' };
    }
}

// ---- Send SMS via Semaphore ----
async function sendSmsNotification(report, newStatus) {
    if (!NotificationConfig.smsEnabled || !NotificationConfig.semaphoreApiKey) return { success: false, reason: 'SMS not configured' };
    if (!report.contact) return { success: false, reason: 'No contact number on report' };

    const { smsMessage } = getNotificationMessages(report, newStatus);

    // Normalize PH number: strip non-digits, prepend 63
    let number = report.contact.replace(/\D/g, '');
    if (number.startsWith('0')) number = '63' + number.substring(1);
    if (!number.startsWith('63')) number = '63' + number;

    try {
        const res = await fetch('https://api.semaphore.co/api/v4/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apikey: NotificationConfig.semaphoreApiKey,
                number: number,
                message: smsMessage,
                sendername: NotificationConfig.semaphoreSenderName || 'BRNGY-DANAO',
            })
        });
        const data = await res.json();
        if (res.ok) return { success: true };
        return { success: false, reason: JSON.stringify(data) };
    } catch (err) {
        return { success: false, reason: err.message };
    }
}

// ---- Master send function ----
async function sendStatusNotifications(report, newStatus) {
    const results = { email: null, sms: null };

    const [emailResult, smsResult] = await Promise.allSettled([
        sendEmailNotification(report, newStatus),
        sendSmsNotification(report, newStatus),
    ]);

    results.email = emailResult.status === 'fulfilled' ? emailResult.value : { success: false, reason: emailResult.reason };
    results.sms   = smsResult.status   === 'fulfilled' ? smsResult.value   : { success: false, reason: smsResult.reason };

    // Log both
    addNotificationLog({
        reportId: report.id,
        citizenName: report.name,
        contact: report.contact,
        email: report.email,
        newStatus,
        emailResult: results.email,
        smsResult: results.sms,
    });

    return results;
}

// ---- Notification Settings Modal ----
function openNotificationSettings() {
    loadNotificationConfig();
    const existing = document.getElementById('notifSettingsModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'notifSettingsModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';

    overlay.innerHTML = `
    <div style="background:#f8f9fa;border-radius:20px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,0.3);animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);">

        <!-- TOP HEADER -->
        <div style="background:linear-gradient(135deg,#8B1538,#b91c4e);border-radius:20px 20px 0 0;padding:24px 24px 20px;position:relative;">
            <div style="font-size:2em;margin-bottom:6px;">🔔</div>
            <div style="color:white;font-size:1.2em;font-weight:800;letter-spacing:-0.3px;">Notifications</div>
            <div style="color:rgba(255,255,255,0.7);font-size:0.82em;margin-top:2px;">Auto-alert citizens when their report status changes</div>
            <button onclick="closeNotificationSettings()"
                style="position:absolute;top:18px;right:18px;border:none;background:rgba(255,255,255,0.2);color:white;width:32px;height:32px;border-radius:50%;font-size:1em;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>

        <!-- BODY -->
        <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">

            <!-- HOW IT WORKS pill -->
            <div style="background:#fff3cd;border-radius:10px;padding:11px 14px;display:flex;align-items:center;gap:10px;border:1px solid #fde68a;">
                <span style="font-size:1.3em;">💡</span>
                <span style="font-size:0.82em;color:#92400e;font-weight:600;line-height:1.4;">When you change a report to <strong>Pending → In Progress → Resolved</strong>, the citizen gets an SMS and/or Email automatically.</span>
            </div>

            <!-- ═══════════ EMAIL CARD ═══════════ -->
            <div style="background:white;border-radius:14px;overflow:hidden;border:2px solid ${NotificationConfig.emailjsEnabled ? '#3b82f6' : '#e5e7eb'};transition:border-color 0.2s;" id="emailCard">

                <!-- Card header row -->
                <div style="padding:16px 18px;display:flex;align-items:center;gap:12px;">
                    <div style="width:42px;height:42px;border-radius:12px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:1.4em;flex-shrink:0;">📧</div>
                    <div style="flex:1;">
                        <div style="font-weight:700;color:#1f2937;font-size:0.95em;">Email Alerts</div>
                        <div style="font-size:0.75em;color:#6b7280;margin-top:1px;">via EmailJS — free 200/month</div>
                    </div>
                    <!-- Big toggle switch -->
                    <label style="position:relative;display:inline-block;width:50px;height:26px;flex-shrink:0;cursor:pointer;">
                        <input type="checkbox" id="emailEnabled" ${NotificationConfig.emailjsEnabled ? 'checked' : ''}
                            onchange="document.getElementById('emailCard').style.borderColor=this.checked?'#3b82f6':'#e5e7eb';document.getElementById('emailFields').style.display=this.checked?'block':'none';"
                            style="opacity:0;width:0;height:0;position:absolute;">
                        <span id="emailToggleTrack" style="position:absolute;inset:0;border-radius:26px;background:${NotificationConfig.emailjsEnabled ? '#3b82f6' : '#d1d5db'};transition:background 0.2s;"></span>
                        <span style="position:absolute;top:3px;left:${NotificationConfig.emailjsEnabled ? '27px' : '3px'};width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.2);transition:left 0.2s;"></span>
                    </label>
                </div>

                <!-- Fields (shown/hidden) -->
                <div id="emailFields" style="display:${NotificationConfig.emailjsEnabled ? 'block' : 'none'};padding:0 18px 16px;border-top:1px solid #f3f4f6;">
                    <div style="padding-top:14px;display:flex;flex-direction:column;gap:10px;">
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">① Public Key</label>
                            <input id="ejsPublicKey" type="text" value="${NotificationConfig.emailjsPublicKey}" placeholder="Paste from emailjs.com → Account"
                                style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;transition:border-color 0.2s;outline:none;"
                                onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">② Service ID</label>
                            <input id="ejsServiceId" type="text" value="${NotificationConfig.emailjsServiceId}" placeholder="service_xxxxxxx"
                                style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;transition:border-color 0.2s;outline:none;"
                                onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">③ Template ID</label>
                            <input id="ejsTemplateId" type="text" value="${NotificationConfig.emailjsTemplateId}" placeholder="template_xxxxxxx"
                                style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;transition:border-color 0.2s;outline:none;"
                                onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
                        </div>
                        <a href="https://www.emailjs.com" target="_blank"
                            style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#3b82f6;font-weight:600;text-decoration:none;padding:7px 12px;background:#eff6ff;border-radius:8px;width:fit-content;">
                            🔗 Get free keys at emailjs.com →
                        </a>
                    </div>
                </div>
            </div>

            <!-- ═══════════ SMS CARD ═══════════ -->
            <div style="background:white;border-radius:14px;overflow:hidden;border:2px solid ${NotificationConfig.smsEnabled ? '#8b5cf6' : '#e5e7eb'};transition:border-color 0.2s;" id="smsCard">

                <div style="padding:16px 18px;display:flex;align-items:center;gap:12px;">
                    <div style="width:42px;height:42px;border-radius:12px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:1.4em;flex-shrink:0;">📱</div>
                    <div style="flex:1;">
                        <div style="font-weight:700;color:#1f2937;font-size:0.95em;">SMS Alerts</div>
                        <div style="font-size:0.75em;color:#6b7280;margin-top:1px;">via Semaphore — Philippine SMS</div>
                    </div>
                    <label style="position:relative;display:inline-block;width:50px;height:26px;flex-shrink:0;cursor:pointer;">
                        <input type="checkbox" id="smsEnabled" ${NotificationConfig.smsEnabled ? 'checked' : ''}
                            onchange="document.getElementById('smsCard').style.borderColor=this.checked?'#8b5cf6':'#e5e7eb';document.getElementById('smsFields').style.display=this.checked?'block':'none';"
                            style="opacity:0;width:0;height:0;position:absolute;">
                        <span style="position:absolute;inset:0;border-radius:26px;background:${NotificationConfig.smsEnabled ? '#8b5cf6' : '#d1d5db'};transition:background 0.2s;"></span>
                        <span style="position:absolute;top:3px;left:${NotificationConfig.smsEnabled ? '27px' : '3px'};width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.2);transition:left 0.2s;"></span>
                    </label>
                </div>

                <div id="smsFields" style="display:${NotificationConfig.smsEnabled ? 'block' : 'none'};padding:0 18px 16px;border-top:1px solid #f3f4f6;">
                    <div style="padding-top:14px;display:flex;flex-direction:column;gap:10px;">
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">① API Key</label>
                            <input id="semApiKey" type="text" value="${NotificationConfig.semaphoreApiKey}" placeholder="Paste from semaphore.co → API Keys"
                                style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;transition:border-color 0.2s;outline:none;"
                                onfocus="this.style.borderColor='#8b5cf6'" onblur="this.style.borderColor='#e5e7eb'">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">② Sender Name <span style="text-transform:none;font-weight:400;">(max 11 chars)</span></label>
                            <input id="semSenderName" type="text" value="${NotificationConfig.semaphoreSenderName}" maxlength="11" placeholder="BRNGY-DANAO"
                                style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;transition:border-color 0.2s;outline:none;"
                                onfocus="this.style.borderColor='#8b5cf6'" onblur="this.style.borderColor='#e5e7eb'">
                        </div>
                        <a href="https://semaphore.co" target="_blank"
                            style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#8b5cf6;font-weight:600;text-decoration:none;padding:7px 12px;background:#f5f3ff;border-radius:8px;width:fit-content;">
                            🔗 Get API key at semaphore.co →
                        </a>
                    </div>
                </div>
            </div>

            <!-- BOTTOM BUTTONS -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;">
                <button onclick="saveNotificationSettings()"
                    style="padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#8B1538,#b91c4e);color:white;font-size:14px;font-weight:700;cursor:pointer;transition:opacity 0.2s;"
                    onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                    💾 Save
                </button>
                <button onclick="openNotificationLog()"
                    style="padding:13px;border:2px solid #e5e7eb;border-radius:12px;background:white;color:#374151;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;"
                    onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                    📋 View Log
                </button>
            </div>

        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeNotificationSettings(); });

    // Animate toggle knobs on change
    overlay.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', function() {
            const track = this.parentElement.querySelector('span:first-of-type');
            const knob  = this.parentElement.querySelector('span:last-of-type');
            if (this.id === 'emailEnabled') {
                track.style.background = this.checked ? '#3b82f6' : '#d1d5db';
            } else {
                track.style.background = this.checked ? '#8b5cf6' : '#d1d5db';
            }
            knob.style.left = this.checked ? '27px' : '3px';
        });
    });
}

function closeNotificationSettings() {
    const el = document.getElementById('notifSettingsModal');
    if (el) el.remove();
}

function saveNotificationSettings() {
    NotificationConfig.emailjsEnabled    = document.getElementById('emailEnabled').checked;
    NotificationConfig.emailjsPublicKey  = document.getElementById('ejsPublicKey').value.trim();
    NotificationConfig.emailjsServiceId  = document.getElementById('ejsServiceId').value.trim();
    NotificationConfig.emailjsTemplateId = document.getElementById('ejsTemplateId').value.trim();
    NotificationConfig.smsEnabled        = document.getElementById('smsEnabled').checked;
    NotificationConfig.semaphoreApiKey   = document.getElementById('semApiKey').value.trim();
    NotificationConfig.semaphoreSenderName = document.getElementById('semSenderName').value.trim() || 'BRNGY-DANAO';
    saveNotificationConfig();
    closeNotificationSettings();

    const toast = document.createElement('div');
    toast.className = 'new-report-toast';
    toast.style.borderLeftColor = '#10b981';
    toast.innerHTML = '✅ <span><strong>Notification settings saved!</strong></span>';
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

// ---- Notification Log Modal ----
function openNotificationLog() {
    const existing = document.getElementById('notifLogModal');
    if (existing) existing.remove();

    const log = getNotificationLog();
    const overlay = document.createElement('div');
    overlay.id = 'notifLogModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s;';

    const rows = log.length === 0
        ? `<div style="text-align:center;padding:40px;color:#9ca3af;">
               <div style="font-size:2.5em;margin-bottom:8px;">📭</div>
               <div style="font-weight:600;">No notifications sent yet</div>
           </div>`
        : log.map(entry => {
            const emailOk  = entry.emailResult?.success;
            const smsOk    = entry.smsResult?.success;
            const emailNA  = !NotificationConfig.emailjsEnabled || !entry.email;
            const smsNA    = !NotificationConfig.smsEnabled || !entry.contact;
            const statusColor = { 'Pending': '#f59e0b', 'In Progress': '#3b82f6', 'Resolved': '#10b981' }[entry.newStatus] || '#6b7280';
            return `
            <div style="padding:14px 16px;border-bottom:1px solid #f3f4f6;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;">
                <div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.9em;">${entry.reportId} — ${entry.citizenName}</div>
                    <div style="font-size:0.8em;color:#6b7280;margin-top:2px;">
                        ${new Date(entry.timestamp).toLocaleString('en-PH')} &nbsp;·&nbsp;
                        <span style="color:${statusColor};font-weight:600;">${entry.newStatus}</span>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                        <span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;background:${emailNA ? '#f3f4f6' : emailOk ? '#d1fae5' : '#fee2e2'};color:${emailNA ? '#9ca3af' : emailOk ? '#065f46' : '#991b1b'};">
                            📧 ${emailNA ? 'N/A' : emailOk ? 'Sent' : 'Failed'}
                        </span>
                        <span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;background:${smsNA ? '#f3f4f6' : smsOk ? '#d1fae5' : '#fee2e2'};color:${smsNA ? '#9ca3af' : smsOk ? '#065f46' : '#991b1b'};">
                            📱 ${smsNA ? 'N/A' : smsOk ? 'Sent' : 'Failed'}
                        </span>
                        ${entry.email ? `<span style="font-size:11px;color:#6b7280;">${entry.email}</span>` : ''}
                        ${entry.contact ? `<span style="font-size:11px;color:#6b7280;">${entry.contact}</span>` : ''}
                    </div>
                    ${(!emailOk && !emailNA && entry.emailResult?.reason) ? `<div style="font-size:11px;color:#ef4444;margin-top:4px;">Email error: ${entry.emailResult.reason}</div>` : ''}
                    ${(!smsOk && !smsNA && entry.smsResult?.reason) ? `<div style="font-size:11px;color:#ef4444;margin-top:4px;">SMS error: ${entry.smsResult.reason}</div>` : ''}
                </div>
            </div>`;
        }).join('');

    overlay.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:0;max-width:620px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,0.35);max-height:85vh;display:flex;flex-direction:column;animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);">
        <div style="padding:24px 28px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div>
                <h2 style="color:#8B1538;font-size:1.2em;font-weight:800;margin:0;">📋 Notification Log</h2>
                <p style="color:#6b7280;font-size:0.82em;margin:3px 0 0;">${log.length} notification event${log.length !== 1 ? 's' : ''} recorded</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                ${log.length > 0 ? `<button onclick="clearNotificationLog()" style="padding:6px 14px;border:1.5px solid #fee2e2;border-radius:8px;background:white;color:#dc2626;font-size:12px;font-weight:600;cursor:pointer;">🗑️ Clear Log</button>` : ''}
                <button onclick="document.getElementById('notifLogModal').remove()" style="border:none;background:#f3f4f6;border-radius:50%;width:34px;height:34px;font-size:1.1em;cursor:pointer;color:#374151;">✕</button>
            </div>
        </div>
        <div style="overflow-y:auto;flex:1;">${rows}</div>
        <div style="padding:16px 28px;border-top:1px solid #e5e7eb;flex-shrink:0;display:flex;justify-content:flex-end;">
            <button onclick="document.getElementById('notifLogModal').remove()" style="padding:9px 22px;border:2px solid #e5e7eb;border-radius:8px;background:white;color:#374151;font-size:13px;font-weight:600;cursor:pointer;">Close</button>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function clearNotificationLog() {
    if (!confirm('Clear all notification logs?')) return;
    localStorage.removeItem('notifLog');
    document.getElementById('notifLogModal').remove();
    openNotificationLog();
}

// ---- Notification Result Toast ----
function showNotifResultToast(results, report, newStatus) {
    const emailOk = results.email?.success;
    const smsOk   = results.sms?.success;
    const emailNA = !NotificationConfig.emailjsEnabled || !report.email;
    const smsNA   = !NotificationConfig.smsEnabled || !report.contact;

    // Don't show toast if both are N/A (not configured)
    if (emailNA && smsNA) return;

    const parts = [];
    if (!emailNA) parts.push(`📧 Email: ${emailOk ? '✅ Sent' : '❌ Failed'}`);
    if (!smsNA)   parts.push(`📱 SMS: ${smsOk ? '✅ Sent' : '❌ Failed'}`);

    const toast = document.createElement('div');
    toast.className = 'new-report-toast';
    toast.style.borderLeftColor = (emailOk || smsOk) ? '#10b981' : '#ef4444';
    toast.innerHTML = `🔔 <span><strong>Citizen Notified</strong> — ${parts.join(' &nbsp;|&nbsp; ')}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
}

// ===================================
// Update Report Status
// ===================================
async function updateReportStatus(reportId, newStatus) {
    if (!isAdmin()) {
        alert('⛔ Access Denied\n\nOnly Administrators can update report status.');
        displayManageReports();
        return;
    }
    const report = AppState.reports.find(r => r.id === reportId);
    if (!report) return;

    const oldStatus = report.status;
    report.status = newStatus;

    if (newStatus === 'Resolved' && !report.responseTime) {
        const daysDiff = Math.floor((new Date() - report.date) / (1000 * 60 * 60 * 24));
        report.responseTime = daysDiff;
    }

    try {
        await updateReportInDB(report);
        console.log('Report status updated in database');
    } catch (error) {
        console.error('Error updating database:', error);
    }

    displayManageReports();
    updateDashboard();
    updateAnalytics();
    updateHeaderStats();

    if (AppState.lguMap) {
        updateLGUMapMarkers();
    }

    // Show status-updated toast
    const statusEmoji = { 'Pending': '🕐', 'In Progress': '🔧', 'Resolved': '✅' }[newStatus] || '📋';
    const statusToast = document.createElement('div');
    statusToast.className = 'new-report-toast';
    statusToast.style.borderLeftColor = { 'Pending': '#f59e0b', 'In Progress': '#3b82f6', 'Resolved': '#10b981' }[newStatus] || '#8B1538';
    statusToast.innerHTML = `${statusEmoji} <span>Report <strong>${report.id}</strong> updated to <strong>${newStatus}</strong></span>`;
    document.body.appendChild(statusToast);
    setTimeout(() => { if (statusToast.parentNode) statusToast.remove(); }, 3000);

    // Send notifications if status actually changed
    if (oldStatus !== newStatus) {
        loadNotificationConfig();
        const results = await sendStatusNotifications(report, newStatus);
        showNotifResultToast(results, report, newStatus);
    }
}

// ===================================
// View Report Details
// ===================================
function viewReportDetails(reportId) {
    const report = AppState.reports.find(r => r.id === reportId);
    if (!report) return;

    const existing = document.getElementById('reportDetailModal');
    if (existing) existing.remove();

    const statusColor = { 'Pending': '#f59e0b', 'In Progress': '#2563eb', 'Resolved': '#10b981' }[report.status] || '#6b7280';
    const priorityColor = { 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#10b981' }[report.priority] || '#6b7280';

    const photosHTML = (report.photos && report.photos.length > 0 && report.photos.some(p => p.url))
        ? `<div style="margin-top:20px;">
               <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">📸 Proof Photos (${report.photos.filter(p=>p.url).length})</div>
               <div style="display:flex;flex-wrap:wrap;gap:10px;">
                   ${report.photos.filter(p => p.url).map((p, i) => `
                       <div style="position:relative;width:110px;height:110px;border-radius:10px;overflow:hidden;border:2px solid #e5e7eb;cursor:pointer;flex-shrink:0;"
                           onclick="lguOpenPhotoLightbox('${p.url.replace(/'/g, "\\'")}','${(p.name||'Photo '+(i+1)).replace(/'/g,"\\'")}')">
                           <img src="${p.url}" alt="${p.name || 'Photo ' + (i+1)}"
                               style="width:100%;height:100%;object-fit:cover;transition:transform 0.2s;"
                               onmouseover="this.style.transform='scale(1.05)'"
                               onmouseout="this.style.transform='scale(1)'">
                           <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);color:white;font-size:9px;padding:2px 5px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">🔍 View</div>
                       </div>`).join('')}
               </div>
           </div>`
        : `<div style="margin-top:16px;padding:14px;background:#f9fafb;border-radius:10px;text-align:center;color:#9ca3af;font-size:0.88em;">📷 No proof photos attached</div>`;

    const overlay = document.createElement('div');
    overlay.id = 'reportDetailModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s;';

    overlay.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:0;max-width:600px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,0.35);max-height:90vh;display:flex;flex-direction:column;animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);">
        <!-- Header -->
        <div style="padding:22px 28px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div>
                <div style="font-family:'Courier New',monospace;font-size:1.3em;font-weight:800;color:#8B1538;">${report.id}</div>
                <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                    <span style="padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${statusColor}22;color:${statusColor};">${report.status}</span>
                    <span style="padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${priorityColor}22;color:${priorityColor};">⚡ ${report.priority} Priority</span>
                </div>
            </div>
            <button onclick="document.getElementById('reportDetailModal').remove()"
                style="border:none;background:#f3f4f6;border-radius:50%;width:36px;height:36px;font-size:1.1em;cursor:pointer;color:#374151;flex-shrink:0;">✕</button>
        </div>

        <!-- Scrollable body -->
        <div style="overflow-y:auto;flex:1;padding:22px 28px;">
            <!-- Info grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;">
                <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;">
                    <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:3px;">CATEGORY</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.9em;">${report.category}</div>
                </div>
                <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;">
                    <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:3px;">DATE SUBMITTED</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.9em;">${formatDate(report.date)}</div>
                </div>
                <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;">
                    <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:3px;">REPORTER</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.9em;">👤 ${report.name}</div>
                </div>
                <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;">
                    <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:3px;">CONTACT</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.9em;">📞 ${report.contact}</div>
                </div>
                ${report.email ? `
                <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;">
                    <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:3px;">EMAIL</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.9em;">📧 ${report.email}</div>
                </div>` : ''}
                <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;${report.email ? '' : 'grid-column:span 2;'}">
                    <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:3px;">LOCATION</div>
                    <div style="font-weight:700;color:#1f2937;font-size:0.9em;">📍 ${report.location}</div>
                </div>
                ${report.responseTime != null ? `
                <div style="background:#f0fdf4;border-radius:10px;padding:12px 14px;border:1px solid #d1fae5;">
                    <div style="font-size:11px;color:#059669;font-weight:600;margin-bottom:3px;">RESPONSE TIME</div>
                    <div style="font-weight:700;color:#065f46;font-size:0.9em;">⏱️ ${report.responseTime} day${report.responseTime !== 1 ? 's' : ''}</div>
                </div>` : ''}
            </div>

            <!-- Description -->
            <div style="margin-top:12px;background:#f9fafb;border-left:4px solid #8B1538;border-radius:0 10px 10px 0;padding:14px 16px;">
                <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:6px;">DESCRIPTION</div>
                <div style="color:#374151;font-size:0.9em;line-height:1.7;">${report.description}</div>
            </div>

            <!-- Proof Photos -->
            ${photosHTML}
        </div>

        <!-- Footer actions -->
        <div style="padding:16px 28px;border-top:1px solid #e5e7eb;flex-shrink:0;display:flex;justify-content:flex-end;gap:10px;">
            <button onclick="printReport('${report.id}')"
                style="padding:9px 20px;border:2px solid #e5e7eb;border-radius:8px;background:white;color:#374151;font-size:13px;font-weight:600;cursor:pointer;"
                onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                🖨️ Print
            </button>
            <button onclick="document.getElementById('reportDetailModal').remove()"
                style="padding:9px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#8B1538,#b91c4e);color:white;font-size:13px;font-weight:700;cursor:pointer;">
                Close
            </button>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function lguOpenPhotoLightbox(dataUrl, name) {
    const existing = document.getElementById('lguPhotoLightbox');
    if (existing) existing.remove();
    const lb = document.createElement('div');
    lb.id = 'lguPhotoLightbox';
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s;';
    lb.innerHTML = `
        <div style="position:relative;max-width:90vw;max-height:90vh;text-align:center;">
            <img src="${dataUrl}" alt="${name}" style="max-width:100%;max-height:82vh;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="color:rgba(255,255,255,0.65);font-size:13px;margin-top:10px;">${name}</div>
            <button onclick="document.getElementById('lguPhotoLightbox').remove()"
                style="position:absolute;top:-14px;right:-14px;width:32px;height:32px;border-radius:50%;background:#ef4444;color:white;border:none;font-size:16px;cursor:pointer;">✕</button>
        </div>`;
    lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
    document.body.appendChild(lb);
}
window.lguOpenPhotoLightbox = lguOpenPhotoLightbox;

// ===================================
// Print Report
// ===================================
function printReport(reportId) {
    const report = AppState.reports.find(r => r.id === reportId);
    if (!report) {
        alert('Report not found!');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Report - ${report.id}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    color: #333;
                    line-height: 1.6;
                }
                
                .print-header {
                    text-align: center;
                    border-bottom: 3px solid #8B1538;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                
                .print-header h1 {
                    color: #8B1538;
                    font-size: 24px;
                    margin-bottom: 5px;
                }
                
                .print-header p {
                    color: #666;
                    font-size: 14px;
                }
                
                .report-id-section {
                    background: #f3f4f6;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 25px;
                    text-align: center;
                }
                
                .report-id-section h2 {
                    color: #8B1538;
                    font-size: 28px;
                    font-family: 'Courier New', monospace;
                }
                
                .status-priority {
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    margin-top: 10px;
                }
                
                .badge {
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                
                .badge-pending { background: #fef3c7; color: #92400e; }
                .badge-in-progress { background: #dbeafe; color: #1e40af; }
                .badge-resolved { background: #d1fae5; color: #065f46; }
                .badge-high { background: #fee2e2; color: #991b1b; }
                .badge-medium { background: #fef3c7; color: #92400e; }
                .badge-low { background: #d1fae5; color: #065f46; }
                
                .report-section {
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                }
                
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #8B1538;
                    margin-bottom: 10px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 5px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 150px 1fr;
                    gap: 12px;
                    margin-bottom: 15px;
                }
                
                .info-label {
                    font-weight: bold;
                    color: #666;
                }
                
                .info-value {
                    color: #333;
                }
                
                .description-box {
                    background: #f9fafb;
                    padding: 15px;
                    border-left: 4px solid #8B1538;
                    border-radius: 4px;
                    margin-top: 10px;
                }
                
                .footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }
                
                @media print {
                    body {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>🏛️ CITIZEN REPORT</h1>
                <p>Barangay Danao, Antequera, Bohol</p>
            </div>
            
            <div class="report-id-section">
                <h2>${report.id}</h2>
                <div class="status-priority">
                    <span class="badge badge-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
                    <span class="badge badge-${report.priority.toLowerCase()}">${report.priority} Priority</span>
                </div>
            </div>
            
            <div class="report-section">
                <div class="section-title">📋 Report Information</div>
                <div class="info-grid">
                    <div class="info-label">Category:</div>
                    <div class="info-value">${report.category}</div>
                    
                    <div class="info-label">Date Submitted:</div>
                    <div class="info-value">${formatDate(report.date)}</div>
                    
                    <div class="info-label">Location:</div>
                    <div class="info-value">${report.location}</div>
                    
                    ${report.coordinates ? `
                    <div class="info-label">Coordinates:</div>
                    <div class="info-value">${report.coordinates.lat}, ${report.coordinates.lng}</div>
                    ` : ''}
                    
                    ${report.responseTime ? `
                    <div class="info-label">Response Time:</div>
                    <div class="info-value">${report.responseTime} days</div>
                    ` : ''}
                </div>
            </div>
            
            <div class="report-section">
                <div class="section-title">👤 Reporter Information</div>
                <div class="info-grid">
                    <div class="info-label">Name:</div>
                    <div class="info-value">${report.name}</div>
                    
                    <div class="info-label">Contact Number:</div>
                    <div class="info-value">${report.contact}</div>
                    
                    ${report.email ? `
                    <div class="info-label">Email:</div>
                    <div class="info-value">${report.email}</div>
                    ` : ''}
                </div>
            </div>
            
            <div class="report-section">
                <div class="section-title">📝 Issue Description</div>
                <div class="description-box">
                    ${report.description}
                </div>
            </div>

            ${report.photos && report.photos.length > 0 ? `
            <div class="report-section" style="page-break-inside:avoid;">
                <div class="section-title">📸 Proof Photos (${report.photos.length})</div>
                <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;">
                    ${report.photos.map((p, i) => `
                    <div style="text-align:center;">
                        <img src="${p.dataUrl}" alt="${p.name || 'Photo ' + (i+1)}"
                            style="width:180px;height:140px;object-fit:cover;border-radius:8px;border:2px solid #e5e7eb;display:block;">
                        <div style="font-size:10px;color:#6b7280;margin-top:4px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Photo ${i+1}: ${p.name || ''}</div>
                    </div>`).join('')}
                </div>
            </div>` : ''}
            
            <div class="footer">
                <p>This is an official report from the Barangay Danao Citizen Reporting Platform</p>
                <p>Printed on: ${new Date().toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// ===================================
// Export to Excel with Menu Options
// ===================================
function exportToExcel() {
    if (!isAdmin()) {
        alert('⛔ Access Denied\n\nOnly Administrators can export data.');
        return;
    }
    if (AppState.reports.length === 0) {
        alert('No reports to export!');
        return;
    }
    
    // Create modal for export options
    showExportMenu();
}

// Show Export Menu Modal
function showExportMenu() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    // Count reports per category
    const categoryCounts = {
        'Waste Management': AppState.reports.filter(r => r.category === 'Waste Management').length,
        'Infrastructure Damage': AppState.reports.filter(r => r.category === 'Infrastructure Damage').length,
        'Environmental Violation': AppState.reports.filter(r => r.category === 'Environmental Violation').length,
        'Public Safety': AppState.reports.filter(r => r.category === 'Public Safety').length,
        'Water & Sanitation': AppState.reports.filter(r => r.category === 'Water & Sanitation').length,
        'Street Lighting': AppState.reports.filter(r => r.category === 'Street Lighting').length,
        'Dog Issues': AppState.reports.filter(r => r.category === 'Dog Issues').length,
        'Other': AppState.reports.filter(r => r.category === 'Other').length
    };
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    modal.innerHTML = `
        <div style="margin-bottom: 25px;">
            <h2 style="color: #8B1538; margin-bottom: 10px;">📊 Export Reports to Excel</h2>
            <p style="color: #666;">Choose which reports you want to export</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <button onclick="exportAllReports(); closeExportMenu();" 
                    style="width: 100%; padding: 15px; background: linear-gradient(135deg, #8B1538, #D4AF37); 
                           color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; 
                           cursor: pointer; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                <span>📑 All Records</span>
                <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                    ${AppState.reports.length} reports
                </span>
            </button>
        </div>
        
        <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-bottom: 15px;">
            <h3 style="color: #8B1538; font-size: 16px; margin-bottom: 15px;">Export by Category:</h3>
        </div>
        
        <div style="display: grid; gap: 10px;">
            <button onclick="exportCategory('Waste Management'); closeExportMenu();" 
                    class="export-category-btn" ${categoryCounts['Waste Management'] === 0 ? 'disabled' : ''}>
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🗑️</span>
                    <span>Waste Management</span>
                </span>
                <span class="count-badge">${categoryCounts['Waste Management']} reports</span>
            </button>
            
            <button onclick="exportCategory('Infrastructure Damage'); closeExportMenu();" 
                    class="export-category-btn" ${categoryCounts['Infrastructure Damage'] === 0 ? 'disabled' : ''}>
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🏗️</span>
                    <span>Infrastructure Damage</span>
                </span>
                <span class="count-badge">${categoryCounts['Infrastructure Damage']} reports</span>
            </button>
            
            <button onclick="exportCategory('Environmental Violation'); closeExportMenu();" 
                    class="export-category-btn" ${categoryCounts['Environmental Violation'] === 0 ? 'disabled' : ''}>
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🌳</span>
                    <span>Environmental Violation</span>
                </span>
                <span class="count-badge">${categoryCounts['Environmental Violation']} reports</span>
            </button>
            
            <button onclick="exportCategory('Public Safety'); closeExportMenu();" 
                    class="export-category-btn" ${categoryCounts['Public Safety'] === 0 ? 'disabled' : ''}>
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🚨</span>
                    <span>Public Safety</span>
                </span>
                <span class="count-badge">${categoryCounts['Public Safety']} reports</span>
            </button>
            
            <button onclick="exportCategory('Water & Sanitation'); closeExportMenu();" 
                    class="export-category-btn" ${categoryCounts['Water & Sanitation'] === 0 ? 'disabled' : ''}>
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">💧</span>
                    <span>Water & Sanitation</span>
                </span>
                <span class="count-badge">${categoryCounts['Water & Sanitation']} reports</span>
            </button>
            
            <button onclick="exportCategory('Street Lighting'); closeExportMenu();" 
                    class="export-category-btn" ${categoryCounts['Street Lighting'] === 0 ? 'disabled' : ''}>
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">💡</span>
                    <span>Street Lighting</span>
                </span>
                <span class="count-badge">${categoryCounts['Street Lighting']} reports</span>
            </button>

            <button onclick="exportCategory('Dog Issues'); closeExportMenu();" 
                    class="export-category-btn" ${categoryCounts['Dog Issues'] === 0 ? 'disabled' : ''}>
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🐕</span>
                    <span>Dog Issues</span>
                </span>
                <span class="count-badge">${categoryCounts['Dog Issues']} reports</span>
            </button>
            
            <button onclick="exportCategory('Other'); closeExportMenu();" 
                    class="export-category-btn" ${categoryCounts['Other'] === 0 ? 'disabled' : ''}>
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">📋</span>
                    <span>Other</span>
                </span>
                <span class="count-badge">${categoryCounts['Other']} reports</span>
            </button>
        </div>
        
        <div style="margin-top: 25px; text-align: center;">
            <button onclick="closeExportMenu();" 
                    style="padding: 12px 30px; background: #f3f4f6; color: #333; border: none; 
                           border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
                Cancel
            </button>
        </div>
        
        <style>
            .export-category-btn {
                width: 100%;
                padding: 12px 15px;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: space-between;
                text-align: left;
            }
            
            .export-category-btn:hover:not(:disabled) {
                background: #f9fafb;
                border-color: #8B1538;
                transform: translateX(5px);
            }
            
            .export-category-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .count-badge {
                background: #8B1538;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .export-category-btn:disabled .count-badge {
                background: #9ca3af;
            }
        </style>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Store reference for closing
    window.exportMenuOverlay = overlay;
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeExportMenu();
        }
    });
}

// Close Export Menu
function closeExportMenu() {
    if (window.exportMenuOverlay) {
        document.body.removeChild(window.exportMenuOverlay);
        window.exportMenuOverlay = null;
    }
}

// Export all reports in one file
function exportAllReports() {
    const excelData = AppState.reports.map(report => ({
        'Report ID': report.id,
        'Date Submitted': formatDate(report.date),
        'Name': report.name,
        'Contact Number': report.contact,
        'Email': report.email || 'N/A',
        'Category': report.category,
        'Location': report.location,
        'Description': report.description,
        'Priority': report.priority,
        'Status': report.status,
        'Latitude': report.coordinates ? report.coordinates.lat : 'N/A',
        'Longitude': report.coordinates ? report.coordinates.lng : 'N/A',
        'Response Time (days)': report.responseTime || 'N/A'
    }));
    
    downloadCSV(excelData, `Barangay_Danao_All_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    
    setTimeout(() => {
        alert(`✅ All Reports Exported!\n\nTotal: ${AppState.reports.length} reports\nFile: Barangay_Danao_All_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    }, 100);
}

// Helper function to download CSV
function downloadCSV(data, filename) {
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            if (typeof value === 'string') {
                value = value.replace(/"/g, '""');
                if (value.includes(',') || value.includes('\n')) {
                    value = `"${value}"`;
                }
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export specific category
function exportCategory(category) {
    const categoryReports = AppState.reports.filter(r => r.category === category);
    
    if (categoryReports.length === 0) {
        alert(`No reports found for ${category}!`);
        return;
    }
    
    const excelData = categoryReports.map(report => ({
        'Report ID': report.id,
        'Date Submitted': formatDate(report.date),
        'Name': report.name,
        'Contact Number': report.contact,
        'Email': report.email || 'N/A',
        'Location': report.location,
        'Description': report.description,
        'Priority': report.priority,
        'Status': report.status,
        'Latitude': report.coordinates ? report.coordinates.lat : 'N/A',
        'Longitude': report.coordinates ? report.coordinates.lng : 'N/A',
        'Response Time (days)': report.responseTime || 'N/A'
    }));
    
    const fileName = `Barangay_Danao_${category.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(excelData, fileName);
    
    setTimeout(() => {
        alert(`✅ ${category} Reports Exported!\n\nTotal: ${categoryReports.length} reports\nFile: ${fileName}`);
    }, 100);
}

// ===================================
// Clear All Data
// ===================================
async function clearAllData() {
    if (!isAdmin()) {
        alert('⛔ Access Denied\n\nOnly Administrators can clear data.');
        return;
    }
    if (!confirm('Are you sure you want to delete ALL reports? This action cannot be undone!')) {
        return;
    }
    
    if (!confirm('This will permanently delete all data from the database. Are you absolutely sure?')) {
        return;
    }
    
    try {
        await deleteAllReportsFromDB();
        AppState.reports = [];
        AppState.reportCounter = 1;
        
        displayReports();
        displayManageReports();
        updateDashboard();
        updateAnalytics();
        updateHeaderStats();
        
        if (AppState.lguMap) {
            updateLGUMapMarkers();
        }
        
        alert('All data has been cleared successfully!');
    } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data. Please try again.');
    }
}

// ===================================
// Utility Functions
// ===================================
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// ===================================
// Export for Global Access
// ===================================
window.switchTab = switchTab;
window.displayReports = displayReports;
window.updateDashboard = updateDashboard;
window.updateAnalytics = updateAnalytics;
window.displayManageReports = displayManageReports;
window.updateReportStatus = updateReportStatus;
window.openNotificationSettings = openNotificationSettings;
window.closeNotificationSettings = closeNotificationSettings;
window.saveNotificationSettings = saveNotificationSettings;
window.openNotificationLog = openNotificationLog;
window.clearNotificationLog = clearNotificationLog;
window.viewReportDetails = viewReportDetails;
window.exportToExcel = exportToExcel;
window.exportAllReports = exportAllReports;
window.exportCategory = exportCategory;
window.closeExportMenu = closeExportMenu;
window.clearAllData = clearAllData;
window.printReport = printReport;
// Export authentication functions for global access
window.handleLogin = handleLogin;
window.logout = logout;

// ===================================
// Initialize Application
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    // Set up login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Initialize authentication
    initAuth();
});
window.handleRegister = handleRegister;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.displayUsersList = displayUsersList;

// Update initialization to include register form
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// ===================================
// PHOTO ALBUM
// ===================================
const AlbumState = {
    sort: 'day',   // 'day' | 'week' | 'month'
    photos: []     // flat array of { url, name, reportId, category, location, date }
};

const CATEGORY_ICONS = {
    'Waste Management':       '🗑️',
    'Infrastructure Damage':  '🏗️',
    'Environmental Violation':'🌿',
    'Public Safety':          '🚨',
    'Water & Sanitation':     '💧',
    'Street Lighting':        '💡',
    'Other':                  '📌'
};

const CATEGORY_COLORS = {
    'Waste Management':       { bg:'#fef3c7', border:'#f59e0b', text:'#92400e' },
    'Infrastructure Damage':  { bg:'#fee2e2', border:'#ef4444', text:'#991b1b' },
    'Environmental Violation':{ bg:'#d1fae5', border:'#10b981', text:'#065f46' },
    'Public Safety':          { bg:'#fce7f3', border:'#ec4899', text:'#9d174d' },
    'Water & Sanitation':     { bg:'#dbeafe', border:'#2563eb', text:'#1e3a8a' },
    'Street Lighting':        { bg:'#fef9c3', border:'#eab308', text:'#713f12' },
    'Other':                  { bg:'#f3f4f6', border:'#9ca3af', text:'#374151' }
};

function refreshAlbum() {
    AlbumState.photos = [];
    const reports = AppState.reports || [];
    reports.forEach(r => {
        if (r.photos && r.photos.length > 0) {
            r.photos.forEach(p => {
                if (p.url) {
                    AlbumState.photos.push({
                        url:      p.url,
                        name:     p.name || 'Photo',
                        reportId: r.id,
                        category: r.category || 'Other',
                        location: r.location || '',
                        date:     r.date instanceof Date ? r.date : new Date(r.date)
                    });
                }
            });
        }
    });

    // Update count badge
    const countEl = document.getElementById('albumPhotoCount');
    if (countEl) countEl.textContent = `${AlbumState.photos.length} photo${AlbumState.photos.length !== 1 ? 's' : ''}`;

    renderAlbum();
}

function setAlbumSort(sort) {
    AlbumState.sort = sort;
    // Update button styles
    ['day','week','month'].forEach(s => {
        const btn = document.getElementById(`albumSort${s.charAt(0).toUpperCase()+s.slice(1)}`);
        if (!btn) return;
        if (s === sort) {
            btn.style.background = '#8B1538';
            btn.style.color = 'white';
        } else {
            btn.style.background = 'white';
            btn.style.color = '#374151';
        }
    });
    renderAlbum();
}

function getAlbumGroupKey(date, sort) {
    if (!(date instanceof Date) || isNaN(date)) return 'Unknown Date';
    if (sort === 'day') {
        return date.toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    }
    if (sort === 'week') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        return `Week of ${mon.toLocaleDateString('en-PH', { month:'short', day:'numeric' })} – ${sun.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}`;
    }
    if (sort === 'month') {
        return date.toLocaleDateString('en-PH', { month:'long', year:'numeric' });
    }
    return '';
}

function renderAlbum() {
    const container = document.getElementById('albumContent');
    if (!container) return;

    const catFilter  = (document.getElementById('albumCategoryFilter')?.value || '').toLowerCase();
    const searchVal  = (document.getElementById('albumSearch')?.value || '').toLowerCase();

    let photos = AlbumState.photos.filter(p => {
        const matchCat  = !catFilter  || p.category.toLowerCase() === catFilter;
        const matchSearch = !searchVal || p.reportId.toLowerCase().includes(searchVal) || p.location.toLowerCase().includes(searchVal);
        return matchCat && matchSearch;
    });

    if (photos.length === 0) {
        container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:#9ca3af;">
            <div style="font-size:3em;margin-bottom:12px;">📭</div>
            <div style="font-weight:700;font-size:1.05em;color:#6b7280;margin-bottom:6px;">No Photos Found</div>
            <div style="font-size:0.88em;">No proof photos match your current filters.</div>
        </div>`;
        return;
    }

    // Sort photos newest first
    photos.sort((a, b) => b.date - a.date);

    // Group by time period
    const groups = {};
    photos.forEach(p => {
        const key = getAlbumGroupKey(p.date, AlbumState.sort);
        if (!groups[key]) groups[key] = {};
        const cat = p.category || 'Other';
        if (!groups[key][cat]) groups[key][cat] = [];
        groups[key][cat].push(p);
    });

    let html = '';
    Object.entries(groups).forEach(([period, cats]) => {
        const totalInPeriod = Object.values(cats).reduce((s, arr) => s + arr.length, 0);
        html += `
        <div style="margin-bottom:36px;">
            <!-- Period Header -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
                <div style="flex:1;height:2px;background:linear-gradient(to right,#8B1538,transparent);"></div>
                <div style="background:linear-gradient(135deg,#8B1538,#b91c4e);color:white;padding:6px 18px;border-radius:20px;font-size:0.83em;font-weight:800;white-space:nowrap;">
                    📅 ${period} <span style="opacity:0.75;font-weight:600;">(${totalInPeriod} photo${totalInPeriod!==1?'s':''})</span>
                </div>
                <div style="flex:1;height:2px;background:linear-gradient(to left,#8B1538,transparent);"></div>
            </div>`;

        // Within each period, group by category
        Object.entries(cats).forEach(([cat, catPhotos]) => {
            const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
            const icon   = CATEGORY_ICONS[cat] || '📌';
            html += `
            <div style="margin-bottom:22px;border:1.5px solid ${colors.border}33;border-radius:14px;overflow:hidden;">
                <!-- Category Header -->
                <div style="background:${colors.bg};padding:12px 18px;display:flex;align-items:center;gap:10px;border-bottom:1.5px solid ${colors.border}33;">
                    <span style="font-size:1.2em;">${icon}</span>
                    <span style="font-weight:800;color:${colors.text};font-size:0.93em;">${cat}</span>
                    <span style="background:${colors.border};color:white;padding:2px 10px;border-radius:12px;font-size:0.75em;font-weight:700;margin-left:auto;">${catPhotos.length} photo${catPhotos.length!==1?'s':''}</span>
                </div>

                <!-- Photo Grid -->
                <div style="padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;background:white;">
                    ${catPhotos.map(p => `
                    <div onclick="albumOpenLightbox('${p.url.replace(/'/g,"\\'")}')"
                        style="border-radius:10px;overflow:hidden;cursor:pointer;position:relative;aspect-ratio:1;background:#f3f4f6;border:2px solid #e5e7eb;transition:all 0.2s;"
                        onmouseover="this.style.transform='scale(1.03)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.15)';this.style.borderColor='${colors.border}'"
                        onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='#e5e7eb'">
                        <img src="${p.url}" alt="${p.name}"
                            style="width:100%;height:100%;object-fit:cover;display:block;"
                            onerror="this.parentElement.style.display='none'">
                        <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.75));padding:8px 8px 6px;color:white;">
                            <div style="font-size:10px;font-weight:700;font-family:monospace;letter-spacing:.3px;">${p.reportId}</div>
                            <div style="font-size:9px;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📍 ${p.location || '—'}</div>
                        </div>
                        <div style="position:absolute;top:7px;right:7px;background:rgba(0,0,0,0.5);border-radius:6px;padding:3px 6px;font-size:9px;color:white;font-weight:600;">🔍</div>
                    </div>`).join('')}
                </div>
            </div>`;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
}

// Album Lightbox
function albumOpenLightbox(url) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;';
    overlay.onclick = () => document.body.removeChild(overlay);
    overlay.innerHTML = `
    <div style="position:relative;max-width:90vw;max-height:90vh;">
        <img src="${url}" style="max-width:100%;max-height:90vh;border-radius:12px;object-fit:contain;box-shadow:0 24px 80px rgba(0,0,0,0.6);">
        <button onclick="event.stopPropagation();document.body.removeChild(this.closest('[style*=fixed]'))"
            style="position:absolute;top:-14px;right:-14px;width:36px;height:36px;background:#ef4444;color:white;border:none;border-radius:50%;font-size:1.1em;cursor:pointer;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);">✕</button>
        <a href="${url}" download target="_blank"
            style="position:absolute;bottom:-14px;right:-14px;width:36px;height:36px;background:#10b981;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:1em;box-shadow:0 4px 12px rgba(0,0,0,0.4);"
            onclick="event.stopPropagation()" title="Download photo">⬇️</a>
    </div>`;
    document.body.appendChild(overlay);
}

window.refreshAlbum  = refreshAlbum;
window.setAlbumSort  = setAlbumSort;
window.renderAlbum   = renderAlbum;
window.albumOpenLightbox = albumOpenLightbox;
