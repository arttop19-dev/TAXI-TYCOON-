// Вставь свои ключи Supabase ниже!
const SUPABASE_URL = 'https://ffgycumfccwcywyammzj.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3ljdW1mY2N3Y3l3eWFtbXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjE4NTUsImV4cCI6MjEwNDA5Nzg1NX0.4QecPesjUcQaGXg7yBGqa1_ONIwPNbQWmsue9Spdrwc';

let db = null;

// WEB AUDIO ENGINE (Синтезатор звуков)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playCoin() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.3);
  }

  playEngine() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.5);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.5);
  }

  playSiren() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.25);
    osc.frequency.linearRampToValueAtTime(600, now + 0.5);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.5);
  }

  playCrash() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.4);
  }
}

const audio = new SoundEngine();

function toggleAudio() {
  audio.enabled = !audio.enabled;
  document.getElementById('audio-toggle').innerText = audio.enabled ? '🔊' : '🔇';
}

// Данные
const CARS = [
  { id: 'vaz2107', name: 'ВАЗ-2107 Cyber', price: 0, reqLevel: 1, income: 400, time: 5, passiveIncome: 10 },
  { id: 'vaz2115', name: 'ВАЗ-2115 Neon', price: 6000, reqLevel: 2, income: 750, time: 6, passiveIncome: 30 },
  { id: 'priora', name: 'Lada Priora Stance', price: 18000, reqLevel: 3, income: 1400, time: 7, passiveIncome: 80 },
  { id: 'passatb5', name: 'VW Passat B5 Turbo', price: 40000, reqLevel: 4, income: 2500, time: 9, passiveIncome: 180 },
  { id: 'lexuslx', name: 'Lexus LX 470 VIP', price: 100000, reqLevel: 5, income: 5500, time: 11, passiveIncome: 450 },
  { id: 'maybach', name: 'Maybach Cyber-Edition', price: 300000, reqLevel: 7, income: 15000, time: 14, passiveIncome: 1200 }
];

const TUNING_PARTS = [
  { id: 'turbo', name: 'Турбо-кит Stage 1', price: 5000, incomeBonus: 1.2, desc: '+20% к доходу' },
  { id: 'chip', name: 'Чип-Тюнинг ЭБУ', price: 12000, speedBonus: 1, desc: '-1 сек от времени поездки' },
  { id: 'neon', name: 'Неоновая подсветка', price: 8000, tipBonus: 0.15, desc: '+15% к шансу чаевых' }
];

const CONTRACTS = [
  { id: 1, title: 'Доставка VIP Клиента', reward: 12000, reqLevel: 2, desc: 'Быстрая поездка без задержек' },
  { id: 2, title: 'Срочный груз в аэропорт', reward: 25000, reqLevel: 4, desc: 'Требуется авто высокого класса' }
];

const WEATHERS = [
  { id: 'clear', name: 'Ясно', icon: '☀️', mult: 1.0, accidentRisk: 0.02 },
  { id: 'rain', name: 'Кибер-дождь', icon: '🌧️', mult: 1.3, accidentRisk: 0.08 },
  { id: 'fog', name: 'Густой туман', icon: '🌫️', mult: 1.5, accidentRisk: 0.12 },
  { id: 'storm', name: 'Неоновый шторм', icon: '⚡', mult: 2.0, accidentRisk: 0.20 }
];

let currentWeather = WEATHERS[0];

let currentUser = {
  telegram_id: null,
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
let tiresCond = 100;
let isDriving = false;

window.onload = async () => {
  initCyberParticles();
  loadFromLocalStorage();

  try {
    if (window.supabase && SUPABASE_URL !== 'ТВОЙ_SUPABASE_URL') {
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    await initUser();
  } catch (err) {
    console.warn("Автономный режим", err);
  }

  simulateLoading();
  startPassiveIncomeLoop();
  startWeatherLoop();
};

function initCyberParticles() {
  const canvas = document.getElementById('cyber-bg');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 35 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    speed: 0.5 + Math.random() * 1.5,
    size: 1.5,
    color: Math.random() > 0.5 ? '#f59e0b' : '#3b82f6'
  }));

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.speed;
      if (p.y > canvas.height) p.y = 0;
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
  let progress = 0;
  const fill = document.getElementById('progress-fill');
  const percentTxt = document.getElementById('progress-percent');
  const logTxt = document.getElementById('terminal-log');

  const logs = [
    { p: 10, text: "> [BIOS] Quantum-Core CPU Initialized..." },
    { p: 25, text: "> [NET] Connecting to Cyber-City Grid..." },
    { p: 45, text: "> [AUDIO] Synthesizing WebAudio Engine..." },
    { p: 65, text: "> [GPS] Calibrating Astana Navigation..." },
    { p: 85, text: "> [DATABASE] Syncing Drivers Profile..." },
    { p: 100, text: "> [READY] Cybernet link established!" }
  ];

  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 6) + 3;
    if (progress > 100) progress = 100;

    if (fill) fill.style.width = progress + '%';
    if (percentTxt) percentTxt.innerText = progress + '%';

    const currentLog = logs.reduce((acc, curr) => progress >= curr.p ? curr.text : acc, logs[0].text);
    if (logTxt && logTxt.innerText !== currentLog) {
      logTxt.innerText = currentLog;
      audio.playClick();
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById('loader-block').classList.add('hidden');
        document.getElementById('start-block').classList.remove('hidden');
      }, 400);
    }
  }, 90);
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('cyber_taxi_user');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      currentUser = { ...currentUser, ...parsed };
      updateUI();
    } catch(e) {}
  }
}

async function initUser() {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || { id: 80399910, first_name: 'Водитель' };
  currentUser.telegram_id = tgUser.id;

  if (!db) {
    updateUI();
    return;
  }

  let { data: profile } = await db.from('profiles').select('*').eq('telegram_id', tgUser.id).single();

  if (!profile) {
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
      auto_drivers: currentUser.auto_drivers,
      upgrades: currentUser.upgrades
    }).select().single();

    if (newProfile) currentUser = newProfile;
  } else {
    currentUser = {
      ...currentUser,
      ...profile,
      owned_cars: profile.owned_cars || ['vaz2107'],
      auto_drivers: profile.auto_drivers || [],
      upgrades: profile.upgrades || []
    };
  }

  saveState();
  updateUI();
}

function saveState() {
  localStorage.setItem('cyber_taxi_user', JSON.stringify(currentUser));

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
      auto_drivers: currentUser.auto_drivers,
      upgrades: currentUser.upgrades
    }, { onConflict: 'telegram_id' }).then();
  }
}

function startGame() {
  audio.playClick();
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('main-game').classList.remove('hidden');
  renderGarage();
  renderTuning();
  renderContracts();
  loadLeaderboard();
  updateUI();
}

function takeOrder() {
  if (isDriving) return;
  if (fuel < 15 || engineCond < 10 || tiresCond < 10) {
    triggerToast('⚠️ Автомобилю нужен ремонт или заправка!');
    return;
  }

  audio.playEngine();
  isDriving = true;
  const btn = document.getElementById('btn-drive');
  const log = document.getElementById('trip-event-log');

  let tripTime = currentCar.time;
  if (currentUser.upgrades.includes('chip')) tripTime = Math.max(3, tripTime - 1);

  let timeLeft = tripTime;
  btn.style.background = '#374151';
  log.innerText = 'Подключение к AR-навигатору...';

  const tripInterval = setInterval(() => {
    btn.innerText = `ЕДЕМ... ${timeLeft} сек`;
    timeLeft--;

    if (timeLeft === 2 && Math.random() < 0.25) {
      clearInterval(tripInterval);
      triggerPoliceEvent(btn, log);
      return;
    }

    if (timeLeft < 0) {
      clearInterval(tripInterval);
      finishOrder(btn, log);
    }
  }, 1000);
}

function triggerPoliceEvent(btn, log) {
  audio.playSiren();
  document.getElementById('police-modal').classList.remove('hidden');
}

function resolvePolice(action) {
  audio.playClick();
  document.getElementById('police-modal').classList.add('hidden');
  const btn = document.getElementById('btn-drive');
  const log = document.getElementById('trip-event-log');

  if (action === 'bribe') {
    if (currentUser.balance < 1500) {
      triggerToast('❌ Не хватило денег на взятку! Оштрафован!');
      currentUser.balance = Math.max(0, currentUser.balance - 2000);
    } else {
      currentUser.balance -= 1500;
      triggerToast('👮 Вы откупились от ДПС.');
    }
  } else {
    if (Math.random() > 0.5) {
      triggerToast('🏎️ Вы оторвались от погони!');
      addEXP(50);
    } else {
      audio.playCrash();
      currentUser.balance = Math.max(0, currentUser.balance - 3000);
      triggerToast('💥 Вас зажали! Штраф -$3,000!');
    }
  }

  btn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  btn.innerText = 'ПРИНЯТЬ ВЫЗОВ';
  isDriving = false;
  updateUI();
  saveState();
}

function finishOrder(btn, log) {
  fuel -= 12;
  engineCond -= Math.floor(Math.random() * 6) + 4;
  tiresCond -= Math.floor(Math.random() * 8) + 5;

  let baseIncome = currentCar.income * currentWeather.mult;
  if (currentUser.upgrades.includes('turbo')) baseIncome *= 1.2;

  const accidentChance = currentWeather.accidentRisk + (100 - tiresCond) * 0.002;
  if (Math.random() < accidentChance) {
    audio.playCrash();
    const repairCost = 600;
    currentUser.balance = Math.max(0, currentUser.balance - repairCost);
    log.innerText = `💥 ДТП! Ремонт -$${repairCost}`;
    triggerToast('💥 Вы попали в ДТП!');
  } else {
    audio.playCoin();
    let earned = Math.floor(baseIncome);
    let tipBonusChance = 0.2;
    if (currentUser.upgrades.includes('neon')) tipBonusChance += 0.15;

    if (Math.random() < tipBonusChance) {
      const tip = Math.floor(earned * 0.25);
      earned += tip;
      log.innerText = `✨ Отличная поездка! Чаевые: +$${tip}`;
    } else {
      log.innerText = '✅ Пассажир доставлен вовремя.';
    }

    currentUser.balance += earned;
    currentUser.total_trips += 1;
    addEXP(30);
  }

  updateUI();
  saveState();

  btn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  btn.innerText = 'ПРИНЯТЬ ВЫЗОВ';
  isDriving = false;
}

function addEXP(amount) {
  currentUser.exp += amount;
  const nextLevelExp = currentUser.level * 100;
  if (currentUser.exp >= nextLevelExp) {
    currentUser.level += 1;
    currentUser.exp -= nextLevelExp;
    triggerToast(`🎉 НОВЫЙ УРОВЕНЬ: ${currentUser.level}!`);
  }
}

function refuel() {
  audio.playClick();
  if (currentUser.balance < 300) return triggerToast('❌ Недостаточно средств!');
  currentUser.balance -= 300;
  fuel = 100;
  updateUI();
  saveState();
}

function repairEngine() {
  audio.playClick();
  if (currentUser.balance < 500) return triggerToast('❌ Недостаточно средств!');
  currentUser.balance -= 500;
  engineCond = 100;
  updateUI();
  saveState();
}

function replaceTires() {
  audio.playClick();
  if (currentUser.balance < 400) return triggerToast('❌ Недостаточно средств!');
  currentUser.balance -= 400;
  tiresCond = 100;
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

function startWeatherLoop() {
  setInterval(() => {
    currentWeather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    document.getElementById('weather-icon').innerText = currentWeather.icon;
    document.getElementById('weather-name').innerText = currentWeather.name;
    document.getElementById('weather-mult').innerText = `Множитель: x${currentWeather.mult}`;
    triggerToast(`🌦️ Погода изменилась: ${currentWeather.name}!`);
  }, 45000);
}

function renderGarage() {
  const container = document.getElementById('garage-list');
  container.innerHTML = CARS.map(car => {
    const isOwned = currentUser.owned_cars.includes(car.id);
    const hasDriver = currentUser.auto_drivers.includes(car.id);
    const isSelected = currentCar.id === car.id;

    return `
      <div class="card glass-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b>${car.name}</b> <span style="font-size:10px; color:#f59e0b;">(Ур. ${car.reqLevel})</span>
            <div style="font-size:11px; color:#9ca3af">Доход: +$${car.income} | Пассив: +$${car.passiveIncome}/10с</div>
          </div>
          <div>
            ${!isOwned ? `
              <button class="btn-neon-sm" onclick="buyCar('${car.id}')" style="width:auto; padding:6px 10px; font-size:11px;">Купить $${car.price}</button>
            ` : `
              <button onclick="selectCar('${car.id}')" style="padding:6px 10px; font-size:11px; border-radius:6px; border:none; background:${isSelected ? '#374151' : '#f59e0b'}; color:${isSelected ? '#fff' : '#000'}">
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
              <button onclick="hireDriver('${car.id}')" style="padding:4px 8px; font-size:10px; width:auto; background:#3b82f6; border:none; border-radius:4px; color:#fff; cursor:pointer;">Нанять ($${car.price * 0.3})</button>
            `}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderTuning() {
  const container = document.getElementById('tuning-list');
  container.innerHTML = TUNING_PARTS.map(part => {
    const isBought = currentUser.upgrades.includes(part.id);
    return `
      <div class="card glass-card" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <b>${part.name}</b>
          <div style="font-size:11px; color:#10b981;">${part.desc}</div>
        </div>
        <button class="btn-neon-sm" onclick="buyTuning('${part.id}')" style="width:auto; padding:6px 12px; font-size:11px; ${isBought ? 'background:#374151; color:#fff;' : ''}">
          ${isBought ? 'Установлено' : '$' + part.price}
        </button>
      </div>
    `;
  }).join('');
}

function renderContracts() {
  const container = document.getElementById('contracts-list');
  container.innerHTML = CONTRACTS.map(c => `
    <div class="card glass-card">
      <b>${c.title}</b>
      <div style="font-size:11px; color:#9ca3af; margin:4px 0;">${c.desc}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
        <span style="color:#10b981; font-weight:bold;">+$${c.reward}</span>
        <button class="btn-neon-sm" onclick="executeContract(${c.reward}, ${c.reqLevel})" style="width:auto; padding:6px 12px;">Выполнить</button>
      </div>
    </div>
  `).join('');
}

function executeContract(reward, reqLvl) {
  audio.playClick();
  if (currentUser.level < reqLvl) return triggerToast(`🔒 Нужен уровень ${reqLvl}!`);
  currentUser.balance += reward;
  audio.playCoin();
  triggerToast(`📜 Контракт выполнен! +$${reward}`);
  updateUI();
  saveState();
}

function buyTuning(partId) {
  audio.playClick();
  if (currentUser.upgrades.includes(partId)) return;
  const part = TUNING_PARTS.find(p => p.id === partId);
  if (currentUser.balance < part.price) return triggerToast('❌ Недостаточно средств!');

  currentUser.balance -= part.price;
  currentUser.upgrades.push(partId);
  updateUI();
  renderTuning();
  saveState();
  triggerToast(`⚡ Тюнинг "${part.name}" установлен!`);
}

function buyCar(carId) {
  audio.playClick();
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
  audio.playClick();
  const car = CARS.find(c => c.id === carId);
  currentCar = car;
  document.getElementById('order-car-title').innerText = car.name;
  document.getElementById('order-class').innerText = car.id.toUpperCase() + ' КЛАСС';
  document.getElementById('order-reward').innerText = '+$' + car.income;
  renderGarage();
}

function hireDriver(carId) {
  audio.playClick();
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
        <div class="card glass-card" style="display:flex; justify-content:space-between; align-items:center;">
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
    <div class="card glass-card" style="display:flex; justify-content:space-between; align-items:center;">
      <div><b>#1 CyberDriver</b><div style="font-size:11px; color:#9ca3af">Поездок: 150</div></div>
      <div style="color:#10b981; font-weight:bold;">$450,000</div>
    </div>
  `;
}

function switchTab(tab) {
  audio.playClick();
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  event.currentTarget.classList.add('active');
  if (tab === 'garage') renderGarage();
  if (tab === 'tuning') renderTuning();
  if (tab === 'contracts') renderContracts();
  if (tab === 'leaders') loadLeaderboard();
}

function triggerToast(msg) {
  const t = document.getElementById('event-toast');
  t.innerText = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function updateUI() {
  document.getElementById('balance').innerText = '$' + Number(currentUser.balance).toLocaleString();
  document.getElementById('rating').innerText = '⭐ ' + Number(currentUser.rating).toFixed(2);
  document.getElementById('header-level').innerText = currentUser.level;
  
  const nextLevelExp = currentUser.level * 100;
  const expPercent = Math.min((currentUser.exp / nextLevelExp) * 100, 100);
  document.getElementById('exp-bar').style.width = expPercent + '%';

  document.getElementById('fuel-val').innerText = fuel + '%';
  document.getElementById('fuel-bar').style.width = fuel + '%';
  document.getElementById('engine-val').innerText = engineCond + '%';
  document.getElementById('engine-bar').style.width = engineCond + '%';
  document.getElementById('tires-val').innerText = tiresCond + '%';
  document.getElementById('tires-bar').style.width = tiresCond + '%';

  const name = currentUser.custom_nickname || currentUser.first_name || 'Таксист';
  document.getElementById('user-name').innerText = name;
  document.getElementById('user-level').innerText = currentUser.level;
  document.getElementById('profile-name').innerText = name;
  document.getElementById('profile-rating-val').innerText = '⭐ ' + Number(currentUser.rating).toFixed(2);
  document.getElementById('profile-trips').innerText = currentUser.total_trips || 0;
  document.getElementById('profile-exp').innerText = currentUser.exp || 0;

  const badgesContainer = document.getElementById('tuning-status-badges');
  if (currentUser.upgrades.length > 0) {
    badgesContainer.innerHTML = currentUser.upgrades.map(u => `<span style="background:rgba(16,185,129,0.2); padding:2px 6px; border-radius:4px;">${u.toUpperCase()}</span>`).join(' ');
  } else {
    badgesContainer.innerText = 'Нет апгрейдов';
  }

  if (currentUser.avatar_url) {
    document.getElementById('user-avatar').src = currentUser.avatar_url;
    document.getElementById('profile-avatar').src = currentUser.avatar_url;
  }
}

function saveNickname() {
  audio.playClick();
  const nick = document.getElementById('input-nickname').value.trim();
  if (!nick) return;
  currentUser.custom_nickname = nick;
  updateUI();
  saveState();
  triggerToast('✅ Ник сохранен!');
}

function applyPromo() {
  audio.playClick();
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
