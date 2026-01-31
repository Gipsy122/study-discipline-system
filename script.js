import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { /* USE YOUR PREVIOUS CONFIG HERE */ };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const statsRef = ref(db, 'discipline/stats');
const activeRef = ref(db, 'discipline/active');
const isAdmin = window.location.search.includes('admin=true');

let timers = {};

// --- REALTIME SYNC ---
onValue(statsRef, (snap) => {
    const d = snap.val() || { pool: 210, buffer: 20 };
    document.getElementById('main-pool').innerText = formatTime(d.pool);
    document.getElementById('buffer-val').innerText = formatTime(d.buffer);
});

// --- CORE LOGIC ---
window.toggleTimer = (id, limit) => {
    if (timers[id]) {
        clearInterval(timers[id].interval);
        delete timers[id];
        update(activeRef, { [id]: null });
    } else {
        timers[id] = { start: Date.now(), limit: limit, elapsed: 0 };
        timers[id].interval = setInterval(() => processTick(id, limit), 1000);
        update(activeRef, { [id]: { running: true, start: Date.now() } });
    }
};

window.manualAdjust = (id, val, limit) => {
    const mins = parseInt(val);
    if (!mins) return;
    
    // If input + current > limit, deduct from pool
    if (mins > limit) {
        const overflow = mins - limit;
        deductFromPool(overflow);
    }
    alert(`Adjusted ${id} by ${mins}m`);
};

function processTick(id, limit) {
    timers[id].elapsed++;
    const currentMins = timers[id].elapsed / 60;
    
    // LIVE DEDUCTION
    if (currentMins > limit) {
        deductFromPool(1/60); // Deduct 1 second's worth of minutes
    }
    
    // Update UI
    const block = document.getElementById(`block-${id}`);
    block.querySelector('.time-readout').innerText = formatTime(currentMins);
}

function deductFromPool(amt) {
    onValue(statsRef, (s) => {
        let d = s.val();
        d.pool -= amt;
        update(statsRef, d);
    }, {onlyOnce: true});
}

function formatTime(mins) {
    const m = Math.floor(mins);
    const s = Math.floor((mins % 1) * 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// --- INITIALIZE ADMIN ---
if (!isAdmin) {
    document.querySelectorAll('.admin-controls').forEach(el => el.style.display = 'none');
}
