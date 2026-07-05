// ============================================================
//  events.js ── 踩地塊事件與自訂函式
//
//  當你在開發面板（🛠 開發模式）中設計完地圖事件與程式碼後，
//  可以按「匯出 events.js」下的「複製」按鈕，並將內容貼在此檔案。
//  「🏁 結局編輯」分頁匯出的結局程式碼，也一樣貼在此檔案
//  （取代下面的 var gameEndings）。
//
//  如此一來，關閉開發面板暫存或清除瀏覽器快取後，遊戲行為依然可以保留。
// ============================================================

// 掛接表："x,y" → 函式名稱
var tileEvents = {};

// 結局表：在開發面板「🏁 結局編輯」設計，匯出後貼到這裡（整段取代）
var gameEndings = [];

// 開場對話：進入遊戲時自動播放，點擊畫面前進。在陣列裡加 { speaker: "名字", text: "台詞" } 就會播，
// 開場對話留空 [] 則直接進入地圖（可用開發面板「💬 對話生成器」產生這段程式碼）
var introDialogue = [];

// ── 範例：對話事件（用 game.talk 在任何事件裡觸發對話） ──────
function onTalkOldMan() {
  game.talk([
    { speaker: "神秘老人", text: "年輕人，前面很危險啊……" },
    { speaker: "勇者",     text: "我不怕！" }
  ]);
}

// 對話結束後還可以接著做事（第二個參數，可省略）
function onTalkTrap() {
  game.talk([
    { speaker: "旁白", text: "地面突然震動！" }
  ], function() {
    game.hp -= 10;
    game.message = "💥 你受到了 10 點傷害！";
  });
}

// ── 範例：陷阱 ──────────────────────────────────────────────
function onTrap() {
  game.hp -= 10;
  game.message = "你踩到陷阱了！";
}

// ── 範例：小怪戰鬥（事件式，用 game.panel 做戰鬥 UI） ──────
function onBattleSmall() {
  var enemy = { name: "哥布林", hp: 30, atk: 5 };

  function render() {
    game.panel =
      '<div style="text-align:center">' +
        '<h2>⚔️ ' + enemy.name + '</h2>' +
        '<p>敵人 HP：' + enemy.hp + '</p>' +
        '<p>你的 HP：' + game.hp + ' / ' + game.maxHp + '</p>' +
        '<hr>' +
        '<button class="btn btn-attack" onclick="battleAttack()">⚔️ 攻擊</button> ' +
        '<button class="btn btn-flee" onclick="battleFlee()">💨 逃跑</button>' +
      '</div>';
  }

  window.battleAttack = function() {
    var dmg = Math.max(1, game.atk - 2);
    enemy.hp -= dmg;
    if (enemy.hp <= 0) {
      game.money += 15;
      game.setTile(game.x, game.y, 0);
      game.panel =
        '<div style="text-align:center">' +
          '<h2>🎉 勝利！</h2>' +
          '<p>獲得 15 金幣</p>' +
          '<button class="btn btn-attack" onclick="game.panel=\'\'">確定</button>' +
        '</div>';
      return;
    }
    game.hp -= enemy.atk;
    render();
  };

  window.battleFlee = function() {
    game.message = "你逃跑了！";
    game.panel = "";
  };

  render();
}

// ── 範例：最終 Boss 戰鬥 ────────────────────────────────────
function onBattleBoss() {
  var boss = { name: "黑暗魔王", hp: 100, maxHp: 100, atk: 12, phase: 1 };

  function render() {
    var phaseText = boss.phase === 2 ? ' <span style="color:#f44">（暴走）</span>' : '';
    game.panel =
      '<div style="text-align:center">' +
        '<h2>👿 ' + boss.name + phaseText + '</h2>' +
        '<p>Boss HP：' + boss.hp + ' / ' + boss.maxHp + '</p>' +
        '<p>你的 HP：' + game.hp + ' / ' + game.maxHp + '</p>' +
        '<hr>' +
        '<button class="btn btn-attack" onclick="bossAttack()">⚔️ 攻擊</button> ' +
        '<button class="btn btn-defend" onclick="bossDefend()">🛡️ 防禦</button>' +
      '</div>';
  }

  window.bossAttack = function() {
    var dmg = Math.max(1, game.atk - 3);
    boss.hp -= dmg;
    if (boss.hp <= 0) {
      game.setTile(game.x, game.y, 0);
      game.panel =
        '<div style="text-align:center">' +
          '<h2>🏆 打倒了 ' + boss.name + '！</h2>' +
          '<p>恭喜通關！</p>' +
          '<button class="btn btn-attack" onclick="game.panel=\'\'">確定</button>' +
        '</div>';
      return;
    }
    if (boss.phase === 1 && boss.hp < boss.maxHp * 0.5) {
      boss.phase = 2;
      boss.atk += 5;
      game.message = boss.name + " 進入暴走狀態！ATK 上升！";
    }
    game.hp -= boss.atk;
    render();
  };

  window.bossDefend = function() {
    var reduced = Math.max(1, boss.atk - game.def);
    game.hp -= reduced;
    render();
  };

  render();
}
