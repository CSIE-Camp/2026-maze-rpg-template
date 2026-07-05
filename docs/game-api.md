# game 物件 API 小抄

`game` 是遊戲引擎給你的**控制台**。改它的屬性，遊戲就跟著變。

---

## 讀寫角色狀態

| 屬性 | 說明 | 範例 |
|------|------|------|
| `game.hp` | 目前 HP（改變時畫面會震動） | `game.hp -= 10` |
| `game.maxHp` | 最大 HP 上限 | `game.maxHp += 20` |
| `game.atk` | 攻擊力 | `game.atk += 5` |
| `game.def` | 防禦力 | `game.def += 2` |
| `game.money` | 金幣數量 | `game.money -= 30` |
| `game.keys` | 鑰匙數量 | `game.keys += 1` |

> **注意**：`game.hp` 設定後會自動 clamp 在 `[0, maxHp]`。降到 0 會直接觸發 Game Over。

---

## 移動角色

```js
game.x = 5;   // 把角色傳送到第 5 欄
game.y = 3;   // 把角色傳送到第 3 列
```

> 改完 x/y 後地圖會自動重繪，**不會**再觸發那格的事件。

---

## 顯示訊息

```js
game.message = "你找到了隱藏道路！";   // 地圖上的浮動訊息
```

---

## 彈出自訂面板

```js
// 顯示（放任何 HTML）
game.panel = `
  <h2>你遇到了神秘商人</h2>
  <p>要以 50 金幣換取力量嗎？</p>
  <button onclick="buyStrength()">買！</button>
  <button onclick="game.panel = ''">算了</button>
`;

// 關閉
game.panel = "";
```

> 面板裡可以放 `<button onclick="你的函式()">` — 跟課堂教的一樣！

---

## 操作地圖格子

```js
game.getTile(x, y)          // 讀取 (x, y) 的地塊代碼
game.setTile(x, y, 0)       // 把 (x, y) 改為空地（代碼 0）
game.setTile(x, y, 1)       // 把 (x, y) 改為牆壁（代碼 1）
```

**常用地塊代碼**

| 代碼 | 意思 |
|------|------|
| `0` | 空地 |
| `1` | 牆壁 |
| `2` | 寶箱 |
| `3` | 敵人 |
| `4` | 門（需鑰匙） |

---

## 背包（game.bag）

物品格式：

```js
{ name: "藥水", effect: onPotionHeal, desc: "可以回復生命的藥水" }
```

`effect` 是一個**函式**（填函式名稱，不加括號！），物品被使用時會被呼叫。

`game.bag` 就是一個**真的 JS 陣列**——沒有任何特殊方法，
所有操作都用你學過的原生陣列語法，修改後背包畫面會自動更新：

```js
// 1. 先寫效果函式
function onPotionHeal() {
  game.hp += 30;
  game.message = "🧪 回復 30 HP！";
}

// 2. 把物品放進背包（例如在寶箱事件裡）：push
game.bag.push({ name: "藥水", effect: onPotionHeal, desc: "可以回復生命的藥水" });
```

| 想做的事 | 原生陣列寫法 |
|------|------|
| 加入一個物品 | `game.bag.push({ name, effect, desc })` |
| 物品總數 | `game.bag.length` |
| 第一個物品的名稱 | `game.bag[0].name` |
| 有沒有鑰匙 → `true`/`false` | `game.bag.some(function(it) { return it.name === "鑰匙"; })` |
| 有幾瓶藥水 → 數字 | `game.bag.filter(function(it) { return it.name === "藥水"; }).length` |
| 找藥水的位置（沒有 → `-1`） | `game.bag.findIndex(function(it) { return it.name === "藥水"; })` |
| 移除第 `i` 個物品 | `game.bag.splice(i, 1)` |
| 清空背包 | `game.bag = []` |

「使用」一個物品 = 找到 → 移除 → 呼叫 `effect()`，三步都是原生語法：

```js
// 使用一瓶藥水
var i = game.bag.findIndex(function(it) { return it.name === "藥水"; });
if (i !== -1) {
  var item = game.bag[i];
  game.bag.splice(i, 1);   // 從背包移除
  item.effect();           // 發動效果
}

// 丟掉一瓶藥水（不發動效果）：一樣 findIndex + splice，不呼叫 effect

for (var j = 0; j < game.bag.length; j++) {   // 走訪背包
  console.log(game.bag[j].name);
}
```

> 玩家也可以自己用物品：地圖背包（按 <kbd>B</kbd>）點「使用」，或在戰鬥中按道具按鈕。
> 兩種方式都會呼叫 effect 函式並消耗一個。
>
> 開發模式（🛠）裡有「🧪 物品生成器」分頁，可以快速生成物品與效果函式。

---

## 對話（game.talk）

播放 RPG 風格的對話畫面：點擊畫面前進，播完自動回到地圖。
可以在任何事件函式（events.js）裡觸發：

```js
function onTalkOldMan() {
  game.talk([
    { speaker: "神秘老人", text: "年輕人，前面很危險啊……" },
    { speaker: "勇者",     text: "我不怕！" }
  ]);
}
```

每一句是 `{ speaker: "名字", text: "台詞" }`；直接放字串則視為旁白。

第二個參數（可省略）是對話結束後要執行的函式：

```js
game.talk([
  { speaker: "旁白", text: "地面突然震動！" }
], function() {
  game.hp -= 10;
  game.message = "💥 你受到了 10 點傷害！";
});
```

**開場對話**：進入遊戲時自動播放的對話定義在 `events.js` 的
`var introDialogue = [...]`，格式相同，改成 `[]` 就不播。

> 開發模式（🛠）裡有「💬 對話生成器」分頁，可以編輯對話、直接播放測試，
> 並匯出事件函式或開場對話程式碼。

---

## 存放自訂狀態

`game` 上可以自由新增屬性，跨事件共用：

```js
game.hasRedKey = false;   // 初始化（放在某個最早觸發的事件裡）
game.hasRedKey = true;    // 在 A 格事件裡設定
if (game.hasRedKey) { }  // 在 B 格事件裡檢查
```

---

## 移除已觸發的事件（一次性）

```js
// 在事件函式最後呼叫：移除這格的事件，事件地塊變回空地
removeEventAt(game.x, game.y);
```
