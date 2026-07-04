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
// 在事件函式最後呼叫，讓這格只能觸發一次
delete tileEvents[game.x + "," + game.y];
```
