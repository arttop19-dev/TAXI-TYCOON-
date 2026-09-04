// ==========================================
// ЯДРО СИСТЕМЫ И ИНИЦИАЛИЗАЦИЯ
// ==========================================

const SUPABASE_URL = 'https://ffgycumfccwcywyammzj.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3ljdW1mY2N3Y3l3eWFtbXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjE4NTUsImV4cCI6MjEwNDA5Nzg1NX0.4QecPesjUcQaGXg7yBGqa1_ONIwPNbQWmsue9Spdrwc';
let db = null;

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.ready();
}

// ==========================================
// ЗВУКОВОЙ ДВИЖОК
// ==========================================
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
    } else if (type === 'police') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.setValueAtTime(800, now + 0.2); osc.frequency.setValueAtTime(1200, now + 0.4);
      gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.6); osc.start(now); osc.stop(now + 0.6);
    }
  }
}
const audio = new SoundEngine();
function toggleAudio() { 
  audio.enabled = !audio.enabled; 
  document.getElementById('audio-toggle').innerText = audio.enabled ? '🔊' : '🔇'; 
}

// ==========================================
// БАЗА ДАННЫХ ИГРЫ (ЭКОНОМИКА И БАЛАНС)
// ==========================================
const CARS = [
  { id: 'vaz2107', name: 'ВАЗ-2107 Cyber', price: 0, reqLevel: 1, speed: 1.0, fuelDrain: 1.0, passive: 10, riskResist: 0 },
  { id: 'seat1991', name: 'SEAT Toledo 1991 Retro', price: 3500, reqLevel: 2, speed: 1.2, fuelDrain: 1.2, passive: 25, riskResist: 5 },
  { id: 'vaz2115', name: 'ВАЗ-2115 Dark Glass', price: 7000, reqLevel: 3, speed: 1.4, fuelDrain: 1.4, passive: 45, riskResist: 10 },
  { id: 'priora', name: 'Lada Priora Stance', price: 18000, reqLevel: 4, speed: 1.7, fuelDrain: 1.6, passive: 90, riskResist: 15 },
  { id: 'passatb5', name: 'VW Passat B5 Turbo', price: 42000, reqLevel: 5, speed: 2.0, fuelDrain: 2.0, passive: 200, riskResist: 25 },
  { id: 'lexuslx', name: 'Lexus LX 470 VIP', price: 110000, reqLevel: 6, speed: 2.5, fuelDrain: 3.0, passive: 500, riskResist: 40 },
  { id: 'maybach', name: 'Maybach Cyber-Edition', price: 350000, reqLevel: 8, speed: 3.5, fuelDrain: 4.0, passive: 1500, riskResist: 60 }
];

const TUNING = [
  { id: 'chip', name: 'Чип-тюнинг ЭБУ Stage 2', price: 15000, desc: 'Скорость в рейсе +25%' },
  { id: 'aero', name: 'Аэродинамический обвес', price: 25000, desc: 'Расход топлива -20%' },
  { id: 'vip', name: 'Кожаный салон Nappa', price: 50000, desc: 'Шанс на чаевые +40%' },
  { id: 'radar', name: 'Антирадар PRO', price: 85000, desc: 'Защита от штрафов ДПС' }
];

const LOCATIONS = ['Астана-Центр', 'Аулиеколь', 'Атбасар', 'Костанай-Сити', 'Аэропорт NQZ', 'Кибер-Район', 'Промзона'];
const WEATHERS = [
  { name: 'Ясно', icon: '☀️', mult: 1.0, risk: 0.05 },
  { name: 'Дождь', icon: '🌧️', mult: 1.3, risk: 0.15 },
  { name: 'Снегопад', icon: '❄️', mult: 1.5, risk: 0.25 },
  { name: 'Неоновый Туман', icon: '🌫️', mult: 1.8, risk: 0.35 }
];

// ==========================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ==========================================
let currentUser = {
  telegram_id: tg?.initDataUnsafe?.user?.id || Math.floor(Math.random() * 100000000),
  first_name: tg?.initDataUnsafe?.user?.first_name || 'Кибер-Гонщик',
  avatar_url: tg?.initDataUnsafe?.user?.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${Math.random()}&backgroundColor=0f172a`,
  balance: 1500, 
  level: 1, 
  exp: 0, 
  rating: 4.80, 
  total_trips: 0, 
  custom_nickname: '',
  owned_cars: ['vaz2107'], 
  auto_drivers: [], 
  upgrades: []
};

let currentCar = CARS[0];
let fuel = 100;
let engineCond = 100;
let currentWeather = WEATHERS[0];
let activeOrders = [];
let isDriving = false;
let autoSaveInterval;

// ==========================================
// ЗАПУСК И СИНХРОНИЗАЦИЯ
// ==========================================
window.onload = async () => {
  initCyberParticles();
  loadFromLocalStorage();

  try {
    if (window.supabase) {
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      await Promise.race([
        syncWithDatabase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Таймаут БД')), 5000))
      ]);
    }
  } catch (err) {
    console.warn("Работа в локальном режиме. Причина:", err.message);
  }

  updateUI();
  simulateLoading();
  startGameLoops();
};

function loadFromLocalStorage() {
  const saved = localStorage.getItem('cyber_taxi_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.telegram_id === currentUser.telegram_id || !tg.initDataUnsafe?.user) {
        currentUser = { ...currentUser, ...parsed };
      }
    } catch(e) { console.error("Ошибка чтения LocalStorage", e); }
  }
}

async function syncWithDatabase() {
  if (!db || !currentUser.telegram_id) return;
  try {
    // Пытаемся прочитать профиль (если RLS позволяет чтение своей записи)
    const { data, error } = await db.from('profiles').select('*').eq('telegram_id', currentUser.telegram_id).single();
    if (data) currentUser = { ...currentUser, ...data };
    localStorage.setItem('cyber_taxi_data', JSON.stringify(currentUser));
  } catch (e) {
    console.warn("Чтение профиля из БД ограничено RLS. Используем локальные данные.");
  }
}

async function saveState() {
  localStorage.setItem('cyber_taxi_data', JSON.stringify(currentUser));
  if (!db || !currentUser.telegram_id) return;
  
  try {
    // Сохранение напрямую. Если настроен Edge Function для записи, 
    // этот запрос тихо завершится с ошибкой из-за RLS, но локальный прогресс сохранится.
    const { error } = await db.from('profiles').upsert({
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
    
    if (error) throw error;
  } catch (e) {
    // Игнорируем ошибки записи, чтобы не спамить в консоль, если работает Edge Function
  }
}

// ==========================================
// ВИЗУАЛЬНЫЕ ЭФФЕКТЫ И АНИМАЦИИ
// ==========================================
function initCyberParticles() {
  const canvas = document.getElementById('cyber-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; 
  canvas.height = window.innerHeight;
  
  const particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * canvas.width, 
    y: Math.random() * canvas.height,
    speed: 0.3 + Math.random(), 
    size: Math.random() * 2, 
    color: Math.random() > 0.5 ? '#3b82f6' : '#f59e0b'
  }));
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y -= p.speed; 
      if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
      ctx.fillStyle = p.color; 
      ctx.beginPath(); 
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); 
      ctx.fill();
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
    p += Math.floor(Math.random() * 12) + 4;
    if (p >= 100) p = 100;
    if(fill) fill.style.width = p + '%'; 
    if(txt) txt.innerText = p + '%';
    
    if (log) {
      if (p > 20 && p < 50) log.innerText = "> Подключение к спутникам навигации...";
      if (p > 50 && p < 80) log.innerText = "> Синхронизация гаража и баланса...";
      if (p > 80 && p < 100) log.innerText = "> Расчет погодных условий...";
    }
    
    if (p === 100) {
      clearInterval(int);
      if(log) log.innerText = "> Система готова. Запуск ядра.";
      setTimeout(() => {
        document.getElementById('loader-block').classList.add('hidden');
        document.getElementById('start-block').classList.remove('hidden');
        document.getElementById('splash-user-name').innerText = currentUser.custom_nickname || currentUser.first_name;
        document.getElementById('splash-user-rating').innerText = `⭐ ${currentUser.rating.toFixed(2)}`;
        document.getElementById('splash-user-level').innerText = currentUser.level;
        document.getElementById('user-avatar').src = currentUser.avatar_url;
      }, 600);
    }
  }, 120);
}

function startGame() {
  audio.play('click');
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('main-game').classList.remove('hidden');
  
  const bestCarId = currentUser.owned_cars[currentUser.owned_cars.length - 1];
  currentCar = CARS.find(c => c.id === bestCarId) || CARS[0];
  
  generateOrders();
  renderGarage();
  renderTuning();
  loadLeaderboard();
  updateUI();
}

// ==========================================
// ИГРОВЫЕ ЦИКЛЫ
// ==========================================
function startGameLoops() {
  // Смена погоды
  setInterval(() => {
    currentWeather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    const wIcon = document.getElementById('weather-icon');
    const wName = document.getElementById('weather-name');
    const wMult = document.getElementById('weather-mult');
    
    if(wIcon) wIcon.innerText = currentWeather.icon;
    if(wName) wName.innerText = currentWeather.name;
    if(wMult) wMult.innerText = `Тариф: x${currentWeather.mult}`;
    
    if (!isDriving) generateOrders();
  }, 90000); // Каждые 1.5 минуты

  // Пассивный доход от нанятых водителей
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
  }, 10000); // Каждые 10 секунд
  
  autoSaveInterval = setInterval(saveState, 15000);
}

// ==========================================
// МЕХАНИКА ЗАКАЗОВ И ПОЕЗДКИ
// ==========================================
function generateOrders() {
  if (isDriving) return;
  audio.play('click');
  activeOrders = [];
  const container = document.getElementById('orders-list');
  if(!container) return;
  
  for(let i = 0; i < 3; i++) {
    const from = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    let to = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    while(from === to) to = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    
    const dist = Math.floor(Math.random() * 20) + 5; 
    const baseReward = dist * 85 * currentWeather.mult;
    const reqLvl = Math.max(1, Math.floor(Math.random() * (currentUser.level + 2)));
    
    activeOrders.push({ id: i, from, to, dist, reward: Math.floor(baseReward), reqLvl });
  }

  container.innerHTML = activeOrders.map(o => `
    <div class="glass-card order-card">
      <div class="order-info">
        <div class="order-route">${o.from} ➔ ${o.to}</div>
        <div class="order-details">Расстояние: ${o.dist} км | Риск ДТП: ${Math.floor(currentWeather.risk * 100)}%</div>
        <div class="order-details" style="color:${currentUser.level >= o.reqLvl ? '#10b981' : '#ef4444'}">Мин. уровень: ${o.reqLvl}</div>
      </div>
      <div style="text-align:right;">
        <div class="order-price">+$${o.reward}</div>
        <button class="btn-neon-sm" style="padding: 6px 15px; font-size:12px; margin-top:5px;" onclick="takeOrder(${o.id})">Взять</button>
      </div>
    </div>
  `).join('');
}

function takeOrder(orderId) {
  const order = activeOrders.find(o => o.id === orderId);
  if (!order) return;
  
  if (currentUser.level < order.reqLvl) return triggerToast(`🔒 Нужен Уровень ${order.reqLvl}!`);
  
  let fuelCost = order.dist * currentCar.fuelDrain;
  if (currentUser.upgrades.includes('aero')) fuelCost *= 0.8;
  
  if (fuel < fuelCost) return triggerToast('⛽ Мало топлива! Заправьтесь.');
  if (engineCond < 15) return triggerToast('🔧 Двигатель критически поврежден!');

  audio.play('engine');
  isDriving = true;
  
  const modal = document.getElementById('trip-modal');
  const fill = document.getElementById('trip-progress-fill');
  const log = document.getElementById('trip-event-log');
  const speedTxt = document.getElementById('trip-speed');
  
  modal.classList.remove('hidden');
  document.getElementById('trip-route').innerText = `${order.from} ➔ ${order.to}`;
  
  let speedMult = currentCar.speed;
  if (currentUser.upgrades.includes('chip')) speedMult *= 1.25;
  if (currentWeather.name === 'Дождь' || currentWeather.name === 'Снегопад') speedMult *= 0.75;
  
  let progress = 0;
  let hasEvent = false;

  const tripInt = setInterval(() => {
    progress += (speedMult * 1.5);
    fill.style.width = Math.min(progress, 100) + '%';
    speedTxt.innerText = `${Math.floor(60 * speedMult + Math.random()*15)} км/ч`;

    // Генерация случайного события на середине пути
    if (progress > 35 && progress < 65 && !hasEvent) {
      hasEvent = true;
      const riskChance = Math.max(0, currentWeather.risk - (currentCar.riskResist / 100));
      
      const rand = Math.random();
      if (rand < riskChance) {
         // Негативное событие (ДТП / Поломка)
         audio.play('crash');
         log.innerText = "⚠️ Пробито колесо! Скорость снижена, машина повреждена.";
         log.style.color = "#ef4444";
         speedMult *= 0.6;
         engineCond -= Math.floor(Math.random() * 15 + 10);
      } else if (rand > 0.7 && rand < 0.85 && !currentUser.upgrades.includes('radar')) {
         // Полиция
         audio.play('police');
         log.innerText = "🚓 Камера ДПС! Штраф за превышение скорости.";
         log.style.color = "#f59e0b";
         const penalty = Math.floor(order.reward * 0.2);
         order.reward -= penalty;
      } else if (rand >= 0.85) {
         // Позитивное событие
         audio.play('coin');
         log.innerText = "💬 Клиенту нравится стиль вождения. Настроение +";
         log.style.color = "#10b981";
         order.reward += Math.floor(order.reward * 0.2);
      }
    }

    if (progress >= 100) {
      clearInterval(tripInt);
      finishOrder(order, log, modal, fuelCost);
    }
  }, 100);
}

function finishOrder(order, log, modal, fuelCost) {
  isDriving = false;
  fuel = Math.max(0, fuel - fuelCost);
  engineCond = Math.max(0, engineCond - Math.floor(Math.random() * 4 + 1));
  
  let finalReward = order.reward;
  if (currentUser.upgrades.includes('vip') && Math.random() > 0.4) {
    finalReward = Math.floor(finalReward * 1.4);
    triggerToast("💸 Клиент оставил щедрые чаевые!");
  }

  currentUser.balance += finalReward;
  currentUser.total_trips += 1;
  addEXP(order.dist * 12);
  
  audio.play('coin');
  log.innerText = `✅ Маршрут завершен! Заработано: $${finalReward}`;
  log.style.color = "#10b981";
  
  updateUI();
  saveState();
  generateOrders();

  setTimeout(() => {
    modal.classList.add('hidden');
    log.innerText = "Навигатор построен. Движение начато...";
    log.style.color = "#60a5fa";
  }, 2200);
}

function addEXP(amt) {
  currentUser.exp += amt;
  const need = currentUser.level * 180;
  if (currentUser.exp >= need) {
    currentUser.level++;
    currentUser.exp -= need;
    triggerToast(`🎉 УРОВЕНЬ ПОВЫШЕН ДО ${currentUser.level}!`);
  }
}

// ==========================================
// ОБСЛУЖИВАНИЕ АВТОМОБИЛЯ
// ==========================================
function refuel() {
  audio.play('click');
  if (fuel >= 100) return triggerToast('⛽ Бак уже полон!');
  if (currentUser.balance < 250) return triggerToast('❌ Недостаточно средств!');
  currentUser.balance -= 250; 
  fuel = 100; 
  updateUI(); 
  saveState();
  triggerToast('✅ Автомобиль заправлен!');
}

function repairCar() {
  audio.play('click');
  if (engineCond >= 100) return triggerToast('🔧 Автомобиль в идеальном состоянии!');
  if (currentUser.balance < 600) return triggerToast('❌ Недостаточно средств!');
  currentUser.balance -= 600; 
  engineCond = 100; 
  updateUI(); 
  saveState();
  triggerToast('✅ Двигатель отремонтирован!');
}

// ==========================================
// ГАРАЖ И АВТОСАЛОН
// ==========================================
function renderGarage() {
  document.getElementById('current-car-name').innerText = currentCar.name;
  const container = document.getElementById('garage-list');
  if(!container) return;

  container.innerHTML = CARS.map(c => {
    const isOwned = currentUser.owned_cars.includes(c.id);
    const hasDriver = currentUser.auto_drivers.includes(c.id);
    const isSelected = currentCar.id === c.id;
    return `
      <div class="glass-card garage-item">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b style="font-size:15px;">${c.name}</b> <span style="font-size:10px; color:#f59e0b;">(Ур. ${c.reqLevel})</span>
            <div style="font-size:11px; color:#9ca3af; margin-top:4px; line-height:1.4;">
              Множитель скорости: x${c.speed} <br>
              Пассив: +$${c.passive}/10с | Броня: ${c.riskResist}%
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
          <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#9ca3af;">Сдача в аренду (Пассивный доход)</span>
            ${hasDriver 
              ? `<span style="font-size:11px; color:#10b981; font-weight:bold;">В работе ✅</span>` 
              : `<button class="btn-sm" style="width:auto; padding:4px 10px;" onclick="hireDriver('${c.id}')">Нанять за $${Math.floor(c.price * 0.25)}</button>`
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
  triggerToast(`🎉 Ключи от ${c.name} ваши!`);
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
  const cost = Math.floor(c.price * 0.25);
  if (currentUser.balance < cost) return triggerToast('❌ Недостаточно средств на найм!');
  
  currentUser.balance -= cost;
  currentUser.auto_drivers.push(id);
  renderGarage();
  saveState();
  triggerToast(`👨‍✈️ Водитель нанят! Начат пассивный заработок на ${c.name}.`);
}

// ==========================================
// ТЮНИНГ И УЛУЧШЕНИЯ
// ==========================================
function renderTuning() {
  const container = document.getElementById('tuning-list');
  if(!container) return;

  container.innerHTML = TUNING.map(t => {
    const isBought = currentUser.upgrades.includes(t.id);
    return `
      <div class="glass-card garage-item" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <b style="font-size:14px;">${t.name}</b>
          <div style="font-size:11px; color:#10b981; margin-top:4px;">${t.desc}</div>
        </div>
        <button class="btn-neon-sm" onclick="buyTuning('${t.id}')" style="${isBought ? 'background:#374151; color:#9ca3af; cursor:not-allowed;' : ''}">
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
  if (currentUser.balance < t.price) return triggerToast('❌ Недостаточно средств на установку!');
  
  currentUser.balance -= t.price;
  currentUser.upgrades.push(id);
  renderTuning();
  saveState();
  triggerToast(`⚡ Установлено оборудование: ${t.name}!`);
}

// ==========================================
// ЗАЛ СЛАВЫ (БЕЗОПАСНЫЙ ЗАПРОС ЧЕРЕЗ RPC)
// ==========================================
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if(!container) return;
  
  try {
    if (!db) throw new Error("Нет подключения к Supabase");
    
    const { data, error } = await db.rpc('get_top_earners');
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      container.innerHTML = data.map((item, i) => `
        <div class="glass-card garage-item" style="display:flex; justify-content:space-between; align-items:center; padding: 12px 15px;">
          <div style="display:flex; gap:10px; align-items:center;">
            <b style="font-size: 16px; color: ${i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : '#3b82f6'};">#${i + 1}</b> 
            <span style="font-weight: 500;">${item.custom_nickname || item.first_name || 'Неизвестный'}</span>
          </div>
          <div style="color:#10b981; font-weight:bold; font-size: 15px;">$${Number(item.balance || 0).toLocaleString()}</div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<div style="text-align:center; color:#9ca3af; font-size:12px; margin-top:20px;">Рейтинг пока пуст</div>`;
    }
  } catch (err) {
    console.error("Полная ошибка RPC:", err);
    // Выводим детальный JSON ошибки прямо на экран телефона в интерфейс игры
    container.innerHTML = `
      <div style="padding: 15px; color: #ef4444; font-size: 11px; word-break: break-all; text-align: left; background: rgba(239, 68, 68, 0.1); border-radius: 8px; margin: 10px;">
        <b>DEBUG ERROR:</b><br>
        ${JSON.stringify(err, null, 2)}
      </div>
    `;
  }
}


// ==========================================
// ПРОФИЛЬ И ИНТЕРФЕЙС
// ==========================================
function saveNickname() {
  audio.play('click');
  const val = document.getElementById('input-nickname').value.trim();
  if (val.length < 2 || val.length > 15) return triggerToast('❌ Никнейм должен быть от 2 до 15 символов!');
  
  currentUser.custom_nickname = val;
  updateUI();
  saveState();
  triggerToast('✅ Позывной успешно обновлен!');
}

function triggerToast(msg) {
  const t = document.getElementById('event-toast');
  if(!t) return;
  t.innerText = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function switchTab(tab) {
  audio.play('click');
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById('tab-' + tab).classList.remove('hidden');
  
  // Поиск активной кнопки и добавление класса
  const btns = document.querySelectorAll('.nav-btn');
  for (let btn of btns) {
    if (btn.getAttribute('onclick').includes(tab)) {
      btn.classList.add('active');
      break;
    }
  }

  if (tab === 'garage') renderGarage();
  if (tab === 'tuning') renderTuning();
  if (tab === 'leaders') loadLeaderboard();
}

function updateUI() {
  document.getElementById('balance').innerText = '$' + Number(currentUser.balance).toLocaleString();
  document.getElementById('header-level').innerText = currentUser.level;
  document.getElementById('exp-bar').style.width = Math.min((currentUser.exp / (currentUser.level * 180)) * 100, 100) + '%';
  
  document.getElementById('fuel-val').innerText = Math.floor(fuel) + '%';
  const fBar = document.getElementById('fuel-bar');
  if(fBar) {
    fBar.style.width = fuel + '%';
    fBar.style.background = fuel > 30 ? '#3b82f6' : '#ef4444';
  }
  
  document.getElementById('engine-val').innerText = Math.floor(engineCond) + '%';
  const eBar = document.getElementById('engine-bar');
  if(eBar) {
    eBar.style.width = engineCond + '%';
    eBar.style.background = engineCond > 30 ? '#10b981' : '#ef4444';
  }

  const name = currentUser.custom_nickname || currentUser.first_name;
  
  const pName = document.getElementById('profile-name');
  if(pName) pName.innerText = name;
  
  const pRating = document.getElementById('profile-rating-val');
  if(pRating) pRating.innerText = `⭐ ${currentUser.rating.toFixed(2)}`;
  
  const pTrips = document.getElementById('profile-trips');
  if(pTrips) pTrips.innerText = currentUser.total_trips;
  
  const pExp = document.getElementById('profile-exp');
  if(pExp) pExp.innerText = currentUser.exp;
  
  const pAvatar = document.getElementById('profile-avatar');
  if (pAvatar && currentUser.avatar_url) pAvatar.src = currentUser.avatar_url;
}
