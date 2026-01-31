import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBteFv0YOR7x9YGhcphPr80F01PpLjVKc",
    authDomain: "study-tracker-29.firebaseapp.com",
    databaseURL: "https://study-tracker-29-default-rtdb.firebaseio.com",
    projectId: "study-tracker-29",
    storageBucket: "study-tracker-29.firebasestorage.app",
    messagingSenderId: "183715810841",
    appId: "1:183715810841:web:b037baebaad795de976488"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const statsRef = ref(db, 'discipline/stats');
const timerRef = ref(db, 'discipline/activeTimer');
const couponRef = ref(db, 'discipline/inventory');

const isAdmin = window.location.search.includes('admin=true');

// 3. System Initialization (The "Initialize" Button)
window.systemBoot = () => {
    set(statsRef, { 
        breakPool: 210, 
        buffer: 20, 
        sleepLimit: 7 
    });
    set(timerRef, { 
        running: false, 
        name: "Idle",
        startTime: 0,
        limit: 0,
        isStrict: false
    });
    alert("System Online: Data Initialized.");
};

// 4. Sync Statistics (Break Pool, Buffer, Sleep)
onValue(statsRef, (snapshot) => {
    const d = snapshot.val();
    if (d) {
        document.getElementById('pool').innerText = d.breakPool + "m";
        document.getElementById('buffer').innerText = d.buffer + "m";
        document.getElementById('sleep-val').innerText = d.sleepLimit + "h";
        
        // Hide boot screen once data is found
        const bootScreen = document.getElementById('boot-screen');
        const appContent = document.getElementById('app-content');
        if (bootScreen) bootScreen.style.display = 'none';
        if (appContent) appContent.style.display = 'block';
        
        // Show Admin Panel if URL matches
        const adminPanel = document.getElementById('admin-panel');
        if (isAdmin && adminPanel) adminPanel.style.display = 'block';
    }
});

// 5. Live Stopwatch Logic
let ticker;
onValue(timerRef, (snapshot) => {
    const t = snapshot.val();
    const box = document.getElementById('timer-box');
    const clock = document.getElementById('timer-clock');
    const nameDisplay = document.getElementById('timer-name');
    
    clearInterval(ticker);
    
    if (t && t.running) {
        box.style.display = 'block';
        nameDisplay.innerText = "LIVE: " + t.name;
        
        ticker = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((now - t.startTime) / 1000);
            const mins = Math.floor(diff / 60);
            const secs = String(diff % 60).padStart(2, '0');
            clock.innerText = `${mins}:${secs}`;
        }, 1000);
    } else {
        box.style.display = 'none';
    }
});

// 6. Action Functions (Attached to Window)
window.startTimer = (name, limit, isStrict) => {
    set(timerRef, { 
        name: name, 
        limit: limit, 
        isStrict: isStrict, 
        startTime: Date.now(), 
        running: true 
    });
};

window.stopTimer = () => {
    onValue(timerRef, (s) => {
        const t = s.val();
        if (t && t.running) {
            const elapsed = Math.round((Date.now() - t.startTime) / 60000);
            applyLogic(t.name, elapsed, t.limit, t.isStrict);
            set(timerRef, { running: false, name: "Idle" });
        }
    }, { onlyOnce: true });
};

window.manualInput = (name, limit, isStrict) => {
    const used = prompt(`Enter total minutes spent on ${name}:`);
    if (used && !isNaN(used)) {
        applyLogic(name, parseInt(used), limit, isStrict);
    }
};

// 7. Deduction Logic Engine
function applyLogic(name, used, limit, isStrict) {
    const overtime = used - limit;
    
    if (overtime > 0) {
        onValue(statsRef, (s) => {
            let d = s.val();
            if (isStrict) {
                // Strict categories (Sleep) hit the pool directly
                d.breakPool -= overtime;
            } else {
                // Regular categories (Bath/Food) hit buffer first
                if (d.buffer >= overtime) {
                    d.buffer -= overtime;
                } else {
                    const remainingPenalty = overtime - d.buffer;
                    d.buffer = 0;
                    d.breakPool -= remainingPenalty;
                }
            }
            update(statsRef, d);
        }, { onlyOnce: true });
    }
}

// 8. Rewards System
window.grantCoupon = (name, type, val, desc) => {
    push(couponRef, { 
        name: name, 
        type: type, 
        value: val, 
        desc: desc, 
        used: false 
    });
    alert("Reward sent to student.");
};
