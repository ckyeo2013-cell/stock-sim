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
   SAFE RANDOM
========================= */

function randn(){
  return (Math.random()+Math.random()+Math.random()+Math.random()-2);
}

/* =========================
   SAFE PRICE ENGINE
========================= */

function updatePrice(){

  buyers = 30 + Math.random()*70;
  sellers = 30 + Math.random()*70;

  volume = 8000 + Math.random()*20000;

  sentiment += randn()*0.005;
  sentiment = Math.max(0, Math.min(1, sentiment));

  volatility = 0.015 + Math.abs(trend) * 0.25;

  let momentum = trend * 0.9;
  let equilibrium = (500 - price) * 0.00001;
  let flow = (buyers - sellers) / 800;
  let noise = randn() * volatility;

  let change =
    momentum +
    equilibrium +
    flow +
    noise;

  /* HARD LIMITS (PREVENT BREAKING) */
  change = Math.max(-0.04, Math.min(0.04, change));

  price *= (1 + change);

  price = Math.max(5, Math.min(5000, price));

  trend = change;
}

/* =========================
   CANDLE SYSTEM
========================= */

function createCandle(){

  let open = price;

  updatePrice();

  let close = price;

  let body = Math.abs(close - open);

  /* SAFE WICK (NO EXTREME SPIKES) */
  let wick = Math.min(2, Math.max(0.3, body * 0.8));

  let high = Math.max(open, close) + Math.random() * wick;
  let low = Math.min(open, close) - Math.random() * wick;

  candles.push({ open, close, high, low });

  if(candles.length > 300){
    candles.shift();
  }
}

/* =========================
   DRAW (FIXED OVERLAP ISSUE)
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  /* LIMIT VISIBLE CANDLES (CRITICAL FIX) */
  const maxVisible = 60;
  let data = candles.slice(-maxVisible);

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

  /* FIXED SPACING (NO MORE “SOUND WAVES”) */
  let spacing = canvas.width / maxVisible;
  let width = Math.max(2, spacing * 0.5);

  /* =========================
     GRID (VERTICAL COLUMNS)
  ========================= */

  for(let i=0;i<10;i++){
    let x = (canvas.width/10)*i;

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x,canvas.height);
    ctx.stroke();
  }

  /* =========================
     PRICE GRID LINES
  ========================= */

  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  for(let val = Math.floor(rawMin / step) * step; val <= rawMax; val += step){

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
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
     CANDLES (NO OVERLAP FIX)
  ========================= */

  for(let i=0;i<data.length;i++){

    let c = data[i];

    let x = i * spacing;

    let color = c.close >= c.open ? "#00c875" : "#ff4d4d";

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    /* wick */
    ctx.beginPath();
    ctx.moveTo(x, y(c.high));
    ctx.lineTo(x, y(c.low));
    ctx.stroke();

    /* body */
    ctx.fillStyle = color;

    let bodyHeight = Math.max(1, Math.abs(y(c.open) - y(c.close)));

    ctx.fillRect(
      x - width/2,
      y(Math.max(c.open, c.close)),
      width,
      bodyHeight
    );
  }
}

/* =========================
   ANALYSIS PANEL (ALWAYS WORKS)
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

    let direction =
      trend > 0.02 ? "Strong bullish"
      : trend > 0.005 ? "Mild bullish"
      : trend < -0.02 ? "Strong bearish"
      : trend < -0.005 ? "Mild bearish"
      : "Sideways";

    let volState =
      volatility > 0.03 ? "High volatility"
      : volatility > 0.015 ? "Moderate volatility"
      : "Low volatility";

    let flow =
      buyers > sellers ? "Buy pressure"
      : "Sell pressure";

    let structure =
      price > 550 ? "Overextended"
      : price < 450 ? "Discount zone"
      : "Balanced range";

    explain.innerHTML = `
      Cash: ${state.cash.toFixed(2)}<br>
      Shares: ${state.shares}<br>
      Volume: ${Math.floor(volume)}<br><br>

      Direction: ${direction}<br>
      Volatility: ${volState}<br>
      Flow: ${flow}<br>
      Structure: ${structure}<br><br>

      Summary: ${direction}, ${volState}, ${flow}, ${structure}
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