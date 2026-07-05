// =========================================================
// tile.js  ── 事件地塊定義檔
//
// 每一種事件地塊：編號: { name, color, icon, event }
//   編號  → 10 ~ 255 之間的整數（由你自己指定，避免互相撞號）
//   name  → 地塊名稱（顯示在地圖編輯筆刷）
//   color → 地塊底色
//   icon  → 圖示（assets/picture/ 路徑，空字串 = 無圖示）
//   event → 事件函式名稱（寫在 events.js），玩家踩上去時呼叫
//
// 在開發模式「🧱 事件地塊」分頁新增地塊後，
// 按「複製」把匯出的程式碼貼到此檔案（整段取代 var tileDefs）。
// 定義好的地塊會出現在「🗺️ 地圖編輯」的筆刷清單，直接畫到地圖上。
// =========================================================

var tileDefs = {
  10: { name: "寶箱",     color: "#c89010", icon: "assets/picture/寶箱.png",     event: "onChest" },
  11: { name: "小怪",     color: "#b83030", icon: "assets/picture/哥布林.png",   event: "onBattle" },
  12: { name: "傳送門",   color: "#c05010", icon: "assets/picture/傳送門.png",   event: "onPortal" },
  13: { name: "商店",     color: "#287840", icon: "assets/picture/商店.png",     event: "onShop" },
  14: { name: "上鎖的門", color: "#604898", icon: "assets/picture/門鎖.png",     event: "onLock" },
  15: { name: "小遊戲",   color: "#1878b0", icon: "assets/picture/小遊戲靶.png", event: "onMiniGame" },
  16: { name: "嚮導",     color: "#2e8ca8", icon: "assets/picture/法師.png",     event: "onGuide" },
  101: { name: "啥子",     color: "#2e8ca8", icon: "assets/picture/法師.png",     event: "onGuide" }
};
