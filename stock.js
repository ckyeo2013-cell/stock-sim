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
let candles = [];

let buyers = 50;
let sellers = 50;

let volume = 10000;

let sentiment = 0.5;
let volatility = 0.02;
let trend = 0;

/* =========================
   UTILS
========================= */

function randn(){
  return (Math.random()+Math.random()+Math.random()+Math.random()-2);
}

function roundDown(n, step){
  return Math.floor(n / step) * step;
}

/* =========================
   SAFE MARKET ENGINE (NO CRASH)
========================= */

function updatePrice(){

  buyers = 30 + Math.random()*70;
  sellers = 30 + Math.random()*70;

  volume = 8000 + Math.random()*20000;

  sentiment += randn()*0.005;
  sentiment = Math.max(0, Math.min(1, sentiment));

  volatility = 0.015 + Math.abs(trend) * 0.3;

  let momentum = trend * 0.9;

  let equilibrium = (500 - price) * 0.00001;

  let flow = (buyers - sellers) / 800;

  let noise = randn() * volatility;

  let change =
    momentum +
    equilibrium +
    flow +
    noise;

  /* HARD SAFETY LIMIT (prevents collapse to 1) */
  change = Math.max(-0.05, Math.min(0.05, change));

  price *= Math.exp(change);

  if(price < 5) price = 5;
  if(price > 5000) price = 5000;

  trend = change;
}

/* =========================
   CANDLES (SAFE)
========================= */

function createCandle(){

  let open = price;

  updatePrice();

  let close = price;

  let body = Math.abs(close - open);
  let wick = Math.max(0.5, body * 1.5);

  let high = Math.max(open, close) + Math.random() * wick;
  let low = Math.min(open, close) - Math.random() * wick;

  candles.push({ open, close, high, low });

  if(candles.length > 200){
    candles.shift();
  }
}

/* =========================
   ANALYSIS ENGINE (FIXED, NEVER EMPTY)
========================= */

function getMarketAnalysis(){

  let direction =
    trend > 0.02 ? "Strong bullish movement"
    : trend > 0.005 ? "Mild bullish trend"
    : trend < -0.02 ? "Strong bearish movement"
    : trend < -0.005 ? "Mild bearish trend"
    : "Sideways consolidation";

  let volState =
    volatility > 0.04 ? "High volatility"
    : volatility > 0.02 ? "Moderate volatility"
    : "Low volatility";

  let flowState =
    buyers > sellers ? "Buy pressure"
    : "Sell pressure";

  let structure =
    price > 550 ? "Overbought zone"
    : price < 450 ? "Oversold zone"
    : "Balanced zone";

  return {
    direction,
    volState,
    flowState,
    structure,
    summary: `${direction}, ${volState}, ${flowState}, ${structure}.`
  };
}

/* =========================
   DRAW (STABLE GRID + 10 COLUMNS)
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  let data = candles.slice(-100);

  if(data.length < 10) return;

  let rawMin = Math.min(...data.map(c => c.low));
  let rawMax = Math.max(...data.map(c => c.high));

  if(rawMin === rawMax){
    rawMin -= 10;
    rawMax += 10;
  }

  let step = 50;

  function y(p){
    let range = rawMax - rawMin;
    if(range <= 0) range = 1;
    return canvas.height - ((p - rawMin) / range) * canvas.height;
  }

  let spacing = canvas.width / data.length;
  let width = Math.max(2, spacing * 0.5);

  /* =========================
     10 GRID COLUMNS
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
     PRICE GRID (10/20/30 STYLE)
  ========================= */

  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  let minGrid = roundDown(rawMin, step);

  for(let val = minGrid; val <= rawMax; val += step){

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.moveTo(0, y(val));
    ctx.lineTo(canvas.width, y(val));
    ctx.stroke();

    ctx.fillText(val.toFixed(0), 5, y(val));
  }

  /* =========================
     PRICE LINE
  ========================= */

  ctx.strokeStyle = "#4aa3ff";
  ctx.beginPath();
  ctx.moveTo(0, y(price));
  ctx.lineTo(canvas.width, y(price));
  ctx.stroke();

  /* =========================
     CANDLES
  ========================= */

  for(let i=0;i<data.length;i++){

    let c = data[i];

    let x = i * spacing;

    let color = c.close >= c.open ? "#00c875" : "#ff4d4d";

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, y(c.high));
    ctx.lineTo(x, y(c.low));
    ctx.stroke();

    ctx.fillStyle = color;

    ctx.fillRect(
      x - width/2,
      y(Math.max(c.open, c.close)),
      width,
      Math.max(1, Math.abs(y(c.open) - c.close))
    );
  }
}

/* =========================
   UI (FULL ANALYSIS RESTORED)
========================= */

function updateUI(){

  let el = (id,val)=>{
    let e = document.getElementById(id);
    if(e) e.innerText = val;
  };

  el("price", price.toFixed(2));
  el("buyers", buyers.toFixed(0));
  el("sellers", sellers.toFixed(0));
  el("volume", Math.floor(volume));

  let explain = document.getElementById("explain");

  if(explain){

    let a = getMarketAnalysis();

    explain.innerHTML = `
      Cash: ${state.cash.toFixed(2)}<br>
      Shares: ${state.shares}<br>
      Volume: ${Math.floor(volume)}<br><br>

      Direction: ${a.direction}<br>
      Volatility: ${a.volState}<br>
      Flow: ${a.flowState}<br>
      Structure: ${a.structure}<br><br>

      Market Summary:<br>
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
   LOOP
========================= */

function tick(){
  createCandle();
  draw();
  updateUI();
}

setInterval(tick, 500);