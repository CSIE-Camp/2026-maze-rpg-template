// ============================================================
//  dev_panel.js ── 開發模式面板（Live Preview）
//
//  分頁「事件程式碼」：
//    學員在左側寫事件函式 → 按「套用」直接生效；匯出後貼到 events.js。
//
//  分頁「事件地塊」：
//    自訂事件地塊（編號 10~255，由學員自行指定，避免撞號），
//    設定名稱、顏色、圖示與事件函式；匯出後貼到 tile.js。
//    定義好的地塊會出現在「地圖編輯」的筆刷清單。
//
//  分頁「地圖編輯」：
//    直接在網頁上點格子畫地圖（含出生點），可套用到遊戲中並匯出 map.js。
//
//  分頁「物品生成器」「結局編輯」：
//    產生 game.bag.push(...) 程式碼／設計結局（匯出貼到 endings.js）。
// ============================================================

var DEV_STORE_CODE    = "hackathon_dev_code";
var DEV_STORE_MAP     = "hackathon_dev_map";
var DEV_STORE_ENDINGS = "hackathon_dev_endings";
var DEV_STORE_TILES   = "hackathon_dev_tiles";

// events.js 檔案的原始函式碼（由 fetch 取得；用於匯出整合與函式清單）
var _eventsFileCode = "";

function _fileFnNames() {
  return _scanFunctionNames(_eventsFileCode);
}

// 地塊定義分兩層：
//   _fileTileDefs  → tile.js 檔案內定義（面板中無法覆蓋/移除，檔案更新永遠生效）
//   _panelTileDefs → 面板新增的地塊（存 localStorage）
// 實際使用的 tileDefs = 兩層合併（編號不會重複，新增時會擋掉檔案內的編號）
var _fileTileDefs  = {};
var _panelTileDefs = {};

function _rebuildTileDefs() {
  tileDefs = {};
  for (var k in _fileTileDefs)  tileDefs[k] = _fileTileDefs[k];
  for (var k2 in _panelTileDefs) tileDefs[k2] = _panelTileDefs[k2];
}

// 追蹤當前正在執行的程式碼，以及上一次成功套用的程式碼，用以實現「返回上一次套用」
var currentlyRunningCode = "";
var lastAppliedCode = null;

// 事件地塊定義表（tile.js 提供；此處保底宣告）
if (typeof tileDefs === "undefined") {
  var tileDefs = {};
}

// 結局表：[{ name: "結局名稱", condition: "JS 表達式", html: "HTML 內容" }, ...]
if (typeof gameEndings === "undefined") {
  var gameEndings = [];
}

// 結局同樣分兩層：
//   _fileEndings  → endings.js 檔案內定義（面板中無法移除/編輯）
//   _panelEndings → 面板新增的結局（存 localStorage）
// 實際檢查的 gameEndings = 檔案層 + 面板層（依序）
var _fileEndings  = [];
var _panelEndings = [];

function _rebuildGameEndings() {
  gameEndings = _fileEndings.concat(_panelEndings);
}

// 編輯器的初始內容：獨立的小範例（events.js 檔案內容不會貼進來，
// 但匯出時會自動與 events.js 整合）
var DEV_DEFAULT_CODE =
  '// 在這裡寫你的事件函式，關閉面板時自動套用\n' +
  '// 範例：\n' +
  'function onTrap() {\n' +
  '  game.hp -= 10;\n' +
  '  game.message = "💥 你踩到陷阱了！";\n' +
  '}\n';

// ── 面板開關 ──────────────────────────────────────────────────
function openDevPanel() {
  var overlay = document.getElementById("dev-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  _renderExport();
  _renderDevMapGrid();
  _renderMapExport();
  _refreshItemFnSelect();
  _renderItemExport();
  _renderDevItemsBagList();
  _refreshTileFnSelect();
  _renderTileDefsList();
  _renderTileExport();
}

// 上次提醒過的覆蓋函式清單（相同就不重複彈窗）
var _lastOverrideAlert = "";

function closeDevPanel() {
  var overlay = document.getElementById("dev-panel-overlay");
  if (overlay) overlay.style.display = "none";

  // 關閉面板時自動套用程式碼
  var err = applyDevCode();
  if (err) {
    alert("⚠️ 事件程式碼有錯誤，尚未生效：\n\n" + err);
    return;
  }
  // 提醒使用者哪些函式覆蓋了 events.js 檔案內的同名函式
  var dups = _getOverriddenFns();
  var key = dups.join("、");
  if (dups.length > 0 && key !== _lastOverrideAlert) {
    alert("提醒：開發面板中的以下函式，覆蓋了 events.js 檔案內的同名函式：\n\n" + key);
  }
  _lastOverrideAlert = key;
}

// 面板程式碼中與 events.js 檔案同名的函式
function _getOverriddenFns() {
  var editor = document.getElementById("dev-code-editor");
  if (!editor) return [];
  var fileNames = _fileFnNames();
  return _scanFunctionNames(editor.value).filter(function(n) {
    return fileNames.indexOf(n) !== -1;
  });
}

function isDevPanelOpen() {
  var overlay = document.getElementById("dev-panel-overlay");
  return !!(overlay && overlay.style.display !== "none");
}

// ── 分頁切換 ──────────────────────────────────────────────────
function switchDevTab(name) {
  var tabs = ["events", "tiles", "map", "items", "endings"];
  for (var i = 0; i < tabs.length; i++) {
    var page = document.getElementById("dev-tab-" + tabs[i]);
    var btn  = document.getElementById("dev-tab-btn-" + tabs[i]);
    var active = (tabs[i] === name);
    if (page) page.style.display = active ? "flex" : "none";
    if (btn)  btn.className = "dev-tab-btn" + (active ? " dev-tab-btn--active" : "");
  }
  if (name === "tiles") { _refreshTileFnSelect(); _renderTileDefsList(); _renderTileExport(); }
  if (name === "map") { _renderDevMapGrid(); _renderMapExport(); }
  if (name === "items") { _refreshItemFnSelect(); _renderItemExport(); _renderDevItemsBagList(); }
  if (name === "endings") { _renderEndingsList(); _renderEndingsExport(); }
}

// ── 輔助生命週期與 QoL 函式 ────────────────────────────────────
function _stripVarDeclarations(src) {
  return src
    .replace(/^\s*var\s+tileEvents\s*=[\s\S]*?;\s*$/m, "")
    .replace(/^\s*var\s+gameEndings\s*=[\s\S]*?;\s*$/m, "")
    .replace(/^\s*\/\/\s*掛接表.*$/m, "")
    .replace(/^\s*\/\/\s*結局表.*$/m, "")
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
}

function _cleanupDeletedFunctions(oldCode, newCode) {
  var oldFuncs  = _scanFunctionNames(oldCode);
  var newFuncs  = _scanFunctionNames(newCode);
  var fileFuncs = _fileFnNames();
  for (var i = 0; i < oldFuncs.length; i++) {
    var fnName = oldFuncs[i];
    // 檔案內的函式不刪（重新 eval 檔案碼會恢復原版）
    if (newFuncs.indexOf(fnName) === -1 && fileFuncs.indexOf(fnName) === -1) {
      try {
        delete window[fnName];
      } catch (e) {
        window[fnName] = undefined;
      }
    }
  }
}

function _getDuplicateWarning(code) {
  var fileNames = _fileFnNames();
  var duplicates = _scanFunctionNames(code).filter(function(name) {
    return fileNames.indexOf(name) !== -1;
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
  if (!confirm("確定要清除開發面板的暫存程式碼、自訂地塊與結局嗎？\n檔案（events.js / tile.js / endings.js）內的內容會保留。")) return;

  try {
    localStorage.removeItem(DEV_STORE_CODE);
    localStorage.removeItem(DEV_STORE_TILES);
    localStorage.removeItem(DEV_STORE_ENDINGS);
  } catch (e) {}
  _panelEndings = [];
  _rebuildGameEndings();
  _panelTileDefs = {};
  _rebuildTileDefs();

  var editor = document.getElementById("dev-code-editor");
  if (editor) editor.value = DEV_DEFAULT_CODE;

  _cleanupDeletedFunctions(currentlyRunningCode, DEV_DEFAULT_CODE);
  currentlyRunningCode = DEV_DEFAULT_CODE;
  lastAppliedCode = null;
  _lastOverrideAlert = "";

  var revertBtn = document.getElementById("btn-dev-revert");
  if (revertBtn) revertBtn.style.display = "none";

  try {
    // 檔案內函式恢復原版，再套用預設範例
    if (_eventsFileCode) (0, eval)(_eventsFileCode);
    (0, eval)(currentlyRunningCode);
  } catch (e) {}

  _setDevStatus("🗑️ 已清除暫存，檔案內容（events.js / tile.js）保留", false);
  _renderExport();
  _rebuildMapPalette();
  _refreshTileFnSelect();
  _renderTileDefsList();
  _renderTileExport();
  renderMap();
}

// ── 套用程式碼（關閉面板時自動執行；成功回傳 null，失敗回傳錯誤訊息）──
function applyDevCode() {
  var code = document.getElementById("dev-code-editor").value;
  try {
    // 先清掉面板已刪除的函式，再依「檔案 → 面板」順序重新執行：
    // 面板同名函式覆蓋檔案版；面板刪掉覆蓋函式後，檔案原版會恢復。
    if (currentlyRunningCode !== code) {
      _cleanupDeletedFunctions(currentlyRunningCode, code);
    }
    if (_eventsFileCode) (0, eval)(_eventsFileCode);
    (0, eval)(code);  // 間接 eval：在全域作用域執行，函式才掛得到 window 上

    if (currentlyRunningCode !== code) {
      lastAppliedCode = currentlyRunningCode;
      currentlyRunningCode = code;

      var revertBtn = document.getElementById("btn-dev-revert");
      if (revertBtn) revertBtn.style.display = "inline-block";
    }

    var dupWarning = _getDuplicateWarning(code);
    _setDevStatus("✅ 已套用！面板共 " + _scanFunctionNames(code).length + " 個函式" + dupWarning, false);
  } catch (e) {
    _setDevStatus("❌ " + e.message, true);
    return e.message;
  }
  _refreshItemFnSelect();
  _refreshTileFnSelect();
  _renderItemExport();
  _renderExport();
  _saveDevState();
  renderMap();
  return null;
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

// 把可用的事件函式列進下拉選單（供事件地塊 / 物品生成器選用）：
// 面板編輯器內宣告的函式＋只存在於 events.js 檔案的函式
function _fillFnSelect(sel, emptyLabel) {
  if (!sel) return;
  var editor = document.getElementById("dev-code-editor");
  if (!editor) return;
  var prev  = sel.value;
  var names = _scanFunctionNames(editor.value);
  var fileOnly = _fileFnNames().filter(function(n) { return names.indexOf(n) === -1; });
  sel.innerHTML = "";
  var none = document.createElement("option");
  none.value = ""; none.textContent = emptyLabel;
  sel.appendChild(none);
  for (var i = 0; i < names.length; i++) {
    var o = document.createElement("option");
    o.value = names[i]; o.textContent = names[i];
    sel.appendChild(o);
  }
  for (var j = 0; j < fileOnly.length; j++) {
    var fo = document.createElement("option");
    fo.value = fileOnly[j]; fo.textContent = fileOnly[j] + "（events.js）";
    sel.appendChild(fo);
  }
  if (names.indexOf(prev) !== -1 || fileOnly.indexOf(prev) !== -1) sel.value = prev;
}

// ── 匯出 events.js ────────────────────────────────────────────
// 從程式碼中移除指定函式（用大括號配對找函式結尾）。
// 注意：若函式內的字串含有不成對的大括號，配對會失準——教學用途可接受。
function _removeFunctionFromCode(code, fnName) {
  var re = new RegExp("(^|\\n)[ \\t]*function\\s+" + fnName + "\\s*\\(");
  var m = re.exec(code);
  if (!m) return code;
  var start = m.index + m[1].length;
  var i = code.indexOf("{", start);
  if (i === -1) return code;
  var depth = 0;
  for (; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return (code.slice(0, start) + code.slice(i)).replace(/\n{3,}/g, "\n\n");
}

// 匯出 = events.js 檔案內容（去掉被面板覆蓋的函式）＋ 面板程式碼
function _buildExportCode() {
  var panelCode = document.getElementById("dev-code-editor").value;
  var fileCode  = _eventsFileCode;
  _getOverriddenFns().forEach(function(n) {
    fileCode = _removeFunctionFromCode(fileCode, n);
  });
  var lines = [
    "// ==== events.js（已整合 events.js 原有內容與開發面板內容，取代 events.js 全部內容）====",
    ""
  ];
  if (fileCode.trim()) {
    lines.push(fileCode.trim());
    lines.push("");
  }
  lines.push("// ── 開發面板新增／覆蓋的函式 ──────────────────────────────");
  lines.push(panelCode);
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
//  事件地塊分頁
//
//  自訂地塊：編號 10~255（由學員指定數值，避免和別人撞號），
//  每種地塊有名稱、顏色、圖示與事件函式（寫在「事件程式碼」分頁）。
//  定義好的地塊會出現在「地圖編輯」的筆刷清單，可以直接畫上地圖。
// ══════════════════════════════════════════════════════════════

function _setDevTilesStatus(msg, isError) {
  var el = document.getElementById("dev-tiles-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? "dev-status-error" : "dev-status-ok";
}

function _refreshTileFnSelect() {
  _fillFnSelect(document.getElementById("dev-tile-fn"), "（無事件）");
}

function updateTileIconPreview() {
  var sel  = document.getElementById("dev-tile-icon");
  var prev = document.getElementById("dev-tile-icon-preview");
  if (!sel || !prev) return;
  if (sel.value) {
    prev.src = sel.value;
    prev.style.display = "inline";
  } else {
    prev.style.display = "none";
  }
}

function addOrUpdateTileDef() {
  var codeEl  = document.getElementById("dev-tile-code");
  var nameEl  = document.getElementById("dev-tile-name");
  var colorEl = document.getElementById("dev-tile-color");
  var iconEl  = document.getElementById("dev-tile-icon");
  var fnEl    = document.getElementById("dev-tile-fn");

  var code = parseInt(codeEl ? codeEl.value : "", 10);
  if (isNaN(code) || code < 10 || code > 255) {
    _setDevTilesStatus("❌ 地塊編號必須是 10 ~ 255 之間的整數", true);
    return;
  }
  // 檔案內定義的地塊：無法在面板中覆蓋
  if (_fileTileDefs[code]) {
    alert("無法覆蓋：編號 " + code + "「" + (_fileTileDefs[code].name || "") + "」已定義在 tile.js 檔案中。\n" +
          "請改用其他編號，或直接修改 tile.js。");
    _setDevTilesStatus("❌ 編號 " + code + " 已定義在 tile.js，無法覆蓋", true);
    return;
  }
  // 面板已有的地塊：確認是否覆蓋
  var isUpdate = !!_panelTileDefs[code];
  if (isUpdate &&
      !confirm("編號 " + code + " 已有地塊「" + (_panelTileDefs[code].name || "") + "」，是否覆蓋？")) {
    return;
  }
  _panelTileDefs[code] = {
    name:  (nameEl && nameEl.value) ? nameEl.value : ("地塊 " + code),
    color: (colorEl && colorEl.value) ? colorEl.value : "#5a3890",
    icon:  (iconEl && iconEl.value) || "",
    event: (fnEl && fnEl.value) || ""
  };
  _rebuildTileDefs();
  _saveDevTiles();
  _renderTileDefsList();
  _renderTileExport();
  _rebuildMapPalette();
  renderMap();
  _setDevTilesStatus((isUpdate ? "✅ 已更新" : "✅ 已新增") + "地塊 " + code + "「" + tileDefs[code].name + "」，到「地圖編輯」分頁用筆刷畫上地圖吧", false);
}

function removeTileDef(code) {
  if (_fileTileDefs[code]) {
    alert("無法移除：編號 " + code + " 定義在 tile.js 檔案中，請直接修改 tile.js。");
    return;
  }
  delete _panelTileDefs[code];
  _rebuildTileDefs();
  _saveDevTiles();
  _renderTileDefsList();
  _renderTileExport();
  _rebuildMapPalette();
  renderMap();
  _setDevTilesStatus("🗑️ 已移除地塊 " + code, false);
}

function _renderTileDefsList() {
  var list = document.getElementById("dev-tiles-list");
  if (!list) return;
  var codes = Object.keys(tileDefs).map(Number).sort(function(a, b) { return a - b; });
  if (codes.length === 0) {
    list.innerHTML = '<div class="dev-attach-empty">還沒有定義任何事件地塊</div>';
    return;
  }
  list.innerHTML = "";

  var declaredFunctions = _scanFunctionNames(document.getElementById("dev-code-editor").value);

  for (var i = 0; i < codes.length; i++) {
    (function(code) {
      var def = tileDefs[code];
      var isFile = !!_fileTileDefs[code];
      var fnInvalid = def.event &&
                      declaredFunctions.indexOf(def.event) === -1 &&
                      typeof window[def.event] !== "function";

      var row = document.createElement("div");
      row.className = "dev-attach-row" + (fnInvalid ? " dev-attach-row--invalid" : "");

      var swatch = document.createElement("span");
      swatch.className = "dev-attach-swatch";
      swatch.style.background = def.color || "#5a3890";
      if (def.icon) {
        var swImg = document.createElement("img");
        swImg.src = def.icon; swImg.alt = "";
        swImg.style.cssText = "width:20px;height:20px;object-fit:contain;";
        swatch.appendChild(swImg);
      }

      var label = document.createElement("span");
      label.className = "dev-attach-label";
      var fnText = def.event ? (" → " + def.event) : "（無事件）";
      if (fnInvalid) {
        label.innerHTML = code + " " + def.name + " → " + def.event +
          ' <span class="dev-attach-invalid-label">(⚠️ 函式不存在)</span>';
      } else {
        label.textContent = code + " " + def.name + fnText;
      }

      row.appendChild(swatch);
      row.appendChild(label);

      if (isFile) {
        // 檔案內定義：無法即時編輯，只能改 tile.js
        var badge = document.createElement("span");
        badge.className = "dev-file-badge";
        badge.textContent = "tile.js";
        badge.title = "定義在 tile.js 檔案中，無法即時編輯；要修改請直接編輯 tile.js。";
        row.appendChild(badge);
      } else {
        var editBtn = document.createElement("button");
        editBtn.className = "dev-bag-use";
        editBtn.textContent = "編輯";
        editBtn.onclick = function() {
          var codeEl  = document.getElementById("dev-tile-code");
          var nameEl  = document.getElementById("dev-tile-name");
          var colorEl = document.getElementById("dev-tile-color");
          var iconEl  = document.getElementById("dev-tile-icon");
          var fnEl    = document.getElementById("dev-tile-fn");
          if (codeEl)  codeEl.value  = code;
          if (nameEl)  nameEl.value  = def.name || "";
          if (colorEl) colorEl.value = def.color || "#5a3890";
          if (iconEl)  { iconEl.value = def.icon || ""; updateTileIconPreview(); }
          _refreshTileFnSelect();
          if (fnEl) fnEl.value = def.event || "";
        };

        var rmBtn = document.createElement("button");
        rmBtn.className = "dev-attach-remove";
        rmBtn.textContent = "✕";
        rmBtn.onclick = function() { removeTileDef(code); };

        row.appendChild(editBtn);
        row.appendChild(rmBtn);
      }
      list.appendChild(row);
    })(codes[i]);
  }
}

function _buildTileExportCode() {
  // 匯出＝檔案層＋面板層整合後的完整定義（tileDefs 即為兩層合併）
  var codes = Object.keys(tileDefs).map(Number).sort(function(a, b) { return a - b; });
  var lines = ["// ==== tile.js 地塊定義（已整合 tile.js 原有地塊與面板新增地塊，把這整段貼到 tile.js 取代 var tileDefs）===="];
  if (codes.length === 0) {
    lines.push("var tileDefs = {};");
    return lines.join("\n");
  }
  lines.push("var tileDefs = {");
  for (var i = 0; i < codes.length; i++) {
    var d = tileDefs[codes[i]];
    lines.push("  " + codes[i] + ": { name: " + JSON.stringify(d.name || "") +
               ", color: " + JSON.stringify(d.color || "") +
               ", icon: " + JSON.stringify(d.icon || "") +
               ", event: " + JSON.stringify(d.event || "") + " }" +
               (i < codes.length - 1 ? "," : ""));
  }
  lines.push("};");
  return lines.join("\n");
}

function _renderTileExport() {
  var el = document.getElementById("dev-tiles-export-code");
  if (el) el.value = _buildTileExportCode();
}

function copyTileExportCode() {
  _copyToClipboard(_buildTileExportCode(), "dev-tiles-export-code");
  _setDevTilesStatus("✅ 已複製地塊定義程式碼", false);
}

function _saveDevTiles() {
  try {
    localStorage.setItem(DEV_STORE_TILES, JSON.stringify(_panelTileDefs));
  } catch (e) {}
}

function _loadDevTiles() {
  // tile.js 載入的內容 = 檔案層
  _fileTileDefs = JSON.parse(JSON.stringify(tileDefs));
  var saved = null;
  try { saved = localStorage.getItem(DEV_STORE_TILES); } catch (e) {}
  if (saved) {
    try {
      var parsed = JSON.parse(saved) || {};
      // 只還原「不在檔案內」的編號：tile.js 的更新永遠優先於暫存
      for (var k in parsed) {
        if (!_fileTileDefs[k]) _panelTileDefs[k] = parsed[k];
      }
    } catch (e) {}
  }
  _rebuildTileDefs();
}

// ══════════════════════════════════════════════════════════════
//  物品生成器分頁
//
//  物品格式：{ name: "藥水", effect: onPotionHeal, desc: "..." }
//  effect 是「函式」，物品被使用時呼叫；也可以是 null（沒有效果的物品）。
//  這個分頁幫學員：產生效果函式範本、組出 game.bag.push(...) 程式碼、
//  並可直接把物品放進背包測試。
// ══════════════════════════════════════════════════════════════

var DEV_ITEM_TEMPLATES = {
  heal: {
    label: "回血藥水", name: "回血藥水", desc: "使用後回復 30 HP", fn: "onPotionHeal",
    code: function(n) {
      return [
        "function onPotionHeal" + n + "() {",
        "  game.hp += 30;",
        '  game.message = "🧪 回復 30 HP！";',
        "}"
      ].join("\n");
    }
  },
  atk: {
    label: "力量藥水", name: "力量藥水", desc: "攻擊力永久 +5", fn: "onAtkPotion",
    code: function(n) {
      return [
        "function onAtkPotion" + n + "() {",
        "  game.atk += 5;",
        '  game.message = "💪 攻擊力 +5！";',
        "}"
      ].join("\n");
    }
  },
  def: {
    label: "防禦藥水", name: "防禦藥水", desc: "防禦力永久 +3", fn: "onDefPotion",
    code: function(n) {
      return [
        "function onDefPotion" + n + "() {",
        "  game.def += 3;",
        '  game.message = "🛡️ 防禦力 +3！";',
        "}"
      ].join("\n");
    }
  },
  scroll: {
    label: "傳送卷軸", name: "傳送卷軸", desc: "使用後回到出生點", fn: "onTeleportScroll",
    code: function(n) {
      return [
        "function onTeleportScroll" + n + "() {",
        "  game.x = playerStart.x;",
        "  game.y = playerStart.y;",
        '  game.message = "🌀 你被傳送回出生點！";',
        "}"
      ].join("\n");
    }
  }
};

function _setDevItemsStatus(msg, isError) {
  var el = document.getElementById("dev-items-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? "dev-status-error" : "dev-status-ok";
}

// 效果函式下拉：列出「事件程式碼」分頁裡宣告的所有函式（可選「無效果」）
function _refreshItemFnSelect() {
  _fillFnSelect(document.getElementById("dev-item-fn"), "（無效果）");
}

// 快速範本：把效果函式加進程式碼編輯器、套用、並填好表單
function quickAddItemTemplate(type) {
  var tpl = DEV_ITEM_TEMPLATES[type];
  if (!tpl) return;
  var editor = document.getElementById("dev-code-editor");

  // 找一個沒被用過的編號（onPotionHeal1、onPotionHeal2…）
  var used = _scanFunctionNames(editor.value);
  var n = 1;
  while (used.indexOf(tpl.fn + n) !== -1) n++;

  var sep = editor.value.trim() === "" ? "" : "\n\n";
  editor.value = editor.value + sep + tpl.code(n) + "\n";
  applyDevCode();

  var nameEl = document.getElementById("dev-item-name");
  var descEl = document.getElementById("dev-item-desc");
  var fnSel  = document.getElementById("dev-item-fn");
  if (nameEl) nameEl.value = tpl.name;
  if (descEl) descEl.value = tpl.desc;
  _refreshItemFnSelect();
  if (fnSel) fnSel.value = tpl.fn + n;
  _renderItemExport();

  _setDevItemsStatus("✅ 已生成效果函式 " + tpl.fn + n + "（程式碼在「事件程式碼」分頁）", false);
}

// 讀取表單，組出 game.bag.push(...) 程式碼
function _buildItemAddCode() {
  var nameEl = document.getElementById("dev-item-name");
  var descEl = document.getElementById("dev-item-desc");
  var fnSel  = document.getElementById("dev-item-fn");
  var name = (nameEl && nameEl.value) ? nameEl.value : "神秘物品";
  var desc = (descEl && descEl.value) ? descEl.value : "";
  var fn   = (fnSel && fnSel.value)   ? fnSel.value   : null;
  return [
    "// 把物品放進背包：原生陣列 push（effect 填函式名稱，不加括號！）",
    "// 沒有效果的物品 effect 填 null。",
    "game.bag.push({",
    "  name: " + JSON.stringify(name) + ",",
    "  effect: " + (fn || "null") + ",",
    "  desc: " + JSON.stringify(desc),
    "});"
  ].join("\n");
}

function _renderItemExport() {
  var el = document.getElementById("dev-item-export-code");
  if (el) el.value = _buildItemAddCode();
}

function copyItemExportCode() {
  _copyToClipboard(_buildItemAddCode(), "dev-item-export-code");
  _setDevItemsStatus("✅ 已複製，貼進你的事件函式裡吧", false);
}

// 直接把表單的物品放進背包（測試用）
function devItemGiveToBag() {
  var nameEl = document.getElementById("dev-item-name");
  var fnSel  = document.getElementById("dev-item-fn");
  var descEl = document.getElementById("dev-item-desc");
  var fnName = fnSel ? fnSel.value : "";

  if (fnName && typeof window[fnName] !== "function") {
    _setDevItemsStatus("❌ 效果函式還沒生效：先按快速範本，或到「事件程式碼」分頁寫好並套用", true);
    return;
  }
  // 用「名稱」在使用當下才找函式：這樣重新套用程式碼後，背包裡的物品也會用到新版函式
  // （原生陣列 push，跟學員在事件裡寫的一樣）
  game.bag.push({
    name: (nameEl && nameEl.value) || "神秘物品",
    effect: fnName ? function() {
      var fn = window[fnName];
      if (typeof fn === "function") fn();
      else game.message = "💥 找不到效果函式「" + fnName + "」，記得先按「套用程式碼」！";
    } : null,
    desc: (descEl && descEl.value) || ""
  });
  _setDevItemsStatus("✅ 已放進背包！關閉面板後看看畫面左側的背包欄", false);
  _renderDevItemsBagList();
}

// 右欄：目前背包內容（可使用 / 丟棄，示範 bag API）
function _renderDevItemsBagList() {
  var list = document.getElementById("dev-items-bag-list");
  if (!list) return;
  var inv = (typeof currentPlayer !== "undefined" && currentPlayer.inventory) ? currentPlayer.inventory : [];
  if (inv.length === 0) {
    list.innerHTML = '<div class="dev-attach-empty">背包是空的，按「➕ 放進背包試試」加一個吧</div>';
    return;
  }
  list.innerHTML = "";

  var counts = {};
  var order  = [];
  for (var i = 0; i < inv.length; i++) {
    var n = inv[i].name;
    if (!counts[n]) { counts[n] = { item: inv[i], qty: 0 }; order.push(n); }
    counts[n].qty++;
  }

  for (var k = 0; k < order.length; k++) {
    (function(name, entry) {
      var row = document.createElement("div");
      row.className = "dev-attach-row";

      var label = document.createElement("span");
      label.className = "dev-attach-label";
      label.textContent = name + " ×" + entry.qty + (entry.item.desc ? "（" + entry.item.desc + "）" : "");

      var useBtn = document.createElement("button");
      useBtn.className = "dev-bag-use";
      useBtn.textContent = "使用";
      useBtn.title = 'findIndex 找到「' + name + '」→ splice 移除 → 呼叫 effect()';
      useBtn.onclick = function() {
        // 原生寫法：找到 → 移除 → 呼叫 effect
        var i = game.bag.findIndex(function(it) { return it.name === name; });
        if (i !== -1) {
          var item = game.bag[i];
          game.bag.splice(i, 1);
          game.message = "🧪 使用了「" + item.name + "」！";
          if (typeof item.effect === "function") item.effect();
        }
        _renderDevItemsBagList();
      };

      var rmBtn = document.createElement("button");
      rmBtn.className = "dev-attach-remove";
      rmBtn.textContent = "✕";
      rmBtn.title = 'findIndex 找到「' + name + '」→ splice 移除（不呼叫 effect）';
      rmBtn.onclick = function() {
        // 原生寫法：找到 → 移除（不呼叫 effect）
        var i = game.bag.findIndex(function(it) { return it.name === name; });
        if (i !== -1) game.bag.splice(i, 1);
        _renderDevItemsBagList();
      };

      row.appendChild(label);
      row.appendChild(useBtn);
      row.appendChild(rmBtn);
      list.appendChild(row);
    })(order[k], counts[order[k]]);
  }
}

// ══════════════════════════════════════════════════════════════
//  地圖編輯分頁
// ══════════════════════════════════════════════════════════════

// 保留 map.js 的原始地圖，供「還原」使用
var _originalMapGrid    = null;
var _originalPlayerStart = null;

// 編輯中的工作副本（devMapGrid 內不含出生點代碼，出生點另存 devPlayerStart，
// 匯出／套用時再把 MAP_TILE.START 蓋回格子上）
var devMapGrid     = null;
var devPlayerStart = null;

var _devMapTool  = 1;      // 目前選擇的筆刷（地塊代碼，或 "start"）
var _devPainting = false;  // 滑鼠拖曳塗色中

// 把格子裡的出生點代碼抽出來（回傳出生點座標；格子改為空地）
function _extractStartFromGrid(grid, fallback) {
  var start = null;
  for (var y = 0; y < grid.length; y++) {
    for (var x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === MAP_TILE.START) {
        if (!start) start = { x: x, y: y };
        grid[y][x] = MAP_TILE.EMPTY;
      }
    }
  }
  return start || fallback || { x: 1, y: 1 };
}

// 基本筆刷 + 已定義的事件地塊
function _devMapTools() {
  var tools = [
    { code: MAP_TILE.EMPTY, label: "空地",   color: "#2d4a7a" },
    { code: MAP_TILE.WALL,  label: "牆壁",   color: "#080d1a" },
    { code: "start",        label: "出生點", color: "#22e060" }
  ];
  var codes = Object.keys(tileDefs).map(Number).sort(function(a, b) { return a - b; });
  for (var i = 0; i < codes.length; i++) {
    var d = tileDefs[codes[i]];
    tools.push({ code: codes[i], label: codes[i] + " " + (d.name || "地塊"), color: d.color || "#5a3890" });
  }
  return tools;
}

function _devMapToolColor(code) {
  if (code === MAP_TILE.EMPTY) return "#2d4a7a";
  if (code === MAP_TILE.WALL)  return "#080d1a";
  var d = tileDefs[code];
  if (d && d.color) return d.color;
  return "#e02020";   // 未定義的地塊：紅色提醒
}

function _ensureDevMap() {
  if (!devMapGrid) {
    devMapGrid     = mapGrid.map(function(r) { return r.slice(); });
    devPlayerStart = _extractStartFromGrid(devMapGrid, playerStart);
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

function _rebuildMapPalette() {
  var pal = document.getElementById("dev-map-palette");
  if (!pal) return;
  pal.innerHTML = "";
  var tools = _devMapTools();
  var hasActive = tools.some(function(t) { return t.code === _devMapTool; });
  if (!hasActive) _devMapTool = MAP_TILE.WALL;
  for (var i = 0; i < tools.length; i++) {
    var t = tools[i];
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
    devMapGrid[y][x] = MAP_TILE.EMPTY;   // 出生點必須是空地
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
  _rebuildMapPalette();

  container.innerHTML = "";
  container.style.gridTemplateColumns = "repeat(" + devMapGrid[0].length + ", 22px)";

  for (var y = 0; y < devMapGrid.length; y++) {
    for (var x = 0; x < devMapGrid[y].length; x++) {
      var cell = document.createElement("div");
      cell.className = "dev-map-cell";
      var code = devMapGrid[y][x];

      if (devPlayerStart.x === x && devPlayerStart.y === y) {
        cell.style.background = "#22e060";
        cell.textContent = "S";
        cell.title = "出生點";
      } else {
        cell.style.background = _devMapToolColor(code);
        var def = tileDefs[code];
        if (def) {
          cell.title = code + " " + (def.name || "");
          if (def.icon) {
            var cImg = document.createElement("img");
            cImg.src = def.icon; cImg.alt = "";
            cImg.style.cssText = "width:16px;height:16px;object-fit:contain;";
            cell.appendChild(cImg);
          }
        } else if (code !== MAP_TILE.EMPTY && code !== MAP_TILE.WALL) {
          cell.textContent = "?";
          cell.title = "編號 " + code + " 的地塊未定義（見「事件地塊」分頁）";
        }
      }

      cell.setAttribute("data-x", x);
      cell.setAttribute("data-y", y);
      container.appendChild(cell);
    }
  }
}

// 產生含出生點代碼的完整地圖（匯出／套用共用）
function _buildGridWithStart() {
  _ensureDevMap();
  var grid = devMapGrid.map(function(r) { return r.slice(); });
  if (grid[devPlayerStart.y] && grid[devPlayerStart.y][devPlayerStart.x] !== undefined) {
    grid[devPlayerStart.y][devPlayerStart.x] = MAP_TILE.START;
  }
  return grid;
}

function applyDevMap() {
  mapGrid     = _buildGridWithStart();
  playerStart = { x: devPlayerStart.x, y: devPlayerStart.y };
  currentMap  = mapGrid.map(function(r) { return r.slice(); });
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
  devPlayerStart = _extractStartFromGrid(devMapGrid, _originalPlayerStart);
  try { localStorage.removeItem(DEV_STORE_MAP); } catch (e) {}
  applyDevMap();
  // 還原後也要刷新面板內的地圖預覽與匯出程式碼，否則畫面停在舊的編輯狀態
  _renderDevMapGrid();
  _renderMapExport();
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
  var grid = _buildGridWithStart();
  var lines = [
    "// ==== 地圖程式碼（把這整段貼到 map.js，取代 var mapGrid）===="
  ];
  lines.push("var mapGrid = [");
  for (var y = 0; y < grid.length; y++) {
    lines.push("  [" + grid[y].join(", ") + "],");
  }
  lines.push("];");
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
  _panelEndings.push({ name: "結局 " + (gameEndings.length + 1), condition: "", html: "<h1>🏁 結局</h1>\n<p>遊戲結束了。</p>" });
  _rebuildGameEndings();
  _renderEndingsList();
  _renderEndingsExport();
  _saveDevEndings();
}

// index 為面板層（_panelEndings）的索引
function removeGameEnding(index) {
  _panelEndings.splice(index, 1);
  _rebuildGameEndings();
  _renderEndingsList();
  _renderEndingsExport();
  _saveDevEndings();
}

function _updateEndingField(index, field, value) {
  if (index < 0 || index >= _panelEndings.length) return;
  _panelEndings[index][field] = value;
  _rebuildGameEndings();
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

  // 卡片：檔案層（唯讀）在前、面板層（可編輯）在後，與檢查順序一致
  function makeCard(e, displayNo, isFile, panelIdx) {
    var card = document.createElement("div");
    card.className = "dev-ending-card";

    var header = document.createElement("div");
    header.className = "dev-ending-header";
    var title = document.createElement("span");
    title.textContent = "#" + displayNo + (e.name ? "　" + e.name : "");
    header.appendChild(title);
    if (isFile) {
      var badge = document.createElement("span");
      badge.className = "dev-file-badge";
      badge.textContent = "endings.js";
      badge.title = "定義在 endings.js 檔案中，無法在面板中編輯或移除；要修改請直接編輯 endings.js。";
      header.appendChild(badge);
    } else {
      var removeBtn = document.createElement("button");
      removeBtn.className = "dev-ending-remove";
      removeBtn.textContent = "✕ 移除";
      removeBtn.onclick = function() { removeGameEnding(panelIdx); };
      header.appendChild(removeBtn);
    }
    card.appendChild(header);

    function field(labelText, el) {
      var label = document.createElement("label");
      label.textContent = labelText;
      card.appendChild(label);
      card.appendChild(el);
    }

    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = e.name || "";
    var condInput = document.createElement("input");
    condInput.type = "text";
    condInput.value = e.condition || "";
    condInput.placeholder = "例：game.hp <= 0 || game.money >= 100";
    var htmlArea = document.createElement("textarea");
    htmlArea.spellcheck = false;
    htmlArea.value = e.html || "";

    if (isFile) {
      nameInput.disabled = condInput.disabled = htmlArea.disabled = true;
    } else {
      nameInput.oninput = function() { _updateEndingField(panelIdx, "name", this.value); };
      condInput.oninput = function() { _updateEndingField(panelIdx, "condition", this.value); };
      htmlArea.oninput  = function() { _updateEndingField(panelIdx, "html", this.value); };
    }

    field("結局名稱", nameInput);
    field("觸發條件（JS 表達式，結果為 true 時觸發）", condInput);
    field("顯示內容（HTML）", htmlArea);

    return card;
  }

  var no = 1;
  for (var i = 0; i < _fileEndings.length; i++) {
    list.appendChild(makeCard(_fileEndings[i], no++, true, -1));
  }
  for (var j = 0; j < _panelEndings.length; j++) {
    list.appendChild(makeCard(_panelEndings[j], no++, false, j));
  }
}

function _buildEndingsExportCode() {
  // 匯出＝endings.js 原有結局＋面板新增結局整合（gameEndings 即為兩層合併）
  var header = "// ==== 結局程式碼（已整合 endings.js 原有結局與面板新增結局，貼到 endings.js 取代 var gameEndings）====";
  if (gameEndings.length === 0) return header + "\n// 沒有設定結局\nvar gameEndings = [];";
  var lines = [header, "var gameEndings = ["];
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
    localStorage.setItem(DEV_STORE_ENDINGS, JSON.stringify(_panelEndings));
  } catch (e) {}
}

function _loadDevEndings() {
  // endings.js 載入的內容 = 檔案層
  _fileEndings = JSON.parse(JSON.stringify(gameEndings));
  var saved = null;
  try { saved = localStorage.getItem(DEV_STORE_ENDINGS); } catch (e) {}
  if (saved) {
    try {
      var parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // 只還原「不等同檔案內結局」的項目（舊版曾把整份 gameEndings 存進暫存）
        _panelEndings = parsed.filter(function(e) {
          return !_fileEndings.some(function(f) {
            return f.name === e.name && f.condition === e.condition && f.html === e.html;
          });
        });
      }
    } catch (e) {}
  }
  _rebuildGameEndings();
}

// ── localStorage 持久化 ───────────────────────────────────────
function _saveDevState() {
  try {
    localStorage.setItem(DEV_STORE_CODE, document.getElementById("dev-code-editor").value);
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
      devPlayerStart = _extractStartFromGrid(devMapGrid, data.start);
      mapGrid     = _buildGridWithStart();
      playerStart = { x: devPlayerStart.x, y: devPlayerStart.y };
      currentMap  = mapGrid.map(function(r) { return r.slice(); });
      player.x = playerStart.x; player.y = playerStart.y;
    }
  } catch (e) {}
}

function _loadDevState() {
  var editor = document.getElementById("dev-code-editor");
  var code = null;
  try {
    code = localStorage.getItem(DEV_STORE_CODE);
  } catch (e) {}
  // 舊版暫存過整份 events.js 內容：視為未編輯，改用預設範例
  if (code !== null && code.trim() === _eventsFileCode.trim()) code = null;
  editor.value = (code !== null && code !== "") ? code : DEV_DEFAULT_CODE;
  currentlyRunningCode = editor.value;

  try {
    (0, eval)(editor.value);  // 自動套用上次的程式碼（events.js 已由 script 標籤載入）
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

  _loadDevTiles();
  _loadDevMap();

  // 從 events.js 抓取原始函式碼（去掉標頭註解），再載入 dev 狀態
  fetch("events.js?v=" + Date.now(), { cache: "no-store" })
    .then(function(r) { return r.text(); })
    .then(function(text) {
      var code = _stripVarDeclarations(text);
      if (code) _eventsFileCode = code;
    })
    .catch(function() {})
    .then(function() {
      _loadDevState();
      _loadDevEndings();
    });
});
