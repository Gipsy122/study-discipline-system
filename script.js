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
const statsRef = ref(db, 'discipline/stats');
const timerRef = ref(db, 'discipline/activeTimer');

const isAdmin = window.location.search.includes('admin=true');
let localDeductionTracker = 0; 

// --- DATABASE SYNC ---
onValue(statsRef, (snapshot) => {
    const d = snapshot.val() || { breakPool: 210, buffer: 20, sleepLimit: 7 };
    document.getElementById('pool-val').innerText = d.breakPool;
    document.getElementById('buffer-val').innerText = d.buffer;
    document.getElementById('sleep-val').innerText = d.sleepLimit + "h";
    
    // Update Ring Progress (Visual)
    const percent = (d.breakPool / 210) * 100;
    document.querySelector('.progress-ring').style.setProperty('--percent', percent);
});

let ticker;
onValue(timerRef, (snapshot) => {
    const t = snapshot.val();
    const timerCard = document.getElementById('live-timer-card');
    clearInterval(ticker);

    if (t && t.running) {
        timerCard.classList.add('active');
        document.getElementById('current-task').innerText = t.name;
        
        ticker = setInterval(() => {
            const elapsedMs = Date.now() - t.startTime;
            const elapsedMins = Math.floor(elapsedMs / 60000);
            const secs = Math.floor((elapsedMs % 60000) / 1000);
            
            document.getElementById('timer-display').innerText = `${elapsedMins}:${secs < 10 ? '0' : ''}${secs}`;

            // VIOLATION LOGIC: Threshold is t.limit
            if (elapsedMins >= t.limit) {
                timerCard.classList.add('violation');
                document.getElementById('warning-msg').innerText = "⚠️ SYSTEM OVERLOAD: DRAINING POOL";
                
                // Admin handles the actual database deduction
                if (isAdmin && elapsedMins > localDeductionTracker) {
                    localDeductionTracker = elapsedMins;
                    deductFromPool(1);
                }
            } else {
                timerCard.classList.remove('violation');
                document.getElementById('warning-msg').innerText = "STABILITY: NORMAL";
            }
        }, 1000);
    } else {
        timerCard.classList.remove('active');
        localDeductionTracker = 0;
    }
});

// --- CORE ACTIONS ---
async function deductFromPool(amount) {
    onValue(statsRef, (s) => {
        const current = s.val().breakPool;
        update(statsRef, { breakPool: current - amount });
    }, { onlyOnce: true });
}

if (isAdmin) {
    document.getElementById('admin-controls').style.display = 'grid';

    window.startDiscipline = (task, limit) => {
        localDeductionTracker = limit; // Start tracking deductions AFTER the limit
        set(timerRef, {
            name: task,
            limit: limit,
            startTime: Date.now(),
            running: true
        });
    };

    window.stopDiscipline = () => {
        set(timerRef, { running: false });
    };

    window.quickPenalty = (amt) => deductFromPool(amt);
}
