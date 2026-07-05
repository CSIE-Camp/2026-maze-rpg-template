// ============================================================
//  game_api.js ── 學員 API：遊戲控制台 `game`
//
//  `game` 是遊戲引擎給你的控制台：改它的屬性，遊戲就會跟著變。
//
//  範例：
//    game.hp -= 10;                 // 扣血（畫面會震動、血條會更新）
//    game.money += 50;              // 加錢
//    game.message = "你踩到陷阱了！"; // 在地圖上顯示訊息
//    game.x = 5; game.y = 3;        // 把玩家傳送到 (5, 3)
//    game.panel = "<h2>謎語</h2>…";  // 彈出自訂面板（放你自己的 HTML）
//    game.panel = "";               // 關閉自訂面板
//    game.setTile(4, 7, 0);         // 把 (4,7) 的牆變成空地（機關開門）
//
//  對話（game.talk）：播放 RPG 對話畫面，點擊前進，播完自動回到地圖
//    game.talk([
//      { speaker: "神秘老人", text: "年輕人，前面很危險啊……" },
//      { speaker: "勇者",     text: "我不怕！" }
//    ]);
//    // 第二個參數（可省略）：對話結束後要做的事
//    game.talk([{ speaker: "旁白", text: "地面突然震動！" }], function() {
//      game.hp -= 10;
//    });
//
//  背包（game.bag）：
//    物品格式：{ name: "藥水", effect: onPotionHeal, desc: "可以回復生命的藥水" }
//      name   → 物品名稱（同名會堆疊顯示）
//      effect → 使用物品時被呼叫的「函式」，在裡面用 game 改變遊戲
//      desc   → 物品說明（顯示在背包裡）
//
//    game.bag 就是一個「真的 JS 陣列」，沒有任何特殊方法——
//    所有操作都用你學過的原生陣列語法（修改後畫面會自動更新）：
//
//    function onPotionHeal() { game.hp += 30; }
//    game.bag.push({ name: "藥水", effect: onPotionHeal, desc: "..." }); // 加入
//    game.bag.length;                                        // 物品總數
//    game.bag[0].name;                                       // 第一個物品的名稱
//    game.bag.some(function(it) { return it.name === "藥水"; });          // 有沒有
//    game.bag.filter(function(it) { return it.name === "藥水"; }).length; // 有幾個
//    // 使用一個藥水（找到 → 移除 → 呼叫 effect）：
//    var i = game.bag.findIndex(function(it) { return it.name === "藥水"; });
//    if (i !== -1) { var it = game.bag[i]; game.bag.splice(i, 1); it.effect(); }
//    game.bag = [];                                          // 清空背包
// ============================================================

function _gameSetTile(x, y, code) {
  if (y < 0 || y >= currentMap.length)    return;
  if (x < 0 || x >= currentMap[y].length) return;
  currentMap[y][x] = code;
  renderMap();
}

function _gameGetTile(x, y) {
  if (y < 0 || y >= currentMap.length)    return undefined;
  if (x < 0 || x >= currentMap[y].length) return undefined;
  return currentMap[y][x];
}

// ── 對話 API ─────────────────────────────────────────────────
// game.talk(對話陣列, 結束後callback)
//   對話陣列每一句：{ speaker: "名字", text: "台詞" }（也可以直接放字串 = 旁白）
//   播放中點擊畫面前進，播完回到地圖，再執行 callback（可省略）
function _gameTalk(lines, callback) {
  if (!Array.isArray(lines)) {
    if (typeof showMapMessage === "function") {
      showMapMessage('💥 game.talk：請傳入對話陣列，例如 [{ speaker: "勇者", text: "..." }]');
    }
    return;
  }
  var norm = [];
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (typeof ln === "string") {
      norm.push({ speaker: "旁白", text: ln });
    } else if (ln && typeof ln === "object") {
      norm.push({ speaker: ln.speaker || "", text: ln.text || "" });
    }
  }
  if (norm.length === 0) return;
  showDialogue(norm, function() {
    showScreen("screen-map");
    if (typeof callback === "function") {
      try {
        callback();
      } catch (e) {
        if (typeof showMapMessage === "function") showMapMessage("💥 對話結束 callback 錯誤：" + e.message);
      }
    }
  });
}

function _gameSetPanel(html) {
  var panel   = document.getElementById("event-panel");
  var content = document.getElementById("event-panel-content");
  if (!panel || !content) return;
  if (html) {
    content.innerHTML = html;
    panel.style.display = "flex";
  } else {
    content.innerHTML = "";
    panel.style.display = "none";
  }
}

// ── 背包 API ─────────────────────────────────────────────────
// game.bag 就是一個「真的陣列」，沒有自訂方法，所有操作都用原生陣列語法：
//   game.bag.length                  // 有幾個物品
//   game.bag[0]                      // 第一個物品
//   game.bag.push(item)              // 加入物品
//   for (var i = 0; i < game.bag.length; i++) { ... }
//   game.bag.some(...)、filter(...)、findIndex(...)、splice(...) 等
//   game.bag = [];                   // 清空背包
// 任何修改（push / splice / 指定元素…）都會自動更新背包畫面。

function _bagRefreshUI() {
  if (typeof renderBagSidebar === "function") renderBagSidebar();
  if (typeof renderShopSidebar === "function") renderShopSidebar();
  if (typeof _renderDevItemsBagList === "function") _renderDevItemsBagList();
}

// （引擎內部）背包側欄「使用」按鈕呼叫這個函式。
// 做的事和學員自己寫的原生版本一模一樣：
//   var i = game.bag.findIndex(function(it) { return it.name === name; });
//   if (i !== -1) { var it = game.bag[i]; game.bag.splice(i, 1); it.effect(); }
function _bagUseItemByName(name) {
  var inv = currentPlayer.inventory;
  for (var i = 0; i < inv.length; i++) {
    if (inv[i].name === name) {
      var item = inv[i];
      inv.splice(i, 1);
      if (typeof showMapMessage === "function") showMapMessage("🧪 使用了「" + item.name + "」！");
      try {
        if (typeof item.effect === "function") {
          item.effect();
        } else if (typeof showMapMessage === "function") {
          showMapMessage("💥 「" + item.name + "」的 effect 不是函式，什麼事都沒發生。");
        }
      } catch (e) {
        if (typeof showMapMessage === "function") showMapMessage("💥 物品效果發生錯誤：" + e.message);
      }
      _bagRefreshUI();
      return true;
    }
  }
  return false;
}

// game.bag = 包住 inventory 陣列的 Proxy：
//   讀取 → 全部交給原生陣列（push、length、[i]、迭代…）
//   寫入 → 直接寫進陣列，並自動更新背包畫面
var _bagProxyTarget = null;
var _bagProxyCache  = null;

function _gameGetBag() {
  var inv = currentPlayer.inventory;
  if (_bagProxyTarget !== inv) {   // inventory 換新陣列（例如重新開始）時重建
    _bagProxyTarget = inv;
    _bagProxyCache = new Proxy(inv, {
      set: function(target, key, value) {
        target[key] = value;
        _bagRefreshUI();     // push / splice / game.bag[0] = ... 都會自動更新畫面
        return true;
      },
      deleteProperty: function(target, key) {
        delete target[key];
        _bagRefreshUI();
        return true;
      }
    });
  }
  return _bagProxyCache;
}

var _gameProxyTarget = { message: "", panel: "" };

// 重來時清除學員自訂屬性（message/panel 以外的所有 key）
function _resetGameCustomProps() {
  var builtins = { message: true, panel: true, bag: true };
  for (var k in _gameProxyTarget) {
    if (!builtins[k]) delete _gameProxyTarget[k];
  }
  game.panel = "";
  game.message = "";
}

var game = new Proxy(_gameProxyTarget, {
  get: function(target, key) {
    switch (key) {
      case "hp":      return currentPlayer.hp;
      case "maxHp":   return currentPlayer.maxHp;
      case "atk":     return currentPlayer.atk;
      case "def":     return currentPlayer.def;
      case "money":   return currentPlayer.money;
      case "x":       return player.x;
      case "y":       return player.y;
      case "bag":     return _gameGetBag();
      case "setTile": return _gameSetTile;
      case "getTile": return _gameGetTile;
      case "talk":    return _gameTalk;
    }
    return target[key];
  },
  set: function(target, key, value) {
    switch (key) {
      case "hp":
        var old = currentPlayer.hp;
        currentPlayer.hp = Math.max(0, Math.min(value, currentPlayer.maxHp));
        if (currentPlayer.hp < old) shakePlayer();
        updateHUD();
        if (currentPlayer.hp <= 0) triggerGameOver();
        break;
      case "maxHp":
        currentPlayer.maxHp = Math.max(1, value);
        if (currentPlayer.hp > currentPlayer.maxHp) currentPlayer.hp = currentPlayer.maxHp;
        updateHUD();
        break;
      case "atk":   currentPlayer.atk   = value; updateHUD(); break;
      case "def":   currentPlayer.def   = value; updateHUD(); break;
      case "money": currentPlayer.money = Math.max(0, value); updateHUD(); break;
      case "bag":
        // 支援 game.bag = [] 這種原生寫法（整個換掉背包）
        if (Array.isArray(value)) {
          currentPlayer.inventory = value;
          _bagRefreshUI();
        } else if (typeof showMapMessage === "function") {
          showMapMessage("💥 game.bag 只能指定為陣列，例如 game.bag = []");
        }
        break;
      case "x":
        if (value >= 0 && value < currentMap[0].length) { player.x = value; renderMap(); }
        break;
      case "y":
        if (value >= 0 && value < currentMap.length) { player.y = value; renderMap(); }
        break;
      case "message":
        target.message = value;
        if (value) showMapMessage(value);
        break;
      case "panel":
        target.panel = value;
        _gameSetPanel(value);
        break;
      default:
        target[key] = value;  // 學員可自由存放自己的狀態，例如 game.hasKey = true
    }
    return true;
  }
});
