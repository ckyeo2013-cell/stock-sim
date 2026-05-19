const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 500;

/* =========================
   PLAYER STATE
========================= */

let state = {
  cash: 5000,
  shares: 0
};

/* =========================
   MARKET CORE
========================= */

let price = 500;
let prevPrice = price;

let candles = [];

let buyers = 50;
let sellers = 50;

let volume = 10000;

let trend = 0;
let volatility = 0.02;

let marketMode = "normal";
let modeTimer = 40;

/* =========================
   STABLE RANGE SYSTEM (IMPORTANT FIX)
========================= */

let lockedMin = 450;
let lockedMax = 550;

/* =========================
   RANDOM
========================= */

function randn(){
  return (
    Math.random() +
    Math.random() +
    Math.random() +
    Math.random() - 2
  );
}

/* =========================
   MARKET MODE
========================= */

function updateMarketMode(){

  modeTimer--;

  if(modeTimer <= 0){

    let r = Math.random();

    if(r < 0.22) marketMode = "bull";
    else if(r < 0.42) marketMode = "bear";
    else if(r < 0.52) marketMode = "panic";
    else marketMode = "normal";

    modeTimer = 30 + Math.random()*60;
  }
}

/* =========================
   PRICE ENGINE (STABLE + REALISTIC)
========================= */

function updatePrice(){

  updateMarketMode();

  buyers = 30 + Math.random()*70;
  sellers = 30 + Math.random()*70;

  let movement = Math.abs(trend);

  volume =
    8000 +
    movement * 1500000 +
    Math.random()*4000;

  volatility =
    0.01 + Math.abs(trend) * 0.45;
  volatility = Math.min(volatility, 0.06);

  let regime = 0;

  if(marketMode === "bull") regime = 0.008;
  if(marketMode === "bear") regime = -0.008;
  if(marketMode === "panic") regime = -0.02;

  let flow = (buyers - sellers) / 450;
  let momentum = trend * 0.7;
  let noise = randn() * volatility;

  let change = momentum + flow + noise + regime;

  change = Math.max(-0.05, Math.min(0.05, change));

  price *= (1 + change);

  price = Math.max(5, Math.min(5000, price));

  let rawTrend = (price - prevPrice) / prevPrice;

  trend = trend * 0.65 + rawTrend * 0.35;

  prevPrice = price;
}

/* =========================
   CANDLES (CLEAN + COMPACT)
========================= */

function createCandle(){

  let open = price;

  updatePrice();

  let close = price;

  let body = Math.abs(close - open);

  let wick = Math.min(1.1, Math.max(0.25, body * 0.55));

  let high = Math.max(open, close) + Math.random() * wick;
  let low = Math.min(open, close) - Math.random() * wick;

  candles.push({ open, close, high, low });

  if(candles.length > 500){
    candles.shift();
  }
}

/* =========================
   DRAW ENGINE (PRO STYLE FIXED)
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  /* =========================
     VISIBILITY (YOU WANTED ~19-25 CANDLES)
  ========================= */

  const maxVisible = 19; // 🔥 your request

  let data = candles.slice(-maxVisible);

  if(data.length < 10) return;

  /* =========================
     STABLE RANGE LOCK (NO MORE WAVE EFFECT)
  ========================= */

  let rawMin = Math.min(...data.map(c => c.low));
  let rawMax = Math.max(...data.map(c => c.high));

  lockedMin = lockedMin * 0.85 + rawMin * 0.15;
  lockedMax = lockedMax * 0.85 + rawMax * 0.15;

  let range = lockedMax - lockedMin;

  function y(p){
    return canvas.height - ((p - lockedMin) / range) * canvas.height;
  }

  /* =========================
     CLEAN GRID (0 / 25 / 50 STYLE)
  ========================= */

  let step = 25;

  let test = range / 6;

  if(test > 200) step = 100;
  else if(test > 100) step = 50;
  else if(test > 50) step = 25;
  else if(test > 20) step = 10;
  else step = 5;

  let start = Math.floor(lockedMin / step) * step;

  /* =========================
     CANDLE SPACING (COMPACT BUT NOT CLUMPED)
  ========================= */

  let spacing = canvas.width / maxVisible;
  spacing *= 0.78; // 🔥 small gap like real trading charts

  let width = Math.max(1, spacing * 0.35);

  let offset = (canvas.width - (spacing * maxVisible)) / 2;

  /* =========================
     GRID LINES
  ========================= */

  for(let i=0;i<10;i++){
    let x = (canvas.width/10)*i;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.moveTo(x,0);
    ctx.lineTo(x,canvas.height);
    ctx.stroke();
  }

  /* =========================
     PRICE GRID
  ========================= */

  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  for(let val=start; val<=lockedMax; val+=step){

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.moveTo(0,y(val));
    ctx.lineTo(canvas.width,y(val));
    ctx.stroke();

    ctx.fillText(val.toFixed(0),5,y(val));
  }

  /* =========================
     PRICE LINE
  ========================= */

  ctx.beginPath();
  ctx.strokeStyle = "#4aa3ff";
  ctx.lineWidth = 2;
  ctx.moveTo(0,y(price));
  ctx.lineTo(canvas.width,y(price));
  ctx.stroke();

  /* =========================
     CANDLES
  ========================= */

  for(let i=0;i<data.length;i++){

    let c = data[i];

    let x = offset + i * spacing;

    let color =
      c.close >= c.open ? "#00c875" : "#ff4d4d";

    /* wick */
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x,y(c.high));
    ctx.lineTo(x,y(c.low));
    ctx.stroke();

    /* body */
    ctx.fillStyle = color;

    let bodyHeight =
      Math.max(1, Math.abs(y(c.open) - y(c.close)));

    ctx.fillRect(
      x - width/2,
      y(Math.max(c.open,c.close)),
      width,
      bodyHeight
    );
  }
}

/* =========================
   ANALYSIS (FULL RESTORED)
========================= */

function getAnalysis(){

  let direction =
    trend > 0.02 ? "Strong bullish"
    : trend > 0.005 ? "Bullish"
    : trend < -0.02 ? "Strong bearish"
    : trend < -0.005 ? "Bearish"
    : "Sideways";

  let volState =
    volatility > 0.04 ? "High volatility"
    : volatility > 0.02 ? "Moderate volatility"
    : "Low volatility";

  let flow =
    buyers > sellers ? "Buy pressure" : "Sell pressure";

  let structure =
    price > 550 ? "Overbought"
    : price < 450 ? "Oversold"
    : "Balanced";

  return `
    Trend: ${direction}<br>
    Volatility: ${volState}<br>
    Flow: ${flow}<br>
    Structure: ${structure}<br><br>

    Market Mode: ${marketMode}<br>
    Volume: ${Math.floor(volume)}<br>
    Price: ${price.toFixed(2)}
  `;
}

/* =========================
   UI (ONLY ONE TREND NOW)
========================= */

function updateUI(){

  let set = (id,val)=>{
    let e = document.getElementById(id);
    if(e) e.innerText = val;
  };

  set("price", price.toFixed(2));
  set("buyers", buyers.toFixed(0));
  set("sellers", sellers.toFixed(0));
  set("volume", Math.floor(volume));

  /* ONLY TREND (NO DUPLICATES) */
  set(
    "trend",
    trend > 0 ? "↗ UP"
    : trend < 0 ? "↘ DOWN"
    : "→ FLAT"
  );

  let explain = document.getElementById("explain");

  if(explain){
    explain.innerHTML = `
      Cash: ${state.cash.toFixed(2)}<br>
      Shares: ${state.shares}<br><br>

      ${getAnalysis()}
    `;
  }
}

/* =========================
   TRADING
========================= */

function buy(){
  if(state.cash >= price){
    state.cash -= price;
    state.shares++;
  }
}

function sell(){
  if(state.shares > 0){
    state.cash += price;
    state.shares--;
  }
}

/* =========================
   INIT
========================= */

for(let i=0;i<30;i++){
  createCandle();
}

/* =========================
   LOOP
========================= */

draw();
updateUI();

setInterval(()=>{
  createCandle();
  draw();
  updateUI();
}, 1200);

/* =========================
   BUTTONS
========================= */

document.getElementById("buyBtn")?.addEventListener("click", buy);
document.getElementById("sellBtn")?.addEventListener("click", sell);