// ============================================================
//  listeners.js ── 外掛：自訂監聽事件
//
//  讓你「訂閱」遊戲狀態的變化，例如每移動一格、血量降低時做某件事。
//
//  用法（寫在 events.js 或任何在這之後載入的地方）：
//    onGameEvent("move", function(info) {
//      game.message = "你走到了 (" + info.x + ", " + info.y + ")";
//    });
//    onGameEvent("hpDown", function(info) {
//      game.message = "好痛！損失了 " + info.amount + " HP";
//    });
//
//  可監聽的事件與 info 內容：
//    "move"        每移動一格（含 game.x/game.y 傳送） { fromX, fromY, x, y }
//    "hpDown"      血量降低                            { oldHp, hp, amount }
//    "hpUp"        血量增加                            { oldHp, hp, amount }
//    "hpChange"    血量改變（不論增減）                 { oldHp, hp, amount }（amount 有正負）
//    "maxHpChange" 最大血量改變                        { oldMaxHp, maxHp, amount }
//    "atkChange"   攻擊力改變                          { oldAtk, atk, amount }
//    "defChange"   防禦力改變                          { oldDef, def, amount }
//    "moneyChange" 金幣改變                            { oldMoney, money, amount }
//    "bagChange"   背包物品數量改變                     { oldCount, count }
//
//  注意：
//    - 同一個事件可以掛很多個函式，會依掛上的順序呼叫。
//    - 在監聽函式裡改 game 的屬性「不會」再連鎖觸發其他監聽
//      （避免 hpDown 裡補血 → 又觸發 hpUp → 無限循環）。
//    - 按「再來一次」重新開始時，數值歸位不會觸發任何事件。
//
//  實作方式：包裝（wrap）引擎的 renderMap / updateHUD / renderBagSidebar
//  ——它們在每次位置、數值、背包變動後都會被呼叫——
//  比對前後快照，有差異就發出對應事件。不修改任何既有檔案。
// ============================================================

// ── 學員 API ─────────────────────────────────────────────────

var _gameEventNames = [
  "move", "hpDown", "hpUp", "hpChange",
  "maxHpChange", "atkChange", "defChange", "moneyChange", "bagChange"
];
var _gameEventListeners = {};

// 訂閱事件：onGameEvent("move", 你的函式)
function onGameEvent(type, fn) {
  if (_gameEventNames.indexOf(type) === -1) {
    if (typeof showMapMessage === "function") {
      showMapMessage("💥 沒有「" + type + "」這種監聽事件，可用：" + _gameEventNames.join("、"));
    }
    return;
  }
  if (typeof fn !== "function") {
    if (typeof showMapMessage === "function") {
      showMapMessage("💥 onGameEvent 的第二個參數要是函式（不加括號！）");
    }
    return;
  }
  (_gameEventListeners[type] = _gameEventListeners[type] || []).push(fn);
}

// 取消訂閱：offGameEvent("move", 同一個函式)；不給 fn 則整類清空
function offGameEvent(type, fn) {
  var list = _gameEventListeners[type];
  if (!list) return;
  if (!fn) { _gameEventListeners[type] = []; return; }
  var i = list.indexOf(fn);
  if (i !== -1) list.splice(i, 1);
}

// ── 內部實作 ─────────────────────────────────────────────────

var _lsSnapshot = null;   // 上一次的狀態快照
var _lsEmitting = false;  // 監聽函式執行中（防止連鎖觸發）
var _lsSuppress = false;  // 重新開始中（數值歸位不觸發事件）

function _lsTakeSnapshot() {
  return {
    x: player.x, y: player.y,
    hp: currentPlayer.hp, maxHp: currentPlayer.maxHp,
    atk: currentPlayer.atk, def: currentPlayer.def,
    money: currentPlayer.money,
    bagCount: currentPlayer.inventory.length
  };
}

function _lsEmit(type, info) {
  var list = _gameEventListeners[type];
  if (!list) return;
  for (var i = 0; i < list.length; i++) {
    try {
      list[i](info);
    } catch (e) {
      if (typeof showMapMessage === "function") {
        showMapMessage("💥 監聽事件「" + type + "」發生錯誤：" + e.message);
      }
    }
  }
}

// 比對快照，發出對應事件
function _lsCheck() {
  if (_lsSuppress || _lsEmitting) return;
  if (_lsSnapshot === null) { _lsSnapshot = _lsTakeSnapshot(); return; }

  var old = _lsSnapshot;
  var cur = _lsTakeSnapshot();
  _lsSnapshot = cur;

  _lsEmitting = true;
  try {
    if (cur.x !== old.x || cur.y !== old.y) {
      _lsEmit("move", { fromX: old.x, fromY: old.y, x: cur.x, y: cur.y });
    }
    if (cur.hp !== old.hp) {
      var d = cur.hp - old.hp;
      _lsEmit(d < 0 ? "hpDown" : "hpUp", { oldHp: old.hp, hp: cur.hp, amount: Math.abs(d) });
      _lsEmit("hpChange", { oldHp: old.hp, hp: cur.hp, amount: d });
    }
    if (cur.maxHp !== old.maxHp) {
      _lsEmit("maxHpChange", { oldMaxHp: old.maxHp, maxHp: cur.maxHp, amount: cur.maxHp - old.maxHp });
    }
    if (cur.atk !== old.atk) {
      _lsEmit("atkChange", { oldAtk: old.atk, atk: cur.atk, amount: cur.atk - old.atk });
    }
    if (cur.def !== old.def) {
      _lsEmit("defChange", { oldDef: old.def, def: cur.def, amount: cur.def - old.def });
    }
    if (cur.money !== old.money) {
      _lsEmit("moneyChange", { oldMoney: old.money, money: cur.money, amount: cur.money - old.money });
    }
    if (cur.bagCount !== old.bagCount) {
      _lsEmit("bagChange", { oldCount: old.bagCount, count: cur.bagCount });
    }
  } finally {
    _lsEmitting = false;
    // 監聽函式裡若有改 game 的屬性，直接吸收進快照（不再連鎖觸發）
    _lsSnapshot = _lsTakeSnapshot();
  }
}

// 包裝引擎函式：位置 / 數值 / 背包有變動時，這三個函式一定會被呼叫
(function() {
  var _origRenderMap = renderMap;
  renderMap = function() {
    _origRenderMap.apply(this, arguments);
    _lsCheck();
  };

  var _origUpdateHUD = updateHUD;
  updateHUD = function() {
    _origUpdateHUD.apply(this, arguments);
    _lsCheck();
  };

  var _origRenderBag = renderBagSidebar;
  renderBagSidebar = function() {
    _origRenderBag.apply(this, arguments);
    _lsCheck();
  };

  // 重新開始：數值歸位不算「變化」，重置快照且不觸發事件
  var _origRestart = restartGame;
  restartGame = function() {
    _lsSuppress = true;
    try {
      _origRestart.apply(this, arguments);
    } finally {
      _lsSuppress = false;
      _lsSnapshot = _lsTakeSnapshot();
    }
  };
})();
