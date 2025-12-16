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
    // Simplified Logic mapping complex outcomes to simple runner logic
    // Treat 'Fly Out', 'Pop Out', 'Strike Out' as Outs.
    // 'Ground Out' -> Out (ignore force play complexity for now)
    // 'Double Play' -> 2 Outs
    // 'Sacrifice Fly' -> Out but runner scores from 3rd

    if (['Single', 'Walk'].includes(type)) {
        if (appState.runners[2]) appState.score[appState.isTop ? 'vis' : 'home']++;
        appState.runners[2] = appState.runners[1]; appState.runners[1] = appState.runners[0]; appState.runners[0] = true;
    } else if (type === 'Double') {
        if (appState.runners[2]) appState.score[appState.isTop ? 'vis' : 'home']++;
        if (appState.runners[1]) appState.score[appState.isTop ? 'vis' : 'home']++;
        appState.runners[2] = appState.runners[0]; appState.runners[1] = true; appState.runners[0] = false;
    } else if (type === 'Triple') {
        if (appState.runners[2]) appState.score[appState.isTop ? 'vis' : 'home']++;
        if (appState.runners[1]) appState.score[appState.isTop ? 'vis' : 'home']++;
        if (appState.runners[0]) appState.score[appState.isTop ? 'vis' : 'home']++;
        appState.runners = [false, false, true];
    } else if (type === 'Home Run') {
        let runs = 1 + (appState.runners[0] ? 1 : 0) + (appState.runners[1] ? 1 : 0) + (appState.runners[2] ? 1 : 0);
        appState.score[appState.isTop ? 'vis' : 'home'] += runs;
        appState.runners = [false, false, false];
    } else if (type === 'Sacrifice Fly') {
        appState.outs++;
        if (appState.runners[2] && appState.outs < 3) {
            appState.score[appState.isTop ? 'vis' : 'home']++;
            appState.runners[2] = false;
        }
    } else if (type === 'Double Play') {
        appState.outs++;
        if (appState.outs < 3) appState.outs++; // Add another out
        // Clear lead runner for simplicity
        if (appState.runners[0]) appState.runners[0] = false;
    } else {
        // All other Outs
        appState.outs++;
    }

    updateScoreboard();
    updateRunnersDisplay();
}

function updateScoreboard() {
    document.getElementById('score-vis-total').innerText = appState.score.vis;
    document.getElementById('score-home-total').innerText = appState.score.home;
    for (let i = 1; i <= 2; i++) document.getElementById(`light-o${i}`).className = `light ${i <= appState.outs ? 'on-red' : ''}`;

    if (appState.outs >= 3) {
        appState.outs = 0; appState.runners = [false, false, false]; appState.isTop = !appState.isTop;
        if (appState.isTop) appState.inning++;
        statusMain.innerText = "攻守交換";
        updateHandUI('vis'); updateHandUI('home');
    }
}

/* --- Animation Utils --- */
function resetBallPosition(posName) { ball.style.top = POSITIONS[posName].top; ball.style.left = POSITIONS[posName].left; ball.style.opacity = 1; }
function moveBallTo(posName, d = 500) { ball.style.transition = `top ${d}ms ease-out, left ${d}ms ease-out`; void ball.offsetWidth; ball.style.top = POSITIONS[posName].top; ball.style.left = POSITIONS[posName].left; }

function performFieldAnimation(type) {
    if (['Strike Out', 'Fly Out', 'Pop Out', 'Double Play'].includes(type)) ball.style.opacity = 0;
    else if (['Ground Out'].includes(type)) moveBallTo('infield', 400);
    else if (['Single', 'Walk', 'Sacrifice Fly'].includes(type)) moveBallTo('outfieldRight', 600);
    else if (['Double', 'Triple'].includes(type)) moveBallTo('outfieldLeft', 800);
    else if (type === 'Home Run') {
        ball.style.transition = "top 1s ease-in, left 1s linear, transform 1s ease-in";
        ball.style.top = "-10%"; ball.style.left = "20%"; ball.style.transform = "scale(0.5)";
    }
}
function updateRunnersDisplay() {
    const bases = ['first', 'second', 'third'];
    for (let i = 0; i < 3; i++) {
        const el = document.getElementById(`runner-${i + 1}`);
        el.className = `runner-dot ${appState.isTop ? '' : 'home-team'} ${appState.runners[i] ? 'active' : ''}`;
        if (appState.runners[i]) { el.style.top = POSITIONS[bases[i]].top; el.style.left = POSITIONS[bases[i]].left; }
    }
}
function endTurn() { appState.phase = 'RESOLVED'; btn.disabled = false; btn.innerText = "下一打席"; }
function resetTurn() {
    appState.phase = 'PLANNING'; appState.selectedAtk = null; appState.selectedDef = null;
    updateSlot('atk', null); updateSlot('def', null);
    updateHandUI('vis'); updateHandUI('home');
    ball.style.opacity = 0; ball.style.transform = "none";
    d1.innerText = "?"; d2.innerText = "?"; statusMain.innerText = "請選擇戰術卡"; btn.innerText = "擲骰子 (ROLL)";
}

init();
