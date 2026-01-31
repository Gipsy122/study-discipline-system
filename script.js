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

const isAdmin = window.location.search.includes('admin=true');
if (isAdmin) document.body.classList.replace('user-view', 'admin-mode');

// --- FORMATTER ---
const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${sc < 10 ? '0' : ''}${sc}`;
};

// --- DATA SYNC ---
onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Update Global Pool
    document.getElementById('main-pool-clock').innerText = fmt(data.poolSecs);
    document.getElementById('buffer-val').innerText = data.buffer;

    // Update Categories
    Object.keys(data.timers).forEach(key => {
        const t = data.timers[key];
        const clock = document.getElementById(`clock-${key}`);
        const ring = document.getElementById(`ring-${key}`);
        const tile = document.getElementById(`tile-${key}`);

        let elapsed = t.elapsed;
        if (t.running) {
            elapsed += Math.floor((Date.now() / 1000) - t.lastStart);
        }

        clock.innerText = fmt(elapsed);
        
        // Ring offset (283 = circumference)
        const limitSecs = t.limit * 60;
        const offset = Math.max(0, 283 - (elapsed / limitSecs) * 283);
        ring.style.strokeDashoffset = offset;

        // Violation Logic
        if (elapsed > limitSecs) {
            tile.classList.add('violation');
            if (isAdmin && t.running) triggerDrain(1);
        } else {
            tile.classList.remove('violation');
        }
    });
});

// --- ADMIN COMMANDS ---
window.ctrlTimer = (key, limitMins) => {
    onValue(stateRef, (snapshot) => {
        const data = snapshot.val();
        const t = data.timers[key];
        const now = Math.floor(Date.now() / 1000);

        if (t.running) {
            t.elapsed += (now - t.lastStart);
            t.running = false;
        } else {
            t.lastStart = now;
            t.running = true;
        }
        update(ref(db, `discipline/os_v6/timers/${key}`), t);
    }, { onlyOnce: true });
};

window.manualForward = (key, mins) => {
    const addSecs = parseInt(mins) * 60;
    onValue(stateRef, (s) => {
        const t = s.val().timers[key];
        t.elapsed += addSecs;
        update(ref(db, `discipline/os_v6/timers/${key}`), t);
    }, { onlyOnce: true });
};

function triggerDrain(s) {
    onValue(stateRef, (snap) => {
        const currentPool = snap.val().poolSecs;
        update(ref(db, 'discipline/os_v6'), { poolSecs: currentPool - s });
    }, { onlyOnce: true });
}

window.hardReset = () => {
    if (!isAdmin) return;
    set(stateRef, {
        poolSecs: 12600, // 3.5 Hours
        buffer: 20,
        timers: {
            bath: { elapsed: 0, running: false, limit: 30 },
            food: { elapsed: 0, running: false, limit: 15 },
            wash: { elapsed: 0, running: false, limit: 15 },
            sleep: { elapsed: 0, running: false, limit: 420 }
        }
    });
};
