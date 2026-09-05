// ==========================================
// ЯДРО СИСТЕМЫ И ИНИЦИАЛИЗАЦИЯ
// ==========================================

const SUPABASE_URL = 'https://ffgycumfccwcywyammzj.supabase.co';
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
  // ЭКОНОМ
  { id: 'vaz2107', name: 'ВАЗ - 2107', class: 'ЭКОНОМ', cssClass: 'class-econom', image: 'https://i.ibb.co.com/Y4KpBGv2/5-F08-F869-B7-DB-423-E-A8-F1-8-B219-CF1-EF60.png', price: 0, reqLevel: 1, speed: 1.0, fuelDrain: 1.0, passive: 10, riskResist: 0 },
  { id: 'seat1991', name: 'SEAT TOLEDO', class: 'ЭКОНОМ', cssClass: 'class-econom', image: 'https://i.ibb.co.com/jjL5gvN/4-D7-E6-C8-A-D624-4-CA2-9-FFB-05-CC9-AB4426-D.png', price: 3500, reqLevel: 2, speed: 1.2, fuelDrain: 1.1, passive: 20, riskResist: 2 },
  { id: 'vaz2115', name: 'ВАЗ - 2115', class: 'ЭКОНОМ', cssClass: 'class-econom', image: 'https://i.ibb.co.com/nNVXD9V7/CE50-CB34-C549-44-BA-8140-023978-A0521-A.png', price: 8000, reqLevel: 3, speed: 1.3, fuelDrain: 1.2, passive: 35, riskResist: 5 },
  { id: 'priora', name: 'LADA Priora', class: 'ЭКОНОМ', cssClass: 'class-econom', image: 'https://i.ibb.co.com/PvF68tx2/9-B8592-B0-8129-41-FB-81-A1-65-EB67-E26-B88.png', price: 15000, reqLevel: 4, speed: 1.5, fuelDrain: 1.3, passive: 50, riskResist: 10 },
  // КОМФОРТ
  { id: 'passatb5', name: 'PASSAT B5', class: 'КОМФОРТ', cssClass: 'class-comfort', image: 'https://i.ibb.co.com/23wYDHd2/27-A556-C7-E2-C5-4189-B6-F7-42-F4-DD159907.png', price: 35000, reqLevel: 5, speed: 1.8, fuelDrain: 1.5, passive: 90, riskResist: 15 },
  { id: 'lexuslx', name: 'LEXUS LX 470', class: 'КОМФОРТ', cssClass: 'class-comfort', image: 'https://i.ibb.co.com/9kgCkDq9/018-D6-BB3-9-E53-41-F7-B1-EF-2809-C17643-DE.png', price: 65000, reqLevel: 6, speed: 2.0, fuelDrain: 1.8, passive: 150, riskResist: 20 },
  { id: 'bmwe39', name: 'BMW e39', class: 'КОМФОРТ', cssClass: 'class-comfort', image: 'https://i.ibb.co.com/Jw1M84rw/5-https://i.ibb.co.com/8gNKAFDCBB0-D82-F-4-FA7-AB73-89-A945-B29501.png', price: 110000, reqLevel: 7, speed: 2.2, fuelDrain: 2.0, passive: 250, riskResist: 25 },
  { id: 'mercedes200', name: 'MERSEDES 200', class: 'КОМФОРТ', cssClass: 'class-comfort', image: 'https://i.ibb.co.com/S7PjhqHz/2559-D4-F7-27-BA-4985-8-A1-A-C349688-CCBE9.png', price: 180000, reqLevel: 8, speed: 2.4, fuelDrain: 2.1, passive: 350, riskResist: 30 },
  // БИЗНЕС
  { id: 'bmwx5', name: 'BMW X5', class: 'БИЗНЕС', cssClass: 'class-business', image: 'https://i.ibb.co.com/5hJ1cG5R/99474-E44-5570-418-C-A0-E0-ECE835-C58-E6-D.png', price: 300000, reqLevel: 10, speed: 2.8, fuelDrain: 2.5, passive: 550, riskResist: 40 },
  { id: 'changan', name: 'Changan Lamore', class: 'БИЗНЕС', cssClass: 'class-business', image: 'https://i.ibb.co.com/FqhMPv0q/FE7-A0-CBE-CC97-40-FC-9802-7-C1-B81-DFF540.png', price: 450000, reqLevel: 12, speed: 3.0, fuelDrain: 2.6, passive: 800, riskResist: 45 },
  // ЭЛИТА
  { id: 'maybach', name: 'MAYBAX', class: 'ЭЛИТА', cssClass: 'class-elite', image: 'https://i.ibb.co.com/PzvLkkw5/1-E69-B68-A-C6-F4-4-E6-C-855-E-4-AECC34-A0-BA3.png', price: 800000, reqLevel: 15, speed: 3.5, fuelDrain: 3.0, passive: 1500, riskResist: 60 },
  { id: 'panamera', name: 'PORSH PANAMERA', class: 'ЭЛИТА', cssClass: 'class-elite', image: 'https://i.ibb.co.com/prQ1RWSZ/6793-F77-B-DD6-E-4-B92-87-E2-20-EB26-FC8-C11.png', price: 1500000, reqLevel: 18, speed: 4.0, fuelDrain: 3.5, passive: 2500, riskResist: 75 }
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
  first_name: tg?.initDataUnsafe?.user?.first_name || 'Гонщик',
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
    const { error } = await db.rpc('upsert_my_profile', {
      p_telegram_id: currentUser.telegram_id,
      p_first_name: currentUser.first_name,
      p_avatar_url: currentUser.avatar_url,
      p_balance: currentUser.balance,
      p_level: currentUser.level,
      p_exp: currentUser.exp,
      p_rating: currentUser.rating,
      p_total_trips: currentUser.total_trips,
      p_custom_nickname: currentUser.custom_nickname || ''
    });
    
    if (error) throw error;
  } catch (e) {
    console.warn("Ошибка сохранения в БД:", e);
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
      if (p > 20 && p < 50) log.innerText = "> Подключение к серверам...";
      if (p > 50 && p < 80) log.innerText = "> Синхронизация профиля...";
      if (p > 80 && p < 100) log.innerText = "> Загрузка автопарка...";
    }
    
    if (p === 100) {
      clearInterval(int);
      if(log) log.innerText = "> Система готова.";
      setTimeout(() => {
        document.getElementById('loader-block').classList.add('hidden');
        document.getElementById('start-block').classList.remove('hidden');
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
  loadGlobalStats();
  updateUI();
}

// ==========================================
// ИГРОВЫЕ ЦИКЛЫ
// ==========================================
function startGameLoops() {
  setInterval(() => {
    currentWeather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    const wIcon = document.getElementById('weather-icon');
    const wName = document.getElementById('weather-name');
    const wMult = document.getElementById('weather-mult');
    
    if(wIcon) wIcon.innerText = currentWeather.icon;
    if(wName) wName.innerText = currentWeather.name;
    if(wMult) wMult.innerText = `Тариф: x${currentWeather.mult}`;
    
    if (!isDriving) generateOrders();
  }, 90000);

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

    if (progress > 35 && progress < 65 && !hasEvent) {
      hasEvent = true;
      const riskChance = Math.max(0, currentWeather.risk - (currentCar.riskResist / 100));
      
      const rand = Math.random();
      if (rand < riskChance) {
         audio.play('crash');
         log.innerText = "⚠️ Пробито колесо! Скорость снижена, машина повреждена.";
         log.style.color = "#ef4444";
         speedMult *= 0.6;
         engineCond -= Math.floor(Math.random() * 15 + 10);
      } else if (rand > 0.7 && rand < 0.85 && !currentUser.upgrades.includes('radar')) {
         audio.play('police');
         log.innerText = "🚓 Камера ДПС! Штраф за превышение скорости.";
         log.style.color = "#f59e0b";
         const penalty = Math.floor(order.reward * 0.2);
         order.reward -= penalty;
      } else if (rand >= 0.85) {
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
        <div class="car-image-container">
           <img src="${c.image}" alt="${c.name}">
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="car-class-badge ${c.cssClass}">${c.class}</span><br>
            <b style="font-size:15px;">${c.name}</b> <span style="font-size:10px; color:#f59e0b;">(Ур. ${c.reqLevel})</span>
            <div style="font-size:11px; color:#9ca3af; margin-top:4px; line-height:1.4;">
              Множитель скорости: x${c.speed} <br>
              Пассив: +$${c.passive}/10с | Броня: ${c.riskResist}%
            </div>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; gap: 8px;">
            ${!isOwned 
              ? `<button class="btn-neon-sm" onclick="buyCar('${c.id}')">Купить<br>$${c.price.toLocaleString()}</button>`
              : `<button class="btn-neon-sm" style="background:${isSelected ? '#10b981' : '#3b82f6'}" onclick="selectCar('${c.id}')">${isSelected ? 'Выбрано' : 'Сесть за руль'}</button>`
            }
          </div>
        </div>
        ${isOwned ? `
          <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#9ca3af;">Сдача в аренду</span>
            ${hasDriver 
              ? `<span style="font-size:11px; color:#10b981; font-weight:bold;">В работе ✅</span>` 
              : `<button class="btn-sm" style="width:auto; padding:4px 10px;" onclick="hireDriver('${c.id}')">Нанять за $${Math.floor(c.price * 0.25).toLocaleString()}</button>`
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
          <div style="color:#10b981; font-weight:bold; font-size: 15px;">$${Number(item.balance).toLocaleString()}</div>
        </div>
      `).join('');
      return;
    } else {
      container.innerHTML = `<div style="text-align:center; color:#9ca3af; font-size:12px; margin-top:20px;">Рейтинг пока пуст</div>`;
      return;
    }
  } catch (err) {
    console.warn("Ошибка загрузки рейтинга:", err);
    container.innerHTML = `<div style="text-align:center; color:#ef4444; font-size:12px; margin-top:20px;">Данные рейтинга недоступны. Проверьте БД.</div>`;
  }
}

// ==========================================
// ГЛОБАЛЬНАЯ СТАТИСТИКА
// ==========================================
async function loadGlobalStats() {
  const elPlayers = document.getElementById('stat-players');
  const elEarned = document.getElementById('stat-earned');
  const elTrips = document.getElementById('stat-trips');
  
  if (!elPlayers || !db) return;
  
  try {
    const { data, error } = await db.rpc('get_global_stats');
    if (error) throw error;
    
    if (data && data.length > 0) {
      const stats = data[0];
      elPlayers.textContent = Number(stats.total_players || 0).toLocaleString();
      elEarned.textContent = `$${Number(stats.total_earned || 0).toLocaleString()}`;
      elTrips.textContent = Number(stats.total_trips || 0).toLocaleString();
    }
  } catch (err) {
    console.warn("Ошибка загрузки глобальной статистики:", err);
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
  
  const btns = document.querySelectorAll('.nav-btn');
  for (let btn of btns) {
    if (btn.getAttribute('onclick')?.includes(tab)) {
      btn.classList.add('active');
      break;
    }
  }

  if (tab === 'garage') renderGarage();
  if (tab === 'tuning') renderTuning();
  if (tab === 'leaders') loadLeaderboard();
  if (tab === 'profile') loadGlobalStats();
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
