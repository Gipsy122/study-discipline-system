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
const statsRef = ref(db, 'discipline/stats');
const activeRef = ref(db, 'discipline/active');
const isAdmin = window.location.search.includes('admin=true');

let runningTimers = {};

// --- REALTIME LISTENER ---
onValue(statsRef, (snap) => {
    const d = snap.val() || { pool: 210, buffer: 20 };
    document.getElementById('pool-display').innerText = formatHMS(d.pool * 60);
    document.getElementById('buffer-display').innerText = formatHMS(d.buffer * 60);
});

// --- TIMER LOGIC ---
window.toggleTimer = (id, limit) => {
    if (runningTimers[id]) {
        clearInterval(runningTimers[id]);
        delete runningTimers[id];
        return;
    }
    
    let elapsedSecs = 0;
    runningTimers[id] = setInterval(() => {
        elapsedSecs++;
        const elapsedMins = elapsedSecs / 60;
        
        // Update UI
        updateUI(id, elapsedSecs, limit);

        // Auto Deduction
        if (elapsedMins > limit && isAdmin) {
            updatePool(-1/60); // 1 sec off pool
        }
    }, 1000);
};

window.forwardTime = (id, limit) => {
    const val = parseInt(document.getElementById(`adj-${id}`).value);
    if (!val) return;
    
    if (val > limit) {
        updatePool(-(val - limit));
    }
    alert(`${id} forward by ${val}m`);
};

function updateUI(id, currentSecs, limit) {
    const el = document.getElementById(`time-${id}`);
    const ring = document.getElementById(`ring-${id}`);
    const block = document.getElementById(`block-${id}`);
    
    el.innerText = formatHMS(currentSecs);
    
    // Ring logic
    const prog = Math.min((currentSecs / (limit * 60)) * 283, 283);
    ring.style.strokeDashoffset = 283 - prog;

    if (currentSecs > (limit * 60)) {
        block.classList.add('violation');
    }
}

function updatePool(amt) {
    onValue(statsRef, (s) => {
        const d = s.val();
        update(statsRef, { pool: d.pool + amt });
    }, { onlyOnce: true });
}

function formatHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

if (!isAdmin) {
    document.querySelectorAll('.admin-ui').forEach(e => e.style.display = 'none');
}
