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
    clearInterval(ticker);
    if (t && t.running) {
        box.style.display = 'block';
        document.getElementById('timer-name').innerText = t.name;
        ticker = setInterval(() => {
            const diff = Math.floor((Date.now() - t.startTime) / 60000);
            const seconds = Math.floor(((Date.now() - t.startTime) % 60000) / 1000);
            document.getElementById('timer-clock').innerText = `${diff}:${seconds < 10 ? '0' : ''}${seconds}`;
            if(diff >= t.limit) document.getElementById('timer-clock').style.color = "#ff3e3e";
        }, 1000);
    } else { box.style.display = 'none'; }
});

onValue(couponRef, (snapshot) => {
    const list = document.getElementById('coupon-list');
    list.innerHTML = "";
    const data = snapshot.val();
    for(let id in data) {
        if(!data[id].used) {
            let div = document.createElement('div');
            div.className = "coupon-card";
            div.innerHTML = `🎟️ <b>${data[id].name}</b><br><small>${data[id].desc}</small>`;
            if(!isAdmin) div.onclick = () => redeemCoupon(id, data[id]);
            list.appendChild(div);
        }
    }
});

// --- CORE FUNCTIONS ---
function applyMath(name, used, limit, isStrict) {
    const over = used - limit;
    if(over > 0) {
        onValue(statsRef, (s) => {
            let d = s.val();
            if(isStrict === "true") d.breakPool -= over;
            else {
                if(d.buffer >= over) d.buffer -= over;
                else { d.breakPool -= (over - d.buffer); d.buffer = 0; }
            }
            update(statsRef, d);
        }, {onlyOnce: true});
    }
}

function redeemCoupon(id, c) {
    onValue(statsRef, (s) => {
        let d = s.val();
        if(c.type === 'sleep') d.sleepLimit = c.value;
        if(c.type === 'break') d.breakPool += c.value;
        update(statsRef, d);
        update(ref(db, `discipline/inventory/${id}`), { used: true });
    }, {onlyOnce: true});
}

// --- EVENT LISTENERS (Admin Only) ---
if(isAdmin) {
    document.getElementById('boot-btn').onclick = () => {
        set(statsRef, { breakPool: 210, buffer: 20, sleepLimit: 7 });
        set(timerRef, { running: false });
        alert("Booted.");
    };

    document.querySelectorAll('.btn-start').forEach(btn => {
        btn.onclick = () => {
            set(timerRef, { 
                name: btn.dataset.task, 
                limit: parseInt(btn.dataset.limit), 
                isStrict: btn.dataset.strict, 
                startTime: Date.now(), 
                running: true 
            });
        };
    });

    document.querySelectorAll('.btn-input').forEach(btn => {
        btn.onclick = () => {
            let used = prompt(`Minutes for ${btn.dataset.task}?`);
            if(used) applyMath(btn.dataset.task, parseInt(used), parseInt(btn.dataset.limit), btn.dataset.strict);
        };
    });

    document.getElementById('stop-btn').onclick = () => {
        onValue(timerRef, (s) => {
            const t = s.val();
            if(t.running) {
                const elapsed = Math.round((Date.now() - t.startTime) / 60000);
                applyMath(t.name, elapsed, t.limit, t.isStrict);
                set(timerRef, { running: false });
            }
        }, {onlyOnce: true});
    };

    document.getElementById('grant-sleep').onclick = () => {
        push(couponRef, { name: 'Sleep Pass', type: 'sleep', value: 8, desc: '+1h Sleep Extension', used: false });
    };
    
    document.getElementById('grant-break').onclick = () => {
        push(couponRef, { name: 'Extra Break', type: 'break', value: 30, desc: '+30m Break Refill', used: false });
    };
}
