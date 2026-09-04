// Вставь свои ключи Supabase ниже!
const SUPABASE_URL = 'https://ffgycumfccwcywyammzj.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3ljdW1mY2N3Y3l3eWFtbXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjE4NTUsImV4cCI6MjEwNDA5Nzg1NX0.4QecPesjUcQaGXg7yBGqa1_ONIwPNbQWmsue9Spdrwc';

let db = null;

// Расширенный автопарк

const CARS = [
  { id: 'vaz2107', name: 'ВАЗ-2107', price: 0, reqLevel: 1, income: 400, time: 5, passiveIncome: 10 },
  { id: 'vaz2115', name: 'ВАЗ-2115', price: 6000, reqLevel: 2, income: 750, time: 6, passiveIncome: 30 },
  { id: 'priora', name: 'Lada Priora', price: 18000, reqLevel: 3, income: 1400, time: 7, passiveIncome: 80 },
  { id: 'passatb5', name: 'VW Passat B5', price: 40000, reqLevel: 4, income: 2500, time: 9, passiveIncome: 180 },
  { id: 'lexuslx', name: 'Lexus LX 470', price: 100000, reqLevel: 5, income: 5500, time: 11, passiveIncome: 450 },
  { id: 'maybach', name: 'Maybach', price: 300000, reqLevel: 7, income: 15000, time: 14, passiveIncome: 1200 }
];

// Дефолтный профиль
let currentUser = {
  telegram_id: null,
  balance: 1500,
  level: 1,
  exp: 0,
  rating: 4.80,
  total_trips: 0,
  custom_nickname: '',
  owned_cars: ['vaz2107'],
  auto_drivers: []
};

let currentCar = CARS[0];
let fuel = 100;
let condition = 100;
let isDriving = false;

window.onload = async () => {
  // 1. Сначала подтягиваем локальное сохранение (чтобы мгновенно отобразить прогресс)
  loadFromLocalStorage();

  try {
    if (window.supabase && SUPABASE_URL !== 'ТВОЙ_SUPABASE_URL') {
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    simulateLoading();
    await initUser();
  } catch (err) {
    console.warn("Работа в автономном режиме без БД", err);
    simulateLoading();
  }
  startPassiveIncomeLoop();
};

function simulateLoading() {
  let p = 0;
  const fill = document.getElementById('progress-fill');
  const txt = document.getElementById('progress-text');
  
  const timer = setInterval(() => {
    p += 25;
    if (fill) fill.style.width = p + '%';
    if (txt) txt.innerText = `Загрузка... ${p}%`;
    if (p >= 100) {
      clearInterval(timer);
      document.getElementById('loader-block').classList.add('hidden');
      document.getElementById('start-block').classList.remove('hidden');
    }
  }, 80);
}

// Загрузка локальной копии
function loadFromLocalStorage() {
  const saved = localStorage.getItem('taxi_tycoon_user');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      currentUser = { ...currentUser, ...parsed };
      updateUI();
    } catch(e) {
      console.error("Ошибка при чтении LocalStorage", e);
    }
  }
}

// Синхронизация с Supabase
async function initUser() {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || { id: 80399910, first_name: 'Водитель' };
  currentUser.telegram_id = tgUser.id;

  if (!db) {
    updateUI();
    return;
  }

  // Запрашиваем профиль из Supabase по telegram_id
  let { data: profile, error } = await db.from('profiles').select('*').eq('telegram_id', tgUser.id).single();

  if (error || !profile) {
    // Если игрока нет — создаем запись
    const { data: newProfile } = await db.from('profiles').insert({
      telegram_id: tgUser.id,
      first_name: tgUser.first_name,
      avatar_url: tgUser.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${tgUser.id}`,
      balance: currentUser.balance,
      level: currentUser.level,
      exp: currentUser.exp,
      rating: currentUser.rating,
      total_trips: currentUser.total_trips,
      custom_nickname: currentUser.custom_nickname,
      owned_cars: currentUser.owned_cars,
      auto_drivers: currentUser.auto_drivers
    }).select().single();

    if (newProfile) currentUser = newProfile;
  } else {
    // Если игрок найден — загружаем его прогресс из БД
    currentUser = {
      ...currentUser,
      ...profile,
      owned_cars: profile.owned_cars || ['vaz2107'],
      auto_drivers: profile.auto_drivers || []
    };
  }

  saveState();
  updateUI();
}

function saveState() {
  // 1. Сохраняем локально
  localStorage.setItem('taxi_tycoon_user', JSON.stringify(currentUser));

  // 2. Отправляем в Supabase
  if (db && currentUser.telegram_id) {
    db.from('profiles').upsert({
      telegram_id: currentUser.telegram_id,
      balance: currentUser.balance,
      level: currentUser.level,
      exp: currentUser.exp,
      rating: currentUser.rating,
      total_trips: currentUser.total_trips,
      custom_nickname: currentUser.custom_nickname,
      owned_cars: currentUser.owned_cars,
      auto_drivers: currentUser.auto_drivers
    }, { onConflict: 'telegram_id' }).then(({ error }) => {
      if (error) console.error("Ошибка сохранения в Supabase:", error);
    });
  }
}

function updateUI() {
  document.getElementById('balance').innerText = '$' + Number(currentUser.balance).toLocaleString();
  document.getElementById('rating').innerText = '⭐ ' + Number(currentUser.rating).toFixed(2);
  document.getElementById('header-level').innerText = currentUser.level;
  
  const nextLevelExp = currentUser.level * 100;
  const expPercent = Math.min((currentUser.exp / nextLevelExp) * 100, 100);
  document.getElementById('exp-bar').style.width = expPercent + '%';

  const name = currentUser.custom_nickname || currentUser.first_name || 'Таксист';
  document.getElementById('user-name').innerText = name;
  document.getElementById('user-level').innerText = currentUser.level;
  document.getElementById('profile-name').innerText = name;
  document.getElementById('profile-rating-val').innerText = '⭐ ' + Number(currentUser.rating).toFixed(2);
  document.getElementById('profile-trips').innerText = currentUser.total_trips || 0;
  document.getElementById('profile-exp').innerText = currentUser.exp || 0;

  if (currentUser.avatar_url) {
    document.getElementById('user-avatar').src = currentUser.avatar_url;
    document.getElementById('profile-avatar').src = currentUser.avatar_url;
  }
}

function startGame() {
  if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('main-game').classList.remove('hidden');
  renderGarage();
  loadLeaderboard();
}

// Выполнение заказов
async function takeOrder() {
  if (isDriving) return;
  if (fuel < 15 || condition < 10) {
    triggerToast('⚠️ Заправь или почини машину перед выездом!');
    return;
  }

  isDriving = true;
  const btn = document.getElementById('btn-drive');
  const log = document.getElementById('trip-event-log');
  let timeLeft = currentCar.time;

  btn.style.background = '#374151';
  btn.style.color = '#fff';
  log.innerText = 'Едем к клиенту...';

  const tripInterval = setInterval(() => {
    btn.innerText = `В ПУТИ... ${timeLeft} сек`;
    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(tripInterval);
      finishOrder(btn, log);
    }
  }, 1000);
}

function finishOrder(btn, log) {
  if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');

  fuel -= 15;
  condition -= 8;
  document.getElementById('fuel-val').innerText = fuel + '%';
  document.getElementById('fuel-bar').style.width = fuel + '%';
  document.getElementById('cond-val').innerText = condition + '%';
  document.getElementById('cond-bar').style.width = condition + '%';

  let earned = currentCar.income;
  let expGained = 25;

  const chance = Math.random();
  if (chance > 0.8) {
    const bonus = Math.floor(earned * 0.3);
    earned += bonus;
    log.innerText = ` 💰 Щедрые чаевые +$${bonus}!`;
  } else if (chance < 0.15) {
    currentUser.rating = Math.max(3.0, currentUser.rating - 0.05);
    log.innerText = ' 😡 Пассажир был недоволен!';
  } else {
    log.innerText = ' ✅ Заказ выполнен успешно!';
  }

  currentUser.balance += earned;
  currentUser.total_trips += 1;
  addEXP(expGained);

  updateUI();
  saveState();

  btn.style.background = 'linear-gradient(to right, #f59e0b, #d97706)';
  btn.style.color = '#000';
  btn.innerText = 'ВЗЯТЬ ЗАКАЗ';
  isDriving = false;
}

function addEXP(amount) {
  currentUser.exp += amount;
  const nextLevelExp = currentUser.level * 100;
  if (currentUser.exp >= nextLevelExp) {
    currentUser.level += 1;
    currentUser.exp -= nextLevelExp;
    triggerToast(`🎉 Поздравляем! Достигнут Уровень ${currentUser.level}!`);
  }
}

function refuel() {
  if (currentUser.balance < 300) return triggerToast('❌ Недостаточно денег!');
  currentUser.balance -= 300;
  fuel = 100;
  document.getElementById('fuel-val').innerText = '100%';
  document.getElementById('fuel-bar').style.width = '100%';
  updateUI();
  saveState();
}

function repair() {
  if (currentUser.balance < 500) return triggerToast('❌ Недостаточно денег!');
  currentUser.balance -= 500;
  condition = 100;
  document.getElementById('cond-val').innerText = '100%';
  document.getElementById('cond-bar').style.width = '100%';
  updateUI();
  saveState();
}

function startPassiveIncomeLoop() {
  setInterval(() => {
    let totalPassive = 0;
    currentUser.auto_drivers.forEach(carId => {
      const car = CARS.find(c => c.id === carId);
      if (car) totalPassive += car.passiveIncome;
    });

    if (totalPassive > 0) {
      currentUser.balance += totalPassive;
      updateUI();
      saveState();
    }
  }, 10000);
}

function renderGarage() {
  const container = document.getElementById('garage-list');
  container.innerHTML = CARS.map(car => {
    const isOwned = currentUser.owned_cars.includes(car.id);
    const hasDriver = currentUser.auto_drivers.includes(car.id);
    const isSelected = currentCar.id === car.id;

    return `
      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b>${car.name}</b> <span style="font-size:10px; color:#f59e0b;">(Ур. ${car.reqLevel})</span>
            <div style="font-size:11px; color:#9ca3af">Доход: +$${car.income} | Пассив: +$${car.passiveIncome}/10сек</div>
          </div>
          <div>
            ${!isOwned ? `
              <button onclick="buyCar('${car.id}')" style="padding:6px 10px; font-size:11px;">Купить $${car.price}</button>
            ` : `
              <button onclick="selectCar('${car.id}')" style="padding:6px 10px; font-size:11px; background:${isSelected ? '#374151' : '#f59e0b'}; color:${isSelected ? '#fff' : '#000'}">
                ${isSelected ? 'Выбрано' : 'Войти'}
              </button>
            `}
          </div>
        </div>
        ${isOwned ? `
          <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); pt:8px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#9ca3af;">Наёмный водитель:</span>
            ${hasDriver ? `
              <span style="font-size:11px; color:#10b981; font-weight:bold;">Работает ✅</span>
            ` : `
              <button onclick="hireDriver('${car.id}')" style="padding:4px 8px; font-size:10px; width:auto; background:#3b82f6; color:#fff;">Нанять ($${car.price * 0.3})</button>
            `}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function buyCar(carId) {
  const car = CARS.find(c => c.id === carId);
  if (currentUser.level < car.reqLevel) return triggerToast(`🔒 Нужен Уровень ${car.reqLevel}!`);
  if (currentUser.balance < car.price) return triggerToast('❌ Недостаточно средств!');

  currentUser.balance -= car.price;
  currentUser.owned_cars.push(carId);
  updateUI();
  renderGarage();
  saveState();
  triggerToast(`🎉 Куплен автомобиль ${car.name}!`);
}

function selectCar(carId) {
  const car = CARS.find(c => c.id === carId);
  currentCar = car;
  document.getElementById('order-car-title').innerText = car.name;
  document.getElementById('order-class').innerText = car.id.toUpperCase() + ' КЛАСС';
  document.getElementById('order-reward').innerText = '+$' + car.income;
  renderGarage();
}

function hireDriver(carId) {
  const car = CARS.find(c => c.id === carId);
  const cost = car.price * 0.3;
  if (currentUser.balance < cost) return triggerToast('❌ Недостаточно средств!');

  currentUser.balance -= cost;
  currentUser.auto_drivers.push(carId);
  updateUI();
  renderGarage();
  saveState();
  triggerToast(`👨‍✈️ Водитель нанят на ${car.name}!`);
}

async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (db) {
    const { data } = await db.from('profiles').select('first_name, custom_nickname, balance, total_trips').order('balance', { ascending: false }).limit(10);
    if (data && data.length > 0) {
      container.innerHTML = data.map((item, i) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <b>#${i + 1} ${item.custom_nickname || item.first_name || 'Таксист'}</b>
            <div style="font-size:11px; color:#9ca3af">Поездок: ${item.total_trips || 0}</div>
          </div>
          <div style="color:#10b981; font-weight:bold;">$${Number(item.balance).toLocaleString()}</div>
        </div>
      `).join('');
      return;
    }
  }

  container.innerHTML = `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div><b>#1 CyberDriver</b><div style="font-size:11px; color:#9ca3af">Поездок: 150</div></div>
      <div style="color:#10b981; font-weight:bold;">$450,000</div>
    </div>
    <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div><b>#2 ${currentUser.custom_nickname || 'Ты'}</b><div style="font-size:11px; color:#9ca3af">Поездок: ${currentUser.total_trips}</div></div>
      <div style="color:#10b981; font-weight:bold;">$${Number(currentUser.balance).toLocaleString()}</div>
    </div>
  `;
}

function switchTab(tab) {
  if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.selectionChanged();
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  event.currentTarget.classList.add('active');
  if (tab === 'garage') renderGarage();
  if (tab === 'leaders') loadLeaderboard();
}

function triggerToast(msg) {
  const t = document.getElementById('event-toast');
  t.innerText = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function saveNickname() {
  const nick = document.getElementById('input-nickname').value.trim();
  if (!nick) return;
  currentUser.custom_nickname = nick;
  updateUI();
  saveState();
  triggerToast('✅ Ник сохранен!');
}

function applyPromo() {
  const code = document.getElementById('input-promo').value.trim().toUpperCase();
  if (code === 'START2026') {
    currentUser.balance += 5000;
    updateUI();
    saveState();
    triggerToast('🎉 Промокод активирован! +$5000');
  } else {
    triggerToast('❌ Неверный промокод!');
  }
}
