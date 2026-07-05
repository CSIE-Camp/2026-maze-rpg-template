// ============================================================
//  new_data.js  ── 遊戲資料設定檔（所有數值、常數、文本）
// ============================================================


// ── DEV_MODE：設為 false 隱藏「程式碼」「開發模式」「程式小抄」按鈕 ──
var DEV_MODE = true;


// ── 攝影機 / 顯示常數 ─────────────────────────────────────────
var CAM_ZOOM  = 1.5;   // >1 = 拉近；改這一個數字調縮放
var TILE_SIZE = 60;    // 每格原始像素（不改）
var VIEW_PX   = 540;   // viewport 像素（不改）


// ── 地塊代碼（預設值） ────────────────────────────────────────
//   0 = 空地、1 = 牆壁、2 = 出生點（地圖上放一格，玩家從這裡開始）
//   10 ~ 255 = 自訂事件地塊，定義寫在 tile.js（見開發模式「事件地塊」分頁）
var MAP_TILE = {
  EMPTY: 0,
  WALL:  1,
  START: 2
};


// ── 玩家初始數值 ──────────────────────────────────────────────
var playerStats = {
  name:   "勇者",
  hp:     1000,
  maxHp:  1000,
  atk:    10,
  def:    5,
  spd:    10,
  money:  10000
};


// ── 商店道具 ──────────────────────────────────────────────────
// 物品格式：{ name, price, effect: 函式, desc, isConsumable }
//   effect       → 一個「函式」，效果發動時被呼叫（用 game 改變遊戲）
//   isConsumable → false：購買後立即呼叫 effect
//                  true ：購買後放進背包（game.bag），之後使用時才呼叫 effect

function onShopAtkUp()  { game.atk += 3; }
function onShopDefUp()  { game.def += 3; }
function onShopMaxHpUp(){ game.maxHp += 20; game.hp += 20; }
function onShopHeal30() { game.hp += 30; }
function onShopHeal80() { game.hp += 80; }

var shopItems = [
  { name: "攻擊強化藥水", price: 25, effect: onShopAtkUp,   desc: "攻擊力永久 +3",    isConsumable: false },
  { name: "防禦強化藥水", price: 15, effect: onShopDefUp,   desc: "防禦力永久 +3",    isConsumable: false },
  { name: "生命強化藥水", price: 30, effect: onShopMaxHpUp, desc: "最大 HP 永久 +20", isConsumable: false },
  { name: "血量恢復藥水", price: 10, effect: onShopHeal30,  desc: "立即回復 30 HP",   isConsumable: false },
  { name: "大恢復藥水",   price: 25, effect: onShopHeal80,  desc: "立即回復 80 HP",   isConsumable: false },
];
