/* --- 1. 全域狀態 --- */
let appState = {
    p1Color: '#d32f2f',
    p2Color: '#1976d2',
    p1Roll: 0,
    p2Roll: 0,
    visTeam: 'P1',
    homeTeam: 'P2',
    visHand: [],
    homeHand: [],
    phase: 'PLANNING',
    runners: [false, false, false],
    outs: 0,
    balls: 0,
    strikes: 0,
    inning: 1,
    isTop: true,
    score: { vis: 0, home: 0 },
    selectedAtk: null,
    selectedDef: null,
    visCardsUsed: [],
    homeCardsUsed: []
};

function renderMachineGrid() {
    const grid = document.getElementById('machine-grid');
    grid.innerHTML = '';
    RESULT_MAP.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'res-cell';
        el.id = `mc-${item.d1}-${item.d2}`;
        el.innerHTML = `
      <span class="d-pair">${item.d1}-${item.d2}</span>
      <span class="d-out">${item.res}</span>
    `;
        grid.appendChild(el);
    });
}

function init() {
    renderColorPickers();
    renderMachineGrid();
}

/* --- Setup Logic --- */
function showGallery() {
    const grid = document.getElementById('gallery-content');
    grid.innerHTML = '';
    CARD_DB.ATK.forEach(c => renderCardPreview(c, 'atk', grid));
    CARD_DB.DEF.forEach(c => renderCardPreview(c, 'def', grid));
    document.getElementById('gallery-screen').classList.remove('hidden');
}
function renderCardPreview(c, type, container) {
    const el = document.createElement('div');
    el.className = `card-preview ${type}`;
    el.innerHTML = `<div style="font-size:2rem">${c.icon}</div><div style="font-weight:bold; font-size:0.9rem">${c.name}</div><div style="font-size:0.7rem; color:#aaa">${c.desc}</div>`;
    container.appendChild(el);
}
function closeGallery() { document.getElementById('gallery-screen').classList.add('hidden'); }
function goToSetup() { document.getElementById('start-screen').classList.add('hidden'); document.getElementById('setup-screen').classList.remove('hidden'); }
function renderColorPickers() {
    const p1c = document.getElementById('p1-colors');
    const p2c = document.getElementById('p2-colors');
    p1c.innerHTML = ''; p2c.innerHTML = '';
    COLORS.forEach(c => {
        let d1 = document.createElement('div'); d1.className = `color-option ${c === appState.p1Color ? 'selected' : ''}`; d1.style.backgroundColor = c;
        d1.onclick = () => { appState.p1Color = c; renderColorPickers(); }
        p1c.appendChild(d1);
        let d2 = document.createElement('div'); d2.className = `color-option ${c === appState.p2Color ? 'selected' : ''}`; d2.style.backgroundColor = c;
        d2.onclick = () => { appState.p2Color = c; renderColorPickers(); }
        p2c.appendChild(d2);
    });
}
function goToInitiative() { document.getElementById('step-color').style.display = 'none'; document.getElementById('step-initiative').style.display = 'block'; }
function rollInitiative(player) {
    const val = Math.floor(Math.random() * 100) + 1;
    if (player === 1) { appState.p1Roll = val; document.getElementById('p1-roll').innerText = val; document.getElementById('btn-roll-p1').disabled = true; }
    else { appState.p2Roll = val; document.getElementById('p2-roll').innerText = val; document.getElementById('btn-roll-p2').disabled = true; }
    if (appState.p1Roll > 0 && appState.p2Roll > 0) {
        const res = document.getElementById('initiative-result');
        if (appState.p1Roll > appState.p2Roll) { res.innerText = "P1 主隊 (後攻)"; appState.homeTeam = 'P1'; appState.visTeam = 'P2'; }
        else { res.innerText = "P2 主隊 (後攻)"; appState.homeTeam = 'P2'; appState.visTeam = 'P1'; }
        document.getElementById('btn-go-draw').style.display = 'inline-block';
    }
}
function goToDraw() { document.getElementById('step-initiative').style.display = 'none'; document.getElementById('step-draw').style.display = 'block'; }
function drawCardsAnimation() {
    const draw = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
    const p1Hand = [...draw(CARD_DB.ATK, 3), ...draw(CARD_DB.DEF, 3)];
    const p2Hand = [...draw(CARD_DB.ATK, 3), ...draw(CARD_DB.DEF, 3)];
    if (appState.visTeam === 'P1') { appState.visHand = p1Hand; appState.homeHand = p2Hand; }
    else { appState.visHand = p2Hand; appState.homeHand = p1Hand; }
    const renderList = (hand, elId) => document.getElementById(elId).innerHTML = hand.map(c => `[${c.icon}${c.name}]`).join(' ');
    renderList(appState.visHand, 'vis-hand-list'); renderList(appState.homeHand, 'home-hand-list');
    document.getElementById('draw-result-area').style.display = 'block';
}
function startGameFromSetup() {
    document.documentElement.style.setProperty('--vis-color', appState.visTeam === 'P1' ? appState.p1Color : appState.p2Color);
    document.documentElement.style.setProperty('--home-color', appState.homeTeam === 'P1' ? appState.p1Color : appState.p2Color);
    updateHandUI('vis'); updateHandUI('home');
    updateFieldersDisplay();
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-game').classList.remove('blur');
}

/* --- Game Loop --- */
const ball = document.getElementById('ball');
const d1 = document.getElementById('d1');
const d2 = document.getElementById('d2');
const statusMain = document.getElementById('main-status');
const statusSub = document.getElementById('sub-status');
const btn = document.getElementById('play-btn');

function updateHandUI(side) {
    const isVis = side === 'vis';
    const hand = isVis ? appState.visHand : appState.homeHand;
    const usedList = isVis ? appState.visCardsUsed : appState.homeCardsUsed;
    const container = document.getElementById(isVis ? 'vis-cards-area' : 'home-cards-area');
    container.innerHTML = '';
    const currentAtkTeam = appState.isTop ? 'vis' : 'home';
    const showAtkCards = (side === currentAtkTeam);

    hand.forEach(card => {
        const isAtkCard = CARD_DB.ATK.some(c => c.id === card.id);
        if ((showAtkCards && isAtkCard) || (!showAtkCards && !isAtkCard)) {
            const isUsed = usedList.includes(card.id);
            const el = document.createElement('div');
            el.className = `card ${isUsed ? 'used disabled' : ''}`;
            el.onclick = () => selectCard(side, card, el);
            el.innerHTML = `<div class="card-icon">${card.icon}</div><div class="card-info"><div class="card-title">${card.name}</div><div class="card-effect">${card.desc}</div></div>`;
            container.appendChild(el);
        }
    });
}

function selectCard(side, card, el) {
    if (appState.phase !== 'PLANNING') return;
    const isAtk = CARD_DB.ATK.some(c => c.id === card.id);
    const targetSlot = isAtk ? 'atk' : 'def';
    el.parentElement.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    if ((isAtk && appState.selectedAtk?.id === card.id) || (!isAtk && appState.selectedDef?.id === card.id)) {
        if (isAtk) appState.selectedAtk = null; else appState.selectedDef = null;
        updateSlot(targetSlot, null);
    } else {
        el.classList.add('selected');
        if (isAtk) appState.selectedAtk = card; else appState.selectedDef = card;
        updateSlot(targetSlot, card);
    }
}

function updateSlot(type, card) {
    const box = document.getElementById(`slot-${type}`);
    const icon = document.getElementById(`icon-${type}`);
    const name = document.getElementById(`name-${type}`);
    if (card) { box.classList.add('filled', `${type}-filled`); icon.innerText = card.icon; name.innerText = card.name; }
    else { box.className = 'slot-box'; icon.innerText = type === 'atk' ? '⚔️' : '🛡️'; name.innerText = '等待選擇'; }
}

function startTurn() {
    if (appState.phase === 'RESOLVED') { resetTurn(); return; }
    appState.phase = 'ROLLING'; btn.disabled = true;
    document.getElementById('roll-overlay').classList.remove('hidden');
    const md1 = document.getElementById('m-d1'); const md2 = document.getElementById('m-d2');
    md1.classList.add('rolling'); md2.classList.add('rolling');
    md1.innerText = "?"; md2.innerText = "?";

    setTimeout(() => {
        const v1 = Math.floor(Math.random() * 6) + 1;
        const v2 = Math.floor(Math.random() * 6) + 1;
        md1.innerText = v1; md2.innerText = v2;
        md1.classList.remove('rolling'); md2.classList.remove('rolling');
        d1.innerText = v1; d2.innerText = v2;
        runMachineAnimation(v1, v2);
    }, 500);
}

function runMachineAnimation(v1, v2) {
    const min = Math.min(v1, v2);
    const max = Math.max(v1, v2);
    const targetId = `mc-${min}-${max}`;

    // Create random sequence of IDs for effect
    let sequence = [];
    for (let i = 0; i < 15; i++) {
        const rand = RESULT_MAP[Math.floor(Math.random() * RESULT_MAP.length)];
        sequence.push(`mc-${rand.d1}-${rand.d2}`);
    }
    sequence.push(targetId); sequence.push(targetId); // End on target

    let currentIdx = 0; let speed = 50;

    function step() {
        document.querySelectorAll('.res-cell').forEach(b => b.classList.remove('active'));
        const cid = sequence[currentIdx];
        const el = document.getElementById(cid);
        if (el) el.classList.add('active');

        if (currentIdx >= sequence.length - 1) {
            setTimeout(() => {
                document.getElementById('roll-overlay').classList.add('hidden');
                resolveResult(v1, v2);
            }, 1500);
            return;
        }
        currentIdx++;
        speed += 15; // slow down
        setTimeout(step, speed);
    }
    step();
}

function resolveResult(v1, v2) {
    appState.phase = 'ANIMATING';
    let type = getOutcomeByDice(v1, v2);
    let msg = `原始結果: ${type}`;

    // --- ATK Logic ---
    if (appState.selectedAtk) {
        const id = appState.selectedAtk.id;
        if (appState.isTop) appState.visCardsUsed.push(id); else appState.homeCardsUsed.push(id);
        if (id === 'a1' && type === 'Single') { type = 'Double'; msg = '全力揮擊!'; }
        if (id === 'a1' && type === 'Double') { type = 'Home Run'; msg = '全壘打!'; }
        if (id === 'a8' && (type.includes('Strike Out'))) { msg = '神預測重骰!'; type = 'Single'; /* Simulating reroll success */ }
        if (id === 'a9' && (type.includes('Strike Out'))) { type = 'Walk'; msg = '選到保送!'; }
        if (id === 'a2' && (type.includes('Ground Out'))) { type = 'Single'; msg = '選球眼重骰成功!'; }
    }

    // --- DEF Logic ---
    if (appState.selectedDef) {
        const id = appState.selectedDef.id;
        if (!appState.isTop) appState.visCardsUsed.push(id); else appState.homeCardsUsed.push(id);
        if (appState.selectedAtk?.id === 'a7') { msg += ' (防禦無效)'; }
        else {
            if (id === 'd1' && type === 'Single') { type = 'Ground Out'; msg = '守備佈陣!'; }
            if (id === 'd2' && (type === 'Double' || type === 'Triple' || type === 'Home Run')) { type = 'Single'; msg = '鐵壁防守!'; }
            if (id === 'd9' && type === 'Home Run') { type = 'Double'; msg = '全壘打牆擋下!'; }
        }
    }

    statusMain.innerText = type;
    statusSub.innerText = msg;
    performFieldAnimation(type);
    setTimeout(() => { handleGameLogic(type); endTurn(); }, 2000);
}

function handleGameLogic(type) {
    if (['Single', 'Walk', 'Double', 'Triple', 'Home Run'].includes(type)) {
        handleRunnerAdvance(type);
    }
    else if (type === 'Sacrifice Fly') {
        appState.outs++;
        // Sacrifice Fly: Runner on 3rd scores.
        if (baseOccupancy[2] !== null) {
            handleRunnerAdvance('Sacrifice Fly');
        }
    }
    else if (type === 'Double Play') {
        // Rule E: Double Play
        // If 0 or 1 out AND runner on 1st: Batter out + 1st runner out (+2 outs).
        if (baseOccupancy[0] !== null && appState.outs < 2) {
            appState.outs += 2;
            // Out the runner on 1st
            const rIdx = baseOccupancy[0];
            resetRunner(rIdx);
            baseOccupancy[0] = null;
        } else {
            appState.outs++;
        }
    }
    else {
        // All other Outs
        appState.outs++;
    }

    updateScoreboard();
}

function updateScoreboard() {
    document.getElementById('score-vis-total').innerText = appState.score.vis;
    document.getElementById('score-home-total').innerText = appState.score.home;
    document.getElementById('inning-display').innerText = `${appState.inning}局${appState.isTop ? '上' : '下'}`;
    for (let i = 1; i <= 2; i++) document.getElementById(`light-o${i}`).className = `light ${i <= appState.outs ? 'on-red' : ''}`;

    if (appState.outs >= 3) {
        appState.outs = 0;
        clearRunners(); // Clear new system runners
        appState.isTop = !appState.isTop;
        if (appState.isTop) appState.inning++;
        statusMain.innerText = "攻守交換";
        updateHandUI('vis'); updateHandUI('home');
        updateFieldersDisplay();
    }
}

/* --- Animation Utils --- */
function resetBallPosition(posName) { ball.style.top = POSITIONS[posName].top; ball.style.left = POSITIONS[posName].left; ball.style.opacity = 1; }
function moveBallTo(posName, d = 500) { ball.style.transition = `top ${d}ms ease-out, left ${d}ms ease-out`; void ball.offsetWidth; ball.style.top = POSITIONS[posName].top; ball.style.left = POSITIONS[posName].left; }

function performFieldAnimation(type) {
    // 1. Reset to Pitcher
    ball.style.transition = 'none';
    ball.style.opacity = 1;
    ball.style.top = POSITIONS['pitcher'].top;
    ball.style.left = POSITIONS['pitcher'].left;
    ball.style.transform = "none";

    // 2. Animate Pitch (Pitcher -> Home)
    setTimeout(() => {
        ball.style.transition = "top 0.3s linear, left 0.3s linear";
        ball.style.top = POSITIONS['home'].top;
        ball.style.left = POSITIONS['home'].left;
    }, 50);

    // 3. Animate Hit (Home -> Target) after pitch arrives
    setTimeout(() => {
        if (['Strike Out'].includes(type)) {
            ball.style.opacity = 1;
            // Strike out: ball stays at catcher (home) or slightly behind
            moveBallTo('C', 200);
        }
        else if (['Fly Out', 'Pop Out'].includes(type)) {
            const targets = ['LF', 'CF', 'RF', 'SS', 'B2'];
            const target = targets[Math.floor(Math.random() * targets.length)];
            moveBallTo(target, 800);
        }
        else if (['Ground Out', 'Double Play'].includes(type)) {
            const targets = ['B1', 'B2', 'B3', 'SS', 'P'];
            const target = targets[Math.floor(Math.random() * targets.length)];
            moveBallTo(target, 400);
        }
        else if (['Single'].includes(type)) {
            moveBallTo('B1', 500);
        }
        else if (['Walk'].includes(type)) {
            // Walk: Player goes to 1st, ball irrelevant, but maybe just stay at home
            ball.style.opacity = 0;
        }
        else if (['Sacrifice Fly'].includes(type)) {
            moveBallTo('CF', 700);
        }
        else if (['Double'].includes(type)) {
            moveBallTo('outfieldLeft', 800);
        }
        else if (['Triple'].includes(type)) {
            moveBallTo('outfieldRight', 900);
        }
        else if (type === 'Home Run') {
            ball.style.transition = "top 1s ease-in, left 1s linear, transform 1s ease-in";
            ball.style.top = "-10%"; ball.style.left = "20%"; ball.style.transform = "scale(0.5)";
        }
    }, 400); // Wait for pitch (300ms) + small buffer
}
function updateRunnersDisplay() {
    // Deprecated: Logic moved to animateRunnerMove
}
function updateFieldersDisplay() {
    // Defense is HOME if isTop is true (Visitor batting), else VISitor is defense.
    const isHomeDefense = appState.isTop;
    const defColor = isHomeDefense ? appState.p2Color : appState.p1Color; // P2 is home, P1 is vis
    // Wait, initial Setup might have P1 as Home? 
    // appState.homeTeam stores 'P1' or 'P2'.
    // If appState.homeTeam == 'P1', then P1 color is home color.
    // If appState.visTeam == 'P1', then P1 color is vis color.
    // simpler: calculate current defense color
    let color;
    if (appState.isTop) {
        // Top of inning: Home team defends.
        color = (appState.homeTeam === 'P1') ? appState.p1Color : appState.p2Color;
    } else {
        // Bottom of inning: Visitor team defends.
        color = (appState.visTeam === 'P1') ? appState.p1Color : appState.p2Color;
    }

    const positions = ['P', 'C', 'B1', 'B2', 'B3', 'SS', 'LF', 'CF', 'RF'];
    positions.forEach(pos => {
        const el = document.getElementById(`f-${pos}`);
        if (el) {
            el.style.backgroundColor = color;
            el.style.top = POSITIONS[pos].top;
            el.style.left = POSITIONS[pos].left;
        }
    });
}
function endTurn() { appState.phase = 'RESOLVED'; btn.disabled = false; btn.innerText = "下一打席"; }
function resetTurn() {
    appState.phase = 'PLANNING'; appState.selectedAtk = null; appState.selectedDef = null;
    updateSlot('atk', null); updateSlot('def', null);
    updateHandUI('vis'); updateHandUI('home');
    ball.style.opacity = 0; ball.style.transform = "none"; ball.style.transition = "none";
    d1.innerText = "?"; d2.innerText = "?"; statusMain.innerText = "請選擇戰術卡"; btn.innerText = "擲骰子 (ROLL)";
}

/* --- Runner Logic --- */
const runnerEntities = [
    { id: 'runner-entity-0', el: null, active: false, currentBase: -1 }, // -1: home, 0: 1st, 1: 2nd, 2: 3rd
    { id: 'runner-entity-1', el: null, active: false, currentBase: -1 },
    { id: 'runner-entity-2', el: null, active: false, currentBase: -1 },
    { id: 'runner-entity-3', el: null, active: false, currentBase: -1 }
];
let baseOccupancy = [null, null, null]; // [0] -> 1B, [1] -> 2B, [2] -> 3B (stores index in runnerEntities or null)

function initRunners() {
    runnerEntities.forEach((r, i) => {
        r.el = document.getElementById(r.id);
        resetRunner(i);
    });
    baseOccupancy = [null, null, null];
}

function resetRunner(idx) {
    const r = runnerEntities[idx];
    r.active = false;
    r.currentBase = -1;
    if (r.el) {
        r.el.style.display = 'none';
        r.el.style.top = POSITIONS.home.top;
        r.el.style.left = POSITIONS.home.left;
        r.el.style.transform = 'translate(-50%, -50%) scale(0)';
        r.el.style.transition = 'none';
        r.el.className = 'runner-dot';
    }
}

function getAvailableRunnerIndex() {
    return runnerEntities.findIndex(r => !r.active);
}

function animateRunnerMove(runnerIdx, targetBaseIdx, onComplete) {
    const r = runnerEntities[runnerIdx];
    if (!r.el) return;

    r.active = true;
    r.el.style.display = 'block';

    // Determine path
    // Bases: -1 (Home), 0 (1B), 1 (2B), 2 (3B)
    // Target uses same indices. 3 denotes Scoring (Home again) but logic might differ.
    // Let's standardize: 0=1B, 1=2B, 2=3B, 3=Home(Score)

    let path = [];
    let start = r.currentBase;

    // Build path step by step (e.g. -1 -> 0 -> 1)
    // If scoring, target is 3.
    for (let b = start + 1; b <= targetBaseIdx; b++) {
        if (b === 0) path.push(POSITIONS.first);
        else if (b === 1) path.push(POSITIONS.second);
        else if (b === 2) path.push(POSITIONS.third);
        else if (b === 3) path.push(POSITIONS.home);
    }

    if (path.length === 0) { if (onComplete) onComplete(); return; }

    let stepIdx = 0;

    // Activate scale if starting from home batter
    if (start === -1) {
        r.el.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    // Set Team Color
    r.el.className = `runner-dot ${appState.isTop ? '' : 'home-team'} active`;

    function nextStep() {
        if (stepIdx >= path.length) {
            r.currentBase = targetBaseIdx;
            if (targetBaseIdx === 3) {
                // Scored! Reset runner
                resetRunner(runnerIdx);
            }
            if (onComplete) onComplete();
            return;
        }

        const pos = path[stepIdx];
        r.el.style.transition = "top 0.6s linear, left 0.6s linear";
        r.el.style.top = pos.top;
        r.el.style.left = pos.left;

        stepIdx++;
        setTimeout(nextStep, 600); // Wait for transition
    }

    // Small delay to ensure display:block applies
    setTimeout(nextStep, 50);
}

function handleRunnerAdvance(hitType) {
    // 1. Identify moves
    // Moves: [{ runnerIdx, targetBase }]
    let moves = [];
    let scoreCount = 0;

    // Existing runners (3B -> 2B -> 1B)
    // 3B
    if (baseOccupancy[2] !== null) {
        let rIdx = baseOccupancy[2];
        if (['Single', 'Double', 'Triple', 'Home Run', 'Walk', 'Sacrifice Fly'].includes(hitType)) {
            moves.push({ idx: rIdx, target: 3 });
            baseOccupancy[2] = null;
            scoreCount++;
        }
    }

    // 2B
    if (baseOccupancy[1] !== null) {
        let rIdx = baseOccupancy[1];
        if (['Single', 'Walk'].includes(hitType)) {
            moves.push({ idx: rIdx, target: 2 }); // to 3B
        } else if (['Double', 'Triple', 'Home Run'].includes(hitType)) {
            moves.push({ idx: rIdx, target: 3 }); // Score
            scoreCount++;
        }
        baseOccupancy[1] = null;
    }

    // 1B
    if (baseOccupancy[0] !== null) {
        let rIdx = baseOccupancy[0];
        if (['Single', 'Walk'].includes(hitType)) {
            moves.push({ idx: rIdx, target: 1 }); // to 2B
        } else if (['Double'].includes(hitType)) {
            moves.push({ idx: rIdx, target: 2 }); // to 3B
        } else if (['Triple', 'Home Run'].includes(hitType)) {
            moves.push({ idx: rIdx, target: 3 }); // Score
            scoreCount++;
        }
        baseOccupancy[0] = null;
    }

    // Batter
    if (['Single', 'Double', 'Triple', 'Home Run', 'Walk'].includes(hitType)) {
        let newRunnerIdx = getAvailableRunnerIndex();
        if (newRunnerIdx !== -1) {
            let target = 0; // 1B
            if (hitType === 'Double') target = 1;
            if (hitType === 'Triple') target = 2;
            if (hitType === 'Home Run') { target = 3; scoreCount++; }
            if (hitType === 'Walk') target = 0;

            moves.push({ idx: newRunnerIdx, target: target });
        }
    }

    // Apply Logic Updates to Occupancy Map
    moves.forEach(m => {
        if (m.target < 3) {
            baseOccupancy[m.target] = m.idx;
        }
    });

    // Execute Animations
    moves.forEach(m => {
        animateRunnerMove(m.idx, m.target);
    });

    // Update Score
    appState.score[appState.isTop ? 'vis' : 'home'] += scoreCount;
    updateScoreboard();
}

function clearRunners() {
    baseOccupancy = [null, null, null];
    runnerEntities.forEach((r, i) => resetRunner(i));
}

init();
initRunners();
