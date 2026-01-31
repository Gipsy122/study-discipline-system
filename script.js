
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
const stateRef = ref(db, "discipline/os_v6");

const isAdmin = window.location.search.includes("admin=true");
if (isAdmin) {
  document.body.classList.replace("user-view", "admin-mode");
  document.getElementById("adminPanel").classList.remove("hidden");
}

const TIMERS = {
  Bath: 30,
  Food: 15,
  Washroom: 15,
  Sleep: 420,
  Buffer: 20
};

let totalBreak = 210;
const timerGrid = document.getElementById("timerGrid");

function renderTimers() {
  timerGrid.innerHTML = "";
  Object.entries(TIMERS).forEach(([name, limit]) => {
    const card = document.createElement("div");
    card.className = "timer-card";

    card.innerHTML = `
      <h3>${name}</h3>
      <svg class="circle" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" stroke="#333" stroke-width="8" fill="none"/>
        <circle cx="50" cy="50" r="45" stroke="#4f7cff" stroke-width="8"
          fill="none" stroke-dasharray="282" stroke-dashoffset="0"/>
      </svg>
      ${isAdmin ? `
        <input type="number" placeholder="Add mins" />
        <button>Add</button>
      ` : ""}
    `;

    if (isAdmin) {
      const input = card.querySelector("input");
      const btn = card.querySelector("button");
      btn.onclick = () => {
        const val = Number(input.value || 0);
        totalBreak -= Math.max(0, val - limit);
        updateState();
      };
    }

    timerGrid.appendChild(card);
  });
}

function updateState() {
  document.getElementById("totalTime").innerText = totalBreak;
  update(stateRef, { totalBreak });
}

onValue(stateRef, snap => {
  if (!snap.exists()) {
    set(stateRef, { totalBreak });
  } else {
    totalBreak = snap.val().totalBreak;
    document.getElementById("totalTime").innerText = totalBreak;
  }
});

renderTimers();

/* Coupons */
const couponList = document.getElementById("couponList");

onValue(ref(db, "discipline/coupons"), snap => {
  couponList.innerHTML = "";
  snap.forEach(c => {
    const data = c.val();
    const div = document.createElement("div");
    div.className = "coupon";
    div.innerHTML = `
      <strong>${data.name}</strong> (+${data.minutes} min)
      ${!data.used ? `<button>Redeem</button>` : "<span>Used</span>"}
    `;
    if (!data.used) {
      div.querySelector("button").onclick = () => {
        totalBreak += data.minutes;
        updateState();
        update(ref(db, `discipline/coupons/${c.key}`), { used: true });
      };
    }
    couponList.appendChild(div);
  });
});

if (isAdmin) {
  document.getElementById("createCoupon").onclick = () => {
    const name = couponName.value;
    const minutes = Number(couponMinutes.value);
    push(ref(db, "discipline/coupons"), {
      name,
      minutes,
      used: false
    });
  };
}
