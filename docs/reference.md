# 迷宮 RPG 開發參考（Reference）

這份文件涵蓋三大部分：**game 物件 API**、**地圖與事件地塊**、**結局系統**。

檔案總覽：

| 檔案 | 內容 |
|------|------|
| `events.js` | 事件函式（踩到地塊時執行的程式） |
| `tile.js` | 事件地塊定義（編號 10~255 的自訂地塊） |
| `map.js` | 地圖格子資料（含出生點）與座標掛接表 |
| `endings.js` | 結局設定 |
| `new_data.js` | 玩家初始數值等遊戲設定 |

---

## game 物件 API

`game` 是遊戲引擎給你的**控制台**。改它的屬性，遊戲就跟著變。

### 讀寫角色狀態

| 屬性 | 說明 | 範例 |
|------|------|------|
| `game.hp` | 目前 HP（改變時畫面會震動） | `game.hp -= 10` |
| `game.maxHp` | 最大 HP 上限 | `game.maxHp += 20` |
| `game.atk` | 攻擊力 | `game.atk += 5` |
| `game.def` | 防禦力 | `game.def += 2` |
| `game.money` | 金幣數量 | `game.money -= 30` |

> **注意**：`game.hp` 設定後會自動 clamp 在 `[0, maxHp]`。
> HP 歸零**不會**自動結束遊戲——想做「死亡結局」請用結局系統（見下方）。

### 移動角色

```js
game.x = 5;   // 把角色傳送到第 5 欄
game.y = 3;   // 把角色傳送到第 3 列
```

> 改完 x/y 後地圖會自動重繪，**不會**再觸發那格的事件。

### 顯示訊息

```js
game.message = "你找到了隱藏道路！";   // 地圖上的浮動訊息
```

### 彈出自訂面板

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

### 操作地圖格子

```js
game.getTile(x, y)          // 讀取 (x, y) 的地塊代碼
game.setTile(x, y, 0)       // 把 (x, y) 改為空地（代碼 0）
game.setTile(x, y, 1)       // 把 (x, y) 改為牆壁（代碼 1）
game.setTile(x, y, 10)      // 把 (x, y) 改為編號 10 的自訂地塊
```

### 存放自訂狀態

`game` 上可以自由新增屬性，跨事件共用：

```js
game.hasRedKey = false;   // 初始化（放在某個最早觸發的事件裡）
game.hasRedKey = true;    // 在 A 格事件裡設定
if (game.hasRedKey) { }  // 在 B 格事件裡檢查
```

### 移除已觸發的事件（一次性）

```js
// 在事件函式最後呼叫：把這格變回空地（事件不會再觸發）
game.setTile(game.x, game.y, 0);

// 也可以用 removeEventAt（同時清掉座標掛接）
removeEventAt(game.x, game.y);
```

---

## 地圖與事件地塊

### 地塊代碼

| 代碼 | 意思 |
|------|------|
| `0` | 空地 |
| `1` | 牆壁（不能走） |
| `2` | 出生點（整張地圖放一格，玩家從這裡開始） |
| `10` ~ `255` | 自訂事件地塊（定義在 `tile.js`） |

地圖本體是 `map.js` 裡的二維陣列 `mapGrid`，每個數字就是一格。
在開發模式「🗺️ 地圖編輯」分頁用筆刷畫好後，按「複製」貼回 `map.js`。

> 如果地圖上放了**未定義**的編號，該格會被當成空白格；
> 開發模式（`DEV_MODE = true`）下會標成紅色並提示
> 「你指定了編號 x 的地塊，但找不到這個地塊。」

### 自訂事件地塊（tile.js）

每一種事件地塊定義成一筆資料：

```js
var tileDefs = {
  10: { name: "寶箱", color: "#c89010", icon: "assets/picture/寶箱.png", event: "onChest" },
  //  ↑ 編號 10~255，自己指定數值（避免和預設或別人的撞號）
};
```

| 欄位 | 說明 |
|------|------|
| `name` | 地塊名稱（顯示在地圖編輯筆刷） |
| `color` | 地塊底色 |
| `icon` | 圖示路徑（`assets/picture/...`，空字串 = 無圖示） |
| `event` | **事件函式名稱**（字串），玩家踩上去時呼叫；寫在 `events.js` |

在開發模式「🧱 事件地塊」分頁新增地塊 → 匯出貼回 `tile.js`。
定義好的地塊會出現在「🗺️ 地圖編輯」的筆刷清單，直接畫上地圖。

### 座標掛接表（進階）

想讓「某一格」有專屬事件（不定義新地塊種類），可以手動編輯 `map.js` 的 `tileEvents`：

```js
var tileEvents = {
  "5,3": "onSecret"   // 踩到 (5, 3) 時呼叫 onSecret（優先於地塊本身的事件）
};
```

---

## 結局系統（endings.js）

結局定義在 `endings.js` 的 `gameEndings` 陣列：

```js
var gameEndings = [
  {
    name: "金幣大亨",
    condition: "game.money >= 500",     // JS 表達式，true 時觸發
    html: "<h1>🏆 金幣大亨</h1><p>你賺飽了 500 金幣，提早退休！</p>"
  },
  {
    name: "力竭倒下",
    condition: "game.hp <= 0",
    html: "<h1>💀 力竭倒下</h1><p>你在迷宮中耗盡了體力……</p>"
  }
];
```

- **每次移動後**依序檢查 `condition`，第一個為 `true` 的結局會觸發（順序 = 優先度）。
- 觸發後顯示全螢幕結局畫面（內容為你的 `html`），並附「再來一次」按鈕。
- 在開發模式「🏁 結局編輯」分頁可以視覺化編輯，匯出後貼回 `endings.js`。
- 條件裡可以使用 `game` 的任何屬性，包含你自訂的狀態（例如 `game.hasRedKey`）。

---

## 背包（game.bag）

物品格式：

```js
{ name: "藥水", effect: onPotionHeal, desc: "可以回復生命的藥水" }
```

`effect` 是一個**函式**（填函式名稱，不加括號！），物品被使用時會被呼叫。
沒有效果的物品（純收集品）`effect` 填 `null`。

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

// 沒有效果的收集品
game.bag.push({ name: "紅色鑰匙", effect: null, desc: "不知道能開哪扇門" });
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

> 玩家也可以在畫面左側的背包欄點「使用」，一樣會呼叫 effect 函式並消耗一個。
>
> 開發模式（🛠）裡有「🧪 物品生成器」分頁，可以快速生成物品與效果函式。
