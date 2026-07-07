// ============================================================
//  new_engine.js  ── 遊戲引擎（邏輯 + 戰鬥 + 小遊戲）
//  來源：engine.js + student.js
//  數值設定請見 new_data.js
// ============================================================


// ── 偽隨機數（固定種子） ────────────────────────────────────────
var SESSION_SEED = Date.now() & 0xFFFFFFFF;

// ── Buff Tooltip（固定浮層，掛在 body，突破 overflow 限制） ──
(function() {
  var tip = document.createElement("div");
  tip.id = "buff-tooltip";
  document.body.appendChild(tip);

  var _mx = 0, _my = 0;
  document.addEventListener("mousemove", function(e) {
    _mx = e.clientX; _my = e.clientY;
    if (tip.style.display !== "block") return;
    var x = _mx + 14, y = _my + 16;
    if (x + 170 > window.innerWidth)  x = _mx - 170;
    if (y + 100 > window.innerHeight) y = _my - 100;
    tip.style.left = x + "px";
    tip.style.top  = y + "px";
  });
  document.addEventListener("mouseover", function(e) {
    var el = e.target.closest ? e.target.closest("[data-tooltip]") : null;
    if (!el) { tip.style.display = "none"; return; }
    tip.textContent = el.dataset.tooltip;
    var x = _mx + 14, y = _my + 16;
    if (x + 170 > window.innerWidth)  x = _mx - 170;
    if (y + 100 > window.innerHeight) y = _my - 100;
    tip.style.left = x + "px";
    tip.style.top  = y + "px";
    tip.style.display = "block";
  });
}());


// ── 全域遊戲狀態 ──────────────────────────────────────────────
// 出生點：掃描地圖中的出生點地塊（MAP_TILE.START）
function _findPlayerStartInGrid(grid) {
  for (var y = 0; y < grid.length; y++) {
    for (var x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === MAP_TILE.START) return { x: x, y: y };
    }
  }
  return { x: 1, y: 1 };
}
var playerStart = _findPlayerStartInGrid(mapGrid);
var player = { x: playerStart.x, y: playerStart.y };

var visionRadius = 2;   // 視野半徑（渲染時由攝影機計算覆寫）

var currentPlayer = {
  name:      playerStats.name,
  hp:        playerStats.hp,
  maxHp:     playerStats.maxHp,
  atk:       playerStats.atk,
  def:       playerStats.def,
  money:     playerStats.money,
  inventory: []
};

var currentMap = mapGrid.map(function(row) { return row.slice(); });


var visitedTiles      = [];
var gameOver          = false;
var _firedDialogueTriggers = {};  // 記錄已觸發過的 dialogueTriggers id

var dialogueQueue    = [];
var dialogueCallback = null;


function showScreen(screenId) {
  var screens = ["screen-map", "screen-dialogue"];
  for (var i = 0; i < screens.length; i++) {
    var el = document.getElementById(screens[i]);
    if (el) el.style.display = (screens[i] === screenId) ? "flex" : "none";
  }
}

function playSound(name) {}

function _duckOverlay()   { if (typeof AudioSystem !== "undefined") AudioSystem.duckBgm();   }
function _unduckOverlay() { if (typeof AudioSystem !== "undefined") AudioSystem.unduckBgm(); }

function updatePlayerMoney(amount) { currentPlayer.money = Math.max(0, currentPlayer.money + amount); updateHUD(); }
function updateHUD() {
  function set(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; }
  set("hud-hp-inline", currentPlayer.hp + " / " + currentPlayer.maxHp);
  set("hud-atk-inline", currentPlayer.atk);
  set("hud-def-inline", currentPlayer.def);
  set("hud-money", currentPlayer.money);

  var bar = document.getElementById("player-hp-bar-fill");
  if (bar) bar.style.width = (currentPlayer.hp / currentPlayer.maxHp * 100) + "%";
  var pnum = document.getElementById("player-hp-num");
  if (pnum) pnum.textContent = currentPlayer.hp + " / " + currentPlayer.maxHp;
}

function _miniMapTileColor(code) {
  if (code === MAP_TILE.WALL) return "#080d1a";
  if (code === MAP_TILE.EMPTY || code === MAP_TILE.START) return "#2d4a7a";
  var def = (typeof tileDefs !== "undefined") ? tileDefs[code] : null;
  if (def && def.color) return def.color;
  return DEV_MODE ? "#e02020" : "#2d4a7a";
}

function renderMiniMap() {
  var canvas = document.getElementById("minimap-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx  = canvas.getContext("2d");
  var rows = currentMap.length;
  var cols = currentMap[0] ? currentMap[0].length : 0;
  if (!rows || !cols) return;

  var RADIUS = 5;
  var VIEW   = RADIUS * 2 + 1;
  var CELL   = 9;
  canvas.width  = VIEW * CELL;
  canvas.height = VIEW * CELL;

  for (var dy = -RADIUS; dy <= RADIUS; dy++) {
    for (var dx = -RADIUS; dx <= RADIUS; dx++) {
      var mx = player.x + dx;
      var my = player.y + dy;
      var cx = (dx + RADIUS) * CELL;
      var cy = (dy + RADIUS) * CELL;

      var color;
      if (dx === 0 && dy === 0) {
        color = "#22e060";
      } else if (mx < 0 || my < 0 || mx >= cols || my >= rows) {
        color = "#050810";
      } else {
        var dist       = Math.max(Math.abs(dx), Math.abs(dy));
        var isVisible  = dist <= visionRadius;
        var isExplored = visitedTiles.indexOf(mx + "," + my) !== -1;
        if (isVisible || isExplored) {
          color = _miniMapTileColor(currentMap[my][mx]);
        } else {
          color = "#050810";
        }
      }

      ctx.fillStyle = color;
      ctx.fillRect(cx, cy, CELL, CELL);
    }
  }

  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth   = 1;
  ctx.strokeRect(RADIUS * CELL + 0.5, RADIUS * CELL + 0.5, CELL - 1, CELL - 1);
}

function renderMiniMapLarge() {
  var canvas = document.getElementById("minimap-canvas-large");
  if (!canvas || !canvas.getContext) return;
  var ctx  = canvas.getContext("2d");
  var rows = currentMap.length;
  var cols = currentMap[0] ? currentMap[0].length : 0;
  if (!rows || !cols) return;

  var CELL = 30;
  canvas.width  = cols * CELL;
  canvas.height = rows * CELL;

  for (var y = 0; y < rows; y++) {
    for (var x = 0; x < cols; x++) {
      var isPlayer   = (x === player.x && y === player.y);
      var dist       = Math.max(Math.abs(x - player.x), Math.abs(y - player.y));
      var isVisible  = dist <= visionRadius;
      var isExplored = visitedTiles.indexOf(x + "," + y) !== -1;

      var color;
      if (isPlayer) {
        color = "#22e060";
      } else if (isVisible || isExplored) {
        color = _miniMapTileColor(currentMap[y][x]);
      } else {
        color = "#050810";
      }

      ctx.fillStyle = color;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth   = 2;
  ctx.strokeRect(player.x * CELL + 1, player.y * CELL + 1, CELL - 2, CELL - 2);
}

// ── 大地圖平移狀態 ────────────────────────────────────────────
var _largeMapPanX = 0;
var _largeMapPanY = 0;
var _LARGE_MAP_CELL = 30;  // 與 renderMiniMapLarge 保持一致

function _applyLargeMapPan() {
  var canvas = document.getElementById("minimap-canvas-large");
  var vp     = document.getElementById("minimap-viewport");
  if (!canvas || !vp) return;
  var vpW = vp.clientWidth  || vp.offsetWidth;
  var vpH = vp.clientHeight || vp.offsetHeight;
  var maxX = 0;
  var minX = Math.min(0, vpW - canvas.width);
  var maxY = 0;
  var minY = Math.min(0, vpH - canvas.height);
  _largeMapPanX = Math.max(minX, Math.min(maxX, _largeMapPanX));
  _largeMapPanY = Math.max(minY, Math.min(maxY, _largeMapPanY));
  canvas.style.left = _largeMapPanX + "px";
  canvas.style.top  = _largeMapPanY + "px";
}

function _largeMapKeyHandler(e) {
  var keys = { ArrowUp: true, ArrowDown: true, ArrowLeft: true, ArrowRight: true };
  if (!keys[e.key]) return;
  e.preventDefault();
  e.stopPropagation();
  var step = _LARGE_MAP_CELL * 3;  // 每次移動 3 格
  if (e.key === "ArrowLeft")  _largeMapPanX += step;
  if (e.key === "ArrowRight") _largeMapPanX -= step;
  if (e.key === "ArrowUp")    _largeMapPanY += step;
  if (e.key === "ArrowDown")  _largeMapPanY -= step;
  _applyLargeMapPan();
}

function openMiniMapOverlay() {
  var overlay = document.getElementById("minimap-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  renderMiniMapLarge();

  // 開啟後將視角對準玩家，再套用平移
  setTimeout(function() {
    var vp = document.getElementById("minimap-viewport");
    if (!vp) return;
    var vpW = vp.clientWidth  || vp.offsetWidth;
    var vpH = vp.clientHeight || vp.offsetHeight;
    var rows = currentMap.length;
    var cols = currentMap[0] ? currentMap[0].length : 0;
    var canvasW = cols * _LARGE_MAP_CELL;
    var canvasH = rows * _LARGE_MAP_CELL;
    // 玩家置中
    _largeMapPanX = vpW / 2 - (player.x + 0.5) * _LARGE_MAP_CELL;
    _largeMapPanY = vpH / 2 - (player.y + 0.5) * _LARGE_MAP_CELL;
    _applyLargeMapPan();
  }, 0);

  document.addEventListener("keydown", _largeMapKeyHandler, true);
  _duckOverlay();
}

function closeMiniMapOverlay() {
  var overlay = document.getElementById("minimap-overlay");
  if (overlay) overlay.style.display = "none";
  document.removeEventListener("keydown", _largeMapKeyHandler, true);
  _unduckOverlay();
}

// ── 背包側欄 ─────────────────────────────────────────────────
function renderBagSidebar() {
  var list = document.getElementById("bag-list");
  if (!list) return;
  list.innerHTML = "";
  var inv = currentPlayer.inventory;
  if (!inv || inv.length === 0) {
    var empty = document.createElement("div");
    empty.className = "bag-empty";
    empty.textContent = "（空的）";
    list.appendChild(empty);
    return;
  }
  var counts = {};
  for (var i = 0; i < inv.length; i++) {
    var n = inv[i].name;
    if (!counts[n]) counts[n] = { item: inv[i], qty: 0 };
    counts[n].qty++;
  }
  Object.keys(counts).forEach(function(name) {
    var row = document.createElement("div");
    row.className = "bag-row";
    var c = counts[name];

    var top = document.createElement("div");
    top.className = "bag-row-top";
    top.innerHTML = "<span class='bag-row-name'>" + c.item.name + "</span>" +
                    "<span class='bag-row-qty'>× " + c.qty + "</span>";

    // 沒有觸發（effect 不是函式）的物品不顯示「使用」按鈕
    if (typeof c.item.effect === "function") {
      var useBtn = document.createElement("button");
      useBtn.className = "bag-row-use";
      useBtn.textContent = "使用";
      useBtn.onclick = function() { _bagUseItemByName(name); };
      top.appendChild(useBtn);
    }

    var desc = document.createElement("span");
    desc.className = "bag-row-desc";
    desc.textContent = c.item.desc || "";

    row.appendChild(top);
    row.appendChild(desc);
    list.appendChild(row);
  });
}

// ── 設定 Overlay ──────────────────────────────────────────────
var _settingsInitialized = false;

function openSettings() {
  var overlay = document.getElementById("settings-overlay");
  if (!overlay) return;
  if (!_settingsInitialized) {
    _settingsInitialized = true;
    var bgmVol = 1.0;
    var sfxVol = 1.0;
    _initVolumeSlider({
      trackId:  "bgm-track",
      fillId:   "bgm-fill",
      thumbId:  "bgm-thumb",
      iconId:   "bgm-icon",
      initialVol: bgmVol,
      onChange: function(v) {
        if (typeof AudioSystem !== "undefined") AudioSystem.setBgmVolume(v);
      }
    });
    _initVolumeSlider({
      trackId:  "sfx-track",
      fillId:   "sfx-fill",
      thumbId:  "sfx-thumb",
      iconId:   "sfx-icon",
      initialVol: sfxVol,
      onChange: function(v) {
        if (typeof AudioSystem !== "undefined") AudioSystem.setSfxVolume(v);
      }
    });
  }
  overlay.style.display = "flex";
  _duckOverlay();
}

function closeSettings() {
  var overlay = document.getElementById("settings-overlay");
  if (overlay) overlay.style.display = "none";
  _unduckOverlay();
}

function _initVolumeSlider(opts) {
  var track = document.getElementById(opts.trackId);
  var fill  = document.getElementById(opts.fillId);
  var thumb = document.getElementById(opts.thumbId);
  var icon  = document.getElementById(opts.iconId);
  if (!track || !fill || !thumb) return;

  var vol        = Math.max(0, Math.min(1, opts.initialVol));
  var lastNonZero = vol > 0 ? vol : 1.0;

  function applyVol(v) {
    vol = Math.max(0, Math.min(1, v));
    if (vol > 0) lastNonZero = vol;
    var pct = (vol * 100).toFixed(2) + "%";
    fill.style.width  = pct;
    thumb.style.left  = pct;
    if (vol === 0) {
      thumb.classList.add("muted");
      if (icon && icon.dataset.off) icon.src = icon.dataset.off;
    } else {
      thumb.classList.remove("muted");
      if (icon && icon.dataset.on) icon.src = icon.dataset.on;
    }
    if (opts.onChange) opts.onChange(vol);
  }

  applyVol(vol);

  if (icon) {
    icon.style.cursor = "pointer";
    icon.addEventListener("click", function() {
      applyVol(vol === 0 ? lastNonZero : 0);
    });
  }

  function volFromEvent(e) {
    var rect = track.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return (clientX - rect.left) / rect.width;
  }

  var dragging = false;

  track.addEventListener("mousedown", function(e) {
    dragging = true;
    applyVol(volFromEvent(e));
    e.preventDefault();
  });
  thumb.addEventListener("mousedown", function(e) {
    dragging = true;
    e.stopPropagation();
    e.preventDefault();
  });
  document.addEventListener("mousemove", function(e) {
    if (!dragging) return;
    applyVol(volFromEvent(e));
  });
  document.addEventListener("mouseup", function() {
    dragging = false;
  });

  track.addEventListener("touchstart", function(e) {
    dragging = true;
    applyVol(volFromEvent(e));
    e.preventDefault();
  }, { passive: false });
  thumb.addEventListener("touchstart", function(e) {
    dragging = true;
    e.stopPropagation();
    e.preventDefault();
  }, { passive: false });
  document.addEventListener("touchmove", function(e) {
    if (!dragging) return;
    applyVol(volFromEvent(e));
  });
  document.addEventListener("touchend", function() {
    dragging = false;
  });
}

// ── 戰鬥按鈕啟用 / 停用 ──────────────────────────────────────
function renderMap() {
  var board = document.getElementById("game-board");
  if (!board) return;
  board.innerHTML = "";
  var tileSize = 60;
  board.style.width = (currentMap[0].length * tileSize) + "px";

  for (var y = 0; y < currentMap.length; y++) {
    for (var x = 0; x < currentMap[y].length; x++) {
      var tile = document.createElement("div");
      tile.className = "tile";

      var dist       = Math.max(Math.abs(x - player.x), Math.abs(y - player.y));
      var key        = x + "," + y;
      var isVisible  = dist <= visionRadius;
      var isExplored = visitedTiles.indexOf(key) !== -1;

      if (isVisible) {
        if (!isExplored) visitedTiles.push(key);
        if (x === player.x && y === player.y) {
          tile.classList.add("tile--player");
          var img = document.createElement("img");
          img.src = "assets/picture/玩家.png"; img.alt = "玩家"; img.className = "sprite";
          tile.appendChild(img);
        } else {
          applyTileStyle(tile, currentMap[y][x], x, y);
        }
      } else if (isExplored) {
        tile.classList.add("tile--explored");
        applyTileStyle(tile, currentMap[y][x], x, y);
      } else {
        tile.classList.add("tile--hidden");
      }
      board.appendChild(tile);
    }
  }
  applyCameraTransform();
  renderMiniMap();
}

function applyCameraTransform() {
  var board = document.getElementById("game-board");
  if (!board) return;
  var viewTiles = Math.floor(VIEW_PX / (TILE_SIZE * CAM_ZOOM));
  var mapW = currentMap[0].length, mapH = currentMap.length;
  var half = (viewTiles - 1) / 2;
  var camX = Math.min(Math.max(player.x - half, 0), mapW - viewTiles);
  var camY = Math.min(Math.max(player.y - half, 0), mapH - viewTiles);
  board.style.transform =
    "scale(" + CAM_ZOOM + ") translate(" + (-camX * TILE_SIZE) + "px, " + (-camY * TILE_SIZE) + "px)";
  visionRadius = Math.ceil(half);
}

// 未定義地塊：每個編號只提示一次
var _warnedUnknownTiles = {};
function _warnUnknownTile(code) {
  if (_warnedUnknownTiles[code]) return;
  _warnedUnknownTiles[code] = true;
  showMapMessage("⚠️ 你指定了編號 " + code + " 的地塊，但找不到這個地塊。");
}

function applyTileStyle(tile, tileType, x, y) {
  if (tileType === MAP_TILE.WALL) { tile.classList.add("tile--wall"); return; }
  if (tileType === MAP_TILE.EMPTY || tileType === MAP_TILE.START) {
    tile.classList.add("tile--empty"); return;
  }

  // 自訂事件地塊（10~255）：外觀由 tile.js 的 tileDefs 定義
  var def = (typeof tileDefs !== "undefined") ? tileDefs[tileType] : null;
  if (def) {
    tile.classList.add("tile--event");
    if (def.color) tile.style.background = def.color;
    if (def.icon) {
      var iconImg = document.createElement("img");
      iconImg.src = def.icon; iconImg.alt = ""; iconImg.className = "sprite";
      tile.appendChild(iconImg);
    }
    return;
  }

  // 未定義的地塊：一般模式當空白格；DEV_MODE 標紅提醒開發者
  if (DEV_MODE) {
    tile.classList.add("tile--unknown");
    var mark = document.createElement("span");
    mark.className = "tile-emoji";
    mark.textContent = "?";
    tile.appendChild(mark);
    _warnUnknownTile(tileType);
  } else {
    tile.classList.add("tile--empty");
  }
}

// ── 鍵盤移動 ─────────────────────────────────────────────────
function closeAnyOverlay() {
  var minimapOverlay   = document.getElementById("minimap-overlay");
  var settingsOverlay  = document.getElementById("settings-overlay");
  var devPanelOverlay  = document.getElementById("dev-panel-overlay");
  var eventPanel       = document.getElementById("event-panel");

  if (devPanelOverlay  && devPanelOverlay.style.display  !== "none") { closeDevPanel();       return true; }
  if (eventPanel       && eventPanel.style.display       !== "none") { game.panel = "";       return true; }
  if (settingsOverlay  && settingsOverlay.style.display  !== "none") { closeSettings();       return true; }
  if (minimapOverlay   && minimapOverlay.style.display   !== "none") { closeMiniMapOverlay(); return true; }
  return false;
}

function updateControlsHint() {
  var el = document.getElementById("controls-hint");
  if (!el) return;
  el.textContent = "WASD / ↑↓←→ 移動　M 地圖　ESC 設定　C 關閉";
}

document.addEventListener("keydown", function(e) {
  if (gameOver) return;

  // 焦點在輸入框（開發模式編輯器等）時不攔截按鍵，否則打 WASD 會讓角色亂跑
  var tag = e.target && e.target.tagName;
  if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;

  if (e.key === "Escape") {
    e.preventDefault();
    if (!closeAnyOverlay()) { openSettings(); }
    return;
  }

  if (e.key === "c" || e.key === "C") {
    if (closeAnyOverlay()) { e.preventDefault(); return; }
  }

  var dlgScreen = document.getElementById("screen-dialogue");
  if (dlgScreen && dlgScreen.style.display !== "none") {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      advanceDialogue();
    }
    return;
  }

  var screen = document.getElementById("screen-map");
  if (!screen || screen.style.display === "none") return;

  // 任何 overlay 開啟時，不移動角色
  var _eventPanel = document.getElementById("event-panel");
  if (_eventPanel && _eventPanel.style.display !== "none") return;
  if (typeof isDevPanelOpen === "function" && isDevPanelOpen()) return;

  if (e.key === "m" || e.key === "M") { openMiniMapOverlay(); return; }

  var dx = 0, dy = 0;
  if (e.key === "ArrowUp"    || e.key === "w" || e.key === "W") dy = -1;
  if (e.key === "ArrowDown"  || e.key === "s" || e.key === "S") dy =  1;
  if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") dx = -1;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dx =  1;
  if (dx === 0 && dy === 0) return;

  var newX = player.x + dx, newY = player.y + dy;
  if (newY < 0 || newY >= currentMap.length) return;
  if (newX < 0 || newX >= currentMap[newY].length) return;

  var targetTile = currentMap[newY][newX];
  if (targetTile === MAP_TILE.WALL) return;

  player.x = newX; player.y = newY;
  renderMap();
  checkTileEvent(newX, newY);
  checkDialogueTriggers(newX, newY);
  if (typeof checkGameEndings === "function") checkGameEndings();
});

// ── 格子事件 ──────────────────────────────────────────────────
function checkDialogueTriggers(x, y) {
  if (typeof dialogueTriggers === "undefined") return;
  for (var i = 0; i < dialogueTriggers.length; i++) {
    var t = dialogueTriggers[i];
    if (_firedDialogueTriggers[t.id]) continue;
    if (t.doorX !== undefined) continue;  // 開門觸發由另一段處理
    var match = false;
    if (t.x !== undefined) {
      match = (x === t.x && y === t.y);
    } else if (t.xMin !== undefined) {
      match = (x >= t.xMin && x <= t.xMax && y >= t.yMin && y <= t.yMax);
    }
    if (match) {
      _firedDialogueTriggers[t.id] = true;
      showDialogue(t.lines);
      return;
    }
  }
}

// 呼叫事件函式（依名稱到 window 上找，錯誤時顯示提示）
function _callTileEventFn(name) {
  var fn = window[name];
  if (typeof fn !== "function") {
    showMapMessage("💥 找不到事件函式「" + name + "」，記得先按「套用程式碼」！");
    return;
  }
  try {
    fn();
  } catch (e) {
    showMapMessage("💥 事件發生錯誤：" + e.message);
  }
}

function checkTileEvent(x, y) {
  // 1. 座標掛接表（map.js 的 tileEvents，優先於地塊本身的事件）
  if (typeof tileEvents !== "undefined") {
    var entry = tileEvents[x + "," + y];
    if (entry) {
      _callTileEventFn(typeof entry === "string" ? entry : entry.fn);
      return;
    }
  }

  // 2. 自訂事件地塊（10~255，定義在 tile.js）
  var t = currentMap[y][x];
  if (t < 10) return;
  var def = (typeof tileDefs !== "undefined") ? tileDefs[t] : null;
  if (!def) {
    if (DEV_MODE) _warnUnknownTile(t);
    return;
  }
  if (def.event) _callTileEventFn(def.event);
}


// ── 重新開始 ─────────────────────────────────────────────────
function restartGame() {
  // 關閉結局面板，並清除學員在 game 上設定的自訂屬性
  if (typeof _closeEndingPanel === "function") _closeEndingPanel();
  if (typeof _resetGameCustomProps === "function") _resetGameCustomProps();
  gameOver = false;
  player.x = playerStart.x; player.y = playerStart.y;
  currentPlayer.hp        = playerStats.hp;
  currentPlayer.maxHp     = playerStats.maxHp;
  currentPlayer.atk       = playerStats.atk;
  currentPlayer.def       = playerStats.def;
  currentPlayer.money     = playerStats.money;
  currentPlayer.inventory = [];

  currentMap            = mapGrid.map(function(row) { return row.slice(); });
  visitedTiles          = [];

  updateHUD(); renderMap(); showScreen("screen-map");
  updateControlsHint();
}

function showMapMessage(msg) {
  var el = document.getElementById("map-message");
  if (!el) return;
  el.textContent = msg; el.style.opacity = "1";
  clearTimeout(showMapMessage._timer);
  showMapMessage._timer = setTimeout(function() { el.style.opacity = "0"; }, 2500);
}

// ── 對話系統 ─────────────────────────────────────────────────
function showDialogue(lines, callback) {
  dialogueQueue = lines.slice(); dialogueCallback = callback || null;
  advanceDialogue();
}

function advanceDialogue() {
  if (dialogueQueue.length === 0) {
    // 先回到地圖，再跑 callback（相容舊寫法），最後補上暫存的 game.message。
    // 這樣即使有掛 callback，也不會多要求玩家按一次「下一步」才關閉對話。
    var cb = dialogueCallback; dialogueCallback = null;
    showScreen("screen-map");
    if (cb) cb();
    _flushPendingMapMessage();
    return;
  }
  var line = dialogueQueue.shift();
  var se = document.getElementById("dialogue-speaker-name");
  var te = document.getElementById("dialogue-text-content");
  if (se) se.textContent = line.speaker || "";
  if (te) te.textContent = line.text    || "";
  showScreen("screen-dialogue");
}


// ============================================================
//  初始化
// ============================================================
window.onload = function() {
  if (!DEV_MODE) {
    var btnCode  = document.getElementById("btn-open-code");
    var btnDev   = document.getElementById("btn-open-dev");
    var btnCheat = document.getElementById("btn-open-cheatsheet");
    if (btnCode)  btnCode.style.display  = "none";
    if (btnDev)   btnDev.style.display   = "none";
    if (btnCheat) btnCheat.style.display = "none";
  }
  updateHUD(); renderMap(); renderBagSidebar();
  showScreen("screen-map");
};
