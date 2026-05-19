const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 500;

/* =========================
   PERSISTENT STATE
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
   SAVE / LOAD (PERSISTENCE)
========================= */

function saveMarket(){

  let data = {
    state,
    price,
    candles,
    buyers,
    sellers,
    sentiment,
    volatility,
    trend,
    lastTime: Date.now()
  };

  localStorage.setItem("marketSave", JSON.stringify(data));
}

function loadMarket(){

  let data = localStorage.getItem("marketSave");
  if(!data) return;

  data = JSON.parse(data);

  let timeGap = (Date.now() - data.lastTime) / 500;

  state = data.state;
  price = data.price;
  candles = data.candles || [];
  buyers = data.buyers;
  sellers = data.sellers;
  sentiment = data.sentiment;
  volatility = data.volatility;
  trend = data.trend;

  /* FAST FORWARD MARKET WHEN CLOSED */
  for(let i=0;i<Math.min(timeGap, 200);i++){
    simulateTick();
  }
}

/* =========================
   MARKET ENGINE (REAL FLOW)
========================= */

function updatePrice(){

  buyers = 30 + Math.random()*70;
  sellers = 30 + Math.random()*70;

  sentiment += randn()*0.01;
  sentiment = Math.max(0, Math.min(1, sentiment));

  volatility += randn()*0.002;
  volatility = Math.max(0.01, Math.min(0.05, volatility));

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

  if(price < 1) price = 1;

  trend = change;

  volatility += Math.abs(change) * 0.001;
  volatility *= 0.99;
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

  candles.push({ open, close, high, low });

  if(candles.length > 200){
    candles.shift();
  }

  fastMA.push(price);
  slowMA.push(price);

  if(fastMA.length > 20) fastMA.shift();
  if(slowMA.length > 60) slowMA.shift();
}

/* =========================
   SIMULATION CORE
========================= */

function simulateTick(){
  createCandle();
}

/* =========================
   DRAW (10 ZONE COLUMN VIEW)
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  let data = candles.slice(-100);

  if(data.length < 10) return;

  /* =========================
     DIVIDE INTO 10 SECTIONS
  ========================= */

  let sections = 10;
  let chunkSize = Math.floor(data.length / sections);

  let sectionData = [];

  for(let i=0;i<sections;i++){
    sectionData.push(
      data.slice(i*chunkSize, (i+1)*chunkSize)
    );
  }

  let rawMin = Math.min(...data.map(c => c.low));
  let rawMax = Math.max(...data.map(c => c.high));

  let step = 50;
  if(rawMax - rawMin < 200) step = 20;
  if(rawMax - rawMin < 100) step = 10;

  function y(p){
    return canvas.height - ((p - rawMin) / (rawMax - rawMin)) * canvas.height;
  }

  /* =========================
     GRID LINES (COLUMNS)
  ========================= */

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for(let i=0;i<sections;i++){

    let x = (canvas.width / sections) * i;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  /* =========================
     PRICE LEVEL GRID
  ========================= */

  ctx.fillStyle = "#aaa";
  ctx.font = "12px Arial";

  for(let val = roundDown(rawMin, step); val <= rawMax; val += step){

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.moveTo(0, y(val));
    ctx.lineTo(canvas.width, y(val));
    ctx.stroke();

    ctx.fillText(val.toFixed(0), 5, y(val));
  }

  /* =========================
     CANDLES (FILTER SMALL NOISE)
  ========================= */

  let spacing = canvas.width / data.length;
  let width = Math.max(2, spacing * 0.6);

  for(let i=0;i<data.length;i++){

    let c = data[i];

    /* REMOVE MICRO CANDLES AT BOTTOM */
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
      Math.max(1, Math.abs(y(c.open) - y(c.close)))
    );
  }
}

/* =========================
   UI
========================= */

function updateUI(){

  let el = (id,val)=>{
    let e = document.getElementById(id);
    if(e) e.innerText = val;
  };

  el("price", price.toFixed(2));
  el("buyers", buyers.toFixed(0));
  el("sellers", sellers.toFixed(0));

  let explain = document.getElementById("explain");

  if(explain){

    let direction =
      trend > 0.01 ? "Uptrend"
      : trend < -0.01 ? "Downtrend"
      : "Sideways";

    let pressure =
      buyers > sellers ? "Buy pressure"
      : "Sell pressure";

    let condition =
      volatility > 0.03 ? "High volatility"
      : "Stable";

    explain.innerHTML = `
      Cash: ${state.cash.toFixed(2)}<br>
      Shares: ${state.shares}<br><br>

      Direction: ${direction}<br>
      Pressure: ${pressure}<br>
      Condition: ${condition}<br>
      Volatility: ${volatility.toFixed(3)}
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
   MAIN LOOP
========================= */

function tick(){
  simulateTick();
  draw();
  updateUI();
  saveMarket();
}

loadMarket();
setInterval(tick, 500);