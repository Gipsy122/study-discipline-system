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

// Initial State Templates
const CATEGORIES = {
    bath: { label: "Bath", limit: 30 },
    food: { label: "Food", limit: 15 },
    washroom: { label: "Washroom", limit: 15 },
    sleep: { label: "Sleep", limit: 420 }, // 7 hours
    buffer: { label: "Study Buffer", limit: 20 }
};

const isAdmin = window.location.search.includes('admin=true');
if (isAdmin) document.body.classList.add('admin-mode');

// Helper: Format Seconds to MM:SS
const formatTime = (s) => {
    const mins = Math.floor(Math.abs(s) / 60);
    const secs = Math.abs(s) % 60;
    return `${s < 0 ? '-' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
};

// UI: Render Blocks
function createTimerBlock(id, data) {
    const block = document.createElement('div');
    block.className = 'timer-block';
    const progress = (data.current / CATEGORIES[id].limit) * 339.29; // Circumference
    
    block.innerHTML = `
        <h3>${CATEGORIES[id].label}</h3>
        <svg class="circle-svg">
            <circle class="circle-bg" cx="60" cy="60" r="54"></circle>
            <circle class="circle-progress" cx="60" cy="60" r="54" 
                style="stroke-dasharray: 339.29; stroke-dashoffset: ${339.29 - progress}"></circle>
        </svg>
        <h2>${formatTime(data.current * 60)}</h2>
        <div class="admin-only">
            <button onclick="toggleTimer('${id}')">${data.active ? 'Stop' : 'Start'}</button>
            <input type="number" id="adj-${id}" placeholder="Mins" style="width:50px">
            <button onclick="adjustTime('${id}')">Add</button>
        </div>
    `;
    return block;
}

// Logic: Listen to Firebase
onValue(stateRef, (snapshot) => {
    const data = snapshot.val() || { totalBreak: 210, categories: {} };
    const container = document.getElementById('dashboard');
    container.innerHTML = '';

    document.getElementById('total-break-timer').innerText = formatTime(data.totalBreak * 60);

    Object.keys(CATEGORIES).forEach(key => {
        const catData = data.categories?.[key] || { current: 0, active: false };
        container.appendChild(createTimerBlock(key, catData));
    });
});

// Admin Actions (Attached to window for HTML onclick access)
window.toggleTimer = (id) => {
    // Logic to update Firebase active state
    // In a real interval, you'd calculate time difference
};

window.adjustTime = (id) => {
    const val = parseInt(document.getElementById(`adj-${id}`).value);
    // Logic to push updated minutes to Firebase
};

// Coupon Logic
document.getElementById('issue-coupon').addEventListener('click', () => {
    const name = document.getElementById('coupon-name').value;
    const value = document.getElementById('coupon-value').value;
    push(ref(db, 'discipline/coupons'), { name, value, used: false });
});
