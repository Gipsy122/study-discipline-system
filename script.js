import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ... [Keep your firebaseConfig here] ...

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const statsRef = ref(db, 'discipline/stats');
const timerRef = ref(db, 'discipline/activeTimer');

const isAdmin = window.location.search.includes('admin=true');

// ATTACH TO WINDOW SO BUTTONS WORK
window.systemBoot = () => {
    set(statsRef, { breakPool: 210, buffer: 20, sleepLimit: 7 });
    set(timerRef, { running: false, name: "Idle" });
};

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
    const used = prompt(`Enter total minutes spent on ${name}:`);
    if(used) applyLogic(name, parseInt(used), limit, isStrict);
};

// ... [Keep your onValue listeners and applyLogic function] ...
