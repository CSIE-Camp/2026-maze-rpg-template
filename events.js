// ============================================================
//  events.js ── 事件函式（預帶程式）
// ============================================================

// ── 嚮導 ─────────────────────────────────────────────────────
function onGuide() {
  showDialogue([
    { speaker: "嚮導", text: "歡迎來到迷宮！用 WASD 或方向鍵移動。" },
    { speaker: "嚮導", text: "踩到彩色的格子會觸發事件——附近就有一個寶箱，還有一隻小怪擋路。" },
    { speaker: "嚮導", text: "對了，地圖裡有一道紫色的『裂隙』，踩下去會被吸進另一個世界……祝你好運！" }
  ]);
  game.setTile(game.x, game.y, 0);
}

// ── 寶箱 ─────────────────────────────────────────────────────
function onChest() {
  game.money += 30;
  game.message = "📦 你打開寶箱，獲得 30 金幣！";
  game.setTile(game.x, game.y, 0);
}

// ── 小怪戰鬥 ─────────────────────────────────────────────────
function onBattle() {
  var enemy = { name: "哥布林", hp: 30, atk: 5 };
  function render() {
    game.panel =
      '<div style="text-align:center">' +
        '<h2>⚔️ ' + enemy.name + '</h2>' +
        '<p>敵人 HP：' + enemy.hp + '</p>' +
        '<p>你的 HP：' + game.hp + ' / ' + game.maxHp + '</p><hr>' +
        '<button class="btn btn-attack" onclick="battleAtk()">⚔️ 攻擊</button> ' +
        '<button class="btn btn-flee" onclick="battleRun()">💨 逃跑</button>' +
      '</div>';
  }
  window.battleAtk = function() {
    enemy.hp -= Math.max(1, game.atk - 2);
    if (enemy.hp <= 0) {
      game.money += 15;
      game.setTile(game.x, game.y, 0);
      game.panel =
        '<div style="text-align:center"><h2>🎉 勝利！</h2><p>獲得 15 金幣</p>' +
        '<button class="btn btn-attack" onclick="game.panel=\'\';">確定</button></div>';
      return;
    }
    game.hp -= enemy.atk;
    render();
  };
  window.battleRun = function() { game.message = "你逃跑了！"; game.panel = ""; };
  render();
}

// ── 傳送門 ───────────────────────────────────────────────────
function onPortal() {
  game.message = "⚡ 你踏入了傳送門！";
  game.x = 17; game.y = 13;
}

// ── 商店 ─────────────────────────────────────────────────────
function onShop() {
  game.panel =
    "<h2>🛒 商店</h2>" +
    "<p>你身上有 " + game.money + " 金幣</p>" +
    "<button onclick='buyPotion()'>補血藥水（30 金幣，回復 30 HP）</button> " +
    "<button onclick=\"game.panel = ''\">離開</button>";
}
function buyPotion() {
  if (game.money >= 30) { game.money -= 30; game.hp += 30; game.message = "🧪 買了補血藥水！"; }
  else { game.message = "💸 金幣不足！"; }
  onShop();
}

// ── 上鎖的門 ─────────────────────────────────────────────────
function onLock() {
  game.panel = '<div style="text-align:center">' +
    '<h2>🚪 上鎖的門</h2><p>這扇門被鎖住了。</p>' +
    '<button class="btn btn-attack" onclick="unlockDoor()">🔑 嘗試開門（需要 10 金幣）</button> ' +
    '<button class="btn btn-flee" onclick="game.panel=\'\';">離開</button></div>';
}
function unlockDoor() {
  if (game.money >= 10) {
    game.money -= 10; game.setTile(game.x, game.y, 0); game.panel = "";
    game.message = "🔓 你花了 10 金幣打開了門！";
  } else { game.message = "💸 金幣不足！"; game.panel = ""; }
}

// ── 小遊戲 ───────────────────────────────────────────────────
function onMiniGame() {
  var score = 0, target = 3;
  function render() {
    var num = Math.floor(Math.random() * 10) + 1;
    game.panel =
      '<div style="text-align:center"><h2>🎯 猜數字小遊戲</h2>' +
      '<p>進度：' + score + ' / ' + target + '</p>' +
      '<p>這個數字是奇數還是偶數？　答案：' + num + '</p>' +
      '<button class="btn btn-attack" onclick="mgGuess(' + num + ',true)">奇數</button> ' +
      '<button class="btn btn-defend" onclick="mgGuess(' + num + ',false)">偶數</button></div>';
  }
  window.mgGuess = function(num, isOdd) {
    var correct = (num % 2 === 1) === isOdd;
    if (correct) {
      score++; game.message = "✅ 答對了！";
      if (score >= target) {
        game.money += 30; game.setTile(game.x, game.y, 0);
        game.panel = '<div style="text-align:center"><h2>🎉 過關！</h2><p>獲得 30 金幣</p>' +
          '<button class="btn btn-attack" onclick="game.panel=\'\';">確定</button></div>';
        return;
      }
    } else { game.message = "❌ 答錯了！"; }
    render();
  };
  render();
}

function onTest() {}


// ════════════════════════════════════════════════════════════
//  ★★★ 裂隙 → 集成戰略（明日方舟風 Roguelike POC）★★★
//
//  onRoguelike() 開啟一個獨立的全螢幕 overlay，內含：
//    ① 節點地圖：每層 2 選 1（作戰 / 精英 / 商店 / 事件），最後是首領
//    ② 即時塔防戰鬥：花「部署點(DP)」把幹員擺上格子，擋住／擊殺
//       從右方湧來的敵人，保護左側防守點
//    ③ 商店招募幹員、藏品(relic)強化、隨機事件
//  通關首領 → 源石錠折成金幣回饋外層 game 並關閉 overlay。
//
//  整個系統自帶 game loop 與 DOM，不依賴外層 game.panel。
// ════════════════════════════════════════════════════════════
function onRoguelike() {
  if (window.RL && RL.run && RL.run.open) return; // 防止重複開啟
  RL.enter();
}

var RL = {
  COLS: 8, ROWS: 4, TILE: 64,

  // ── 幹員模板（原創命名，class 走明日方舟職業）────────────────
  OPS: {
    guard:   { key:"guard",   name:"白狼", cls:"近衛", cost:6,  hp:520,  atk:100, itv:1.0, range:1, block:2, ground:true,  color:"#c0392b", letter:"衛" },
    defender:{ key:"defender",name:"山岳", cls:"重裝", cost:11, hp:1100, atk:70,  itv:1.3, range:1, block:3, ground:true,  color:"#8e6b23", letter:"盾" },
    sniper:  { key:"sniper",  name:"遠雷", cls:"狙擊", cost:8,  hp:280,  atk:130, itv:1.05,range:3, block:0, ground:false, color:"#27ae60", letter:"狙" },
    caster:  { key:"caster",  name:"霜語", cls:"術師", cost:10, hp:300,  atk:160, itv:1.6, range:2, block:0, ground:false, color:"#8e44ad", letter:"術", magic:true },
    medic:   { key:"medic",   name:"甘露", cls:"醫療", cost:9,  hp:280,  heal:130,itv:1.0, range:3, block:0, ground:false, color:"#16a085", letter:"醫", healer:true }
  },

  // ── 敵人模板（spd = px/秒）─────────────────────────────────
  ENE: {
    bug:    { name:"源石蟲",   hp:150,  atk:40,  spd:56, itv:0.9, weight:1, r:12, color:"#95a5a6" },
    soldier:{ name:"士兵",     hp:440,  atk:90,  spd:34, itv:1.0, weight:1, r:15, color:"#c0392b" },
    heavy:  { name:"重裝兵",   hp:1200, atk:150, spd:22, itv:1.3, weight:1, r:19, color:"#2c3e50" },
    boss:   { name:"湮滅者",   hp:6000, atk:340, spd:18, itv:1.4, weight:5, r:26, color:"#111111" }
  },

  RELICS: [
    { name:"移動信標",   desc:"部署上限 +6",            mod:{ maxDP:6 } },
    { name:"高濃度源石", desc:"全幹員攻擊 +15%",        mod:{ atkPct:0.15 } },
    { name:"無人機模組", desc:"部署點回復加速",          mod:{ dpRate:0.35 } },
    { name:"防護力場",   desc:"每場作戰生命 +2",         mod:{ life:2 } },
    { name:"戰術裝甲",   desc:"全幹員生命 +25%",        mod:{ hpPct:0.25 } },
    { name:"狂戰士之血", desc:"攻擊 +25%，生命 -10%",   mod:{ atkPct:0.25, hpPct:-0.1 } }
  ],

  EVENTS: [
    { title:"廢棄補給站", desc:"一座沒人看守的補給站，門半掩著。", opts:[
      { label:"撬開保險箱（+45 源石錠）", run:function(){ RL.run.ingots += 45; RL.toast="撬開保險箱，+45 源石錠"; } },
      { label:"搜刮醫療箱（隨機藏品）",    run:function(){ RL.grantRelic(); } }
    ]},
    { title:"神秘商人",   desc:"一名戴兜帽的商人向你招手。", opts:[
      { label:"重金換取情報（-20 源石錠，得藏品）", run:function(){ RL.run.ingots=Math.max(0,RL.run.ingots-20); RL.grantRelic(); } },
      { label:"婉拒離開（+10 源石錠退款）",          run:function(){ RL.run.ingots += 10; RL.toast="你謹慎地離開了，+10 源石錠"; } }
    ]},
    { title:"感染者聚落", desc:"聚落居民請求你的幫助。", opts:[
      { label:"伸出援手（招募一名隨機幹員）", run:function(){ RL.recruitRandom(); } },
      { label:"收取報酬（+35 源石錠）",       run:function(){ RL.run.ingots += 35; RL.toast="你收下了報酬，+35 源石錠"; } }
    ]}
  ],

  run: null, b: null, raf: 0, toast: "",

  // ── 進入：初始化 run、建立 overlay ──────────────────────────
  enter: function() {
    RL.run = {
      open:true, stage:0, total:6, ingots:20,
      squad:["guard","sniper","medic"],
      relics:[],
      mods:{ maxDP:0, atkPct:0, dpRate:0, life:0, hpPct:0 },
      candidates:[]
    };
    // 建立 overlay
    var o = document.createElement("div");
    o.id = "rl-overlay";
    o.style.cssText = "position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 0%,#2a2140,#0d0a16 70%);color:#eee;font-family:sans-serif;overflow:auto;padding:16px;box-sizing:border-box;";
    o.innerHTML = '<div id="rl-view" style="max-width:560px;margin:0 auto;"></div>';
    document.body.appendChild(o);
    RL.root = o;
    RL.view = o.querySelector("#rl-view");

    // 攔截 WASD/方向鍵，避免外層角色在背後亂走
    RL._keyBlock = function(e){
      var k = (e.key||"").toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].indexOf(k)>=0) e.stopPropagation();
    };
    window.addEventListener("keydown", RL._keyBlock, true);

    RL.genCandidates();
    RL.showMap();
  },

  close: function(reward, msg) {
    if (RL.raf) cancelAnimationFrame(RL.raf), RL.raf = 0;
    window.removeEventListener("keydown", RL._keyBlock, true);
    if (RL.root && RL.root.parentNode) RL.root.parentNode.removeChild(RL.root);
    RL.run.open = false;
    if (reward) game.money += reward;
    game.message = msg || "你從裂隙中脫身了。";
  },

  // ── 節點地圖 ───────────────────────────────────────────────
  genCandidates: function() {
    var r = RL.run;
    if (r.stage >= r.total - 1) { r.candidates = [{ type:"boss" }]; return; }
    var pool = ["battle","battle","elite","shop","event"];
    function pick(){ return pool[Math.floor(Math.random()*pool.length)]; }
    var a = pick(), b = pick();
    while (b === a && Math.random() < 0.6) b = pick();
    r.candidates = [{ type:a }, { type:b }];
  },

  nodeInfo: function(t) {
    return ({
      battle:{ icon:"⚔️", name:"作戰",     desc:"一般規模的敵襲" },
      elite: {icon:"💀", name:"精英作戰", desc:"更強、更多的敵人，報酬豐厚" },
      shop:  {icon:"🛒", name:"招募站",   desc:"消耗源石錠招募幹員／換取藏品" },
      event: {icon:"❔", name:"不期而遇", desc:"隨機事件，或有奇遇" },
      boss:  {icon:"👑", name:"首領",     desc:"擊敗它即可通關！" }
    })[t];
  },

  showMap: function() {
    var r = RL.run, h = "";
    h += RL.headerHTML("第 " + (r.stage+1) + " / " + r.total + " 層");
    if (RL.toast) { h += '<div style="background:#3a2e5a;padding:8px 12px;border-radius:8px;margin:6px 0;font-size:13px;">📢 '+RL.toast+'</div>'; RL.toast=""; }
    h += '<p style="text-align:center;opacity:.8;margin:14px 0 8px;">選擇你的前進路線：</p>';
    h += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">';
    r.candidates.forEach(function(c, i){
      var info = RL.nodeInfo(c.type);
      var boss = c.type === "boss";
      h += '<div onclick="RL.pick('+i+')" style="cursor:pointer;flex:1;min-width:160px;background:'+(boss?"#4a1520":"#241d3a")+';border:2px solid '+(boss?"#e74c3c":"#5a4a82")+';border-radius:12px;padding:16px;text-align:center;transition:.15s;" onmouseover="this.style.transform=\'translateY(-3px)\'" onmouseout="this.style.transform=\'\'">'+
        '<div style="font-size:34px;">'+info.icon+'</div>'+
        '<div style="font-weight:bold;font-size:17px;margin:4px 0;">'+info.name+'</div>'+
        '<div style="font-size:12px;opacity:.75;">'+info.desc+'</div></div>';
    });
    h += '</div>';
    h += '<div style="margin-top:16px;text-align:center;"><button style="'+RL.btnCss("#6c5ce7")+'" onclick="RL.confirmQuit()">🚪 撤離裂隙</button></div>';
    RL.view.innerHTML = h;
  },

  headerHTML: function(title) {
    var r = RL.run;
    var relics = r.relics.length ? r.relics.map(function(x){return "🔹"+x.name;}).join("　") : "（無）";
    var squad = r.squad.map(function(k){ var o=RL.OPS[k]; return o.letter+o.name; }).join("・");
    return '<div style="background:#191225;border-radius:12px;padding:12px 16px;">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;">'+
        '<span style="font-size:18px;font-weight:bold;">🌀 集成戰略</span>'+
        '<span style="font-size:15px;">💎 源石錠 <b>'+r.ingots+'</b></span></div>'+
      '<div style="font-size:12px;opacity:.85;margin-top:6px;">👥 幹員：'+squad+'</div>'+
      '<div style="font-size:12px;opacity:.85;margin-top:3px;">🔹 藏品：'+relics+'</div>'+
      '<div style="font-size:13px;opacity:.9;margin-top:8px;font-weight:bold;">'+title+'</div></div>';
  },

  pick: function(i) {
    var c = RL.run.candidates[i];
    if (c.type === "shop")      RL.showShop();
    else if (c.type === "event")RL.showEvent();
    else                        RL.startBattle(c.type);
  },

  advance: function() {
    RL.run.stage++;
    if (RL.run.stage >= RL.run.total) return; // 理論上首領已結束遊戲
    RL.genCandidates();
    RL.showMap();
  },

  // ── 事件 ───────────────────────────────────────────────────
  showEvent: function() {
    var ev = RL.EVENTS[Math.floor(Math.random()*RL.EVENTS.length)];
    RL._ev = ev;
    var h = RL.headerHTML(ev.title);
    h += '<div style="background:#241d3a;border-radius:12px;padding:16px;margin-top:12px;">'+
         '<p style="opacity:.9;">'+ev.desc+'</p>';
    ev.opts.forEach(function(op, i){
      h += '<button style="'+RL.btnCss("#5a4a82")+'display:block;width:100%;margin:8px 0;text-align:left;" onclick="RL.evChoose('+i+')">'+op.label+'</button>';
    });
    h += '</div>';
    RL.view.innerHTML = h;
  },
  evChoose: function(i) { RL._ev.opts[i].run(); RL.advance(); },

  grantRelic: function() {
    var owned = RL.run.relics.map(function(x){return x.name;});
    var avail = RL.RELICS.filter(function(x){ return owned.indexOf(x.name)<0; });
    var pool = avail.length ? avail : RL.RELICS;
    var r = pool[Math.floor(Math.random()*pool.length)];
    RL.run.relics.push(r);
    for (var k in r.mod) RL.run.mods[k] = (RL.run.mods[k]||0) + r.mod[k];
    RL.toast = "獲得藏品「"+r.name+"」— "+r.desc;
  },
  recruitRandom: function() {
    var keys = Object.keys(RL.OPS);
    var k = keys[Math.floor(Math.random()*keys.length)];
    RL.run.squad.push(k);
    RL.toast = "招募了幹員「"+RL.OPS[k].name+"（"+RL.OPS[k].cls+"）」！";
  },

  // ── 商店 ───────────────────────────────────────────────────
  showShop: function() {
    var keys = Object.keys(RL.OPS);
    var r1 = keys[Math.floor(Math.random()*keys.length)];
    var r2 = keys[Math.floor(Math.random()*keys.length)];
    var relic = RL.RELICS[Math.floor(Math.random()*RL.RELICS.length)];
    RL._shop = { items:[
      { type:"op", key:r1, price:35 },
      { type:"op", key:r2, price:35 },
      { type:"relic", relic:relic, price:55 }
    ], sold:[false,false,false] };
    RL.renderShop();
  },
  renderShop: function() {
    var s = RL._shop, h = RL.headerHTML("🛒 招募站");
    h += '<div style="margin-top:12px;">';
    s.items.forEach(function(it, i){
      var label, sub;
      if (it.type === "op") { var o=RL.OPS[it.key]; label=o.letter+" 招募 "+o.name+"（"+o.cls+"）"; sub="HP "+o.hp+"　ATK "+o.atk+"　費 "+o.cost; }
      else { label="🔹 藏品 "+it.relic.name; sub=it.relic.desc; }
      var done = s.sold[i];
      h += '<div style="background:#241d3a;border-radius:10px;padding:12px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;'+(done?"opacity:.4;":"")+'">'+
        '<div><div style="font-weight:bold;">'+label+'</div><div style="font-size:12px;opacity:.75;">'+sub+'</div></div>'+
        (done ? '<span style="opacity:.7;">已購買</span>'
              : '<button style="'+RL.btnCss("#27ae60")+'" onclick="RL.buy('+i+')">💎 '+it.price+'</button>')+
        '</div>';
    });
    h += '</div><div style="text-align:center;margin-top:8px;"><button style="'+RL.btnCss("#6c5ce7")+'" onclick="RL.advance()">前進 ▶</button></div>';
    RL.view.innerHTML = h;
  },
  buy: function(i) {
    var s = RL._shop, it = s.items[i];
    if (s.sold[i]) return;
    if (RL.run.ingots < it.price) { RL.toast="源石錠不足！"; RL.renderShop(); return; }
    RL.run.ingots -= it.price;
    s.sold[i] = true;
    if (it.type === "op") RL.run.squad.push(it.key);
    else { RL.run.relics.push(it.relic); for (var k in it.relic.mod) RL.run.mods[k]=(RL.run.mods[k]||0)+it.relic.mod[k]; }
    RL.renderShop();
  },

  // ── 波次生成 ───────────────────────────────────────────────
  makeWaves: function(diff, boss) {
    var spawns = [], t = 2.0;
    var count = 6 + diff * 3;
    for (var i=0;i<count;i++){
      var row = Math.floor(Math.random()*RL.ROWS);
      var roll = Math.random() + diff*0.05;
      var type = roll > 0.82 ? "heavy" : (roll > 0.45 ? "soldier" : "bug");
      spawns.push({ t:t, type:type, row:row });
      t += Math.max(0.7, 1.7 - diff*0.08) + Math.random()*0.7;
    }
    if (boss) {
      for (var j=0;j<3;j++) spawns.push({ t: 3+j*1.4, type:"soldier", row:Math.floor(Math.random()*RL.ROWS) });
      spawns.push({ t: t+2, type:"boss", row:1 });
      for (var m=0;m<4;m++) spawns.push({ t:t+2.5+m*1.2, type:"heavy", row:Math.floor(Math.random()*RL.ROWS) });
    }
    return spawns;
  },

  // ── 開始戰鬥 ───────────────────────────────────────────────
  startBattle: function(kind) {
    var boss = kind === "boss";
    var diff = RL.run.stage + (kind==="elite"?2:0) + (boss?4:0);
    var m = RL.run.mods;
    RL.b = {
      kind: kind, boss: boss,
      dp: Math.min(12, 20+m.maxDP), maxDP: 20+m.maxDP, dpRate: 1/1.4 + m.dpRate,
      life: 3 + m.life, maxLife: 3 + m.life,
      spawns: RL.makeWaves(diff, boss), spawnIdx: 0, clock: 0,
      units: [], enemies: [], killed: 0,
      cards: RL.run.squad.map(function(k, idx){ return { uid:idx, op:RL.OPS[k], state:"ready", cd:0, unit:null }; }),
      sel: null, over: false, speed: 1
    };
    RL.renderBattleShell(kind);
    RL.last = performance.now();
    RL.raf = requestAnimationFrame(RL.loop);
  },

  renderBattleShell: function(kind) {
    var W = RL.COLS*RL.TILE, H = RL.ROWS*RL.TILE;
    var titleMap = { battle:"⚔️ 作戰", elite:"💀 精英作戰", boss:"👑 首領決戰" };
    var h = '<div style="text-align:center;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'+
         '<b>'+(titleMap[kind]||"作戰")+'</b>'+
         '<span id="rl-stat" style="font-size:14px;"></span>'+
         '<button style="'+RL.btnCss("#555")+'padding:4px 10px;" onclick="RL.toggleSpeed()"><span id="rl-spd">▶ 1x</span></button></div>';
    h += '<canvas id="rl-cv" width="'+W+'" height="'+H+'" style="width:'+W+'px;height:'+H+'px;background:#0f0c1a;border:2px solid #3a2e5a;border-radius:8px;max-width:100%;"></canvas>';
    h += '<div id="rl-cards" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px;"></div>';
    h += '<div style="font-size:12px;opacity:.7;margin-top:8px;">點幹員卡 → 再點格子部署（地面幹員會擋怪，遠程幹員站高台不被攻擊）。點自己的幹員可撤退（8 秒後可再部署）。</div>';
    h += '</div>';
    RL.view.innerHTML = h;
    RL.cv = document.getElementById("rl-cv");
    RL.ctx = RL.cv.getContext("2d");
    RL.cv.addEventListener("mousedown", RL.onCanvasClick);
    RL.renderCards();
  },

  renderCards: function() {
    var box = document.getElementById("rl-cards"); if (!box) return;
    box.innerHTML = "";
    RL.b.cards.forEach(function(c){
      var o = c.op, dis = c.state!=="ready" || RL.b.dp < o.cost;
      var bg = c.uid===RL.b.sel ? "#f1c40f" : (c.state==="onfield"?"#2c3e50":(c.state==="cd"?"#333":o.color));
      var extra = c.state==="cd" ? ("待命 "+Math.ceil(c.cd)+"s") : ("費 "+o.cost);
      var d = document.createElement("div");
      d.style.cssText = "min-width:58px;padding:6px 4px;border-radius:8px;text-align:center;cursor:"+(dis?"not-allowed":"pointer")+";background:"+bg+";color:"+(c.uid===RL.b.sel?"#000":"#fff")+";opacity:"+(dis?.5:1)+";font-size:12px;border:2px solid rgba(255,255,255,.15);";
      d.innerHTML = '<div style="font-size:18px;font-weight:bold;">'+o.letter+'</div><div>'+o.name+'</div><div style="font-size:11px;opacity:.9;">'+extra+'</div>';
      d.onclick = function(){ if (c.state==="ready" && RL.b.dp>=o.cost) { RL.b.sel = (RL.b.sel===c.uid?null:c.uid); RL.renderCards(); } };
      box.appendChild(d);
    });
  },

  onCanvasClick: function(e) {
    if (RL.b.over) return;
    var rect = RL.cv.getBoundingClientRect();
    var x = (e.clientX-rect.left) * (RL.cv.width/rect.width);
    var y = (e.clientY-rect.top)  * (RL.cv.height/rect.height);
    var col = Math.floor(x/RL.TILE), row = Math.floor(y/RL.TILE);
    if (col<0||col>=RL.COLS||row<0||row>=RL.ROWS) return;
    var occupant = RL.b.units.filter(function(u){ return u.col===col && u.row===row; })[0];

    if (RL.b.sel != null && !occupant) {                 // 部署
      var card = RL.b.cards.filter(function(c){return c.uid===RL.b.sel;})[0];
      if (card && card.state==="ready" && RL.b.dp>=card.op.cost) {
        var o = card.op, m = RL.run.mods;
        var hp = Math.round(o.hp * (1+m.hpPct));
        var u = { op:o, col:col, row:row, hp:hp, maxHp:hp,
                  atk:Math.round((o.atk||0)*(1+m.atkPct)), heal:o.heal||0,
                  cd:0, block:o.block, blocked:[], card:card };
        RL.b.units.push(u); card.unit = u; card.state="onfield";
        RL.b.dp -= o.cost; RL.b.sel = null; RL.renderCards();
      }
    } else if (occupant) {                               // 撤退
      RL.retreat(occupant);
    }
  },

  retreat: function(u) {
    u.blocked.forEach(function(en){ en.blocker=null; });
    RL.b.units = RL.b.units.filter(function(x){return x!==u;});
    u.card.state="cd"; u.card.cd=8; u.card.unit=null;
    RL.renderCards();
  },

  toggleSpeed: function() {
    RL.b.speed = RL.b.speed===1 ? 2 : 1;
    var s = document.getElementById("rl-spd"); if (s) s.textContent = "▶ "+RL.b.speed+"x";
  },

  // ── 主迴圈 ─────────────────────────────────────────────────
  loop: function(now) {
    if (!RL.b || RL.b.over) return;
    var dt = Math.min(0.05, (now-RL.last)/1000) * RL.b.speed;
    RL.last = now;
    RL.update(dt);
    RL.draw();
    if (!RL.b.over) RL.raf = requestAnimationFrame(RL.loop);
  },

  update: function(dt) {
    var b = RL.b, T = RL.TILE;
    b.clock += dt;
    b.dp = Math.min(b.maxDP, b.dp + b.dpRate*dt);

    // 卡片冷卻
    var cardChanged = false;
    b.cards.forEach(function(c){
      if (c.state==="cd") { c.cd -= dt; if (c.cd<=0){ c.state="ready"; cardChanged=true; } }
    });

    // 生怪
    while (b.spawnIdx < b.spawns.length && b.clock >= b.spawns[b.spawnIdx].t) {
      var sp = b.spawns[b.spawnIdx++], def = RL.ENE[sp.type];
      var mult = 1 + RL.run.stage*0.12; // 越後面越硬
      b.enemies.push({ def:def, type:sp.type, row:sp.row, x:RL.COLS*T,
        hp:Math.round(def.hp*mult), maxHp:Math.round(def.hp*mult), cd:0, blocker:null });
    }

    // 敵人移動 / 阻擋 / 攻擊
    for (var i=b.enemies.length-1;i>=0;i--){
      var en = b.enemies[i];
      // 尋找阻擋者
      if (!en.blocker) {
        var col = Math.floor(en.x / T);
        var gu = b.units.filter(function(u){ return u.ground && u.col===col && u.row===en.row && u.blocked.length<u.block; })[0];
        if (gu) { en.blocker = gu; gu.blocked.push(en); en.x = col*T + T*0.62; }
      }
      if (en.blocker) {
        if (en.blocker.hp<=0) { en.blocker=null; }
        else {
          en.cd -= dt;
          if (en.cd<=0){ en.blocker.hp -= en.def.atk; en.cd = en.def.itv;
            if (en.blocker.hp<=0) RL.killUnit(en.blocker); }
        }
      } else {
        en.x -= en.def.spd*dt;
        if (en.x <= 6) { b.life -= en.def.weight; b.enemies.splice(i,1); continue; }
      }
    }

    // 幹員攻擊 / 治療
    b.units.forEach(function(u){
      u.cd -= dt; if (u.cd>0) return;
      if (u.op.healer) {
        var hurt = b.units.filter(function(t){ return t!==u && t.hp<t.maxHp && RL.inRange(u,t.col,t.row); })
                          .sort(function(a,c){return (a.hp/a.maxHp)-(c.hp/c.maxHp);})[0];
        if (hurt){ hurt.hp = Math.min(hurt.maxHp, hurt.hp+u.heal); u.cd = u.op.itv; }
        return;
      }
      var target;
      if (u.ground) { target = u.blocked.filter(function(e){return e.hp>0;})[0]; }
      else {
        var cand = b.enemies.filter(function(e){ return e.hp>0 && RL.inRange(u, Math.floor(e.x/T), e.row); });
        cand.sort(function(a,c){return a.x-c.x;}); target = cand[0]; // 打最靠近終點的
      }
      if (target){ target.hp -= u.atk; u.cd = u.op.itv; if (target.hp<=0) RL.killEnemy(target); }
    });

    if (cardChanged) RL.renderCards();

    // 勝敗判定
    var done = b.spawnIdx>=b.spawns.length && b.enemies.length===0;
    if (b.life<=0) RL.endBattle(false);
    else if (done)  RL.endBattle(true);
    var stat = document.getElementById("rl-stat");
    if (stat) stat.innerHTML = "🔷DP "+Math.floor(b.dp)+"/"+b.maxDP+"　❤️生命 "+Math.max(0,b.life)+"/"+b.maxLife+"　👾剩 "+(b.spawns.length-b.killed);
  },

  inRange: function(u, col, row) {
    return Math.abs(u.col-col)<=u.op.range && Math.abs(u.row-row)<=u.op.range;
  },
  killEnemy: function(en) {
    var idx = RL.b.enemies.indexOf(en); if (idx<0) return;
    RL.b.enemies.splice(idx,1); RL.b.killed++;
    if (en.blocker){ en.blocker.blocked = en.blocker.blocked.filter(function(x){return x!==en;}); }
    RL.run.ingots += (en.type==="boss"?0:1) + (en.type==="heavy"?2:0);
  },
  killUnit: function(u) {
    u.blocked.forEach(function(en){ en.blocker=null; });
    RL.b.units = RL.b.units.filter(function(x){return x!==u;});
    if (u.card){ u.card.state="cd"; u.card.cd=10; u.card.unit=null; }
    RL.renderCards();
  },

  // ── 繪製 ───────────────────────────────────────────────────
  draw: function() {
    var b=RL.b, ctx=RL.ctx, T=RL.TILE;
    ctx.clearRect(0,0,RL.cv.width,RL.cv.height);
    // 格線
    for (var c=0;c<RL.COLS;c++) for (var r=0;r<RL.ROWS;r++){
      ctx.fillStyle = (c+r)%2 ? "#171226" : "#1c1630";
      ctx.fillRect(c*T,r*T,T,T);
    }
    // 左側防守點
    ctx.fillStyle = "rgba(52,152,219,.25)"; ctx.fillRect(0,0,8,RL.cv.height);
    ctx.fillStyle = "#3498db";
    for (var y=0;y<RL.cv.height;y+=8) ctx.fillRect(0,y,4,4);
    // 敵人
    b.enemies.forEach(function(en){
      var cx=en.x, cy=en.row*T+T/2;
      ctx.beginPath(); ctx.arc(cx,cy,en.def.r,0,7); ctx.fillStyle=en.def.color; ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.4)"; ctx.stroke();
      RL.bar(cx-en.def.r, cy-en.def.r-7, en.def.r*2, 4, en.hp/en.maxHp, "#e74c3c");
    });
    // 幹員
    b.units.forEach(function(u){
      var x=u.col*T, y=u.row*T;
      ctx.fillStyle = u.op.color; RL.rr(x+8,y+8,T-16,T-16,8); ctx.fill();
      if (!u.ground){ ctx.strokeStyle="#f1c40f"; ctx.lineWidth=2; RL.rr(x+8,y+8,T-16,T-16,8); ctx.stroke(); ctx.lineWidth=1; }
      ctx.fillStyle="#fff"; ctx.font="bold 22px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(u.op.letter, x+T/2, y+T/2-4);
      RL.bar(x+10, y+T-14, T-20, 4, u.hp/u.maxHp, "#2ecc71");
    });
  },
  rr: function(x,y,w,h,r){ var c=RL.ctx; c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); },
  bar: function(x,y,w,h,p,col){ var c=RL.ctx; c.fillStyle="rgba(0,0,0,.6)"; c.fillRect(x,y,w,h); c.fillStyle=col; c.fillRect(x,y,w*Math.max(0,Math.min(1,p)),h); },

  // ── 戰鬥結算 ───────────────────────────────────────────────
  endBattle: function(win) {
    if (RL.b.over) return;
    RL.b.over = true;
    if (RL.raf) cancelAnimationFrame(RL.raf), RL.raf=0;
    if (RL.cv) RL.cv.removeEventListener("mousedown", RL.onCanvasClick);

    if (!win) {
      // 失敗 → 本次 roguelike 結束，帶少量安慰金離開
      var consolation = 20 + RL.run.stage*10;
      var h = RL.headerHTML("💀 作戰失敗");
      h += '<div style="text-align:center;background:#3a1520;border-radius:12px;padding:20px;margin-top:12px;">'+
        '<h2>防線被突破了……</h2><p>你的探索止步於第 '+(RL.run.stage+1)+' 層。</p>'+
        '<p>結算為外層金幣 <b>+'+consolation+'</b>。</p>'+
        '<button style="'+RL.btnCss("#c0392b")+'" onclick="RL.close('+consolation+',\'💀 你在裂隙的集成戰略中倒下，帶回 '+consolation+' 金幣。\')">離開裂隙</button></div>';
      RL.view.innerHTML = h;
      return;
    }

    if (RL.b.boss) {                                    // 通關！
      game.roguelikeCleared = true;
      var reward = 300 + RL.run.ingots; // 剩餘源石錠 1:1 折金幣
      var h2 = RL.headerHTML("👑 通關！");
      h2 += '<div style="text-align:center;background:#1e3a1e;border-radius:12px;padding:24px;margin-top:12px;">'+
        '<h1>🏆 征服集成戰略</h1><p>你擊敗了首領「湮滅者」，帶著戰利品凱旋！</p>'+
        '<p>總計折算金幣 <b>+'+reward+'</b>（獎勵 300 + 源石錠 '+RL.run.ingots+'）。</p>'+
        '<button style="'+RL.btnCss("#27ae60")+'" onclick="RL.close('+reward+',\'👑 你征服了裂隙深處的集成戰略，帶回 '+reward+' 金幣！\')">凱旋而歸</button></div>';
      RL.view.innerHTML = h2;
      return;
    }

    // 一般 / 精英勝利 → 領獎、前進
    var bonus = (RL.b.kind==="elite"?60:30) + RL.b.killed*2;
    RL.run.ingots += bonus;
    if (Math.random() < (RL.b.kind==="elite"?0.7:0.3)) RL.grantRelic();
    var h3 = RL.headerHTML("🎉 作戰勝利");
    h3 += '<div style="text-align:center;background:#1e2a3a;border-radius:12px;padding:20px;margin-top:12px;">'+
      '<h2>防線守住了！</h2><p>擊殺 '+RL.b.killed+' 敵，獲得源石錠 <b>+'+bonus+'</b>。</p>'+
      (RL.toast?'<p style="color:#f1c40f;">'+RL.toast+'</p>':'')+
      '<button style="'+RL.btnCss("#27ae60")+'" onclick="RL.advance()">前進 ▶</button></div>';
    RL.toast = "";
    RL.view.innerHTML = h3;
  },

  confirmQuit: function() {
    var take = RL.run.ingots;
    var h = RL.headerHTML("🚪 撤離裂隙");
    h += '<div style="text-align:center;background:#241d3a;border-radius:12px;padding:20px;margin-top:12px;">'+
      '<p>放棄本次探索並撤離？目前 '+take+' 源石錠將折算成金幣帶走。</p>'+
      '<button style="'+RL.btnCss("#c0392b")+'" onclick="RL.close('+take+',\'你撤離了裂隙，帶回 '+take+' 金幣。\')">確定撤離</button> '+
      '<button style="'+RL.btnCss("#6c5ce7")+'" onclick="RL.showMap()">繼續探索</button></div>';
    RL.view.innerHTML = h;
  },

  btnCss: function(bg){ return "background:"+bg+";color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:14px;cursor:pointer;margin:4px;"; }
};