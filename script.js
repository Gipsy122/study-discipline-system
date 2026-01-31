import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBteFv0YOR7x9YGhcphPr80F01PpLjVKc",
    authDomain: "study-tracker-29.firebaseapp.com",
    databaseURL: "https://study-tracker-29-default-rtdb.firebaseio.com",
    projectId: "study-tracker-29",
    storageBucket: "study-tracker-29.firebasestorage.app",
    messagingSenderId: "183715810841",
    appId: "1:183715810841:web:b037baebaad795de976488"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const stateRef = ref(db, 'discipline/os_v6');

// Toggle Admin View
const isAdmin = window.location.search.includes('admin=true');
if (isAdmin) document.body.classList.replace('user-view', 'admin-mode');

// Configuration
const TIMER_DEFAULTS = {
    bath: 30, food: 15, washroom: 15, sleep: 420, buffer: 20
};

// Listen to Firebase State
onValue(stateRef, (snapshot) => {
    const data = snapshot.val() || {};
    renderDashboard(data);
    updateGlobalBreak(data.totalBreak || 210);
});

function renderDashboard(data) {
    const container = document.getElementById('dashboard');
    container.innerHTML = '';

    Object.keys(TIMER_DEFAULTS).forEach(key => {
        const block = document.createElement('div');
        block.className = `timer-block ${data[key]?.overtime ? 'overtime' : ''}`;
        
        block.innerHTML = `
            <h3>${key.toUpperCase()}</h3>
            <div class="timer-circle">${data[key]?.remaining || TIMER_DEFAULTS[key]}:00</div>
            <div class="admin-only">
                <input type="number" placeholder="Add mins" id="input-${key}">
                <button onclick="adjustTime('${key}')">Update</button>
                <button onclick="toggleTimer('${key}')">${data[key]?.active ? 'Stop' : 'Start'}</button>
            </div>
        `;
        container.appendChild(block);
    });
}

// Logical Functions (Exposed to Window for HTML access)
window.adjustTime = (key) => {
    const val = document.getElementById(`input-${key}`).value;
    // Logic: update Firebase with new value
    update(ref(db, `discipline/os_v6/${key}`), { remaining: parseInt(val) });
};

window.toggleTimer = (key) => {
    // Logic: Set active state in Firebase
    // A background process (Cloud Function or local Interval) would usually decrement these.
};

// Coupon Logic
document.getElementById('issue-coupon')?.addEventListener('click', () => {
    const code = document.getElementById('coupon-code').value;
    const value = document.getElementById('coupon-value').value;
    push(ref(db, 'discipline/coupons'), { code, value, active: true });
});
