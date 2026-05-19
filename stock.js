const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 500;

/* =========================
   STATE
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
   MARKET MODE SYSTEM
========================= */

function updateMarketMode(){

  modeTimer--;

  if(modeTimer <= 0){

    let r = Math.random();

    if(r < 0.2){
      marketMode = "bull";
    }
    else if(r < 0.4){
      marketMode = "bear";
    }
    else if(r < 0.5){
      marketMode = "panic";
    }
    else{
      marketMode = "normal";
    }

    modeTimer = 30 + Math.random()*50;
  }
}

/* =========================
   PRICE ENGINE (STABLE)
========================= */

function updatePrice(){

  updateMarketMode();

  buyers = 30 + Math.random()*70;
  sellers = 30 + Math.random()*70;

  let movement = Math.abs(trend);

  volume =
    8000 +
    movement * 2000000 +
    Math.random()*5000;

  /* volatility (SAFE) */
  volatility =
    0.015 +
    Math.abs(trend) * 0.4;

  volatility = Math.min(volatility, 0.06);

  /* regime drift */
  let regime = 0;

  if(marketMode === "bull") regime = 0.01;
  if(marketMode === "bear") regime = -0.01;
  if(marketMode === "panic") regime = -0.025;

  let flow =
    (buyers - sellers) / 400;

  let momentum =
    trend * 0.75;

  let noise =
    randn() * volatility;

  let change =
    momentum +
    flow +
    noise +
    regime;

  /* SAFE LIMIT */
  change = Math.max(-0.06, Math.min(0.06, change));

  price *= (1 + change);

  /* HARD SAFETY FLOOR */
  price = Math.max(5, Math.min(5000, price));

  /* TREND (SMOOTHED + FIXED) */
  let rawTrend =
    (price - prevPrice) / prevPrice;

  trend =
    trend * 0.65 +
    rawTrend * 0.35;

  prevPrice = price;
}

/* =========================
   CANDLE SYSTEM
========================= */

function createCandle(){

  let open = price;

  updatePrice();

  let close = price;

  let body =
    Math.abs(close - open);

  let wick =
    Math.min(
      2.5,
      Math.max(0.4, body * 0.8)
    );

  let high =
    Math.max(open, close) +
    Math.random() * wick;

  let low =
    Math.min(open, close) -
    Math.random() * wick;

  candles.push({
    open,
    close,
    high,
    low,
    volume
  });

  if(candles.length > 300){
    candles.shift();
  }
}

/* =========================
   DRAW CHART (FIXED GRID + NO SPAM)
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  const maxVisible = 60;

  let data = candles.slice(-maxVisible);

  if(data.length < 10) return;

  let rawMin = Math.min(...data.map(c => c.low));
  let rawMax = Math.max(...data.map(c => c.high));

  /* SAFE PADDING */
  let padding = (rawMax - rawMin) * 0.15;

  rawMin -= padding;
  rawMax += padding;

  if(rawMin === rawMax){
    rawMin -= 10;
    rawMax += 10;
  }

  let range = rawMax - rawMin;

  function y(p){
    return canvas.height - ((p - rawMin) / range) * canvas.height;
  }

  /* CLEAN GRID STEP (FIXED) */
  let step = Math.ceil(range / 8);

  if(step <= 5) step = 5;
  else if(step <= 10) step = 10;
  else if(step <= 20) step = 20;
  else if(step <= 50) step = 50;
  else step = 100;

  /* SPACING (NO WAVES) */
  let spacing = canvas.width / maxVisible;
  let width = Math.max(2, spacing * 0.3);

  /* GRID VERTICAL */
  for(let i=0;i<10;i++){

    let x = (canvas.width/10)*i;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.moveTo(x,0);
    ctx.lineTo(x,canvas.height);
    ctx.stroke();
  }

  /* GRID HORIZONTAL */
  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  let start = Math.floor(rawMin / step) * step;

  for(let val = start; val <= rawMax; val += step){

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.moveTo(0, y(val));
    ctx.lineTo(canvas.width, y(val));
    ctx.stroke();

    ctx.fillText(val.toFixed(0), 5, y(val));
  }

  /* PRICE LINE */
  ctx.beginPath();
  ctx.strokeStyle = "#4aa3ff";
  ctx.lineWidth = 2;
  ctx.moveTo(0, y(price));
  ctx.lineTo(canvas.width, y(price));
  ctx.stroke();

  /* CANDLES */
  for(let i=0;i<data.length;i++){

    let c = data[i];

    let x = i * spacing;

    let color =
      c.close >= c.open
      ? "#00c875"
      : "#ff4d4d";

    /* wick */
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(x, y(c.high));
    ctx.lineTo(x, y(c.low));
    ctx.stroke();

    /* body */
    ctx.fillStyle = color;

    let bodyHeight =
      Math.max(1, Math.abs(y(c.open) - y(c.close)));

    ctx.fillRect(
      x - width/2,
      y(Math.max(c.open, c.close)),
      width,
      bodyHeight
    );
  }
}

/* =========================
   ANALYSIS PANEL (FULL RESTORED)
========================= */

function getAnalysis(){

  let direction =
    trend > 0.02
    ? "Strong bullish momentum"
    : trend > 0.005
    ? "Bullish trend"
    : trend < -0.02
    ? "Strong bearish momentum"
    : trend < -0.005
    ? "Bearish trend"
    : "Sideways market";

  let volState =
    volatility > 0.04
    ? "High volatility"
    : volatility > 0.02
    ? "Moderate volatility"
    : "Low volatility";

  let flow =
    buyers > sellers
    ? "Buy pressure"
    : "Sell pressure";

  let structure =
    price > 550
    ? "Overbought zone"
    : price < 450
    ? "Oversold zone"
    : "Balanced zone";

  return `
    Trend: ${direction}<br>
    Volatility: ${volState}<br>
    Flow: ${flow}<br>
    Structure: ${structure}<br><br>

    Market Mode: ${marketMode}<br>
    Volume: ${Math.floor(volume)}
  `;
}

/* =========================
   UI
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
  set("trend", trend.toFixed(4));

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