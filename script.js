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

// ────────────────────────────────────────────────
const isAdmin = window.location.search.includes('admin=true');
if (isAdmin) {
  document.body.classList.add('admin-mode');
  document.getElementById('mode-indicator').textContent = 'Admin Mode';
}

// Config (easy to edit)
const limits = {
  bath: 30,
  food: 15,
  washroom: 15,
  sleep: 420,     // 7 hours
  buffer: 20,
  weekly_fun: 0   // set by admin
};

let totalBreak = 210;   // will be updated live
let states = {};        // will hold {bath: {elapsed:0, active:false, ...}}

// ─── Format MM:SS ────────────────────────────────────────
function formatTime(minutes) {
  const m = Math.floor(minutes);
  const s = Math.floor((minutes - m) * 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}

// ─── Update one circle ───────────────────────────────────
function updateCircle(type) {
  const el = states[type];
  if (!el) return;

  const limit = limits[type] || 0;
  const pct = Math.min(el.elapsed / limit, 1) * 100;
  const offset =  (2 * Math.PI * 44) * (1 - pct/100);

  document.getElementById(`${type}-progress`).style.strokeDasharray = `${2 * Math.PI * 44}`;
  document.getElementById(`${type}-progress`).style.strokeDashoffset = offset;

  document.getElementById(`${type}-time`).textContent = formatTime(el.elapsed);
}

// ─── Update total ────────────────────────────────────────
function updateTotal() {
  let deducted = 0;
  for (let type in states) {
    const over = Math.max(0, states[type].elapsed - (limits[type] || 0));
    deducted += over;
  }

  const remaining = Math.max(0, totalBreak - deducted);
  const pct = remaining / 210;

  document.getElementById('total-progress').style.strokeDasharray = `${2 * Math.PI * 54}`;
  document.getElementById('total-progress').style.strokeDashoffset = (2 * Math.PI * 54) * (1 - pct);

  document.getElementById('total-remaining').textContent = Math.round(remaining);
}

// ─── Real-time listener ──────────────────────────────────
onValue(stateRef, (snap) => {
  const data = snap.val() || {};
  states = data.states || {};
  totalBreak = data.totalBreak || 210;
  limits.weekly_fun = data.weeklyAllowed || 0;

  // Update all circles
  for (let type in limits) {
    updateCircle(type);
  }
  updateTotal();

  // You can also update coupon list here if you expand it
});

// ─── Admin controls (start / stop / add) ─────────────────
document.querySelectorAll('.timer-card').forEach(card => {
  const type = card.dataset.type;
  if (!type) return;

  card.querySelector('.start-btn')?.addEventListener('click', () => {
    update(ref(db, `${stateRef.path}/${type}`), { active: true, startTime: Date.now() });
  });

  card.querySelector('.stop-btn')?.addEventListener('click', () => {
    update(ref(db, `${stateRef.path}/${type}`), { active: false });
  });

  card.querySelector('.add-btn')?.addEventListener('click', () => {
    const input = card.querySelector('.add-min');
    const val = Number(input.value);
    if (!val) return;
    const current = states[type]?.elapsed || 0;
    update(ref(db, `${stateRef.path}/${type}`), { elapsed: current + val });
    input.value = '';
  });
});

// Weekly fun setter
document.getElementById('set-weekly-fun')?.addEventListener('click', () => {
  const val = Number(document.getElementById('weekly-fun-allowed').value);
  if (val >= 0) {
    update(stateRef, { weeklyAllowed: val });
  }
});

// Coupon creation stub (expand later)
document.getElementById('create-coupon')?.addEventListener('click', () => {
  alert("Coupon creation logic can be added here (push to /coupons)");
  // Example: push(ref(db, 'coupons'), { code, minutes, expiry })
});
