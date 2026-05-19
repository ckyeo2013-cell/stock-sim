const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 500;

/* =========================
   TIMEFRAME SYSTEM
========================= */

let timeframes = {
  "1m": 1,
  "5m": 5,
  "1h": 60,
  "24h": 1440
};

let currentTF = "1m";
let tfMultiplier = timeframes[currentTF];

/* =========================
   PLAYER STATE
========================= */

let state = {
  cash: 5000,
  shares: 0,
  lastTime: Date.now()
};

/* =========================
   MARKET STATE
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
   MOVING AVERAGES
========================= */

let fastMA = [];
let slowMA = [];

/* =========================
   UTILS
========================= */

function randn(){
  return (Math.random()+Math.random()+Math.random()+Math.random()-2);
}

function roundDown(n, step){
  return Math.floor(n / step) * step;
}

function roundUp(n, step){
  return Math.ceil(n / step) * step;
}

/* =========================
   TIMEFRAME SWITCH
========================= */

function setTimeframe(tf){
  currentTF = tf;
  tfMultiplier = timeframes[tf];
}

/* =========================
   MARKET ENGINE (FIXED FLOW)
========================= */

function updatePrice(){

  buyers = 30 + Math.random()*70;
  sellers = 30 + Math.random()*70;

  volume = 5000 + Math.random()*20000 * tfMultiplier;

  sentiment += randn()*0.01;
  sentiment = Math.max(0, Math.min(1, sentiment));

  volatility = 0.02 + (Math.abs(trend) * 0.5);

  let momentum = trend * 1.3;

  let equilibrium = (500 - price) * 0.00002;

  let flow = (buyers - sellers) / 500;

  let volImpact = (volume / 20000) * 0.01;

  let noise = randn() * volatility * tfMultiplier * 0.5;

  let change =
    momentum +
    equilibrium +
    flow +
    noise +
    volImpact;

  price *= Math.exp(change);

  if(price < 1) price = 1;

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
  let wick = Math.max(0.2, body * 1.5);

  let high = Math.max(open, close) + Math.random() * wick;
  let low = Math.min(open, close) - Math.random() * wick;

  candles.push({
    open,
    close,
    high,
    low,
    volume
  });

  if(candles.length > 200){
    candles.shift();
  }

  fastMA.push(price);
  slowMA.push(price);

  if(fastMA.length > 20) fastMA.shift();
  if(slowMA.length > 60) slowMA.shift();
}

/* =========================
   MARKET ANALYSIS ENGINE (FIXED + NOT EMPTY)
========================= */

function getMarketAnalysis(){

  let direction =
    trend > 0.01 ? "Bullish momentum"
    : trend < -0.01 ? "Bearish pressure"
    : "Neutral consolidation";

  let volState =
    volatility > 0.04 ? "High volatility regime"
    : volatility > 0.02 ? "Moderate volatility"
    : "Low volatility stability";

  let flowState =
    buyers > sellers ? "Buy dominance"
    : "Sell dominance";

  let structure =
    price > 520 ? "Overextended upside risk"
    : price < 480 ? "Undervalued zone"
    : "Fair value zone";

  return {
    direction,
    volState,
    flowState,
    structure,
    summary:
      direction + " with " +
      volState + " and " +
      flowState + ". Market in " +
      structure + "."
  };
}

/* =========================
   DRAW CHART (10 GRID RESTORED)
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  let data = candles.slice(-100);
  if(data.length < 10) return;

  let rawMin = Math.min(...data.map(c => c.low));
  let rawMax = Math.max(...data.map(c => c.high));

  let step = 50;
  if(rawMax - rawMin < 200) step = 20;
  if(rawMax - rawMin < 100) step = 10;

  function y(p){
    return canvas.height - ((p - rawMin) / (rawMax - rawMin)) * canvas.height;
  }

  let spacing = canvas.width / data.length;
  let width = Math.max(2, spacing * 0.6);

  /* =========================
     10 GRID COLUMNS
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
     PRICE GRID (10/20/30 STYLE)
  ========================= */

  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  for(let val = roundDown(rawMin, step); val <= rawMax; val += step){

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
     CANDLES
  ========================= */

  for(let i=0;i<data.length;i++){

    let c = data[i];

    if(c.high < rawMin + (rawMax - rawMin)*0.05) continue;

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
   UI + ANALYSIS PANEL (FIXED + RICH)
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
      Timeframe: ${currentTF}<br>
      Cash: ${state.cash.toFixed(2)}<br>
      Shares: ${state.shares}<br>
      Volume: ${Math.floor(volume)}<br><br>

      Direction: ${a.direction}<br>
      Volatility: ${a.volState}<br>
      Flow: ${a.flowState}<br>
      Structure: ${a.structure}<br><br>

      Summary: ${a.summary}
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