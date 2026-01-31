import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Configuration for Timers (Minutes)
const TIMER_CONFIGS = {
    bath: { label: "Bath", limit: 30 },
    food: { label: "Food", limit: 15 },
    washroom: { label: "Washroom", limit: 15 },
    sleep: { label: "Sleep", limit: 420 }, // 7 hours
    buffer: { label: "Buffer Off", limit: 20 },
    fun: { label: "Weekly Fun", limit: 0 } // Admin defined
};

const isAdmin = window.location.search.includes('admin=true');
if (isAdmin) document.body.classList.replace('user-view', 'admin-mode');

// --- Initialization ---
function init() {
    const grid = document.getElementById('timer-grid');
    Object.keys(TIMER_CONFIGS).forEach(key => {
        grid.innerHTML += `
            <div class="block" id="block-${key}">
                <h3>${TIMER_CONFIGS[key].label}</h3>
                <div class="timer-circle" id="circle-${key}">
                    <span class="time-display" id="disp-${key}">00:00</span>
                </div>
                <div class="admin-controls">
                    <button onclick="toggleTimer('${key}')">Start/Stop</button>
                    <div class="input-group">
                        <input type="number" id="input-${key}" placeholder="Mins">
                        <button onclick="adjustTime('${key}')">Add</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- Live Sync ---
onValue(stateRef, (snapshot) => {
    const data = snapshot.val() || {};
    updateUI(data);
});

function updateUI(data) {
    let totalBank = 210; // Total Break Time Daily (Minutes)
    
    Object.keys(TIMER_CONFIGS).forEach(key => {
        const timeUsed = data[key]?.elapsed || 0;
        const limit = (key === 'fun') ? (data.funLimit || 0) : TIMER_CONFIGS[key].limit;
        
        // Update display
        document.getElementById(`disp-${key}`).innerText = formatTime(timeUsed);
        
        // Handle Bank Deduction
        if (timeUsed > limit) {
            totalBank -= (timeUsed - limit);
        }

        // Visual Active State
        const circle = document.getElementById(`circle-${key}`);
        data[key]?.running ? circle.classList.add('running') : circle.classList.remove('running');
    });

    // Process Coupons
    if(data.coupons) {
        const couponArea = document.getElementById('coupon-display-area');
        couponArea.innerHTML = '';
        Object.keys(data.coupons).forEach(id => {
            const c = data.coupons[id];
            couponArea.innerHTML += `
                <div class="coupon-item">
                    <span>${c.name} (${c.val}m)</span>
                    <button onclick="redeemCoupon('${id}', ${c.val})">Redeem</button>
                </div>
            `;
        });
    }

    document.getElementById('bank-timer').innerText = Math.max(0, totalBank).toFixed(1);
}

// --- Global Functions (Attached to window for HTML access) ---
window.toggleTimer = (key) => {
    onValue(stateRef, (snap) => {
        const current = snap.val()?.[key] || { elapsed: 0, running: false };
        update(ref(db, `discipline/os_v6/${key}`), { running: !current.running });
    }, { onlyOnce: true });
};

window.adjustTime = (key) => {
    const val = parseInt(document.getElementById(`input-${key}`).value) || 0;
    onValue(ref(db, `discipline/os_v6/${key}/elapsed`), (snap) => {
        const current = snap.val() || 0;
        set(ref(db, `discipline/os_v6/${key}/elapsed`), current + val);
    }, { onlyOnce: true });
};

window.redeemCoupon = (id, val) => {
    // Adding coupon value back to the daily bank (or reducing elapsed time)
    // Here we reduce the bath elapsed time as an example, or you can create a 'bonus' field
    set(ref(db, `discipline/os_v6/coupons/${id}`), null); // Delete used coupon
    // Implementation of bank adjustment goes here
};

function formatTime(totalMinutes) {
    const mins = Math.floor(totalMinutes);
    const secs = Math.floor((totalMinutes % 1) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Ticker to increment running timers locally then sync
setInterval(() => {
    if (!isAdmin) return; // Only Admin "drives" the clock
    // Logic to push increments to Firebase every 10 seconds to save bandwidth
}, 10000);

init();
