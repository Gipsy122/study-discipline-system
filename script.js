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
@@ -39,15 +35,14 @@ onValue(statsRef, (snapshot) => {
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
        document.getElementById('timer-name').innerText = "LIVE: " + t.name;
        ticker = setInterval(() => {
            const diff = Math.floor((Date.now() - t.startTime) / 1000);
            document.getElementById('timer-clock').innerText = 
@@ -56,7 +51,6 @@ onValue(timerRef, (snapshot) => {
    } else { box.style.display = 'none'; }
});

// --- ACTIONS ---
window.startTimer = (name, limit, isStrict) => {
    set(timerRef, { name, limit, isStrict, startTime: Date.now(), running: true });
};
@@ -66,50 +60,28 @@ window.stopTimer = () => {
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
            applyLogic(t.name, elapsed, t.limit, t.isStrict);
            set(timerRef, { running: false, name: "Idle" });
        }
    }, {onlyOnce: true});
};

// --- COUPON SYSTEM ---
window.grantCoupon = (name, type, val, desc) => {
    push(couponRef, { name, type, value: val, desc, used: false });
window.manualInput = (name, limit, isStrict) => {
    const used = prompt(`Enter total minutes spent on ${name}:`);
    if(used) applyLogic(name, parseInt(used), limit, isStrict);
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
function applyLogic(name, used, limit, isStrict) {
    const overtime = used - limit;
    if(overtime > 0) {
        onValue(statsRef, (s) => {
            let d = s.val();
            if(isStrict) d.breakPool -= overtime;
            else {
                if(d.buffer >= overtime) d.buffer -= overtime;
                else { d.breakPool -= (overtime - d.buffer); d.buffer = 0; }
            }
            update(statsRef, d);
        }, {onlyOnce: true});
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
}
