import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Your verified config
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
const timerRef = ref(db, 'discipline/activeTimer');

const isAdmin = window.location.search.includes('admin=true');

// Attach functions to window so HTML buttons can see them
window.systemBoot = () => {
    set(statsRef, { breakPool: 210, buffer: 20, sleepLimit: 7 });
    set(timerRef, { running: false, name: "Idle", startTime: 0, limit: 0, isStrict: false });
};

// Sync Data from Firebase
onValue(statsRef, (snapshot) => {
    const d = snapshot.val();
    if (d) {
        document.getElementById('pool').innerText = d.breakPool + "m";
        document.getElementById('buffer').innerText = d.buffer + "m";
        document.getElementById('sleep-val').innerText = d.sleepLimit + "h";
        document.getElementById('boot-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        if(isAdmin) document.getElementById('admin-panel').style.display = 'flex';
    }
});

// Timer Ticker Logic
let ticker;
onValue(timerRef, (snapshot) => {
    const t = snapshot.val();
    const clock = document.getElementById('timer-clock');
    const nameDisplay = document.getElementById('timer-name');
    clearInterval(ticker);
    if (t && t.running) {
        nameDisplay.innerText = "LIVE: " + t.name;
        ticker = setInterval(() => {
            const diff = Math.floor((Date.now() - t.startTime) / 1000);
            const mins = Math.floor(diff / 60);
            const secs = String(diff % 60).padStart(2, '0');
            clock.innerText = `${mins}:${secs}`;
        }, 1000);
    } else {
        nameDisplay.innerText = "SYSTEM IDLE";
        clock.innerText = "00:00";
    }
});

window.startTimer = (name, limit, isStrict) => {
    set(timerRef, { name, limit, isStrict, startTime: Date.now(), running: true });
};

window.stopTimer = () => {
    onValue(timerRef, (s) => {
        const t = s.val();
        if(t && t.running) {
            const elapsed = Math.round((Date.now() - t.startTime) / 60000);
            applyLogic(t.name, elapsed, t.limit, t.isStrict);
            set(timerRef, { running: false, name: "Idle" });
        }
    }, {onlyOnce: true});
};

window.manualInput = (name, limit, isStrict) => {
    const used = prompt(`Total minutes spent on ${name}:`);
    if(used && !isNaN(used)) applyLogic(name, parseInt(used), limit, isStrict);
};

function applyLogic(name, used, limit, isStrict) {
    const overtime = used - limit;
    if(overtime > 0) {
        onValue(statsRef, (s) => {
            let d = s.val();
            if(isStrict) {
                d.breakPool -= overtime;
            } else {
                if(d.buffer >= overtime) d.buffer -= overtime;
                else {
                    d.breakPool -= (overtime - d.buffer);
                    d.buffer = 0;
                }
            }
            update(statsRef, d);
        }, {onlyOnce: true});
    }
}
