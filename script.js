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
const timerRef = ref(db, 'discipline/activeTimer');

const isAdmin = window.location.search.includes('admin=true');
let lastProcessedMinute = 0; // Tracks minutes already deducted

// --- SYNC DATA ---
onValue(statsRef, (snapshot) => {
    const d = snapshot.val() || { breakPool: 210, buffer: 20, sleepLimit: 7 };
    document.getElementById('pool').innerText = d.breakPool + "m";
    document.getElementById('buffer').innerText = d.buffer + "m";
    document.getElementById('sleep-val').innerText = d.sleepLimit + "h";
    if(isAdmin) document.getElementById('admin-panel').style.display = 'block';
});

let ticker;
onValue(timerRef, (snapshot) => {
    const t = snapshot.val();
    const box = document.getElementById('active-timer-box');
    const clock = document.getElementById('timer-clock');
    const nameLabel = document.getElementById('timer-name');
    
    clearInterval(ticker);
    if (t && t.running) {
        box.style.display = 'block';
        ticker = setInterval(() => {
            const now = Date.now();
            const diffMs = now - t.startTime;
            const diffMins = Math.floor(diffMs / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);

            clock.innerText = `${diffMins}:${diffSecs < 10 ? '0' : ''}${diffSecs}`;

            // LOGIC: Over threshold check
            if (diffMins >= t.limit) {
                clock.style.color = "var(--red)";
                nameLabel.innerText = "⚠️ VIOLATION: DRAINING POOL";
                nameLabel.style.color = "var(--red)";
                
                // AUTO-DRAIN LOGIC (Admin only handles the database write to avoid conflicts)
                if (isAdmin && diffMins > lastProcessedMinute) {
                    lastProcessedMinute = diffMins;
                    drainPool(1, t.name);
                }
            } else {
                clock.style.color = "black";
                nameLabel.innerText = t.name + " ACTIVE";
                nameLabel.style.color = "#666";
            }
        }, 1000);
    } else { 
        box.style.display = 'none'; 
        lastProcessedMinute = 0;
    }
});

function drainPool(amount, reason) {
    onValue(statsRef, (s) => {
        let d = s.val();
        d.breakPool -= amount;
        update(statsRef, d);
    }, {onlyOnce: true});
}

// --- ADMIN CONTROLS ---
if(isAdmin) {
    document.getElementById('boot-btn').onclick = () => {
        set(statsRef, { breakPool: 210, buffer: 20, sleepLimit: 7 });
        set(timerRef, { running: false });
    };

    document.querySelectorAll('.btn-start').forEach(btn => {
        btn.onclick = () => {
            lastProcessedMinute = parseInt(btn.dataset.limit) - 1; 
            set(timerRef, { 
                name: btn.dataset.task, 
                limit: parseInt(btn.dataset.limit), 
                startTime: Date.now(), 
                running: true 
            });
        };
    });

    document.getElementById('stop-btn').onclick = () => {
        set(timerRef, { running: false });
    };

    // WRONG ANSWER BUTTON LOGIC
    window.deductWrongAnswer = () => {
        drainPool(2, "Wrong Answer");
        alert("-2 Minutes Deducted");
    };
}
