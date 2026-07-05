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
      case "bag":     return currentPlayer.inventory;
      case "setTile": return _gameSetTile;
      case "getTile": return _gameGetTile;
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
