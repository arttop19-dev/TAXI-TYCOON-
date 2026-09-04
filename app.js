// Настройки Supabase
const SUPABASE_URL = 'https://ffgycumfccwcywyammzj.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3ljdW1mY2N3Y3l3eWFtbXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjE4NTUsImV4cCI6MjEwNDA5Nzg1NX0.4QecPesjUcQaGXg7yBGqa1_ONIwPNbQWmsue9Spdrwc';
let db = null;

// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.ready();
}

// Звуковой движок (Оптимизированный)
class SoundEngine {
  constructor() { this.ctx = null; this.enabled = true; }
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
  play(type) {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    if (type === 'click') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.05); osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'coin') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(987, now); osc.frequency.setValueAtTime(1318, now + 0.08);
      gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'engine') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(60, now); osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.4); osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'crash') {
      osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
      gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.4); osc.start(now); osc.stop(now + 0.4);
    }
  }
}
const audio = new SoundEngine();
function toggleAudio() { audio.enabled = !audio.enabled; document.getElementById('audio-toggle').innerText = audio.enabled ? '🔊' : '🔇'; }

// Базы данных игры
const CARS = [
  { id: 'vaz2107', name: 'ВАЗ-2107 Cyber', price: 0, reqLevel: 1, speed: 1.0, fuelDrain: 1, passive: 10 },
  { id: 'seat1991', name: 'SEAT Toledo 1991 Retro', price: 3500, reqLevel: 2, speed: 1.2, fuelDrain: 1.2, passive: 25 },
  { id: 'vaz2115', name: 'ВАЗ-2115 Dark Glass', price: 7000, reqLevel: 3, speed: 1.4, fuelDrain: 1.4, passive: 45 },
  { id: 'priora', name: 'Lada Priora Stance', price: 18000, reqLevel: 4, speed: 1.7, fuelDrain: 1.6, passive: 90 },
  { id: 'passatb5', name: 'VW Passat B5 Turbo', price: 42000, reqLevel: 5, speed: 2.0, fuelDrain: 2.0, passive: 200 },
  { id: 'lexuslx', name: 'Lexus LX 470 VIP', price: 110000, reqLevel: 6, speed: 2.5, fuelDrain: 3.0, passive: 500 },
  { id: 'maybach', name: 'Maybach Cyber-Edition', price: 350000, reqLevel: 8, speed: 3.5, fuelDrain: 4.0, passive: 1500 }
];

const TUNING = [
  { id: 'chip', name: 'Чип-тюнинг ЭБУ', price: 15000, desc: 'Скорость +20%' },
  { id: 'aero', name: 'Спорт-обвес', price: 25000, desc: 'Расход топлива -15%' },
  { id: 'vip', name: 'VIP Салон', price: 50000, desc: 'Чаевые +30%' }
];

const LOCATIONS = ['Астана-Центр', 'Аулиеколь', 'Атбасар', 'Костанай-Сити', 'Аэропорт NQZ', 'Кибер-Район'];
const WEATHERS = [
  { name: 'Ясно', icon: '☀️', mult: 1.0, risk: 0.05 },
  { name: 'Дождь', icon: '🌧️', mult: 1.3, risk: 0.15 },
  { name: 'Неоновый Туман', icon: '🌫️', mult: 1.6, risk: 0.25 }
];

// Состояние
let currentUser = {
  telegram_id: tg?.initDataUnsafe?.user?.id || Math.floor(Math.random() * 100000),
  first_name: tg?.initDataUnsafe?.user?.first_name || 'Водитель',
  avatar_url: tg?.initDataUnsafe?.user?.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=Taxi`,
  balance: 1500, level: 1, exp: 0, rating: 4.80, total_trips: 0, custom_nickname: '',
  owned_cars: ['vaz2107'], auto_drivers: [], upgrades: []
};

let currentCar = CARS[0];
let fuel = 100, engineCond = 100;
let currentWeather = WEATHERS[0];
let activeOrders = [];
let isDriving = false;
let autoSaveInterval;

// Инициализация
window.onload = async () => {
  initCyberParticles();
  loadFromLocalStorage(); // Быстрый fallback

  // Исправление зависания загрузки (таймаут 5 секунд на Supabase)
  let dbLoaded = false;
  try {
    if (window.supabase) {
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      await Promise.race([
        syncWithDatabase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 5000))
      ]);
      dbLoaded = true;
    }
  } catch (err) {
    console.warn("Локальный режим: БД недоступна", err);
  }

  updateUI();
  simulateLoading(); // Анимация загрузки поверх данных
  startGameLoops();
};

function initCyberParticles() {
  const canvas = document.getElementById('cyber-bg');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    speed: 0.5 + Math.random(), size: 1.5, color: Math.random() > 0.5 ? '#3b82f6' : '#f59e0b'
  }));
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y -= p.speed; if (p.y < 0) p.y = canvas.height;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

function simulateLoading() {
  let p = 0;
  const fill = document.getElementById('progress-fill');
  const txt = document.getElementById('progress-percent');
  const log = document.getElementById('terminal-log');
  
  const int = setInterval(() => {
    p += Math.floor(Math.random() * 15) + 5;
    if (p >= 100) p = 100;
    fill.style.width = p + '%'; txt.innerText = p + '%';
    
    if (p > 30 && p < 60) log.innerText = "> Подключение к спутникам...";
    if (p > 60 && p < 90) log.innerText = "> Синхронизация гаража...";
    if (p === 100) {
      clearInterval(int);
      log.innerText = "> Система готова.";
      setTimeout(() => {
        document.getElementById('loader-block').classList.add('hidden');
        document.getElementById('start-block').classList.remove('hidden');
        document.getElementById('splash-user-name').innerText = currentUser.custom_nickname || currentUser.first_name;
        document.getElementById('splash-user-rating').innerText = `⭐ ${currentUser.rating.toFixed(2)}`;
        document.getElementById('splash-user-level').innerText = currentUser.level;
        document.getElementById('user-avatar').src = currentUser.avatar_url;
      }, 500);
    }
  }, 100);
}

// Надежная система сохранений
function loadFromLocalStorage() {
  const saved = localStorage.getItem('cyber_taxi_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Защита от сброса при смене TG ID (если играем с одного устройства)
      if (parsed.telegram_id === currentUser.telegram_id || !tg.initDataUnsafe?.user) {
        currentUser = { ...currentUser, ...parsed };
      }
    } catch(e) {}
  }
}

async function syncWithDatabase() {
  if (!db || !currentUser.telegram_id) return;
  const { data, error } = await db.from('profiles').select('*').eq('telegram_id', currentUser.telegram_id).single();
  
  if (data) {
    currentUser = { ...currentUser, ...data };
  } else {
    await db.from('profiles').insert([currentUser]);
  }
  localStorage.setItem('cyber_taxi_data', JSON.stringify(currentUser));
}

async function saveState() {
  localStorage.setItem('cyber_taxi_data', JSON.stringify(currentUser));
  if (db && currentUser.telegram_id) {
    try {
      await db.from('profiles').upsert({
        telegram_id: currentUser.telegram_id,
        first_name: currentUser.first_name,
        avatar_url: currentUser.avatar_url,
        balance: currentUser.balance,
        level: currentUser.level,
        exp: currentUser.exp,
        rating: currentUser.rating,
        total_trips: currentUser.total_trips,
        custom_nickname: currentUser.custom_nickname,
        owned_cars: currentUser.owned_cars,
        auto_drivers: currentUser.auto_drivers,
        upgrades: currentUser.upgrades,
        updated_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' });
    } catch (e) {}
  }
}

function startGame() {
  audio.play('click');
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('main-game').classList.remove('hidden');
  
  // Устанавливаем лучшую машину
  const bestCarId = currentUser.owned_cars[currentUser.owned_cars.length - 1];
  currentCar = CARS.find(c => c.id === bestCarId) || CARS[0];
  
  generateOrders();
  renderGarage();
  renderTuning();
  loadLeaderboard();
  updateUI();
}

function startGameLoops() {
  setInterval(() => {
    currentWeather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    document.getElementById('weather-icon').innerText = currentWeather.icon;
    document.getElementById('weather-name').innerText = currentWeather.name;
    document.getElementById('weather-mult').innerText = `Тариф: x${currentWeather.mult}`;
    generateOrders();
  }, 60000);

  setInterval(() => {
    let passiveIncome = 0;
    currentUser.auto_drivers.forEach(id => {
      const c = CARS.find(x => x.id === id);
      if (c) passiveIncome += c.passive;
    });
    if (passiveIncome > 0) {
      currentUser.balance += passiveIncome;
      updateUI();
      saveState();
    }
  }, 10000);
  
  // Автосохранение каждые 15 сек
  autoSaveInterval = setInterval(saveState, 15000);
}

// Механика заказов
function generateOrders() {
  if (isDriving) return;
  audio.play('click');
  activeOrders = [];
  const container = document.getElementById('orders-list');
  
  for(let i=0; i<3; i++) {
    const from = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    let to = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    while(from === to) to = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    
    const dist = Math.floor(Math.random() * 15) + 5; // 5-20 km
    const baseReward = dist * 80 * currentWeather.mult;
    const reqLvl = Math.floor(Math.random() * 3) + 1;
    
    activeOrders.push({ id: i, from, to, dist, reward: Math.floor(baseReward), reqLvl });
  }

  container.innerHTML = activeOrders.map(o => `
    <div class="glass-card order-card">
      <div class="order-info">
        <div class="order-route">${o.from} ➔ ${o.to}</div>
        <div class="order-details">Расстояние: ${o.dist} км | Риск ДТП: ${Math.floor(currentWeather.risk * 100)}%</div>
        <div class="order-details" style="color:#f59e0b">Мин. уровень: ${o.reqLvl}</div>
      </div>
      <div style="text-align:right;">
        <div class="order-price">+$${o.reward}</div>
        <button class="btn-neon-sm" style="padding: 6px 15px; font-size:12px;" onclick="takeOrder(${o.id})">Взять</button>
      </div>
    </div>
  `).join('');
}

function takeOrder(orderId) {
  const order = activeOrders.find(o => o.id === orderId);
  if (!order) return;
  
  if (currentUser.level < order.reqLvl) return triggerToast(`🔒 Нужен Уровень ${order.reqLvl}!`);
  if (fuel < order.dist * currentCar.fuelDrain) return triggerToast('⛽ Мало топлива!');
  if (engineCond < 20) return triggerToast('🔧 Двигатель критически поврежден!');

  audio.play('engine');
  isDriving = true;
  
  const modal = document.getElementById('trip-modal');
  const fill = document.getElementById('trip-progress-fill');
  const log = document.getElementById('trip-event-log');
  const speedTxt = document.getElementById('trip-speed');
  
  modal.classList.remove('hidden');
  document.getElementById('trip-route').innerText = `${order.from} ➔ ${order.to}`;
  
  let speedMult = currentCar.speed;
  if (currentUser.upgrades.includes('chip')) speedMult *= 1.2;
  if (currentWeather.name === 'Дождь') speedMult *= 0.8;
  
  let progress = 0;
  let hasEvent = false;

  const tripInt = setInterval(() => {
    progress += speedMult * 2;
    fill.style.width = Math.min(progress, 100) + '%';
    speedTxt.innerText = `${Math.floor(60 * speedMult + Math.random()*20)} км/ч`;

    // Случайное событие в пути
    if (progress > 40 && progress < 60 && !hasEvent) {
      hasEvent = true;
      if (Math.random() < currentWeather.risk + (100 - engineCond) * 0.001) {
         audio.play('crash');
         log.innerText = "⚠️ Пробито колесо / Яма! Скорость снижена.";
         log.style.color = "#ef4444";
         speedMult *= 0.5;
         engineCond -= 15;
      } else if (Math.random() > 0.8) {
         audio.play('coin');
         log.innerText = "💬 Клиенту нравится музыка. Настроение +";
         log.style.color = "#10b981";
         order.reward += Math.floor(order.reward * 0.15);
      }
    }

    if (progress >= 100) {
      clearInterval(tripInt);
      finishOrder(order, log, modal);
    }
  }, 100);
}

function finishOrder(order, log, modal) {
  isDriving = false;
  fuel = Math.max(0, fuel - (order.dist * currentCar.fuelDrain));
  engineCond = Math.max(0, engineCond - Math.floor(Math.random() * 5));
  
  let finalReward = order.reward;
  if (currentUser.upgrades.includes('vip') && Math.random() > 0.5) {
    finalReward = Math.floor(finalReward * 1.3);
    triggerToast("💸 Щедрые чаевые от VIP!");
  }

  currentUser.balance += finalReward;
  currentUser.total_trips += 1;
  addEXP(order.dist * 10);
  
  audio.play('coin');
  log.innerText = `✅ Успешно! Заработано: $${finalReward}`;
  log.style.color = "#10b981";
  
  updateUI();
  saveState();
  generateOrders();

  setTimeout(() => {
    modal.classList.add('hidden');
    log.innerText = "Навигатор построен. Движение начато...";
    log.style.color = "#60a5fa";
  }, 2000);
}

function addEXP(amt) {
  currentUser.exp += amt;
  const need = currentUser.level * 150;
  if (currentUser.exp >= need) {
    currentUser.level++;
    currentUser.exp -= need;
    triggerToast(`🎉 УРОВЕНЬ ПОВЫШЕН ДО ${currentUser.level}!`);
  }
}

// Ремонт и топливо
function refuel() {
  audio.play('click');
  if (currentUser.balance < 300) return triggerToast('❌ Нет денег!');
  currentUser.balance -= 300; fuel = 100; updateUI(); saveState();
}
function repairCar() {
  audio.play('click');
  if (currentUser.balance < 500) return triggerToast('❌ Нет денег!');
  currentUser.balance -= 500; engineCond = 100; updateUI(); saveState();
}

// Гараж и Тюнинг
function renderGarage() {
  document.getElementById('current-car-name').innerText = currentCar.name;
  const container = document.getElementById('garage-list');
  container.innerHTML = CARS.map(c => {
    const isOwned = currentUser.owned_cars.includes(c.id);
    const hasDriver = currentUser.auto_drivers.includes(c.id);
    const isSelected = currentCar.id === c.id;
    return `
      <div class="glass-card garage-item">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b style="font-size:15px;">${c.name}</b> <span style="font-size:10px; color:#f59e0b;">(Ур. ${c.reqLevel})</span>
            <div style="font-size:11px; color:#9ca3af; margin-top:4px;">
              Множитель скорости: x${c.speed} | Пассив: +$${c.passive}/10с
            </div>
          </div>
          <div>
            ${!isOwned 
              ? `<button class="btn-neon-sm" onclick="buyCar('${c.id}')">Купить $${c.price.toLocaleString()}</button>`
              : `<button class="btn-neon-sm" style="background:${isSelected ? '#10b981' : '#3b82f6'}" onclick="selectCar('${c.id}')">${isSelected ? 'Выбрано' : 'Сесть за руль'}</button>`
            }
          </div>
        </div>
        ${isOwned ? `
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
            <span style="font-size:11px; color:#9ca3af;">Сдача в аренду (Пассив)</span>
            ${hasDriver 
              ? `<span style="font-size:11px; color:#10b981; font-weight:bold;">В работе ✅</span>` 
              : `<button class="btn-sm" style="width:auto; padding:4px 10px;" onclick="hireDriver('${c.id}')">Нанять за $${Math.floor(c.price * 0.3)}</button>`
            }
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function buyCar(id) {
  audio.play('click');
  const c = CARS.find(x => x.id === id);
  if (currentUser.level < c.reqLevel) return triggerToast(`🔒 Требуется Уровень ${c.reqLevel}!`);
  if (currentUser.balance < c.price) return triggerToast('❌ Недостаточно средств!');
  currentUser.balance -= c.price;
  currentUser.owned_cars.push(id);
  selectCar(id);
  triggerToast(`🎉 Куплен ${c.name}!`);
  saveState();
}

function selectCar(id) {
  audio.play('click');
  currentCar = CARS.find(x => x.id === id);
  updateUI();
  renderGarage();
}

function hireDriver(id) {
  audio.play('click');
  const c = CARS.find(x => x.id === id);
  const cost = Math.floor(c.price * 0.3);
  if (currentUser.balance < cost) return triggerToast('❌ Недостаточно средств!');
  currentUser.balance -= cost;
  currentUser.auto_drivers.push(id);
  renderGarage();
  saveState();
  triggerToast(`👨‍✈️ Водитель нанят на ${c.name}!`);
}

function renderTuning() {
  const container = document.getElementById('tuning-list');
  container.innerHTML = TUNING.map(t => {
    const isBought = currentUser.upgrades.includes(t.id);
    return `
      <div class="glass-card garage-item" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <b>${t.name}</b>
          <div style="font-size:11px; color:#10b981; margin-top:4px;">${t.desc}</div>
        </div>
        <button class="btn-neon-sm" onclick="buyTuning('${t.id}')" style="${isBought ? 'background:#374151; color:#9ca3af;' : ''}">
          ${isBought ? 'Установлено' : '$' + t.price.toLocaleString()}
        </button>
      </div>
    `;
  }).join('');
}

function buyTuning(id) {
  audio.play('click');
  if (currentUser.upgrades.includes(id)) return;
  const t = TUNING.find(x => x.id === id);
  if (currentUser.balance < t.price) return triggerToast('❌ Недостаточно средств!');
  currentUser.balance -= t.price;
  currentUser.upgrades.push(id);
  renderTuning();
  saveState();
  triggerToast(`⚡ Установлено: ${t.name}!`);
}

// Топ и Профиль
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (db) {
    const { data } = await db.from('profiles').select('first_name, custom_nickname, balance').order('balance', { ascending: false }).limit(10);
    if (data && data.length > 0) {
      container.innerHTML = data.map((item, i) => `
        <div class="glass-card garage-item" style="display:flex; justify-content:space-between; align-items:center; padding: 12px 15px;">
          <div><b>#${i + 1} ${item.custom_nickname || item.first_name || 'Водитель'}</b></div>
          <div style="color:#f59e0b; font-weight:bold;">$${Number(item.balance).toLocaleString()}</div>
        </div>
      `).join('');
      return;
    }
  }
  container.innerHTML = `<div style="text-align:center; color:#9ca3af; font-size:12px; margin-top:20px;">Нет данных или нет подключения к БД</div>`;
}

function saveNickname() {
  audio.play('click');
  const val = document.getElementById('input-nickname').value.trim();
  if (val.length < 2) return triggerToast('❌ Слишком короткий ник!');
  currentUser.custom_nickname = val;
  updateUI();
  saveState();
  triggerToast('✅ Позывной обновлен!');
}

function triggerToast(msg) {
  const t = document.getElementById('event-toast');
  t.innerText = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function switchTab(tab) {
  audio.play('click');
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  event.currentTarget.classList.add('active');
  if (tab === 'garage') renderGarage();
  if (tab === 'tuning') renderTuning();
  if (tab === 'leaders') loadLeaderboard();
}

function updateUI() {
  document.getElementById('balance').innerText = '$' + Number(currentUser.balance).toLocaleString();
  document.getElementById('header-level').innerText = currentUser.level;
  document.getElementById('exp-bar').style.width = Math.min((currentUser.exp / (currentUser.level * 150)) * 100, 100) + '%';
  
  document.getElementById('fuel-val').innerText = Math.floor(fuel) + '%';
  document.getElementById('fuel-bar').style.width = fuel + '%';
  document.getElementById('engine-val').innerText = Math.floor(engineCond) + '%';
  document.getElementById('engine-bar').style.width = engineCond + '%';

  const name = currentUser.custom_nickname || currentUser.first_name;
  document.getElementById('profile-name').innerText = name;
  document.getElementById('profile-rating-val').innerText = `⭐ ${currentUser.rating.toFixed(2)}`;
  document.getElementById('profile-trips').innerText = currentUser.total_trips;
  document.getElementById('profile-exp').innerText = currentUser.exp;
  if (currentUser.avatar_url) document.getElementById('profile-avatar').src = currentUser.avatar_url;
}
