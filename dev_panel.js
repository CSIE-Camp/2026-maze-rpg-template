// ============================================================
//  dev_panel.js ── 開發模式面板（Live Preview）
//
//  學員在面板左側貼上事件函式 → 按「套用」直接生效；
//  把角色走到目標格 → 按「掛接在目前位置」把函式綁到那一格；
//  「匯出」產生可複製貼上的 events.js 程式碼。
// ============================================================

var DEV_STORE_CODE   = "hackathon_dev_code";
var DEV_STORE_EVENTS = "hackathon_dev_events";

// 掛接表："x,y" → 函式名稱（存名字字串，重新套用程式碼後自動綁到新版函式）
var tileEvents = {};

var DEV_DEFAULT_CODE =
  '// 在這裡寫你的事件函式，按「套用程式碼」後生效\n' +
  '// 範例：\n' +
  'function onTrap() {\n' +
  '  game.hp -= 10;\n' +
  '  game.message = "💥 你踩到陷阱了！";\n' +
  '}\n';

// ── 事件分派（由 checkTileEvent 呼叫）─────────────────────────
function dispatchCustomTileEvent(x, y) {
  var name = tileEvents[x + "," + y];
  if (!name) return;
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
}

function closeDevPanel() {
  var overlay = document.getElementById("dev-panel-overlay");
  if (overlay) overlay.style.display = "none";
}

function isDevPanelOpen() {
  var overlay = document.getElementById("dev-panel-overlay");
  return !!(overlay && overlay.style.display !== "none");
}

// ── 套用程式碼 ────────────────────────────────────────────────
function applyDevCode() {
  var code = document.getElementById("dev-code-editor").value;
  try {
    (0, eval)(code);  // 間接 eval：在全域作用域執行，函式才掛得到 window 上
    _setDevStatus("✅ 已套用！共 " + _scanFunctionNames(code).length + " 個函式", false);
  } catch (e) {
    _setDevStatus("❌ " + e.message, true);
    return;
  }
  _refreshFnSelect();
  _renderExport();
  _saveDevState();
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

function attachEventHere() {
  var sel  = document.getElementById("dev-fn-select");
  var name = sel ? sel.value : "";
  if (!name) { _setDevStatus("❌ 請先寫好函式並按「套用程式碼」", true); return; }
  if (typeof window[name] !== "function") {
    _setDevStatus("❌ 函式「" + name + "」還沒生效，先按「套用程式碼」", true);
    return;
  }
  var key = player.x + "," + player.y;
  tileEvents[key] = name;
  _setDevStatus("✅ 已把 " + name + " 掛接在 (" + player.x + ", " + player.y + ")", false);
  _renderAttachList();
  _renderExport();
  _saveDevState();
  renderMap();
}

function removeTileEvent(key) {
  delete tileEvents[key];
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
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var row = document.createElement("div");
    row.className = "dev-attach-row";
    var label = document.createElement("span");
    label.textContent = "(" + key + ") → " + tileEvents[key];
    var btn = document.createElement("button");
    btn.className = "dev-attach-remove";
    btn.textContent = "✕";
    btn.onclick = (function(k) { return function() { removeTileEvent(k); }; })(key);
    row.appendChild(label);
    row.appendChild(btn);
    list.appendChild(row);
  }
}

// ── 匯出 ──────────────────────────────────────────────────────
function _buildExportCode() {
  var lines = [
    "// ==== events.js（把這整段複製到你的專案）====",
    "var tileEvents = {"
  ];
  var keys = Object.keys(tileEvents);
  for (var i = 0; i < keys.length; i++) {
    lines.push('  "' + keys[i] + '": "' + tileEvents[keys[i]] + '",');
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
  var code = _buildExportCode();
  function done() { _setDevStatus("✅ 已複製到剪貼簿", false); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done, function() { _copyFallback(code); done(); });
  } else {
    _copyFallback(code); done();
  }
}

function _copyFallback(code) {
  var el = document.getElementById("dev-export-code");
  el.value = code;
  el.select();
  document.execCommand("copy");
}

// ── localStorage 持久化 ───────────────────────────────────────
function _saveDevState() {
  try {
    localStorage.setItem(DEV_STORE_CODE, document.getElementById("dev-code-editor").value);
    localStorage.setItem(DEV_STORE_EVENTS, JSON.stringify(tileEvents));
  } catch (e) { /* 無痕模式等情況存不了就算了 */ }
}

function _loadDevState() {
  var editor = document.getElementById("dev-code-editor");
  var code = null, events = null;
  try {
    code   = localStorage.getItem(DEV_STORE_CODE);
    events = localStorage.getItem(DEV_STORE_EVENTS);
  } catch (e) {}
  editor.value = (code !== null && code !== "") ? code : DEV_DEFAULT_CODE;
  if (events) {
    try { tileEvents = JSON.parse(events) || {}; } catch (e) { tileEvents = {}; }
  }
  try {
    (0, eval)(editor.value);  // 自動套用上次的程式碼
  } catch (e) {
    _setDevStatus("❌ 上次的程式碼有錯誤：" + e.message, true);
  }
  renderMap();
}

// ── 編輯器 QoL：Tab 鍵插入兩個空格 ────────────────────────────
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
  _loadDevState();
});
