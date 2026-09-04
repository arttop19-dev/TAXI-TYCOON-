// Подключение к Supabase
const SUPABASE_URL = 'ТВОЙ_SUPABASE_URL';
const SUPABASE_KEY = 'ТВОЙ_ANON_KEY';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CARS = [
  { id: 'vaz', name: 'ВАЗ-2107', price: 0, class: 'Эконом', income: 400 },
  { id: 'solaris', name: 'Hyundai Solaris', price: 15000, class: 'Комфорт', income: 1200 },
  { id: 'camry', name: 'Toyota Camry', price: 50000, class: 'Бизнес', income: 3500 },
  { id: 'maybach', name: 'Maybach', price: 200000, class: 'VIP', income: 10000 }
];

let currentUser = null;
let currentCar = CARS[0];
let fuel = 100;
let condition = 100;
let isDriving = false;

// Инициализация при запуске
window.addEventListener('DOMContentLoaded', async () => {
  simulateLoading();
  await initUser();
});

function simulateLoading() {
  let p = 0;
  const fill = document.getElementById('progress-fill');
  const txt = document.getElementById('progress-text');
  
  const timer = setInterval(() => {
    p += 10;
    fill.style.width = p + '%';
    txt.innerText = `Загрузка... ${p}%`;
    if (p >= 100) {
      clearInterval(timer);
      document.getElementById('loader-block').classList.add('hidden');
      document.getElementById('start-block').classList.remove('hidden');
    }
  }, 100);
}

async function initUser() {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {
    id: 80399910,
    first_name: 'Данил',
    photo_url: null
  };

  let { data: profile } = await db.from('profiles').select('*').eq('telegram_id', tgUser.id).single();

  if (!profile) {
    const { data: newProfile } = await db.from('profiles').insert({
      telegram_id: tgUser.id,
      first_name: tgUser.first_name,
      avatar_url: tgUser.photo_url,
      balance: 1500
    }).select().single();
    profile = newProfile;
  }

  currentUser = profile;
  updateUI();
}

function updateUI() {
  if (!currentUser) return;
  document.getElementById('balance').innerText = '$' + Number(currentUser.balance).toLocaleString();
  document.getElementById('rating').innerText = '⭐ ' + (currentUser.rating || '4.80');
  document.getElementById('user-name').innerText = currentUser.custom_nickname || currentUser.first_name || 'Таксист';
  if (currentUser.avatar_url) document.getElementById('user-avatar').src = currentUser.avatar_url;
}

function startGame() {
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
  }
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('main-game').classList.remove('hidden');
  renderGarage();
  loadLeaderboard();
}

// Механика заказа
async function takeOrder() {
  if (isDriving) return;
  if (fuel < 15 || condition < 10) return alert('Нужно починить или заправить авто!');

  isDriving = true;
  const btn = document.getElementById('btn-drive');
  btn.innerText = 'В ПОЕЗДКЕ...';
  btn.style.opacity = '0.5';

  setTimeout(async () => {
    fuel -= 15;
    condition -= 8;
    document.getElementById('fuel-val').innerText = fuel + '%';
    document.getElementById('fuel-bar').style.width = fuel + '%';
    document.getElementById('cond-val').innerText = condition + '%';
    document.getElementById('cond-bar').style.width = condition + '%';

    const newBalance = Number(currentUser.balance) + currentCar.income;
    const newEarned = Number(currentUser.total_earned || 0) + currentCar.income;

    const { data } = await db.from('profiles').update({
      balance: newBalance,
      total_earned: newEarned,
      total_trips: (currentUser.total_trips || 0) + 1
    }).eq('id', currentUser.id).select().single();

    currentUser = data;
    updateUI();

    isDriving = false;
    btn.innerText = 'ВЗЯТЬ ЗАКАЗ';
    btn.style.opacity = '1';
  }, 2000);
}

// Заправка и ремонт
async function refuel() {
  if (currentUser.balance < 300) return alert('Недостаточно денег!');
  const { data } = await db.from('profiles').update({ balance: currentUser.balance - 300 }).eq('id', currentUser.id).select().single();
  currentUser = data;
  fuel = 100;
  document.getElementById('fuel-val').innerText = '100%';
  document.getElementById('fuel-bar').style.width = '100%';
  updateUI();
}

async function repair() {
  if (currentUser.balance < 500) return alert('Недостаточно денег!');
  const { data } = await db.from('profiles').update({ balance: currentUser.balance - 500 }).eq('id', currentUser.id).select().single();
  currentUser = data;
  condition = 100;
  document.getElementById('cond-val').innerText = '100%';
  document.getElementById('cond-bar').style.width = '100%';
  updateUI();
}

// Переключение вкладок
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  event.currentTarget.classList.add('active');
}

// Рендер гаража
function renderGarage() {
  const container = document.getElementById('garage-list');
  container.innerHTML = CARS.map(car => `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <b>${car.name}</b>
        <div style="font-size:11px; color:#9ca3af">Доход: +$${car.income}</div>
      </div>
      <button onclick="selectCar('${car.id}')" style="width:auto; padding:6px 12px;">
        ${currentCar.id === car.id ? 'Выбрано' : '$' + car.price}
      </button>
    </div>
  `).join('');
}

function selectCar(id) {
  const car = CARS.find(c => c.id === id);
  if (currentUser.balance < car.price) return alert('Недостаточно средств!');
  currentCar = car;
  document.getElementById('order-car-title').innerText = car.name;
  document.getElementById('order-class').innerText = car.class + ' КЛАСС';
  document.getElementById('order-reward').innerText = '+$' + car.income;
  renderGarage();
}

// Топ лидеров
async function loadLeaderboard() {
  const { data } = await db.rpc('get_top_earners', { limit_count: 20 });
  if (!data) return;
  document.getElementById('leaderboard-list').innerHTML = data.map(item => `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <b>#${item.rank} ${item.display_name}</b>
        <div style="font-size:11px; color:#9ca3af">Заказов: ${item.total_trips}</div>
      </div>
      <div style="color:#f59e0b; font-weight:bold;">$${Number(item.total_earned).toLocaleString()}</div>
    </div>
  `).join('');
}

// Промокод
async function applyPromo() {
  const code = document.getElementById('input-promo').value.trim().toUpperCase();
  if (code === 'START2026') {
    const { data } = await db.from('profiles').update({ balance: Number(currentUser.balance) + 5000 }).eq('id', currentUser.id).select().single();
    currentUser = data;
    updateUI();
    alert('Промокод активирован! +$5000');
  } else {
    alert('Неверный промокод!');
  }
}

// Сохранить ник
async function saveNickname() {
  const nick = document.getElementById('input-nickname').value.trim();
  if (!nick) return;
  const { data } = await db.from('profiles').update({ custom_nickname: nick }).eq('id', currentUser.id).select().single();
  currentUser = data;
  updateUI();
  alert('Ник сохранен!');
}
