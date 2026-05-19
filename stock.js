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
   MARKET STATE
========================= */

let price = 500;
let candles = [];

let buyers = 50;
let sellers = 50;

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
   MARKET ENGINE (STRONGER MOVES)
========================= */

function updatePrice(){

  buyers = 30 + Math.random()*70;
  sellers = 30 + Math.random()*70;

  sentiment += randn()*0.01;
  sentiment = Math.max(0, Math.min(1, sentiment));

  volatility += randn()*0.002;
  volatility = Math.max(0.01, Math.min(0.05, volatility));

  /* STRONGER REALISTIC MARKET FLOW */
  let momentum = trend * 1.2;

  let equilibrium = (500 - price) * 0.00002;

  let flow = (buyers - sellers) / 500;

  let noise = randn() * volatility * 2;

  let change =
    momentum +
    equilibrium +
    flow +
    noise;

  price *= Math.exp(change);

  if(price < 1){
    price = 1;
  }

  trend = change;

  /* volatility reacts to movement */
  volatility += Math.abs(change) * 0.001;
  volatility *= 0.99;
}

/* =========================
   CANDLE ENGINE
========================= */

function createCandle(){

  let open = price;

  updatePrice();

  let close = price;

  let body = Math.abs(close - open);
  let wickSize = Math.max(0.2, body * 1.5);

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
   DRAW CHART
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  let data = candles.slice(-80);

  if(data.length < 2) return;

  let rawMin = Math.min(...data.map(c => c.low));
  let rawMax = Math.max(...data.map(c => c.high));

  let step = 50;

  if(rawMax - rawMin < 200) step = 20;
  if(rawMax - rawMin < 100) step = 10;

  let min = roundDown(rawMin, step);
  let max = roundUp(rawMax, step);

  function y(p){
    return canvas.height - ((p - min) / (max - min)) * canvas.height;
  }

  let spacing = canvas.width / data.length;
  let width = Math.max(2, spacing * 0.5);

  /* =========================
     PRICE GRID LINES (FIXED)
  ========================= */

  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  for(let val = min; val <= max; val += step){

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
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

    let direction =
      trend > 0.01 ? "Strong Uptrend"
      : trend > 0 ? "Uptrend"
      : trend < -0.01 ? "Downtrend"
      : "Sideways";

    let pressure =
      buyers > sellers ? "Buy pressure"
      : "Sell pressure";

    let condition =
      volatility > 0.03 ? "High volatility"
      : "Stable market";

    explain.innerHTML = `
      Cash: ${state.cash.toFixed(2)}<br>
      Shares: ${state.shares}<br><br>

      Direction: ${direction}<br>
      Pressure: ${pressure}<br>
      Condition: ${condition}<br>
      Volatility: ${volatility.toFixed(3)}<br>
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