// ============================================================
//  dev_panel.js ── 開發模式面板（Live Preview）
//
//  分頁一「事件程式碼」：
//    學員在左側寫事件函式 → 按「套用」直接生效；
//    把角色走到目標格 → 按「掛接在目前位置」→ 該格自動變成事件地塊
//    （覆蓋原本的地塊），並使用學員指定的顏色與圖示。
//    「快速加入」可一鍵生成傳送門 / 寶箱 / 商店的範本事件。
//
//  分頁二「地圖編輯」：
//    直接在網頁上點格子畫地圖，可套用到遊戲中並匯出 map.js 程式碼。
// ============================================================

var DEV_STORE_CODE    = "hackathon_dev_code";
var DEV_STORE_EVENTS  = "hackathon_dev_events";
var DEV_STORE_MAP     = "hackathon_dev_map";
var DEV_STORE_ENDINGS = "hackathon_dev_endings";

// 事件地塊的預設外觀（圖示為 assets/picture/ 路徑，空字串代表無圖示）
var DEV_EVENT_DEFAULT_ICON  = "";
var DEV_EVENT_DEFAULT_COLOR = "#5a3890";

// 紀錄所有內建的 window 函式，用來區分後載入的 events.js 裡宣告的學員函式
var builtinFunctions = new Set();
for (var key in window) {
  try {
    if (typeof window[key] === "function") {
      builtinFunctions.add(key);
    }
  } catch (e) {}
}

// events.js 宣告的學員函式集合，以及 events.js 內建的初始掛接表
var eventsJsFunctions = new Set();
var initialTileEvents = {};

// 追蹤當前正在執行的程式碼，以及上一次成功套用的程式碼，用以實現「返回上一次套用」
var currentlyRunningCode = "";
var lastAppliedCode = null;

// events.js 中扣除 var tileEvents / var gameEndings 宣告後的純函式程式碼
var _initialEventsCode = DEV_DEFAULT_CODE;

// 掛接表："x,y" → { fn: 函式名稱, icon: 圖示, color: 顏色 }
// （存名字字串而非函式參照，重新套用程式碼後自動綁到新版函式）
if (typeof tileEvents === "undefined") {
  var tileEvents = {};
}

// 結局表：[{ name: "結局名稱", condition: "JS 表達式", html: "HTML 內容" }, ...]
if (typeof gameEndings === "undefined") {
  var gameEndings = [];
}

var DEV_DEFAULT_CODE =
  '// 在這裡寫你的事件函式，按「套用程式碼」後生效\n' +
  '// 範例：\n' +
  'function onTrap() {\n' +
  '  game.hp -= 10;\n' +
  '  game.message = "💥 你踩到陷阱了！";\n' +
  '}\n';

// ── 掛接表工具 ────────────────────────────────────────────────
// 舊格式（值是字串）→ 新格式（物件），讓舊的 localStorage / events.js 不會壞
function _isValidIcon(icon) {
  return typeof icon === "string" && icon.indexOf("assets/") === 0;
}

function _normalizeTileEvents() {
  for (var k in tileEvents) {
    var v = tileEvents[k];
    if (typeof v === "string") {
      tileEvents[k] = { fn: v, icon: DEV_EVENT_DEFAULT_ICON, color: DEV_EVENT_DEFAULT_COLOR };
    } else if (v && typeof v === "object") {
      // 若 icon 不是有效的圖片路徑（例如舊版 emoji），清空為預設
      if (!_isValidIcon(v.icon)) v.icon = DEV_EVENT_DEFAULT_ICON;
      if (!v.color) v.color = DEV_EVENT_DEFAULT_COLOR;
    }
  }
}

// 把掛接表中的每一格蓋上事件地塊（restartGame / 套用地圖後也會呼叫）
function syncEventTiles() {
  if (typeof currentMap === "undefined" || typeof MAP_TILE === "undefined") return;
  for (var k in tileEvents) {
    var p = k.split(",");
    var x = parseInt(p[0], 10), y = parseInt(p[1], 10);
    if (y >= 0 && y < currentMap.length && x >= 0 && x < currentMap[y].length) {
      currentMap[y][x] = MAP_TILE.EVENT;
    }
  }
}

// 學員 API：移除某一格的事件（事件地塊變回空地）。適合做「只能觸發一次」的事件。
function removeEventAt(x, y) {
  removeTileEvent(x + "," + y);
}

// ── 事件分派（由 checkTileEvent 呼叫，只在事件地塊上觸發）──────
function dispatchCustomTileEvent(x, y) {
  var entry = tileEvents[x + "," + y];
  if (!entry) return;
  var name = (typeof entry === "string") ? entry : entry.fn;
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

// ── 面板開關 ──────────────────────────────────────────────────
function openDevPanel() {
  var overlay = document.getElementById("dev-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  _updateDevPosition();
  _refreshFnSelect();
  _renderAttachList();
  _renderExport();
  _renderDevMapGrid();
  _renderMapExport();
}

function closeDevPanel() {
  var overlay = document.getElementById("dev-panel-overlay");
  if (overlay) overlay.style.display = "none";
}

function isDevPanelOpen() {
  var overlay = document.getElementById("dev-panel-overlay");
  return !!(overlay && overlay.style.display !== "none");
}

// ── 分頁切換 ──────────────────────────────────────────────────
function switchDevTab(name) {
  var tabs = ["events", "map", "endings"];
  for (var i = 0; i < tabs.length; i++) {
    var page = document.getElementById("dev-tab-" + tabs[i]);
    var btn  = document.getElementById("dev-tab-btn-" + tabs[i]);
    var active = (tabs[i] === name);
    if (page) page.style.display = active ? "flex" : "none";
    if (btn)  btn.className = "dev-tab-btn" + (active ? " dev-tab-btn--active" : "");
  }
  if (name === "map") { _renderDevMapGrid(); _renderMapExport(); }
  if (name === "endings") { _renderEndingsList(); _renderEndingsExport(); }
}

// ── 輔助生命週期與 QoL 函式 ────────────────────────────────────
function _stripVarDeclarations(src) {
  return src
    .replace(/^\s*var\s+tileEvents\s*=[\s\S]*?;\s*$/m, "")
    .replace(/^\s*var\s+gameEndings\s*=[\s\S]*?;\s*$/m, "")
    .replace(/^\s*\/\/\s*掛接表.*$/m, "")
    .replace(/^\s*\/\/\s*==+[\s\S]*?==+\s*$/gm, "")
    .replace(/^\n{3,}/gm, "\n\n")
    .trim();
}

function _detectEventsJsFunctions() {
  for (var key in window) {
    try {
      if (typeof window[key] === "function" && !builtinFunctions.has(key)) {
        eventsJsFunctions.add(key);
      }
    } catch (e) {}
  }
  if (typeof tileEvents !== "undefined") {
    _normalizeTileEvents();
    initialTileEvents = JSON.parse(JSON.stringify(tileEvents));
  }
}

function _cleanupDeletedFunctions(oldCode, newCode) {
  var oldFuncs = _scanFunctionNames(oldCode);
  var newFuncs = _scanFunctionNames(newCode);
  for (var i = 0; i < oldFuncs.length; i++) {
    var fnName = oldFuncs[i];
    if (newFuncs.indexOf(fnName) === -1) {
      try {
        delete window[fnName];
      } catch (e) {
        window[fnName] = undefined;
      }
    }
  }
}

function _getDuplicateWarning(code) {
  var duplicates = [];
  var panelFuncs = _scanFunctionNames(code);
  panelFuncs.forEach(function(name) {
    if (eventsJsFunctions.has(name)) {
      duplicates.push(name);
    }
  });
  if (duplicates.length > 0) {
    return " (⚠️ 覆蓋 events.js 同名函式: " + duplicates.join(", ") + ")";
  }
  return "";
}

function revertLastDevCode() {
  if (!lastAppliedCode) return;
  var editor = document.getElementById("dev-code-editor");
  if (editor) {
    editor.value = lastAppliedCode;
  }
  lastAppliedCode = null;
  var revertBtn = document.getElementById("btn-dev-revert");
  if (revertBtn) revertBtn.style.display = "none";

  applyDevCode();
}

function clearDevState() {
  if (!confirm("確定要清除開發面板的暫存程式碼與掛接事件嗎？\n這將還原為 events.js 的內容。")) return;

  try {
    localStorage.removeItem(DEV_STORE_CODE);
    localStorage.removeItem(DEV_STORE_EVENTS);
    localStorage.removeItem(DEV_STORE_ENDINGS);
  } catch (e) {}
  gameEndings = [];

  var editor = document.getElementById("dev-code-editor");
  if (editor) editor.value = _initialEventsCode;

  // 把目前掛接表的事件地塊還原為空地，再換回 events.js 的初始掛接表
  for (var k in tileEvents) {
    var p = k.split(",");
    var x = parseInt(p[0], 10), y = parseInt(p[1], 10);
    if (y >= 0 && y < currentMap.length && x >= 0 && x < currentMap[y].length &&
        currentMap[y][x] === MAP_TILE.EVENT) {
      currentMap[y][x] = MAP_TILE.EMPTY;
    }
  }
  tileEvents = JSON.parse(JSON.stringify(initialTileEvents));
  syncEventTiles();

  _cleanupDeletedFunctions(currentlyRunningCode, _initialEventsCode);
  currentlyRunningCode = _initialEventsCode;
  lastAppliedCode = null;

  var revertBtn = document.getElementById("btn-dev-revert");
  if (revertBtn) revertBtn.style.display = "none";

  try {
    (0, eval)(currentlyRunningCode);
  } catch (e) {}

  _setDevStatus("🗑️ 已清除暫存，已還原為 events.js 內容", false);
  _refreshFnSelect();
  _renderAttachList();
  _renderExport();
  renderMap();
}

// ── 套用程式碼 ────────────────────────────────────────────────
function applyDevCode() {
  var code = document.getElementById("dev-code-editor").value;
  try {
    (0, eval)(code);  // 間接 eval：在全域作用域執行，函式才掛得到 window 上

    // 清除已刪除的函式，並儲存上一次成功套用的狀態
    if (currentlyRunningCode !== code) {
      _cleanupDeletedFunctions(currentlyRunningCode, code);
      lastAppliedCode = currentlyRunningCode;
      currentlyRunningCode = code;

      var revertBtn = document.getElementById("btn-dev-revert");
      if (revertBtn) revertBtn.style.display = "inline-block";
    }

    var dupWarning = _getDuplicateWarning(code);
    _setDevStatus("✅ 已套用！共 " + _scanFunctionNames(code).length + " 個函式" + dupWarning, false);
  } catch (e) {
    _setDevStatus("❌ " + e.message, true);
    return;
  }
  _refreshFnSelect();
  _renderExport();
  _saveDevState();
  _renderAttachList();
  renderMap();
}

function _setDevStatus(msg, isError) {
  var el = document.getElementById("dev-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? "dev-status-error" : "dev-status-ok";
}

function _scanFunctionNames(code) {
  var names = [], re = /function\s+([A-Za-z_$][\w$]*)/g, m;
  while ((m = re.exec(code)) !== null) names.push(m[1]);
  return names;
}

function _refreshFnSelect() {
  var sel = document.getElementById("dev-fn-select");
  if (!sel) return;
  var prev  = sel.value;
  var names = _scanFunctionNames(document.getElementById("dev-code-editor").value);
  sel.innerHTML = "";
  if (names.length === 0) {
    var opt = document.createElement("option");
    opt.value = ""; opt.textContent = "（還沒有函式，先寫好按套用）";
    sel.appendChild(opt);
    return;
  }
  for (var i = 0; i < names.length; i++) {
    var o = document.createElement("option");
    o.value = names[i]; o.textContent = names[i];
    sel.appendChild(o);
  }
  if (names.indexOf(prev) !== -1) sel.value = prev;
}

// ── 掛接 ──────────────────────────────────────────────────────
function _updateDevPosition() {
  var el = document.getElementById("dev-position");
  if (el) el.textContent = "目前位置：(" + player.x + ", " + player.y + ")";
}

function updateIconPreview() {
  var sel  = document.getElementById("dev-event-icon");
  var prev = document.getElementById("dev-event-icon-preview");
  if (!sel || !prev) return;
  if (sel.value) {
    prev.src = sel.value;
    prev.style.display = "inline";
  } else {
    prev.style.display = "none";
  }
}

function _readEventStyleInputs() {
  var iconEl  = document.getElementById("dev-event-icon");
  var colorEl = document.getElementById("dev-event-color");
  return {
    icon:  (iconEl && iconEl.value)   ? iconEl.value   : DEV_EVENT_DEFAULT_ICON,
    color: (colorEl && colorEl.value) ? colorEl.value  : DEV_EVENT_DEFAULT_COLOR
  };
}

// 把函式掛接到 (x, y)：寫入掛接表 + 該格覆蓋為事件地塊
function _attachAt(x, y, name, icon, color) {
  tileEvents[x + "," + y] = { fn: name, icon: icon, color: color };
  if (y >= 0 && y < currentMap.length && x >= 0 && x < currentMap[y].length) {
    currentMap[y][x] = MAP_TILE.EVENT;   // 覆蓋原本的地塊
  }
  _renderAttachList();
  _renderExport();
  _saveDevState();
  renderMap();
}

function attachEventHere() {
  var sel  = document.getElementById("dev-fn-select");
  var name = sel ? sel.value : "";
  if (!name) { _setDevStatus("❌ 請先寫好函式並按「套用程式碼」", true); return; }
  if (typeof window[name] !== "function") {
    _setDevStatus("❌ 函式「" + name + "」還沒生效，先按「套用程式碼」", true);
    return;
  }
  var style = _readEventStyleInputs();
  _attachAt(player.x, player.y, name, style.icon, style.color);
  _setDevStatus("✅ 已把 " + name + " 掛接在 (" + player.x + ", " + player.y + ")，該格已變為事件地塊", false);
}

function removeTileEvent(key) {
  delete tileEvents[key];
  // 事件地塊變回空地
  var p = key.split(",");
  var x = parseInt(p[0], 10), y = parseInt(p[1], 10);
  if (typeof currentMap !== "undefined" &&
      y >= 0 && y < currentMap.length && x >= 0 && x < currentMap[y].length &&
      currentMap[y][x] === MAP_TILE.EVENT) {
    currentMap[y][x] = MAP_TILE.EMPTY;
  }
  _renderAttachList();
  _renderExport();
  _saveDevState();
  renderMap();
}

function _renderAttachList() {
  var list = document.getElementById("dev-attach-list");
  if (!list) return;
  var keys = Object.keys(tileEvents);
  if (keys.length === 0) {
    list.innerHTML = '<div class="dev-attach-empty">還沒有掛接任何事件</div>';
    return;
  }
  list.innerHTML = "";

  // 掃描編輯器內已宣告的函式
  var editorVal = document.getElementById("dev-code-editor").value;
  var declaredFunctions = _scanFunctionNames(editorVal);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var entry = tileEvents[key];
    var fnName = (typeof entry === "string") ? entry : entry.fn;
    var isInvalid = (declaredFunctions.indexOf(fnName) === -1 &&
                     typeof window[fnName] !== "function");

    var row = document.createElement("div");
    row.className = "dev-attach-row" + (isInvalid ? " dev-attach-row--invalid" : "");

    var swatch = document.createElement("span");
    swatch.className = "dev-attach-swatch";
    swatch.style.background = (entry && entry.color) || DEV_EVENT_DEFAULT_COLOR;
    if (entry && _isValidIcon(entry.icon)) {
      var swImg = document.createElement("img");
      swImg.src = entry.icon; swImg.alt = "";
      swImg.style.cssText = "width:20px;height:20px;object-fit:contain;";
      swatch.appendChild(swImg);
    }

    var label = document.createElement("span");
    label.className = "dev-attach-label";
    if (isInvalid) {
      label.innerHTML = "(" + key + ") → " + fnName + ' <span class="dev-attach-invalid-label">(⚠️ 目前無效)</span>';
    } else {
      label.textContent = "(" + key + ") → " + fnName;
    }

    var btn = document.createElement("button");
    btn.className = "dev-attach-remove";
    btn.textContent = "✕";
    btn.onclick = (function(k) { return function() { removeTileEvent(k); }; })(key);

    row.appendChild(swatch);
    row.appendChild(label);
    row.appendChild(btn);
    list.appendChild(row);
  }
}

// ── 快速加入：傳送門 / 寶箱 / 商店（用事件實作）────────────────
var DEV_QUICK_TEMPLATES = {
  portal: {
    label: "傳送門", icon: "assets/picture/傳送門.png", color: "#c05010",
    fns: ["onPortal"],
    code: function(n) {
      return [
        "function onPortal" + n + "() {",
        '  game.message = "⚡ 你踏入了傳送門！";',
        "  game.x = 5;   // ← 改成目的地座標",
        "  game.y = 3;",
        "}"
      ].join("\n");
    }
  },
  chest: {
    label: "寶箱", icon: "assets/picture/寶箱.png", color: "#c89010",
    fns: ["onChest"],
    code: function(n) {
      return [
        "function onChest" + n + "() {",
        "  game.money += 30;",
        '  game.message = "📦 你打開寶箱，獲得 30 金幣！";',
        "  removeEventAt(game.x, game.y);   // 寶箱只能開一次",
        "}"
      ].join("\n");
    }
  },
  shop: {
    label: "商店", icon: "assets/picture/商店.png", color: "#287840",
    fns: ["onShop", "buyPotion"],
    code: function(n) {
      return [
        "function onShop" + n + "() {",
        "  game.panel =",
        '    "<h2>🛒 商店</h2>" +',
        '    "<p>你身上有 " + game.money + " 金幣</p>" +',
        '    "<button onclick=\'buyPotion' + n + '()\'>補血藥水（30 金幣，回復 30 HP）</button>" +',
        '    "<button onclick=\\"game.panel = \'\'\\">離開</button>";',
        "}",
        "",
        "function buyPotion" + n + "() {",
        "  if (game.money >= 30) {",
        "    game.money -= 30;",
        "    game.hp += 30;",
        '    game.message = "🧪 買了補血藥水！";',
        "  } else {",
        '    game.message = "💸 金幣不足！";',
        "  }",
        "  onShop" + n + "();   // 重新整理商店畫面",
        "}"
      ].join("\n");
    }
  },
  lock: {
    label: "上鎖的門", icon: "assets/picture/門鎖.png", color: "#604898",
    fns: ["onLock"],
    code: function(n) {
      return [
        "function onLock" + n + "() {",
        '  if (game.hasKey' + n + ') {',
        '    game.message = "🔓 門已經打開了！";',
        "    return;",
        "  }",
        '  game.panel = \'<div style="text-align:center">\' +',
        "    '<h2>🚪 上鎖的門</h2>' +",
        "    '<p>這扇門被鎖住了。</p>' +",
        "    '<button class=\"btn btn-attack\" onclick=\"unlockDoor" + n + "()\">🔑 嘗試開門（需要 10 金幣）</button> ' +",
        "    '<button class=\"btn btn-flee\" onclick=\"game.panel=\\'\\';\">離開</button>' +",
        "    '</div>';",
        "}",
        "",
        "function unlockDoor" + n + "() {",
        "  if (game.money >= 10) {",
        "    game.money -= 10;",
        "    game.hasKey" + n + " = true;",
        "    game.setTile(game.x, game.y, 0);",
        '    game.panel = "";',
        '    game.message = "🔓 你花了 10 金幣打開了門！";',
        "  } else {",
        '    game.message = "💸 金幣不足！";',
        '    game.panel = "";',
        "  }",
        "}"
      ].join("\n");
    }
  },
  minigame: {
    label: "小遊戲", icon: "assets/picture/小遊戲靶.png", color: "#1878b0",
    fns: ["onMiniGame"],
    code: function(n) {
      return [
        "function onMiniGame" + n + "() {",
        "  var score = 0;",
        "  var target = 3;",
        "",
        "  function render() {",
        "    var num = Math.floor(Math.random() * 10) + 1;",
        "    game.panel =",
        '      \'<div style="text-align:center">\' +',
        "      '<h2>🎯 猜數字小遊戲</h2>' +",
        "      '<p>進度：' + score + ' / ' + target + '</p>' +",
        "      '<p>這個數字是奇數還是偶數？　答案：' + num + '</p>' +",
        "      '<button class=\"btn btn-attack\" onclick=\"mgGuess" + n + "(' + num + ',true)\">奇數</button> ' +",
        "      '<button class=\"btn btn-defend\" onclick=\"mgGuess" + n + "(' + num + ',false)\">偶數</button>' +",
        "      '</div>';",
        "  }",
        "",
        "  window.mgGuess" + n + " = function(num, isOdd) {",
        "    var correct = (num % 2 === 1) === isOdd;",
        "    if (correct) {",
        "      score++;",
        '      game.message = "✅ 答對了！";',
        "      if (score >= target) {",
        "        game.money += 30;",
        "        game.setTile(game.x, game.y, 0);",
        '        game.panel = \'<div style="text-align:center"><h2>🎉 過關！</h2><p>獲得 30 金幣</p>\' +',
        "          '<button class=\"btn btn-attack\" onclick=\"game.panel=\\'\\';\">確定</button></div>';",
        "        return;",
        "      }",
        "    } else {",
        '      game.message = "❌ 答錯了！";',
        "    }",
        "    render();",
        "  };",
        "",
        "  render();",
        "}"
      ].join("\n");
    }
  },
  battle: {
    label: "小怪戰鬥", icon: "assets/picture/哥布林.png", color: "#b83030",
    fns: ["onBattle", "battleAtk", "battleRun"],
    code: function(n) {
      return [
        "function onBattle" + n + "() {",
        '  var enemy = { name: "哥布林", hp: 30, atk: 5 };',
        "",
        "  function render() {",
        "    game.panel =",
        '      \'<div style="text-align:center">\' +',
        "      '<h2>⚔️ ' + enemy.name + '</h2>' +",
        "      '<p>敵人 HP：' + enemy.hp + '</p>' +",
        "      '<p>你的 HP：' + game.hp + ' / ' + game.maxHp + '</p><hr>' +",
        "      '<button class=\"btn btn-attack\" onclick=\"battleAtk" + n + "()\">⚔️ 攻擊</button> ' +",
        "      '<button class=\"btn btn-flee\" onclick=\"battleRun" + n + "()\">💨 逃跑</button>' +",
        "      '</div>';",
        "  }",
        "",
        "  window.battleAtk" + n + " = function() {",
        "    enemy.hp -= Math.max(1, game.atk - 2);",
        "    if (enemy.hp <= 0) {",
        "      game.money += 15;",
        "      game.setTile(game.x, game.y, 0);",
        '      game.panel = \'<div style="text-align:center"><h2>🎉 勝利！</h2><p>獲得 15 金幣</p>\' +',
        "        '<button class=\"btn btn-attack\" onclick=\"game.panel=\\'\\';\">確定</button></div>';",
        "      return;",
        "    }",
        "    game.hp -= enemy.atk;",
        "    render();",
        "  };",
        "",
        "  window.battleRun" + n + " = function() {",
        '    game.message = "你逃跑了！";',
        '    game.panel = "";',
        "  };",
        "",
        "  render();",
        "}"
      ].join("\n");
    }
  }
};

function quickAddEvent(type) {
  var tpl = DEV_QUICK_TEMPLATES[type];
  if (!tpl) return;
  var editor = document.getElementById("dev-code-editor");

  // 找一個沒被用過的編號（onPortal1、onPortal2…）
  var used = _scanFunctionNames(editor.value);
  var n = 1;
  while (true) {
    var taken = tpl.fns.some(function(f) { return used.indexOf(f + n) !== -1; });
    if (!taken) break;
    n++;
  }

  // 1. 自動 append 範本函式到文字框
  var sep = editor.value.trim() === "" ? "" : "\n\n";
  editor.value = editor.value + sep + tpl.code(n) + "\n";

  // 2. 套用程式碼
  applyDevCode();

  // 3. 用範本預設的圖示與顏色，掛接在目前位置（自動覆蓋地塊）
  var iconEl  = document.getElementById("dev-event-icon");
  var colorEl = document.getElementById("dev-event-color");
  if (iconEl)  { iconEl.value = tpl.icon; updateIconPreview(); }
  if (colorEl) colorEl.value = tpl.color;
  var mainFn = tpl.fns[0] + n;
  _attachAt(player.x, player.y, mainFn, tpl.icon, tpl.color);

  _setDevStatus("✅ 已加入" + tpl.label + "事件 " + mainFn + "，並掛接在 (" + player.x + ", " + player.y + ")", false);
}

// ── 匯出 events.js ────────────────────────────────────────────
function _buildExportCode() {
  var lines = [
    "// ==== events.js（把這整段複製到你的專案）====",
    "var tileEvents = {"
  ];
  var keys = Object.keys(tileEvents);
  for (var i = 0; i < keys.length; i++) {
    var e = tileEvents[keys[i]];
    var fnName = (typeof e === "string") ? e : e.fn;
    var icon   = (e && e.icon)  || DEV_EVENT_DEFAULT_ICON;
    var color  = (e && e.color) || DEV_EVENT_DEFAULT_COLOR;
    lines.push('  "' + keys[i] + '": { fn: "' + fnName + '", icon: "' + icon + '", color: "' + color + '" },');
  }
  lines.push("};");
  lines.push("");
  lines.push(document.getElementById("dev-code-editor").value);
  return lines.join("\n");
}

function _renderExport() {
  var el = document.getElementById("dev-export-code");
  if (el) el.value = _buildExportCode();
}

function copyExportCode() {
  _copyToClipboard(_buildExportCode(), "dev-export-code");
}

function _copyToClipboard(code, fallbackTextareaId) {
  function done() { _setDevStatus("✅ 已複製到剪貼簿", false); }
  function fallback() {
    var el = document.getElementById(fallbackTextareaId);
    if (!el) return;
    el.value = code;
    el.select();
    document.execCommand("copy");
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done, function() { fallback(); done(); });
  } else {
    fallback(); done();
  }
}

// ══════════════════════════════════════════════════════════════
//  地圖編輯分頁
// ══════════════════════════════════════════════════════════════

// 保留 map.js 的原始地圖，供「還原」使用
var _originalMapGrid    = null;
var _originalPlayerStart = null;

// 編輯中的工作副本
var devMapGrid     = null;
var devPlayerStart = null;

var _devMapTool  = 1;      // 目前選擇的筆刷（地塊代碼，或 "start"）
var _devPainting = false;  // 滑鼠拖曳塗色中

var DEV_MAP_TOOLS = [
  { code: 0,       label: "空地",   color: "#2d4a7a" },
  { code: 1,       label: "牆壁",   color: "#080d1a" },
  { code: 3,       label: "敵人",   color: "#b83030" },
  { code: 4,       label: "門",     color: "#604898" },
  { code: 5,       label: "小遊戲", color: "#1878b0" },
  { code: 9,       label: "魔王",   color: "#880010" },
  { code: "start", label: "出生點", color: "#22e060" }
];

function _devMapToolColor(code) {
  for (var i = 0; i < DEV_MAP_TOOLS.length; i++) {
    if (DEV_MAP_TOOLS[i].code === code) return DEV_MAP_TOOLS[i].color;
  }
  return "#2d4a7a";
}

function _ensureDevMap() {
  if (!devMapGrid) {
    devMapGrid     = mapGrid.map(function(r) { return r.slice(); });
    devPlayerStart = { x: playerStart.x, y: playerStart.y };
  }
}

function selectMapTool(code) {
  _devMapTool = code;
  var btns = document.querySelectorAll(".dev-map-tool");
  for (var i = 0; i < btns.length; i++) {
    var isActive = (btns[i].getAttribute("data-code") === String(code));
    btns[i].className = "dev-map-tool" + (isActive ? " dev-map-tool--active" : "");
  }
}

function _renderMapPalette() {
  var pal = document.getElementById("dev-map-palette");
  if (!pal || pal.childNodes.length > 0) return;  // 只建一次
  for (var i = 0; i < DEV_MAP_TOOLS.length; i++) {
    var t = DEV_MAP_TOOLS[i];
    var btn = document.createElement("button");
    btn.className = "dev-map-tool" + (t.code === _devMapTool ? " dev-map-tool--active" : "");
    btn.setAttribute("data-code", String(t.code));
    var dot = document.createElement("span");
    dot.className = "dev-map-tool-dot";
    dot.style.background = t.color;
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(t.label));
    btn.onclick = (function(code) { return function() { selectMapTool(code); }; })(t.code);
    pal.appendChild(btn);
  }
}

function _paintDevMapCell(x, y) {
  if (_devMapTool === "start") {
    devPlayerStart = { x: x, y: y };
    devMapGrid[y][x] = 0;   // 出生點必須是空地
  } else {
    devMapGrid[y][x] = _devMapTool;
  }
  _renderDevMapGrid();
  _renderMapExport();
}

function _renderDevMapGrid() {
  var container = document.getElementById("dev-map-grid");
  if (!container) return;
  _ensureDevMap();
  _renderMapPalette();

  container.innerHTML = "";
  container.style.gridTemplateColumns = "repeat(" + devMapGrid[0].length + ", 22px)";

  for (var y = 0; y < devMapGrid.length; y++) {
    for (var x = 0; x < devMapGrid[y].length; x++) {
      var cell = document.createElement("div");
      cell.className = "dev-map-cell";
      var evEntry = tileEvents[x + "," + y];

      if (devPlayerStart.x === x && devPlayerStart.y === y) {
        cell.style.background = "#22e060";
        cell.textContent = "S";
      } else if (evEntry) {
        // 事件地塊由「事件程式碼」分頁管理，這裡顯示但照樣可以覆蓋畫格
        cell.style.background = evEntry.color || DEV_EVENT_DEFAULT_COLOR;
        if (_isValidIcon(evEntry.icon)) {
          var cImg = document.createElement("img");
          cImg.src = evEntry.icon; cImg.alt = "";
          cImg.style.cssText = "width:16px;height:16px;object-fit:contain;";
          cell.appendChild(cImg);
        }
        cell.title = "事件：" + (evEntry.fn || evEntry);
      } else {
        cell.style.background = _devMapToolColor(devMapGrid[y][x]);
      }

      cell.setAttribute("data-x", x);
      cell.setAttribute("data-y", y);
      container.appendChild(cell);
    }
  }
}

function applyDevMap() {
  _ensureDevMap();
  mapGrid     = devMapGrid.map(function(r) { return r.slice(); });
  playerStart = { x: devPlayerStart.x, y: devPlayerStart.y };
  currentMap  = mapGrid.map(function(r) { return r.slice(); });
  syncEventTiles();
  // 玩家若剛好站在新畫的牆裡，移回出生點
  if (currentMap[player.y] === undefined ||
      currentMap[player.y][player.x] === MAP_TILE.WALL) {
    player.x = playerStart.x; player.y = playerStart.y;
  }
  _saveDevMap();
  renderMap();
  _setDevMapStatus("✅ 已套用地圖！關閉面板走走看吧", false);
}

function resetDevMap() {
  if (!confirm("確定要放棄地圖修改，還原為 map.js 的原始地圖嗎？")) return;
  devMapGrid     = _originalMapGrid.map(function(r) { return r.slice(); });
  devPlayerStart = { x: _originalPlayerStart.x, y: _originalPlayerStart.y };
  try { localStorage.removeItem(DEV_STORE_MAP); } catch (e) {}
  applyDevMap();
  _setDevMapStatus("↩️ 已還原為原始地圖", false);
}

function _setDevMapStatus(msg, isError) {
  var el = document.getElementById("dev-map-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? "dev-status-error" : "dev-status-ok";
}

// ── 地圖匯出 ──────────────────────────────────────────────────
function _buildMapExportCode() {
  _ensureDevMap();
  var lines = [
    "// ==== 地圖程式碼（貼上取代 map.js 裡的 mapGrid 與 playerStart）===="
  ];
  lines.push("var mapGrid = [");
  for (var y = 0; y < devMapGrid.length; y++) {
    lines.push("  [" + devMapGrid[y].join(", ") + "],");
  }
  lines.push("];");
  lines.push("");
  lines.push("var playerStart = { x: " + devPlayerStart.x + ", y: " + devPlayerStart.y + " };");
  return lines.join("\n");
}

function _renderMapExport() {
  var el = document.getElementById("dev-map-export-code");
  if (el) el.value = _buildMapExportCode();
}

function copyMapExportCode() {
  _copyToClipboard(_buildMapExportCode(), "dev-map-export-code");
  _setDevMapStatus("✅ 已複製地圖程式碼", false);
}

// ── 結局系統 ──────────────────────────────────────────────────

function checkGameEndings() {
  if (gameOver) return;
  for (var i = 0; i < gameEndings.length; i++) {
    var ending = gameEndings[i];
    if (!ending.condition) continue;
    try {
      var result = (0, eval)(ending.condition);
      if (result) {
        triggerCustomEnding(ending);
        return;
      }
    } catch (e) {}
  }
}

function triggerCustomEnding(ending) {
  gameOver = true;
  var panel   = document.getElementById("ending-panel");
  var content = document.getElementById("ending-panel-content");
  if (!panel || !content) return;
  content.innerHTML = ending.html || "<h1>" + (ending.name || "結局") + "</h1>";
  panel.style.display = "flex";
}

function _closeEndingPanel() {
  var panel = document.getElementById("ending-panel");
  if (panel) panel.style.display = "none";
}

function addGameEnding() {
  gameEndings.push({ name: "結局 " + (gameEndings.length + 1), condition: "", html: "<h1>🏁 結局</h1>\n<p>遊戲結束了。</p>" });
  _renderEndingsList();
  _renderEndingsExport();
  _saveDevEndings();
}

function removeGameEnding(index) {
  gameEndings.splice(index, 1);
  _renderEndingsList();
  _renderEndingsExport();
  _saveDevEndings();
}

function _updateEndingField(index, field, value) {
  if (index < 0 || index >= gameEndings.length) return;
  gameEndings[index][field] = value;
  _saveDevEndings();
  _renderEndingsExport();
}

function _renderEndingsList() {
  var list = document.getElementById("dev-endings-list");
  if (!list) return;
  if (gameEndings.length === 0) {
    list.innerHTML = '<div class="dev-attach-empty">還沒有設定任何結局</div>';
    return;
  }
  list.innerHTML = "";
  for (var i = 0; i < gameEndings.length; i++) {
    var e = gameEndings[i];
    var card = document.createElement("div");
    card.className = "dev-ending-card";

    var header = document.createElement("div");
    header.className = "dev-ending-header";
    var title = document.createElement("span");
    title.textContent = "#" + (i + 1);
    var removeBtn = document.createElement("button");
    removeBtn.className = "dev-ending-remove";
    removeBtn.textContent = "✕ 移除";
    removeBtn.onclick = (function(idx) { return function() { removeGameEnding(idx); }; })(i);
    header.appendChild(title);
    header.appendChild(removeBtn);
    card.appendChild(header);

    var nameLabel = document.createElement("label");
    nameLabel.textContent = "結局名稱";
    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = e.name || "";
    nameInput.oninput = (function(idx) { return function() { _updateEndingField(idx, "name", this.value); }; })(i);
    card.appendChild(nameLabel);
    card.appendChild(nameInput);

    var condLabel = document.createElement("label");
    condLabel.textContent = "觸發條件（JS 表達式，結果為 true 時觸發）";
    var condInput = document.createElement("input");
    condInput.type = "text";
    condInput.value = e.condition || "";
    condInput.placeholder = "例：game.hp <= 0 || game.money >= 100";
    condInput.oninput = (function(idx) { return function() { _updateEndingField(idx, "condition", this.value); }; })(i);
    card.appendChild(condLabel);
    card.appendChild(condInput);

    var htmlLabel = document.createElement("label");
    htmlLabel.textContent = "顯示內容（HTML）";
    var htmlArea = document.createElement("textarea");
    htmlArea.spellcheck = false;
    htmlArea.value = e.html || "";
    htmlArea.oninput = (function(idx) { return function() { _updateEndingField(idx, "html", this.value); }; })(i);
    card.appendChild(htmlLabel);
    card.appendChild(htmlArea);

    list.appendChild(card);
  }
}

function _buildEndingsExportCode() {
  if (gameEndings.length === 0) return "// 沒有設定結局\nvar gameEndings = [];";
  var lines = ["var gameEndings = ["];
  for (var i = 0; i < gameEndings.length; i++) {
    var e = gameEndings[i];
    lines.push("  {");
    lines.push('    name: ' + JSON.stringify(e.name || "") + ',');
    lines.push('    condition: ' + JSON.stringify(e.condition || "") + ',');
    lines.push('    html: ' + JSON.stringify(e.html || "") + '');
    lines.push("  }" + (i < gameEndings.length - 1 ? "," : ""));
  }
  lines.push("];");
  return lines.join("\n");
}

function _renderEndingsExport() {
  var el = document.getElementById("dev-endings-export-code");
  if (el) el.value = _buildEndingsExportCode();
}

function copyEndingsExportCode() {
  _copyToClipboard(_buildEndingsExportCode(), "dev-endings-export-code");
}

function _saveDevEndings() {
  try {
    localStorage.setItem(DEV_STORE_ENDINGS, JSON.stringify(gameEndings));
  } catch (e) {}
}

function _loadDevEndings() {
  var saved = null;
  try { saved = localStorage.getItem(DEV_STORE_ENDINGS); } catch (e) {}
  if (saved) {
    try {
      var parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) gameEndings = parsed;
    } catch (e) {}
  }
}

// ── localStorage 持久化 ───────────────────────────────────────
function _saveDevState() {
  try {
    localStorage.setItem(DEV_STORE_CODE, document.getElementById("dev-code-editor").value);
    localStorage.setItem(DEV_STORE_EVENTS, JSON.stringify(tileEvents));
  } catch (e) { /* 無痕模式等情況存不了就算了 */ }
}

function _saveDevMap() {
  try {
    localStorage.setItem(DEV_STORE_MAP, JSON.stringify({ grid: devMapGrid, start: devPlayerStart }));
  } catch (e) {}
}

function _loadDevMap() {
  // 先保存 map.js 的原始地圖
  _originalMapGrid     = mapGrid.map(function(r) { return r.slice(); });
  _originalPlayerStart = { x: playerStart.x, y: playerStart.y };

  var saved = null;
  try { saved = localStorage.getItem(DEV_STORE_MAP); } catch (e) {}
  if (!saved) return;
  try {
    var data = JSON.parse(saved);
    if (data && data.grid && data.start) {
      devMapGrid     = data.grid;
      devPlayerStart = data.start;
      mapGrid     = devMapGrid.map(function(r) { return r.slice(); });
      playerStart = { x: devPlayerStart.x, y: devPlayerStart.y };
      currentMap  = mapGrid.map(function(r) { return r.slice(); });
      player.x = playerStart.x; player.y = playerStart.y;
    }
  } catch (e) {}
}

function _loadDevState() {
  var editor = document.getElementById("dev-code-editor");
  var code = null, events = null;
  try {
    code   = localStorage.getItem(DEV_STORE_CODE);
    events = localStorage.getItem(DEV_STORE_EVENTS);
  } catch (e) {}
  editor.value = (code !== null && code !== "") ? code : _initialEventsCode;
  currentlyRunningCode = editor.value;

  if (events) {
    try {
      var localEvents = JSON.parse(events) || {};
      // 合併 events.js 和 localStorage 中的掛接
      for (var k in localEvents) {
        tileEvents[k] = localEvents[k];
      }
    } catch (e) {
      if (typeof tileEvents === "undefined") tileEvents = {};
    }
  }
  _normalizeTileEvents();
  syncEventTiles();

  try {
    (0, eval)(editor.value);  // 自動套用上次的程式碼
    if (code !== null && code !== "") {
      var dupWarning = _getDuplicateWarning(editor.value);
      _setDevStatus("⚠️ 目前執行的是開發面板暫存的程式碼" + dupWarning, false);
    }
  } catch (e) {
    _setDevStatus("❌ 上次的程式碼有錯誤：" + e.message, true);
  }
  renderMap();
}

// ── 初始化 ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  var editor = document.getElementById("dev-code-editor");
  if (editor) {
    editor.addEventListener("keydown", function(e) {
      if (e.key === "Tab") {
        e.preventDefault();
        var s = editor.selectionStart, t = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + "  " + editor.value.slice(t);
        editor.selectionStart = editor.selectionEnd = s + 2;
      }
    });
  }

  // 地圖編輯格：按住拖曳塗色
  var grid = document.getElementById("dev-map-grid");
  if (grid) {
    grid.addEventListener("mousedown", function(e) {
      var t = e.target;
      if (!t.classList.contains("dev-map-cell")) return;
      e.preventDefault();
      _devPainting = true;
      _paintDevMapCell(parseInt(t.getAttribute("data-x"), 10), parseInt(t.getAttribute("data-y"), 10));
    });
    grid.addEventListener("mouseover", function(e) {
      if (!_devPainting) return;
      var t = e.target;
      if (!t.classList.contains("dev-map-cell")) return;
      _paintDevMapCell(parseInt(t.getAttribute("data-x"), 10), parseInt(t.getAttribute("data-y"), 10));
    });
    document.addEventListener("mouseup", function() { _devPainting = false; });
  }

  _detectEventsJsFunctions();
  _loadDevMap();

  // 從 events.js 抓取原始函式碼（去掉 var tileEvents 等宣告），再載入 dev 狀態
  fetch("events.js?v=" + Date.now(), { cache: "no-store" })
    .then(function(r) { return r.text(); })
    .then(function(text) {
      var code = _stripVarDeclarations(text);
      if (code) _initialEventsCode = code;
    })
    .catch(function() {})
    .then(function() {
      _loadDevState();
      _loadDevEndings();
    });
});
