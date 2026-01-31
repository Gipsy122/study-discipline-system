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
const couponRef = ref(db, 'discipline/inventory');

const isAdmin = window.location.search.includes('admin=true');

// --- INITIALIZE ---
window.systemBoot = () => {
    set(statsRef, { breakPool: 210, buffer: 20, sleepLimit: 7 });
    set(timerRef, { running: false, name: "Idle" });
    alert("System Online.");
};

// --- DATA SYNC ---
onValue(statsRef, (snapshot) => {
    const d = snapshot.val();
    if (d) {
        document.getElementById('pool').innerText = d.breakPool + "m";
        document.getElementById('buffer').innerText = d.buffer + "m";
        document.getElementById('sleep-val').innerText = d.sleepLimit + "h";
        document.getElementById('boot-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        if(isAdmin) document.getElementById('admin-panel').style.display = 'block';
    }
});

// --- TIMER LOGIC ---
let ticker;
onValue(timerRef, (snapshot) => {
    const t = snapshot.val();
    const box = document.getElementById('timer-box');
    clearInterval(ticker);
    if (t && t.running) {
        box.style.display = 'block';
        document.getElementById('timer-name').innerText = t.name;
        ticker = setInterval(() => {
            const diff = Math.floor((Date.now() - t.startTime) / 1000);
            document.getElementById('timer-clock').innerText = 
                Math.floor(diff/60) + ":" + String(diff%60).padStart(2,'0');
        }, 1000);
    } else { box.style.display = 'none'; }
});

// --- ACTIONS ---
window.startTimer = (name, limit, isStrict) => {
    set(timerRef, { name, limit, isStrict, startTime: Date.now(), running: true });
};

window.stopTimer = () => {
    onValue(timerRef, (s) => {
        const t = s.val();
        if(t && t.running) {
            const elapsed = Math.round((Date.now() - t.startTime) / 60000);
            const overtime = elapsed - t.limit;
            if(overtime > 0) {
                onValue(statsRef, (ss) => {
                    let d = ss.val();
                    if(t.isStrict) d.breakPool -= overtime;
                    else {
                        if(d.buffer >= overtime) d.buffer -= overtime;
                        else { d.breakPool -= (overtime - d.buffer); d.buffer = 0; }
                    }
                    update(statsRef, d);
                }, {onlyOnce: true});
            }
            set(timerRef, { running: false, name: "Idle" });
        }
    }, {onlyOnce: true});
};

// --- COUPON SYSTEM ---
window.grantCoupon = (name, type, val, desc) => {
    push(couponRef, { name, type, value: val, desc, used: false });
};

onValue(couponRef, (snapshot) => {
    const list = document.getElementById('coupon-list');
    list.innerHTML = "";
    const data = snapshot.val();
    for(let id in data) {
        if(!data[id].used) {
            let div = document.createElement('div');
            div.className = "coupon-card";
            div.innerHTML = `🎟️ <b>${data[id].name}</b><br><small>${data[id].desc}</small>`;
            if(!isAdmin) div.onclick = () => redeem(id, data[id]);
            list.appendChild(div);
        }
    }
});

window.redeem = (id, coupon) => {
    onValue(statsRef, (s) => {
        let d = s.val();
        if (coupon.type === 'sleep') d.sleepLimit = coupon.value;
        if (coupon.type === 'break') d.breakPool += coupon.value;
        update(statsRef, d);
        update(ref(db, `discipline/inventory/${id}`), { used: true });
        alert("Reward Activated!");
    }, {onlyOnce: true});
};
