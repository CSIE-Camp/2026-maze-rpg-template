// ============================================================
//  new_data.js  ── 遊戲資料設定檔（所有數值、常數、文本）
// ============================================================


// ── 攝影機 / 顯示常數 ─────────────────────────────────────────
var CAM_ZOOM  = 1.5;   // >1 = 拉近；改這一個數字調縮放
var TILE_SIZE = 60;    // 每格原始像素（不改）
var VIEW_PX   = 540;   // viewport 像素（不改）


// ── 等級系統 ──────────────────────────────────────────────────
var MAX_LEVEL    = 5;                       // 等級上限（調小可快速測試）
var LEVEL_QUOTAS = [30, 60, 110, 180];      // 每級升級所需 EXP（索引 0 = Lv1→2）
var LEVELUP_BONUS = { hp: 15, def: 1, spd: 2 }; // 每次升級加成

// ── 升級特效設定（光圈動畫）────────────────────────────────────
var LEVELUP_RING_COUNT    = 5;    // 光圈數量
var LEVELUP_RING_DURATION = 900;  // 單圈動畫時長（ms）
var LEVELUP_RING_STAGGER  = 110;  // 每圈啟動間隔（ms）
var LEVELUP_RING_SIZE_MIN = 34;   // 最小光圈直徑（px）
var LEVELUP_RING_SIZE_STEP = 20;  // 每圈直徑增量（px）
var LEVELUP_RING_RISE     = 65;   // 光圈上浮距離（px）

// ── 玩家初始數值 ──────────────────────────────────────────────
var playerStats = {
  name:   "勇者",
  hp:     1000,
  maxHp:  1000,
  atk:    10,
  def:    5,
  spd:    10,
  money:  10000,
  keys:   0,
  skills: ["power_strike"],
  level: 1, exp: 0
};


// ── 寶箱獎勵 ──────────────────────────────────────────────────
var chestRewards = [
  { money: 25,  message: "你找到了 25 枚金幣！" },
  { atk:   3,   message: "你找到了力量秘藥，攻擊力永久提升 3！" },
  { def:   2,   message: "你找到了盾牌碎片，防禦力永久提升 2！" },
  { money: 35,  message: "大寶箱！你找到了 35 枚金幣！" }
];


// ── 商店道具 ──────────────────────────────────────────────────
var shopItems = [
  { name: "攻擊強化藥水", price: 25, effect: { atk:   3 }, desc: "攻擊力永久 +3",       isConsumable: false },
  { name: "防禦強化藥水", price: 15, effect: { def:   3 }, desc: "防禦力永久 +3",       isConsumable: false },
  { name: "生命強化藥水", price: 30, effect: { maxHp: 20}, desc: "最大 HP 永久 +20",    isConsumable: false },
  { name: "血量恢復藥水", price: 10, effect: { hp:   30 }, desc: "立即回復 30 HP",      isConsumable: false },
  { name: "大恢復藥水",   price: 25, effect: { hp:   80 }, desc: "立即回復 80 HP",      isConsumable: false },
];




// ── 對話文本 ────────────────────────
var dialogues = {
  intro: [
    { speaker: "旁白",   text: "黑暗魔王的詛咒籠罩了整片大地……" },
    { speaker: "勇者",   text: "我一定要找到他，終結這一切！" }
  ],
  shop_first: [
    { speaker: "商人",   text: "歡迎光臨！看看有什麼需要的吧。" }
  ],
};
