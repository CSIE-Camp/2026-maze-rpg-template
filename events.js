// ============================================================
//  events.js ── 事件函式（預帶程式）
//
//  這裡的函式對應 tile.js 中各種事件地塊的 event 欄位，
//  玩家踩到該種地塊時就會被呼叫。
//
//  在開發面板（🛠 開發模式）寫好程式碼後，
//  按「匯出 events.js」下的「複製」按鈕，把內容貼在此檔案，
//  關閉開發面板暫存或清除瀏覽器快取後，遊戲行為依然可以保留。
//
//  結局請貼到 endings.js、地圖請貼到 map.js、地塊定義請貼到 tile.js。
// ============================================================

// ── 嚮導（出生點旁的教學對話）────────────────────────────────
function onGuide() {
  showDialogue([
    { speaker: "嚮導", text: "歡迎來到迷宮！用 WASD 或方向鍵移動。" },
    { speaker: "嚮導", text: "踩到彩色的格子會觸發事件——附近就有一個寶箱，還有一隻小怪擋路。" },
    { speaker: "嚮導", text: "按 M 可以打開大地圖。祝你好運！" }
  ]);
  game.setTile(game.x, game.y, 0);   // 教學只觸發一次
}

// ── 寶箱 ─────────────────────────────────────────────────────
function onChest() {
  game.money += 30;
  game.message = "📦 你打開寶箱，獲得 30 金幣！";
  game.setTile(game.x, game.y, 0);   // 寶箱只能開一次
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

  window.battleRun = function() {
    game.message = "你逃跑了！";
    game.panel = "";
  };

  render();
}

// ── 傳送門 ───────────────────────────────────────────────────
function onPortal() {
  game.message = "⚡ 你踏入了傳送門！";
  game.x = 17;   // ← 改成目的地座標
  game.y = 13;
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
  if (game.money >= 30) {
    game.money -= 30;
    game.hp += 30;
    game.message = "🧪 買了補血藥水！";
  } else {
    game.message = "💸 金幣不足！";
  }
  onShop();   // 重新整理商店畫面
}

// ── 上鎖的門 ─────────────────────────────────────────────────
function onLock() {
  game.panel = '<div style="text-align:center">' +
    '<h2>🚪 上鎖的門</h2>' +
    '<p>這扇門被鎖住了。</p>' +
    '<button class="btn btn-attack" onclick="unlockDoor()">🔑 嘗試開門（需要 10 金幣）</button> ' +
    '<button class="btn btn-flee" onclick="game.panel=\'\';">離開</button>' +
    '</div>';
}

function unlockDoor() {
  if (game.money >= 10) {
    game.money -= 10;
    game.setTile(game.x, game.y, 0);
    game.panel = "";
    game.message = "🔓 你花了 10 金幣打開了門！";
  } else {
    game.message = "💸 金幣不足！";
    game.panel = "";
  }
}

// ── 小遊戲 ───────────────────────────────────────────────────
function onMiniGame() {
  var score = 0;
  var target = 3;

  function render() {
    var num = Math.floor(Math.random() * 10) + 1;
    game.panel =
      '<div style="text-align:center">' +
      '<h2>🎯 猜數字小遊戲</h2>' +
      '<p>進度：' + score + ' / ' + target + '</p>' +
      '<p>這個數字是奇數還是偶數？　答案：' + num + '</p>' +
      '<button class="btn btn-attack" onclick="mgGuess(' + num + ',true)">奇數</button> ' +
      '<button class="btn btn-defend" onclick="mgGuess(' + num + ',false)">偶數</button>' +
      '</div>';
  }

  window.mgGuess = function(num, isOdd) {
    var correct = (num % 2 === 1) === isOdd;
    if (correct) {
      score++;
      game.message = "✅ 答對了！";
      if (score >= target) {
        game.money += 30;
        game.setTile(game.x, game.y, 0);
        game.panel = '<div style="text-align:center"><h2>🎉 過關！</h2><p>獲得 30 金幣</p>' +
          '<button class="btn btn-attack" onclick="game.panel=\'\';">確定</button></div>';
        return;
      }
    } else {
      game.message = "❌ 答錯了！";
    }
    render();
  };

  render();
}

function onTest() {

}