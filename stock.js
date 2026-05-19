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

    if(r < 0.2) marketMode = "bull";
    else if(r < 0.4) marketMode = "bear";
    else if(r < 0.5) marketMode = "panic";
    else marketMode = "normal";

    modeTimer = 30 + Math.random()*50;
  }
}

/* =========================
   PRICE ENGINE
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

  volatility =
    Math.max(
      0.01,
      Math.min(
        0.06,
        0.02 + Math.abs(trend) * 0.5
      )
    );

  let regime = 0;

  if(marketMode === "bull") regime = 0.01;
  if(marketMode === "bear") regime = -0.01;
  if(marketMode === "panic") regime = -0.02;

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

  change = Math.max(-0.06, Math.min(0.06, change));

  price *= (1 + change);

  price = Math.max(5, Math.min(5000, price));

  let rawTrend =
    (price - prevPrice) / prevPrice;

  trend =
    trend * 0.6 +
    rawTrend * 0.4;

  prevPrice = price;
}

/* =========================
   CANDLES
========================= */

function createCandle(){

  let open = price;

  updatePrice();

  let close = price;

  let body = Math.abs(close - open);

  let wick =
    Math.min(
      2,
      Math.max(0.3, body * 0.8)
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
    low
  });

  if(candles.length > 300){
    candles.shift();
  }
}

/* =========================
   DRAW (COMPACT FIXED)
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  const maxVisible = 25; // COMPACT FIX

  let data = candles.slice(-maxVisible);

  if(data.length < 10) return;

  let rawMin = Math.min(...data.map(c => c.low));
  let rawMax = Math.max(...data.map(c => c.high));

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

  let step = Math.ceil(range / 8);
  if(step < 5) step = 5;

  let spacing = canvas.width / maxVisible;
  let width = Math.max(2, spacing * 0.35);

  /* GRID */
  for(let i=0;i<10;i++){
    let x = (canvas.width/10)*i;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.moveTo(x,0);
    ctx.lineTo(x,canvas.height);
    ctx.stroke();
  }

  /* PRICE LINES */
  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  let start = Math.floor(rawMin/step)*step;

  for(let val=start; val<=rawMax; val+=step){

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.moveTo(0,y(val));
    ctx.lineTo(canvas.width,y(val));
    ctx.stroke();

    ctx.fillText(val.toFixed(0),5,y(val));
  }

  /* PRICE LINE */
  ctx.beginPath();
  ctx.strokeStyle = "#4aa3ff";
  ctx.lineWidth = 2;
  ctx.moveTo(0,y(price));
  ctx.lineTo(canvas.width,y(price));
  ctx.stroke();

  /* CANDLES */
  for(let i=0;i<data.length;i++){

    let c = data[i];
    let x = i * spacing;

    let color =
      c.close >= c.open ? "#00c875" : "#ff4d4d";

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x,y(c.high));
    ctx.lineTo(x,y(c.low));
    ctx.stroke();

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
   ANALYSIS + TREND FIXED UI
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

  return {
    direction,
    volState,
    flow,
    structure,
    summary: `${direction}, ${flow}, ${volState}, ${structure}`
  };
}

/* =========================
   UI (FIXED TREND POSITION)
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

  /* TREND FIXED (NOW PROPER AREA) */
  set(
    "trend",
    trend.toFixed(4)
  );

  let explain = document.getElementById("explain");

  if(explain){

    let a = getAnalysis();

    explain.innerHTML = `
      Cash: ${state.cash.toFixed(2)}<br>
      Shares: ${state.shares}<br><br>

      Trend: ${a.direction}<br>
      Volatility: ${a.volState}<br>
      Flow: ${a.flow}<br>
      Structure: ${a.structure}<br><br>

      Market Mode: ${marketMode}<br>
      Volume: ${Math.floor(volume)}<br><br>

      Summary:<br>
      ${a.summary}
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