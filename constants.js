/* --- 0. 資料庫: 20 張卡片定義 (Updated for Exact Pair Rules) --- */
const CARD_DB = {
    ATK: [
        { id: 'a1', name: '全力揮擊', icon: '💪', desc: '一安→二安，二安→全壘打' },
        { id: 'a2', name: '選球眼', icon: '👁️', desc: '如果是滾地出局，可重骰' },
        { id: 'a3', name: '幸運星', icon: '🌟', desc: '骰到出局時，有50%機率改為安打' },
        { id: 'a4', name: '滿貫砲', icon: '🎆', desc: '滿壘時若安打，視為全壘打' },
        { id: 'a5', name: '短打戰術', icon: '🏏', desc: '犧牲打：推進跑者，打者出局' },
        { id: 'a6', name: '盜壘指令', icon: '👟', desc: '隨機一名跑者前進一個壘包' },
        { id: 'a7', name: '流星打', icon: '☄️', desc: '無視對手本回合防禦卡' },
        { id: 'a8', name: '神預測', icon: '🔮', desc: '如果是三振，自動重骰' },
        { id: 'a9', name: '教練喊話', icon: '📣', desc: '將三振轉為保送' },
        { id: 'a10', name: '再一次', icon: '🔄', desc: '無條件重骰這一次結果' }
    ],
    DEF: [
        { id: 'd1', name: '守備佈陣', icon: '🧤', desc: '一壘安打 → 滾地出局' },
        { id: 'd2', name: '鐵壁防守', icon: '🧱', desc: '二壘安打以上 → 一壘安打' },
        { id: 'd3', name: '精準控球', icon: '🎯', desc: '對手重骰較大的那顆骰子' },
        { id: 'd4', name: '雙殺網', icon: '🕸️', desc: '若滾地且一壘有人 → 雙殺' },
        { id: 'd5', name: '雷射肩', icon: '⚡', desc: '跑者無法多推進壘包' },
        { id: 'd6', name: '變速球', icon: '🐌', desc: '對手必須重骰數值較大的骰子' },
        { id: 'd7', name: '威嚇', icon: '😠', desc: '無效化對手的攻擊卡' },
        { id: 'd8', name: '壞球釣魚', icon: '🎣', desc: '將四壞保送轉為壞球' },
        { id: 'd9', name: '全壘打牆', icon: '🚧', desc: '全壘打 → 二壘安打' },
        { id: 'd10', name: '干擾戰術', icon: '🎺', desc: '強制對手重骰數值較小的骰子' }
    ]
};

const COLORS = ['#d32f2f', '#1976d2', '#388e3c', '#fbc02d', '#7b1fa2', '#e64a19', '#5d4037', '#455a64'];
const POSITIONS = {
    home: { top: '79.7%', left: '50%' },
    first: { top: '50%', left: '79.7%' },
    second: { top: '20.3%', left: '50%' },
    third: { top: '50%', left: '20.3%' },
    pitcher: { top: '50%', left: '50%' },
    outfieldLeft: { top: '15%', left: '20%' },
    outfieldRight: { top: '15%', left: '80%' },
    infield: { top: '35%', left: '65%' }
};

// --- 核心：21種組合表 (參考圖片) ---
const RESULT_MAP = [
    // Column 1
    { d1: 1, d2: 1, res: 'Home Run' },
    { d1: 1, d2: 2, res: 'Double' },
    { d1: 1, d2: 3, res: 'Fly Out' },
    { d1: 1, d2: 4, res: 'Walk' },
    { d1: 1, d2: 5, res: 'Pop Out' },
    { d1: 1, d2: 6, res: 'Single' },
    { d1: 2, d2: 2, res: 'Double Play' },
    // Column 2
    { d1: 2, d2: 3, res: 'Ground Out' },
    { d1: 2, d2: 4, res: 'Strike Out' },
    { d1: 2, d2: 5, res: 'Single' },
    { d1: 2, d2: 6, res: 'Strike Out' },
    { d1: 3, d2: 3, res: 'Walk' },
    { d1: 3, d2: 4, res: 'Triple' },
    { d1: 3, d2: 5, res: 'Ground Out' },
    // Column 3
    { d1: 3, d2: 6, res: 'Fly Out' },
    { d1: 4, d2: 4, res: 'Walk' },
    { d1: 4, d2: 5, res: 'Pop Out' },
    { d1: 4, d2: 6, res: 'Strike Out' },
    { d1: 5, d2: 5, res: 'Double' },
    { d1: 5, d2: 6, res: 'Sacrifice Fly' },
    { d1: 6, d2: 6, res: 'Home Run' }
];

/* --- Utils --- */
function getOutcomeByDice(v1, v2) {
    const min = Math.min(v1, v2);
    const max = Math.max(v1, v2);
    const found = RESULT_MAP.find(r => r.d1 === min && r.d2 === max);
    return found ? found.res : 'Out';
}
