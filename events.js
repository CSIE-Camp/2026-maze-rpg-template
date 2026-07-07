// ============================================================
//  events.js ── 事件函式
// ============================================================

// ── 地下城城主的初始獨白 ───────────────────────────────────
function onLordTalk() {
  game.dialogue = [
    { speaker: "地下城城主", text: "唉……最近的地下城業績越來越差了，勇者都不愛來。" },
    { speaker: "地下城城主", text: "身為城主，我現在真的很煩惱，不知道該怎麼佈置我的地下城……" },
    { speaker: "地下城城主", text: "讓我一邊走一邊思考看看好了。" }
  ];
  game.setTile(game.x, game.y, 0);
}

// ── 問題一：佈置有趣的機關？（穿牆傳送門） ────────────────────
function onPortal() {
  game.dialogue = [
    { speaker: "地下城城主", text: "唔，如果是我的話……應該要佈置一些有趣的空間機關？" },
    { speaker: "地下城城主", text: "例如……像這樣「咻──」地穿牆過去的傳送門？" }
  ];
  game.message = "⚡ 你被空間魔法瞬間傳送了！"; // 對話結束後才顯示
  game.x = 3;  // 穿過牆壁傳送到下方
  game.y = 5;
  game.setTile(3, 3, 0); // 移除原本觸發的傳送門
}

// ── 問題二：惡整來訪者？（尖刺陷阱） ────────────────────────
function onMyTrap() {
  game.hp -= 10;
  game.dialogue = [
    { speaker: "地下城城主", text: "哇哇哇！好險！差點被突然揮過來的尖刺打到！" },
    { speaker: "地下城城主", text: "（摸摸頭）嘖，好像還是有被擦到邊，痛痛痛……（HP 損失 10）" },
    { speaker: "地下城城主", text: "直接這樣惡整來訪者，真的會好玩嗎？勇者會不會氣到檢舉我？" }
  ];
  game.setTile(game.x, game.y, 0);
}

// ── 問題三：設計對話 NPC？（正在上廁所的哥布林） ─────────────
function onToiletGoblin() {
  game.dialogue = [
    { speaker: "地下城城主", text: "或者……在角落放一些有生活感的對話 NPC？" },
    { speaker: "哥布林", text: "幹嘛？不要偷看！沒看過哥布林上廁所喔！出去啦！" },
    { speaker: "地下城城主", text: "呃，對不起……（順手撿起了地上的東西？）" }
  ];
  game.message = "👜 獲得物品：【哥布林的羞恥】x1"; // 對話結束後才顯示
  game.bag.push({
    name: "哥布林的羞恥",
    effect: null,
    desc: "（為什麼羞恥心會是一個具象的物品啊...算了）"
  });
  game.setTile(game.x, game.y, 0);
}

// ── 問題四：放很多怪物？（弱化皮史萊姆戰鬥） ──────────────────
function onSlimeBattle() {
  var enemy = { name: "套皮史萊姆（很弱）", hp: 10, atk: 1 };

  function render() {
    game.panel =
      '<div style="text-align:center">' +
        '<h2>⚔️ ' + enemy.name + '</h2>' +
        '<p>城主正在思考要不要放很多這種生物……</p>' +
        '<p>史萊姆 HP：' + enemy.hp + '</p>' +
        '<p>你的 HP：' + game.hp + ' / ' + game.maxHp + '</p><hr>' +
        '<button class="btn" onclick="battleAtk()">⚔️ 一拳揍扁</button> ' +
      '</div>';
  }

  window.battleAtk = function() {
    enemy.hp -= 5; // 兩拳就能搞定
    if (enemy.hp <= 0) {
      game.setTile(game.x, game.y, 0);
      game.panel =
        '<div style="text-align:center"><h2>🎉 輕鬆獲勝！</h2>' +
        '<p>地下城城主：『這種怪是不是太沒挑戰性了啊？』</p>' +
        '<button class="btn" onclick="game.panel=\'\';">繼續前進</button></div>';
      return;
    }
    game.hp -= enemy.atk;
    render();
  };

  render();
}

// ── 走到走廊盡頭，準備進入結局 ──────────────────────────────
function onReachEnd() {
  game.isFinished = true; // 建立觸發結局的條件
}