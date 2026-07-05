# 事件食譜

每個食譜都可以直接貼進**開發模式面板**的程式碼編輯器。
套用後，到「🧱 事件地塊」分頁新增一個地塊（編號 10~255）綁定這個函式，
再到「🗺️ 地圖編輯」分頁用筆刷畫在你想觸發的格子上。

---

## 1. 陷阱

踩到就扣血，顯示訊息。

```js
function onTrap() {
  game.hp -= 15;
  game.message = "💥 你踩到陷阱了！損失 15 HP。";
}
```

---

## 2. 回復泉

踩到補滿 HP。

```js
function onFountain() {
  game.hp = game.maxHp;
  game.message = "💧 神聖的泉水讓你恢復了所有 HP！";
}
```

---

## 3. NPC 對話

踩到出現對話視窗，按按鈕才能關閉。

```js
function onNpc() {
  game.panel = `
    <h2>🧙 神秘老人</h2>
    <p>「這個迷宮很危險……小心前進。」</p>
    <button onclick="game.panel = ''">我知道了</button>
  `;
}
```

---

## 4. 猜謎門（innerHTML + onclick）

踩到出現謎題，答對才放行，答錯扣血。

> 這個食譜同時用到了 `querySelector`、`innerHTML`、`onclick` — 跟課堂教的三樣東西一模一樣！

```js
function onRiddle() {
  game.panel = `
    <h2>🚪 謎語之門</h2>
    <p>「什麼動物早上四條腿、中午兩條腿、晚上三條腿？」</p>
    <button onclick="answerRiddle('人')">人</button>
    <button onclick="answerRiddle('狗')">狗</button>
    <button onclick="answerRiddle('螃蟹')">螃蟹</button>
  `;
}

function answerRiddle(ans) {
  if (ans === '人') {
    game.panel = "";
    game.message = "✅ 正確！門打開了。";
  } else {
    game.hp -= 10;
    document.querySelector("#event-panel-content").innerHTML = `
      <h2>🚪 謎語之門</h2>
      <p style="color:#f08080">❌ 不對！損失 10 HP。再想想……</p>
      <button onclick="answerRiddle('人')">人</button>
      <button onclick="answerRiddle('狗')">狗</button>
      <button onclick="answerRiddle('螃蟹')">螃蟹</button>
    `;
  }
}
```

---

## 5. 機關開牆

踩到某格，讓遠處的牆壁消失（開通道）。
配合地圖編輯器先放好牆壁的位置。

```js
function onSwitch() {
  game.setTile(10, 5, 0);   // 把 (10, 5) 的牆變成空地
  game.message = "🔓 機關啟動了！遠處傳來轟隆聲……";
}
```

---

## 6. 一次性事件

觸發一次後就消失，不會再次觸發。

```js
function onSecret() {
  game.money += 50;
  game.message = "✨ 你發現了隱藏金幣！+50 金幣。";

  // 移除自己：事件地塊變回空地，之後踩到什麼都不發生
  removeEventAt(game.x, game.y);
}
```

---

## 7. 傳送門

踩到直接傳送到另一格。

```js
function onPortal() {
  game.message = "⚡ 你踏入了傳送門！";
  game.x = 15;   // 目標欄
  game.y = 2;    // 目標列
}
```

---

## 8. 收費站

沒錢就過不去（把角色擋回來）。

```js
function onToll() {
  if (game.money >= 30) {
    game.money -= 30;
    game.message = "💰 付了 30 金幣，衛兵讓你通過。";
  } else {
    game.message = "🚫 衛兵：「沒錢就別想過！」";
    // 把角色擋回前一格
    game.x = game.x - 1;
  }
}
```

> **提示**：方向要看收費站的位置調整（往左進來就 `game.x + 1` 推回去）。

---

## 9. 跨事件狀態（收集旗標）

踩 A 格拿到「紅色鑰匙」旗標，踩 B 格才能檢查並過關。

```js
// === 紅色鑰匙 ===

function onRedKeyPickup() {
  game.hasRedKey = true;
  game.message = "🔑 你撿到了紅色鑰匙！";
  removeEventAt(game.x, game.y);   // 一次性：撿完就消失
}

function onRedKeyDoor() {
  if (game.hasRedKey) {
    game.message = "🚪 紅色大門打開了！";
    removeEventAt(game.x, game.y);             // 門消失
  } else {
    game.message = "🔒 這扇門需要紅色鑰匙才能打開。";
    game.x = game.x - 1;                       // 擋回去
  }
}
```

> 把這兩個函式一起貼進編輯器，定義成兩種不同的地塊、分別畫到兩個格子就完成了。

---

## 小提醒

- 一次貼多個函式完全沒問題，統一按一次「套用」即可。
- 出現 `💥 事件發生錯誤` 訊息？那就是你的 bug！對照 [reference.md](./reference.md) 檢查一下。
