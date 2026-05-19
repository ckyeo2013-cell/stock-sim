const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 500;

/* =========================
   PLAYER STATE
========================= */

let state = {
  cash: 10000,
  shares: 0
};

/* =========================
   MARKET STATE
========================= */

let price = 100;
let candles = [];

let buyers = 50;
let sellers = 50;

let sentiment = 0.5;
let volatility = 0.02;

let trend = 0;

/* =========================
   CRASH SYSTEM
========================= */

let crash = 0;
let crashCooldown = 0;

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
   NEWS + CRASH ENGINE
========================= */

function updateNews(){

  if(crashCooldown > 0) crashCooldown--;

  if(crash === 0 && crashCooldown === 0){
    if(Math.random() < 0.006){
      crash = -1;
      crashCooldown = 40;
    }
  }

  if(crash !== 0){

    volatility += 0.003;
    sentiment -= 0.008;

    if(Math.random() < 0.02){
      crash = 0;
    }
  }
}

/* =========================
   MARKET BEHAVIOR
========================= */

function updateMarket(){

  buyers = 30 + Math.random()*70;
  sellers = 30 + Math.random()*70;

  sentiment += randn()*0.01;
  sentiment = Math.max(0, Math.min(1, sentiment));

  volatility += randn()*0.002;
  volatility = Math.max(0.01, Math.min(0.05, volatility));

  if(crash === 0){
    sentiment += (0.5 - sentiment) * 0.02;
    volatility *= 0.995;
  }
}

/* =========================
   PRICE ENGINE
========================= */

function updatePrice(){

  updateNews();
  updateMarket();

  let imbalance = (buyers - sellers) / 100;
  let drift = (sentiment - 0.5) * 0.02;

  let shock = randn() * volatility;

  if(crash === -1){
    shock -= 0.03;
  }

  let bias = 0.0003;

  let change = drift + imbalance*0.01 + shock + bias;

  price *= Math.exp(change);

  if(price < 1){
    price = 1;
    crash = 0;
    sentiment = 0.5;
    volatility = 0.02;
  }

  trend = change;
}

/* =========================
   CANDLE SYSTEM (FIXED WICKS)
========================= */

function createCandle(){

  let open = price;

  updatePrice();

  let close = price;

  let body = Math.abs(close - open);
  let uncertainty = volatility * 8;

  let wickSize = (uncertainty * 0.6) + (1 / (body + 0.5)) * 0.8;
  wickSize = Math.min(wickSize, 1.5);

  let high = Math.max(open, close) + Math.random() * wickSize;
  let low = Math.min(open, close) - Math.random() * wickSize;

  candles.push({ open, close, high, low });

  if(candles.length > 120){
    candles.shift();
  }

  fastMA.push(price);
  slowMA.push(price);

  if(fastMA.length > 20) fastMA.shift();
  if(slowMA.length > 60) slowMA.shift();
}

/* =========================
   ANALYST ENGINE
========================= */

function getMarketAnalysis(){

  let direction =
    trend > 0.01 ? "strong upward trend"
    : trend > 0 ? "weak upward trend"
    : trend < -0.01 ? "strong downward trend"
    : "sideways movement";

  let pressure =
    buyers > sellers ? "buyers are in control"
    : "sellers are dominating";

  let volatilityState =
    volatility > 0.03 ? "high volatility"
    : "stable conditions";

  let crashState =
    crash !== 0 ? "panic / crash behavior"
    : "normal market conditions";

  let explanation = "";

  if(trend > 0.02){
    explanation = "Strong buying momentum is pushing price upward.";
  }
  else if(trend < -0.02){
    explanation = "Heavy selling pressure is pushing price downward.";
  }
  else if(volatility > 0.03){
    explanation = "Market is unstable with unpredictable movement.";
  }
  else{
    explanation = "Market is consolidating with no strong direction.";
  }

  return {
    direction,
    pressure,
    volatilityState,
    crashState,
    explanation
  };
}

/* =========================
   DRAW CHART
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  let data = candles.slice(-80);

  if(data.length < 2) return;

  let rawMin = Math.min(...data.map(c => c.low));
  let rawMax = Math.max(...data.map(c => c.high));

  let step = 10;

  if(rawMax - rawMin > 200) step = 50;
  else if(rawMax - rawMin > 80) step = 20;

  let min = roundDown(rawMin, step);
  let max = roundUp(rawMax, step);

  function y(p){
    return canvas.height - ((p - min) / (max - min)) * canvas.height;
  }

  let spacing = canvas.width / data.length;
  let width = Math.max(2, spacing * 0.5);

  /* =========================
     PRICE SCALE
  ========================= */

  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  for(let val = min; val <= max; val += step){
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
      Math.max(1, Math.abs(y(c.open) - y(c.close)))
    );
  }

  /* =========================
     MOVING AVERAGES
  ========================= */

  function drawMA(arr, color){

    ctx.strokeStyle = color;
    ctx.beginPath();

    for(let i=1;i<arr.length;i++){

      let x1 = (i-1) * (canvas.width / arr.length);
      let x2 = i * (canvas.width / arr.length);

      let y1 = y(arr[i-1]);
      let y2 = y(arr[i]);

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }

    ctx.stroke();
  }

  drawMA(fastMA, "yellow");
  drawMA(slowMA, "white");
}

/* =========================
   UI
========================= */

function updateUI(){

  const el = (id,val)=>{
    let e = document.getElementById(id);
    if(e) e.innerText = val;
  };

  el("price", price.toFixed(2));
  el("buyers", buyers.toFixed(0));
  el("sellers", sellers.toFixed(0));

  let explain = document.getElementById("explain");

  if(explain){

    let a = getMarketAnalysis();

    explain.innerHTML = `
      Cash: ${state.cash.toFixed(2)}<br>
      Shares: ${state.shares}<br><br>

      Direction: ${a.direction}<br>
      Pressure: ${a.pressure}<br>
      Volatility: ${a.volatilityState}<br>
      State: ${a.crashState}<br><br>

      Analyst: ${a.explanation}
    `;
  }
}

/* =========================
   TRADING SYSTEM
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