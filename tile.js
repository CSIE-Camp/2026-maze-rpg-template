// =========================================================
// tile.js  ── 事件地塊定義檔
// =========================================================

var tileDefs = {
  10: { name: "寶箱",     color: "#c89010", icon: "assets/picture/寶箱.png",     event: "onChest" },
  11: { name: "小怪",     color: "#b83030", icon: "assets/picture/哥布林.png",   event: "onBattle" },
  12: { name: "傳送門",   color: "#c05010", icon: "assets/picture/傳送門.png",   event: "onPortal" },
  13: { name: "商店",     color: "#287840", icon: "assets/picture/商店.png",     event: "onShop" },
  14: { name: "上鎖的門", color: "#604898", icon: "assets/picture/門鎖.png",     event: "onLock" },
  15: { name: "小遊戲",   color: "#1878b0", icon: "assets/picture/小遊戲靶.png", event: "onMiniGame" },
  16: { name: "嚮導",     color: "#2e8ca8", icon: "assets/picture/法師.png",     event: "onGuide" },
  20: { name: "裂隙",     color: "#4a2b6b", icon: "",                            event: "onRoguelike" }, // ★ 集成戰略入口
  101: { name: "啥子",    color: "#2e8ca8", icon: "assets/picture/弓箭手.png",     event: "onGuide" }
};