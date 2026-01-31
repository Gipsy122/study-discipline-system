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
const stateRef = ref(db, 'discipline/v5_state');

const isAdmin = window.location.search.includes('admin=true');
if(isAdmin) document.body.classList.add('admin-mode');

// --- DATABASE SYNC ---
onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Update Main Pool
    const poolSecs = data.mainPoolSecs || 12600;
    document.getElementById('main-pool-display').innerText = formatTime(poolSecs);

    // Update Category Timers
    ['bath', 'food', 'sleep'].forEach(cat => {
        const timer = data.timers[cat];
        const display = document.getElementById(`time-${cat}`);
        const ring = document.getElementById(`ring-${cat}`);
        const tile = document.getElementById(`tile-${cat}`);

        let currentSecs = timer.elapsed;
        if(timer.running) {
            const now = Math.floor(Date.now() / 1000);
            currentSecs += (now - timer.lastStarted);
        }

        display.innerText = formatTime(currentSecs);
        
        // Progress Ring (283 is full circle)
        const limitSecs = timer.limit * 60;
        const offset = Math.max(0, 283 - (currentSecs / limitSecs) * 283);
        ring.style.strokeDashoffset = offset;

        // Violation Logic
        if (currentSecs > limitSecs) {
            tile.classList.add('violation');
            if(isAdmin && timer.running) processDrain(1); // Drain 1s per tick
        } else {
            tile.classList.remove('violation');
        }
    });
});

// --- ACTIONS ---
window.toggleTimer = (cat, limitMins) => {
    onValue(stateRef, (s) => {
        const data = s.val();
        const t = data.timers[cat];
        const now = Math.floor(Date.now() / 1000);

        if(t.running) {
            t.elapsed += (now - t.lastStarted);
            t.running = false;
        } else {
            t.lastStarted = now;
            t.running = true;
        }
        update(ref(db, 'discipline/v5_state/timers/' + cat), t);
    }, {onlyOnce: true});
};

window.forwardTime = (cat, limitMins, addMins) => {
    const addSecs = parseInt(addMins) * 60;
    onValue(stateRef, (s) => {
        const t = s.val().timers[cat];
        t.elapsed += addSecs;
        update(ref(db, 'discipline/v5_state/timers/' + cat), t);
    }, {onlyOnce: true});
};

function processDrain(sec) {
    onValue(stateRef, (s) => {
        const current = s.val().mainPoolSecs;
        update(ref(db, 'discipline/v5_state'), { mainPoolSecs: current - sec });
    }, {onlyOnce: true});
}

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

window.resetSystem = () => {
    set(stateRef, {
        mainPoolSecs: 12600,
        timers: {
            bath: { elapsed: 0, running: false, limit: 30 },
            food: { elapsed: 0, running: false, limit: 15 },
            sleep: { elapsed: 0, running: false, limit: 420 }
        }
    });
};
