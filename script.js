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
const stateRef = ref(db, 'discipline/os_v6');

const isAdmin = window.location.search.includes('admin=true');
if (isAdmin) document.body.classList.replace('user-view', 'admin-mode');

const CONFIG = {
    bath: 30, food: 15, washroom: 15, sleep: 420, buffer: 20
};

// Global Listener
onValue(stateRef, (snapshot) => {
    const data = snapshot.val() || {};
    renderUI(data);
});

function renderUI(data) {
    const container = document.getElementById('dashboard');
    const globalDisplay = document.getElementById('global-timer');
    
    globalDisplay.innerText = formatTime(data.globalBreak || 210);
    container.innerHTML = '';

    Object.keys(CONFIG).forEach(key => {
        const timerData = data[key] || { current: 0, active: false };
        const block = document.createElement('div');
        block.className = 'timer-block';
        
        block.innerHTML = `
            <div class="block-header">
                <span style="font-weight:bold">${key.toUpperCase()}</span>
                <span class="limit-badge">${CONFIG[key]}m</span>
            </div>
            <div class="timer-circle" style="border-color: ${timerData.current > CONFIG[key] ? '#ffb4ab' : '#2d3035'}">
                ${formatTime(timerData.current)}
            </div>
            <div class="admin-only">
                <button class="btn-start" onclick="window.toggleTimer('${key}', ${timerData.active})">
                    ${timerData.active ? 'STOP' : 'START'}
                </button>
                <button class="btn-plus" onclick="window.addMinute('${key}', ${timerData.current})">+ 1 Min</button>
            </div>
        `;
        container.appendChild(block);
    });
}

// Logic Functions
window.toggleTimer = (key, isActive) => {
    update(ref(db, `discipline/os_v6/${key}`), { active: !isActive });
};

window.addMinute = (key, current) => {
    update(ref(db, `discipline/os_v6/${key}`), { current: current + 1 });
};

function formatTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' + m : m}:00`;
}

// Admin Tick (Only runs if admin is open to save resources)
if (isAdmin) {
    setInterval(() => {
        onValue(stateRef, (snapshot) => {
            const data = snapshot.val();
            let updates = {};
            let globalReduction = 0;

            Object.keys(CONFIG).forEach(key => {
                if (data[key]?.active) {
                    let nextVal = (data[key].current || 0) + 1;
                    updates[`${key}/current`] = nextVal;
                    
                    // If over the limit, subtract from global break
                    if (nextVal > CONFIG[key]) {
                        globalReduction++;
                    }
                }
            });

            if (globalReduction > 0) {
                updates['globalBreak'] = (data.globalBreak || 210) - (globalReduction / 60); // Subtracting live
            }
            
            update(stateRef, updates);
        }, { onlyOnce: true });
    }, 60000); // Ticks every minute
}
