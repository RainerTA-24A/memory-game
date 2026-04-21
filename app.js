document.addEventListener("DOMContentLoaded", () => {
  const baseCards = [
    { name: "fries", img: "images/fries.png" },
    { name: "cheeseburger", img: "images/cheeseburger.png" },
    { name: "ice-cream", img: "images/ice-cream.png" },
    { name: "pizza", img: "images/pizza.png" },
    { name: "milkshake", img: "images/milkshake.png" },
    { name: "hotdog", img: "images/hotdog.png" },
  ];

  const campaignLevels = [
    { id: 1, pairs: 3, time: 70, matchPoints: 90, missPenalty: 6, clearBonus: 120 },
    { id: 2, pairs: 4, time: 65, matchPoints: 100, missPenalty: 7, clearBonus: 150 },
    { id: 3, pairs: 5, time: 58, matchPoints: 115, missPenalty: 8, clearBonus: 180 },
    { id: 4, pairs: 6, time: 52, matchPoints: 130, missPenalty: 10, clearBonus: 220 },
  ];

  const modeLabels = {
    campaign: "Campaign",
    "time-attack": "Time Attack",
    endless: "Endless",
    distractor: "Distractor Mode",
    "target-recall": "Target Recall",
    afterimage: "Afterimage Lab",
    "memory-lock": "Memory Lock",
    "limited-moves": "Limited Moves",
    "neuro-raid": "Neuro Raid",
  };

  const modeDescriptions = {
    campaign: "Campaign trains memory consistency and progressive load.",
    "time-attack": "Time Attack builds pressure handling and quick recall.",
    endless: "Endless rewards focus and long-run pattern retention.",
    distractor: "Distractor Mode trains focus under interruptions and visual noise.",
    "target-recall": "Target Recall shows target positions, then blends them; pick all remembered tiles without mistakes.",
    afterimage: "Afterimage Lab shows card faces briefly, then masks them to force active recall.",
    "memory-lock": "Memory Lock reveals a card once, then permanently masks it to correct.png for the rest of the round.",
    "limited-moves": "Limited Moves trains planning before each flip.",
    "neuro-raid": "Neuro Raid trains stress control, flexibility, and rapid decisions.",
  };

  const modeFocus = {
    campaign: "Memory",
    "time-attack": "Speed",
    endless: "Consistency",
    distractor: "Attention",
    "target-recall": "Spatial Memory",
    afterimage: "Working Memory",
    "memory-lock": "Recall Discipline",
    "limited-moves": "Strategy",
    "neuro-raid": "Adaptation",
  };

  const eventRuleCatalog = [
    {
      id: "freeze-pulse",
      label: "Freeze Pulse",
      description: "Board locks briefly every 18 seconds.",
      apply(stateRef, uiRef, setStatusFn) {
        const id = setInterval(() => {
          if (!stateRef.gameRunning) return;
          stateRef.lockBoard = true;
          uiRef.grid.classList.add("is-frozen");
          setStatusFn("Event rule: Freeze Pulse.", "warning");
          setTimeout(() => {
            uiRef.grid.classList.remove("is-frozen");
            if (stateRef.flipped.length < 2) stateRef.lockBoard = false;
          }, 1200);
        }, 18000);
        stateRef.eventIntervals.push(id);
      },
    },
    {
      id: "panic-tax",
      label: "Panic Tax",
      description: "Every miss applies extra score penalty.",
      apply() {},
    },
    {
      id: "fragile-combo",
      label: "Fragile Combo",
      description: "Long hesitation instantly resets streak.",
      apply() {},
    },
    {
      id: "easter-shuffle",
      label: "Easter Shuffle",
      description: "Unmatched cards reshuffle every 14 seconds.",
      apply(stateRef, uiRef, setStatusFn) {
        const id = setInterval(() => {
          if (!stateRef.gameRunning || stateRef.lockBoard || stateRef.flipped.length) return;
          const unmatchedIndexes = stateRef.deck
            .map((_, index) => index)
            .filter((index) => !stateRef.matchedIndices.has(index));
          if (unmatchedIndexes.length < 2) return;
          const shuffled = shuffle(unmatchedIndexes.map((index) => stateRef.deck[index]));
          unmatchedIndexes.forEach((deckIndex, i) => {
            stateRef.deck[deckIndex] = shuffled[i];
          });
          uiRef.grid.classList.add("is-jammed");
          setTimeout(() => uiRef.grid.classList.remove("is-jammed"), 400);
          renderBoard();
          setStatusFn("Seasonal event: Easter Shuffle.", "warning");
        }, 14000);
        stateRef.eventIntervals.push(id);
      },
    },
  ];

  const achievementCatalog = [
    { id: "first-match", title: "First Match", text: "Find your first pair." },
    { id: "streak-3", title: "Combo Chef", text: "Reach 3-match streak." },
    { id: "clean-level", title: "Clean Run", text: "Clear a level with zero misses." },
    { id: "speed-clear", title: "Speed Slice", text: "Clear with over 20s left." },
    { id: "all-levels", title: "Bistro Legend", text: "Beat all Campaign levels." },
    { id: "marathon", title: "Marathon", text: "Clear 3 rounds in one run." },
    { id: "impulse-guard", title: "Impulse Guard", text: "Complete a round with 10+ flips and no misses." },
    { id: "calm-pressure", title: "Calm Under Pressure", text: "Find 3 matches while the timer is under 10 seconds." },
  ];

  const audio = {
    background: new Audio("audio/background.mp3"),
    cardFlip: new Audio("audio/cardFlip.mp3"),
    gameOver: new Audio("audio/gameOver.wav"),
  };

  audio.background.loop = true;
  audio.background.volume = 0.08;
  audio.cardFlip.volume = 0.2;
  audio.gameOver.volume = 0.25;

  const state = {
    mode: "campaign",
    playerName: "",
    score: 0,
    streak: 0,
    bestStreak: 0,
    levelIndex: 0,
    roundNumber: 1,
    deck: [],
    flipped: [],
    matchedCount: 0,
    totalPairsFound: 0,
    missesThisRound: 0,
    lockBoard: false,
    timerId: null,
    secondsLeft: null,
    achievements: new Set(),
    gameRunning: false,
    levelTransitionId: null,
    flipBackId: null,
    audioEnabled: true,
    movesLeft: null,
    matchedIndices: new Set(),
    totalFlips: 0,
    decisionSamples: [],
    lastActionAt: null,
    lastMissAt: null,
    recoverySamples: [],
    pressureMatches: 0,
    neuroJammerId: null,
    neuroRotateId: null,
    distractorId: null,
    blackoutTimeoutId: null,
    activeEventRule: null,
    eventIntervals: [],
    signalIntervalId: null,
    signalTimeoutId: null,
    signalActive: false,
    signalHits: 0,
    signalMisses: 0,
    signalFalseAlarms: 0,
    recallTargets: new Set(),
    recallHits: new Set(),
    recallRevealId: null,
    recallInReveal: false,
    afterimageRevealId: null,
    lockedMemoryCards: new Set(),
    memoryLockRevealTimeouts: {},
  };

  const ui = {
    startScreen: document.querySelector("#start-screen"),
    gameScreen: document.querySelector("#game-screen"),
    endScreen: document.querySelector("#end-screen"),
    startForm: document.querySelector("#start-form"),
    playerNameInput: document.querySelector("#player-name"),
    gameModeSelect: document.querySelector("#game-mode"),
    playAgainBtn: document.querySelector("#play-again-btn"),
    restartLevelBtn: document.querySelector("#restart-level-btn"),
    quitBtn: document.querySelector("#quit-btn"),
    grid: document.querySelector("#memory-grid"),
    result: document.querySelector("#result"),
    hudPlayer: document.querySelector("#hud-player"),
    hudLevel: document.querySelector("#hud-level"),
    hudTimer: document.querySelector("#hud-timer"),
    hudMoves: document.querySelector("#hud-moves"),
    hudTurn: document.querySelector("#hud-turn"),
    hudFocus: document.querySelector("#hud-focus"),
    hudRule: document.querySelector("#hud-rule"),
    scoreA: document.querySelector("#score-a span"),
    bestStreak: document.querySelector("#best-streak span"),
    avgDecision: document.querySelector("#avg-decision span"),
    recoverySpeed: document.querySelector("#recovery-speed span"),
    statusText: document.querySelector("#status-text"),
    modeHelp: document.querySelector("#mode-help"),
    roundBrief: document.querySelector("#round-brief"),
    achievementList: document.querySelector("#achievement-list"),
    finalTitle: document.querySelector("#final-title"),
    finalSummary: document.querySelector("#final-summary"),
    finalAchievements: document.querySelector("#final-achievements"),
    audioToggle: document.querySelector("#audio-toggle"),
  };

  function showScreen(screenName) {
    ui.startScreen.classList.remove("is-active");
    ui.gameScreen.classList.remove("is-active");
    ui.endScreen.classList.remove("is-active");
    screenName.classList.add("is-active");
  }

  function shuffle(list) {
    const cloned = [...list];
    for (let i = cloned.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
  }

  function seededRandom(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let n = Math.imul(t ^ (t >>> 15), t | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededShuffle(list, randomFn) {
    const cloned = [...list];
    for (let i = cloned.length - 1; i > 0; i -= 1) {
      const j = Math.floor(randomFn() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
  }

  function formatTime(totalSeconds) {
    const min = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const sec = (totalSeconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  }

  function currentLevel() {
    const safeIndex = Math.min(state.levelIndex, campaignLevels.length - 1);
    return campaignLevels[safeIndex];
  }

  function setStatus(text, tone = "normal") {
    ui.statusText.textContent = text;
    ui.statusText.classList.remove("warning", "danger");
    if (tone === "warning") ui.statusText.classList.add("warning");
    if (tone === "danger") ui.statusText.classList.add("danger");
  }

  function clearPendingActions(includeTimer = true) {
    if (includeTimer) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    clearInterval(state.neuroJammerId);
    clearInterval(state.neuroRotateId);
    clearInterval(state.distractorId);
    clearInterval(state.signalIntervalId);
    clearTimeout(state.blackoutTimeoutId);
    clearTimeout(state.signalTimeoutId);
    clearTimeout(state.recallRevealId);
    clearTimeout(state.afterimageRevealId);
    Object.values(state.memoryLockRevealTimeouts).forEach((id) => clearTimeout(id));
    state.eventIntervals.forEach((id) => clearInterval(id));
    clearTimeout(state.levelTransitionId);
    clearTimeout(state.flipBackId);
    state.neuroJammerId = null;
    state.neuroRotateId = null;
    state.distractorId = null;
    state.signalIntervalId = null;
    state.signalTimeoutId = null;
    state.recallRevealId = null;
    state.afterimageRevealId = null;
    state.memoryLockRevealTimeouts = {};
    state.blackoutTimeoutId = null;
    state.eventIntervals = [];
    state.levelTransitionId = null;
    state.flipBackId = null;
    state.activeEventRule = null;
    state.signalActive = false;
    state.recallInReveal = false;
    ui.grid.classList.remove("is-rotating", "is-jammed");
    ui.grid.classList.remove("is-frozen");
    ui.gameScreen.querySelector(".board-panel").classList.remove("is-blackout");
  }

  function pickEventRule(mode) {
    if (mode === "campaign" || mode === "time-attack" || mode === "target-recall" || mode === "memory-lock") return null;
    const isApril = new Date().getMonth() === 3;
    let weighted = mode === "neuro-raid" ? eventRuleCatalog.slice(0, 3) : eventRuleCatalog.slice(0, 2);
    if (isApril && Math.random() < 0.25) {
      weighted = [...weighted, eventRuleCatalog[3]];
    }
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  function applyEventRule() {
    state.activeEventRule = pickEventRule(state.mode);
    if (!state.activeEventRule) return;
    state.activeEventRule.apply(state, ui, setStatus);
    updateRoundBrief(`${ui.roundBrief.textContent} Active rule: ${state.activeEventRule.description}`);
  }

  function triggerDistractorPulse() {
    if (!state.gameRunning || state.mode !== "distractor") return;
    const boardPanel = ui.gameScreen.querySelector(".board-panel");
    boardPanel.classList.add("is-blackout");
    state.lockBoard = true;
    setStatus("Distractor pulse: hold your map.", "warning");
    clearTimeout(state.blackoutTimeoutId);
    state.blackoutTimeoutId = setTimeout(() => {
      boardPanel.classList.remove("is-blackout");
      if (state.flipped.length < 2) state.lockBoard = false;
    }, 900);
  }

  function startDistractorEffects() {
    clearInterval(state.distractorId);
    const interval = Math.max(5500, 9500 - state.roundNumber * 300);
    state.distractorId = setInterval(() => {
      triggerDistractorPulse();
    }, interval);
  }

  function startSignalCheck() {
    clearInterval(state.signalIntervalId);
    clearTimeout(state.signalTimeoutId);
    state.signalActive = false;

    const cadence = Math.max(7000, 11500 - state.roundNumber * 320);
    state.signalIntervalId = setInterval(() => {
      if (!state.gameRunning || state.mode !== "afterimage") return;
      state.signalActive = true;
      setStatus("Signal check: press Space now.", "warning");
      clearTimeout(state.signalTimeoutId);
      state.signalTimeoutId = setTimeout(() => {
        if (!state.signalActive) return;
        state.signalActive = false;
        state.signalMisses += 1;
        state.score = Math.max(0, state.score - 15);
        setStatus("Signal missed. Focus penalty.", "danger");
        updateHud();
      }, 1300);
    }, cadence);
  }

  function showMaskedFace(cardEl) {
    const img = cardEl.querySelector("img");
    if (!img || cardEl.classList.contains("matched")) return;
    if (!img.dataset.realSrc) img.dataset.realSrc = img.src;
    img.src = "images/correct.png";
    cardEl.classList.add("masked");
  }

  function restoreCardFace(cardEl) {
    const img = cardEl.querySelector("img");
    if (!img) return;
    if (img.dataset.realSrc) img.src = img.dataset.realSrc;
    cardEl.classList.remove("masked");
  }

  function averageOf(values) {
    if (!values.length) return 0;
    return values.reduce((sum, n) => sum + n, 0) / values.length;
  }

  function formatSeconds(value) {
    return `${value.toFixed(2)}s`;
  }

  function updateModeHelp(selectedMode) {
    if (!ui.modeHelp) return;
    ui.modeHelp.textContent = modeDescriptions[selectedMode] || modeDescriptions.campaign;
  }

  function updateRoundBrief(text) {
    if (!ui.roundBrief) return;
    ui.roundBrief.textContent = text;
  }

  function setCardAria(cardEl, index, cardState) {
    cardEl.setAttribute("aria-label", `Card ${index + 1}, ${cardState}`);
  }

  function computeGridColumns() {
    const cardCount = state.deck.length;
    if (cardCount <= 6) return 3;
    if (cardCount >= 30) return 6;
    if (cardCount >= 20) return 5;
    return 4;
  }

  function buildRecallDeck(cardCount) {
    const deck = [];
    for (let i = 0; i < cardCount; i += 1) {
      const picked = baseCards[Math.floor(Math.random() * baseCards.length)];
      deck.push({ ...picked, pairId: `recall-${i}` });
    }
    state.deck = shuffle(deck);
  }

  function targetRecallBoardSize() {
    return state.roundNumber >= 20 ? 30 : 20;
  }

  function targetRecallTargetCount() {
    return Math.min(3 + (state.roundNumber - 1), targetRecallBoardSize());
  }

  function startTargetRecallRevealPhase() {
    const indexes = shuffle(state.deck.map((_, index) => index));
    state.recallTargets = new Set(indexes.slice(0, targetRecallTargetCount()));
    state.recallHits = new Set();
    state.recallInReveal = true;
    state.lockBoard = true;

    const cards = ui.grid.querySelectorAll(".card");
    state.recallTargets.forEach((index) => {
      const cardEl = cards[index];
      if (!cardEl) return;
      cardEl.classList.add("revealed");
      setCardAria(cardEl, index, "revealed target");
    });

    state.recallRevealId = setTimeout(() => {
      state.recallTargets.forEach((index) => {
        const cardEl = cards[index];
        if (!cardEl) return;
        cardEl.classList.remove("revealed");
        setCardAria(cardEl, index, "hidden");
      });
      state.recallInReveal = false;
      state.lockBoard = false;
      setStatus(`Now select the ${targetRecallTargetCount()} remembered tiles.`);
    }, 1800);
  }

  function startAfterimageRevealPhase() {
    state.lockBoard = true;
    const cards = ui.grid.querySelectorAll(".card");

    cards.forEach((cardEl, index) => {
      restoreCardFace(cardEl);
      cardEl.classList.add("revealed");
      setCardAria(cardEl, index, "revealed preview");
    });

    state.afterimageRevealId = setTimeout(() => {
      cards.forEach((cardEl, index) => {
        cardEl.classList.remove("revealed");
        showMaskedFace(cardEl);
        setCardAria(cardEl, index, "hidden");
      });
      state.lockBoard = false;
      setStatus("Preview ended. Match pairs from memory only.");
      updateHud();
    }, 1800);
  }

  function refreshGridColumns() {
    ui.grid.style.setProperty("--grid-cols", String(computeGridColumns()));
  }

  function playSound(sound) {
    if (!state.audioEnabled) return;
    const cloned = sound.cloneNode();
    cloned.volume = sound.volume;
    cloned.play().catch(() => {});
  }

  function startBackgroundMusic() {
    if (!state.audioEnabled) return;
    audio.background.play().catch(() => {});
  }

  function stopBackgroundMusic() {
    audio.background.pause();
    audio.background.currentTime = 0;
  }

  function updateAudioToggle() {
    if (!ui.audioToggle) return;
    ui.audioToggle.textContent = state.audioEnabled ? "🔊" : "🔇";
    ui.audioToggle.classList.toggle("is-muted", !state.audioEnabled);
    ui.audioToggle.setAttribute("aria-pressed", String(state.audioEnabled));
    ui.audioToggle.setAttribute(
      "aria-label",
      state.audioEnabled ? "Mute audio" : "Enable audio"
    );
  }

  function renderAchievements() {
    ui.achievementList.innerHTML = "";
    achievementCatalog.forEach((achievement) => {
      const item = document.createElement("li");
      const unlocked = state.achievements.has(achievement.id);
      item.className = unlocked ? "unlocked" : "";
      item.textContent = unlocked
        ? `${achievement.title}: ${achievement.text}`
        : `Locked: ${achievement.title}`;
      ui.achievementList.appendChild(item);
    });
  }

  function unlockAchievement(id) {
    if (!state.achievements.has(id)) {
      state.achievements.add(id);
      renderAchievements();
      const found = achievementCatalog.find((a) => a.id === id);
      if (found) {
        setStatus(`Achievement unlocked: ${found.title}`);
      }
    }
  }

  function updateHud() {
    ui.hudPlayer.textContent = state.playerName || "Player";

    if (state.mode === "campaign") {
      ui.hudLevel.textContent = String(currentLevel().id);
    } else if (state.mode === "time-attack") {
      ui.hudLevel.textContent = `Wave ${state.roundNumber}`;
    } else if (state.mode === "endless") {
      ui.hudLevel.textContent = `Stage ${state.roundNumber}`;
    } else if (state.mode === "limited-moves") {
      ui.hudLevel.textContent = `Puzzle ${state.roundNumber}`;
    } else if (state.mode === "neuro-raid") {
      ui.hudLevel.textContent = `Raid ${state.roundNumber}`;
    } else if (state.mode === "distractor") {
      ui.hudLevel.textContent = `Focus ${state.roundNumber}`;
    } else if (state.mode === "target-recall") {
      ui.hudLevel.textContent = `Lvl ${state.roundNumber}/30`;
    } else if (state.mode === "afterimage") {
      ui.hudLevel.textContent = `Memory ${state.roundNumber}`;
    } else if (state.mode === "memory-lock") {
      ui.hudLevel.textContent = `Lock ${state.roundNumber}`;
    } else {
      ui.hudLevel.textContent = "Run";
    }

    ui.hudTimer.textContent = state.secondsLeft === null ? "--:--" : formatTime(state.secondsLeft);
    ui.hudMoves.textContent = state.movesLeft === null ? "--" : String(state.movesLeft);
    ui.hudTurn.textContent = modeLabels[state.mode];
    ui.hudFocus.textContent = modeFocus[state.mode] || "Memory";
    ui.hudRule.textContent = state.activeEventRule ? state.activeEventRule.label : "None";
    ui.scoreA.textContent = state.score;
    ui.bestStreak.textContent = state.bestStreak;
    ui.result.textContent = state.totalPairsFound;
    ui.avgDecision.textContent = formatSeconds(averageOf(state.decisionSamples));
    ui.recoverySpeed.textContent = formatSeconds(averageOf(state.recoverySamples));
  }

  function buildDeck(pairCount, randomFn = null) {
    const picked = (randomFn ? seededShuffle(baseCards, randomFn) : shuffle(baseCards)).slice(
      0,
      pairCount
    );
    const withPairs = picked.flatMap((card) => [
      { ...card, pairId: card.name },
      { ...card, pairId: card.name },
    ]);
    state.deck = randomFn ? seededShuffle(withPairs, randomFn) : shuffle(withPairs);
  }

  function createCardElement(card, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.setAttribute("data-index", index);
    setCardAria(button, index, "hidden");

    const img = document.createElement("img");
    img.src = card.img;
    img.alt = card.name;
    img.dataset.realSrc = card.img;
    img.draggable = false;

    button.appendChild(img);
    button.addEventListener("click", onCardClick);
    return button;
  }

  function renderBoard() {
    ui.grid.innerHTML = "";
    refreshGridColumns();
    state.deck.forEach((card, index) => {
      const cardEl = createCardElement(card, index);
      if (state.mode === "memory-lock" && state.lockedMemoryCards.has(index)) {
        showMaskedFace(cardEl);
      }
      if (state.matchedIndices.has(index)) {
        cardEl.classList.add("matched");
        setCardAria(cardEl, index, "matched");
      }
      ui.grid.appendChild(cardEl);
    });
  }

  function resetLevelState() {
    state.flipped = [];
    state.matchedCount = 0;
    state.missesThisRound = 0;
    state.lockBoard = false;
    state.matchedIndices = new Set();
    state.pressureMatches = 0;
  }

  function startNeuroEffects() {
    clearInterval(state.neuroJammerId);
    clearInterval(state.neuroRotateId);

    state.neuroJammerId = setInterval(() => {
      if (!state.gameRunning || state.mode !== "neuro-raid") return;
      ui.grid.classList.add("is-jammed");
      setTimeout(() => ui.grid.classList.remove("is-jammed"), 520);
    }, 10000);

    state.neuroRotateId = setInterval(() => {
      if (!state.gameRunning || state.mode !== "neuro-raid") return;
      ui.grid.classList.toggle("is-rotating");
      reshuffleUnmatchedDeck();
    }, 15000);
  }

  function reshuffleUnmatchedDeck() {
    if (!state.gameRunning || state.lockBoard || state.flipped.length) return;
    const unmatchedIndexes = state.deck
      .map((_, index) => index)
      .filter((index) => !state.matchedIndices.has(index));

    if (unmatchedIndexes.length < 2) return;

    const unmatchedCards = shuffle(unmatchedIndexes.map((index) => state.deck[index]));
    unmatchedIndexes.forEach((deckIndex, localIndex) => {
      state.deck[deckIndex] = unmatchedCards[localIndex];
    });
    renderBoard();
    setStatus("Neuro shift: board scrambled.", "warning");
  }

  function startTimer() {
    if (state.secondsLeft === null) return;
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      state.secondsLeft -= 1;
      ui.hudTimer.textContent = formatTime(state.secondsLeft);

      if (state.secondsLeft <= 10 && state.secondsLeft > 0) {
        setStatus("Time is running out.", "warning");
      }

      if (state.secondsLeft <= 0) {
        clearInterval(state.timerId);
        state.secondsLeft = 0;
        updateHud();
        endGame(false, "Time ran out.");
      }
    }, 1000);
  }

  function beginRound(isFreshRun = false) {
    const keepRunningTimer = (state.mode === "time-attack" || state.mode === "neuro-raid") && !isFreshRun;
    clearPendingActions(!keepRunningTimer);

    resetLevelState();

    if (state.mode === "campaign") {
      const level = currentLevel();
      state.secondsLeft = level.time;
      state.movesLeft = null;
      buildDeck(level.pairs);
      updateRoundBrief("Focus: memory consistency. Tip: map the board in chunks, not single cards.");
      setStatus(`Campaign level ${level.id}: find ${level.pairs} pairs.`);
      startTimer();
    } else if (state.mode === "time-attack") {
      const pairs = Math.min(6, 3 + Math.floor((state.roundNumber - 1) / 2));
      state.movesLeft = null;
      buildDeck(pairs);
      if (isFreshRun) {
        state.secondsLeft = 90;
        startTimer();
      }
      updateRoundBrief("Focus: speed recall. Tip: prioritize uncertain zones first.");
      setStatus(`Time Attack wave ${state.roundNumber}: clear ${pairs} pairs before timer ends.`);
    } else if (state.mode === "endless") {
      const pairs = Math.min(6, 3 + ((state.roundNumber - 1) % 4));
      state.secondsLeft = null;
      state.movesLeft = null;
      buildDeck(pairs);
      updateRoundBrief("Focus: consistency. Tip: avoid autopilot and keep a steady scan pattern.");
      setStatus(`Endless stage ${state.roundNumber}: no timer, keep climbing.`);
    } else if (state.mode === "distractor") {
      const pairs = Math.min(6, 4 + Math.floor((state.roundNumber - 1) / 2));
      state.secondsLeft = 65;
      state.movesLeft = null;
      buildDeck(pairs);
      updateRoundBrief("Focus: attention control. Tip: reconstruct board mentally after each pulse.");
      setStatus(`Distractor ${state.roundNumber}: clear ${pairs} pairs under interruptions.`);
      startTimer();
      startDistractorEffects();
    } else if (state.mode === "target-recall") {
      state.secondsLeft = null;
      state.movesLeft = null;
      buildRecallDeck(targetRecallBoardSize());
      updateRoundBrief("Focus: spatial memory. Memorize highlighted positions, then pick only those tiles.");
      setStatus(`Target Recall Lvl ${state.roundNumber}: memorize ${targetRecallTargetCount()} targets.`);
    } else if (state.mode === "afterimage") {
      const pairs = Math.min(6, 4 + Math.floor((state.roundNumber - 1) / 2));
      state.secondsLeft = 72;
      state.movesLeft = null;
      buildDeck(pairs);
      updateRoundBrief("Focus: working memory + inhibition. Card faces flash briefly, then mask out.");
      setStatus(`Afterimage ${state.roundNumber}: memorize fast, then match from memory.`);
      startTimer();
      startSignalCheck();
    } else if (state.mode === "memory-lock") {
      const pairs = Math.min(6, 4 + Math.floor((state.roundNumber - 1) / 2));
      state.secondsLeft = 78;
      state.movesLeft = null;
      buildDeck(pairs);
      updateRoundBrief("Focus: recall discipline. A card shows real face once for 1.5s, then stays masked forever.");
      setStatus(`Memory Lock ${state.roundNumber}: each card reveals once, then locks to mask.`);
      startTimer();
    } else if (state.mode === "limited-moves") {
      const pairs = Math.min(6, 4 + Math.floor((state.roundNumber - 1) / 2));
      state.secondsLeft = null;
      state.movesLeft = 16 + state.roundNumber * 2;
      buildDeck(pairs);
      updateRoundBrief("Focus: planning. Tip: only flip cards that test a concrete hypothesis.");
      setStatus(`Limited Moves puzzle ${state.roundNumber}: clear ${pairs} pairs in ${state.movesLeft} moves.`);
    } else if (state.mode === "neuro-raid") {
      state.movesLeft = null;
      buildDeck(6);
      if (isFreshRun) {
        state.secondsLeft = 45;
        startTimer();
      }
      updateRoundBrief("Focus: adaptation. Tip: reset your mental map after every scramble.");
      setStatus(`Neuro Raid ${state.roundNumber}: survive pressure and clear 6 pairs.`);
      startNeuroEffects();
    }

    applyEventRule();

    renderBoard();
    if (state.mode === "target-recall") {
      startTargetRecallRevealPhase();
    } else if (state.mode === "afterimage") {
      startAfterimageRevealPhase();
    }
    updateHud();
  }

  function registerMiss() {
    const level = currentLevel();
    const penalty = state.mode === "campaign" ? level.missPenalty : state.mode === "neuro-raid" ? 12 : 8;
    const extraPenalty = state.activeEventRule && state.activeEventRule.id === "panic-tax" ? 7 : 0;
    state.score = Math.max(0, state.score - penalty - extraPenalty);
    state.streak = 0;
    state.missesThisRound += 1;
    state.lastMissAt = performance.now();

    if (state.mode === "neuro-raid" && state.secondsLeft !== null) {
      state.secondsLeft = Math.max(0, state.secondsLeft - 3);
      if (state.secondsLeft === 0) {
        updateHud();
        endGame(false, "Neuro Raid failed: penalty drained your timer.");
        return;
      }
    }

    setStatus("No match, try again.", "warning");
    updateHud();
  }

  function registerMatch() {
    const level = currentLevel();
    const basePoints =
      state.mode === "campaign"
        ? level.matchPoints
        : state.mode === "time-attack"
          ? 110
          : state.mode === "endless"
            ? 95
            : state.mode === "afterimage"
              ? 140
            : state.mode === "memory-lock"
              ? 135
            : state.mode === "limited-moves"
              ? 120
              : state.mode === "neuro-raid"
                ? 145
                : 130;

    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    const streakBonus = Math.max(0, state.streak - 1) * 10;
    state.score += basePoints + streakBonus;
    state.matchedCount += 1;
    state.totalPairsFound += 1;

    if (state.lastMissAt) {
      state.recoverySamples.push((performance.now() - state.lastMissAt) / 1000);
      state.lastMissAt = null;
    }

    if (state.secondsLeft !== null && state.secondsLeft <= 10) {
      state.pressureMatches += 1;
      if (state.pressureMatches >= 3) unlockAchievement("calm-pressure");
    }

    if (state.matchedCount === 1) unlockAchievement("first-match");
    if (state.bestStreak >= 3) unlockAchievement("streak-3");

    setStatus("Great. Pair found.");
    updateHud();
  }

  function currentRoundTargetPairs() {
    if (state.mode === "campaign") return currentLevel().pairs;
    if (state.mode === "time-attack") return Math.min(6, 3 + Math.floor((state.roundNumber - 1) / 2));
    if (state.mode === "endless") return Math.min(6, 3 + ((state.roundNumber - 1) % 4));
    if (state.mode === "distractor") return Math.min(6, 4 + Math.floor((state.roundNumber - 1) / 2));
    if (state.mode === "target-recall") return targetRecallTargetCount();
    if (state.mode === "afterimage") return Math.min(6, 4 + Math.floor((state.roundNumber - 1) / 2));
    if (state.mode === "memory-lock") return Math.min(6, 4 + Math.floor((state.roundNumber - 1) / 2));
    if (state.mode === "limited-moves") return Math.min(6, 4 + Math.floor((state.roundNumber - 1) / 2));
    if (state.mode === "neuro-raid") return 6;
    return 6;
  }

  function checkMoveFailure() {
    if (state.mode !== "limited-moves" || state.movesLeft === null || !state.gameRunning) return false;
    if (state.movesLeft <= 0 && state.matchedCount < currentRoundTargetPairs()) {
      endGame(false, "No moves left.");
      return true;
    }
    return false;
  }

  function checkRoundCompleted() {
    const targetPairs = currentRoundTargetPairs();
    if (state.matchedCount !== targetPairs) return;

    if (state.missesThisRound === 0) unlockAchievement("clean-level");
    if (state.secondsLeft !== null && state.secondsLeft >= 20) unlockAchievement("speed-clear");
    if (state.missesThisRound === 0 && state.totalFlips >= 10) unlockAchievement("impulse-guard");

    if (state.roundNumber >= 3) unlockAchievement("marathon");

    if (state.mode === "campaign") {
      clearInterval(state.timerId);
      const levelBonus = currentLevel().clearBonus + (state.secondsLeft || 0) * 2;
      state.score += levelBonus;
      updateHud();

      if (state.levelIndex < campaignLevels.length - 1) {
        state.levelIndex += 1;
        state.roundNumber += 1;
        setStatus(`Level cleared. Bonus +${levelBonus}. Next level loading...`);
        state.levelTransitionId = setTimeout(() => beginRound(true), 1200);
        return;
      }

      unlockAchievement("all-levels");
      endGame(true, `Campaign complete. Final bonus +${levelBonus}.`);
      return;
    }

    if (state.mode === "time-attack") {
      state.roundNumber += 1;
      const bonus = 80 + state.roundNumber * 5;
      state.score += bonus;
      updateHud();
      setStatus(`Wave clear. Bonus +${bonus}. Next wave.`);
      state.levelTransitionId = setTimeout(() => beginRound(false), 650);
      return;
    }

    if (state.mode === "endless") {
      state.roundNumber += 1;
      state.levelIndex += 1;
      const bonus = 60 + state.roundNumber * 8;
      state.score += bonus;
      updateHud();
      setStatus(`Stage clear. Bonus +${bonus}. Next stage.`);
      state.levelTransitionId = setTimeout(() => beginRound(false), 650);
      return;
    }

    if (state.mode === "limited-moves") {
      state.roundNumber += 1;
      const bonus = 90 + state.roundNumber * 10 + Math.max(0, state.movesLeft || 0) * 4;
      state.score += bonus;
      updateHud();
      setStatus(`Puzzle solved. Bonus +${bonus}. Next puzzle.`);
      state.levelTransitionId = setTimeout(() => beginRound(false), 700);
      return;
    }

    if (state.mode === "distractor") {
      state.roundNumber += 1;
      const bonus = 95 + state.roundNumber * 9;
      state.score += bonus;
      updateHud();
      setStatus(`Focus round clear. Bonus +${bonus}. Next disruption.`);
      state.levelTransitionId = setTimeout(() => beginRound(false), 700);
      return;
    }

    if (state.mode === "target-recall") {
      if (state.roundNumber >= 30) {
        endGame(true, "Target Recall mastered. You completed level 30.");
        return;
      }

      state.roundNumber += 1;
      const boardSizeText = state.roundNumber === 20 ? " +10 cards added." : "";
      const bonus = 110 + state.roundNumber * 7;
      state.score += bonus;
      updateHud();
      setStatus(`Recall clear. Bonus +${bonus}. Next level.${boardSizeText}`);
      state.levelTransitionId = setTimeout(() => beginRound(false), 800);
      return;
    }

    if (state.mode === "afterimage") {
      state.roundNumber += 1;
      const bonus = 100 + state.roundNumber * 10 + state.signalHits * 3;
      state.score += bonus;
      updateHud();
      setStatus(`Afterimage clear. Bonus +${bonus}. Next memory test.`);
      state.levelTransitionId = setTimeout(() => beginRound(false), 700);
      return;
    }

    if (state.mode === "memory-lock") {
      state.roundNumber += 1;
      const bonus = 95 + state.roundNumber * 9;
      state.score += bonus;
      updateHud();
      setStatus(`Memory Lock clear. Bonus +${bonus}. Next lock stage.`);
      state.levelTransitionId = setTimeout(() => beginRound(false), 700);
      return;
    }

    if (state.mode === "neuro-raid") {
      state.roundNumber += 1;
      const bonus = 120 + state.roundNumber * 12;
      state.score += bonus;
      updateHud();
      setStatus(`Raid cleared. Bonus +${bonus}. Next raid.`);
      state.levelTransitionId = setTimeout(() => beginRound(false), 700);
      return;
    }

    endGame(true, "Run completed.");
  }

  function onCardClick(event) {
    if (!state.gameRunning || state.lockBoard) return;

    const cardEl = event.currentTarget;
    const idx = Number(cardEl.dataset.index);
    const card = state.deck[idx];

    if (!Number.isInteger(idx) || cardEl.classList.contains("matched") || cardEl.classList.contains("revealed")) {
      return;
    }

    if (state.mode === "memory-lock") {
      const isLocked = state.lockedMemoryCards.has(idx);

      cardEl.classList.add("revealed");
      setCardAria(cardEl, idx, "revealed");
      playSound(audio.cardFlip);

      if (isLocked) {
        showMaskedFace(cardEl);
      } else {
        restoreCardFace(cardEl);
        clearTimeout(state.memoryLockRevealTimeouts[idx]);
        state.memoryLockRevealTimeouts[idx] = setTimeout(() => {
          if (!state.gameRunning) return;
          state.lockedMemoryCards.add(idx);
          showMaskedFace(cardEl);
        }, 1500);
      }

      state.flipped.push({ index: idx, pairId: card.pairId, element: cardEl });
      if (state.flipped.length < 2) {
        updateHud();
        return;
      }

      state.lockBoard = true;
      const [first, second] = state.flipped;

      if (first.pairId === second.pairId) {
        clearTimeout(state.memoryLockRevealTimeouts[first.index]);
        clearTimeout(state.memoryLockRevealTimeouts[second.index]);
        state.lockedMemoryCards.add(first.index);
        state.lockedMemoryCards.add(second.index);
        first.element.classList.add("matched");
        second.element.classList.add("matched");
        first.element.classList.remove("revealed");
        second.element.classList.remove("revealed");
        showMaskedFace(first.element);
        showMaskedFace(second.element);
        setCardAria(first.element, first.index, "matched");
        setCardAria(second.element, second.index, "matched");
        state.matchedIndices.add(first.index);
        state.matchedIndices.add(second.index);
        state.flipped = [];
        state.lockBoard = false;
        registerMatch();
        checkRoundCompleted();
        return;
      }

      state.flipBackId = setTimeout(() => {
        first.element.classList.remove("revealed");
        second.element.classList.remove("revealed");
        state.lockedMemoryCards.add(first.index);
        state.lockedMemoryCards.add(second.index);
        showMaskedFace(first.element);
        showMaskedFace(second.element);
        setCardAria(first.element, first.index, "hidden");
        setCardAria(second.element, second.index, "hidden");
        state.flipped = [];
        state.lockBoard = false;
        registerMiss();
      }, 650);
      return;
    }

    if (state.mode === "target-recall") {
      if (state.recallInReveal || state.recallHits.has(idx)) return;

      state.lockBoard = true;
      cardEl.classList.add("revealed");
      restoreCardFace(cardEl);
      setCardAria(cardEl, idx, "revealed guess");
      playSound(audio.cardFlip);

      state.flipBackId = setTimeout(() => {
        cardEl.classList.remove("revealed");
        showMaskedFace(cardEl);

        if (state.recallTargets.has(idx)) {
          cardEl.classList.add("matched");
          state.recallHits.add(idx);
          state.matchedCount += 1;
          state.totalPairsFound += 1;
          state.score += 65;
          setStatus(`Correct tile ${state.recallHits.size}/${state.recallTargets.size}.`);
          unlockAchievement("first-match");
          if (state.recallHits.size >= 3) unlockAchievement("streak-3");
          state.lockBoard = false;
          updateHud();
          checkRoundCompleted();
          return;
        }

        state.score = Math.max(0, state.score - 25);
        state.missesThisRound += 1;
        updateHud();
        cardEl.classList.add("wrong-guess");
        setStatus("Wrong tile selected. Run ended.", "danger");
        endGame(false, "Target Recall failed: wrong position selected.");
      }, 320);
      return;
    }

    const now = performance.now();
    if (state.lastActionAt !== null) {
      const delaySec = (now - state.lastActionAt) / 1000;
      state.decisionSamples.push(delaySec);

      if ((state.mode === "neuro-raid" && delaySec > 1.8) || (state.activeEventRule && state.activeEventRule.id === "fragile-combo" && delaySec > 1.35)) {
        state.streak = 0;
        setStatus("Reaction delay broke your combo.", "warning");
      }
    }
    state.lastActionAt = now;

    state.totalFlips += 1;
    if (state.mode === "limited-moves" && state.movesLeft !== null) {
      state.movesLeft = Math.max(0, state.movesLeft - 1);
    }

    cardEl.classList.add("revealed");
    if (state.mode === "afterimage") {
      showMaskedFace(cardEl);
    } else {
      cardEl.classList.remove("masked");
      restoreCardFace(cardEl);
    }
    setCardAria(cardEl, idx, "revealed");
    playSound(audio.cardFlip);
    state.flipped.push({ index: idx, pairId: card.pairId, element: cardEl });

    updateHud();

    if (state.flipped.length < 2) return;

    state.lockBoard = true;
    const [first, second] = state.flipped;

    if (first.index === second.index) {
      first.element.classList.remove("revealed");
      if (state.mode !== "afterimage") first.element.classList.remove("masked");
      setCardAria(first.element, first.index, "hidden");
      state.flipped = [];
      state.lockBoard = false;
      checkMoveFailure();
      return;
    }

    if (first.pairId === second.pairId) {
      first.element.classList.add("matched");
      second.element.classList.add("matched");
      first.element.classList.remove("revealed");
      second.element.classList.remove("revealed");
      if (state.mode !== "afterimage") {
        restoreCardFace(first.element);
        restoreCardFace(second.element);
      }
      setCardAria(first.element, first.index, "matched");
      setCardAria(second.element, second.index, "matched");
      state.matchedIndices.add(first.index);
      state.matchedIndices.add(second.index);
      state.flipped = [];
      state.lockBoard = false;
      registerMatch();
      checkRoundCompleted();
      checkMoveFailure();
      return;
    }

    state.flipBackId = setTimeout(() => {
      first.element.classList.remove("revealed");
      second.element.classList.remove("revealed");
      if (state.mode !== "afterimage") {
        first.element.classList.remove("masked");
        second.element.classList.remove("masked");
      }
      setCardAria(first.element, first.index, "hidden");
      setCardAria(second.element, second.index, "hidden");
      state.flipped = [];
      state.lockBoard = false;
      registerMiss();
      checkMoveFailure();
    }, 650);
  }

  function resultText() {
    return `${state.playerName || "Player"} scored ${state.score} points and found ${state.totalPairsFound} pairs.`;
  }

  function renderFinalAchievements() {
    ui.finalAchievements.innerHTML = "";
    if (state.achievements.size === 0) {
      ui.finalAchievements.textContent = "No achievements unlocked this run.";
      return;
    }

    achievementCatalog.forEach((achievement) => {
      if (state.achievements.has(achievement.id)) {
        const badge = document.createElement("span");
        badge.textContent = achievement.title;
        ui.finalAchievements.appendChild(badge);
      }
    });
  }

  function buildRunInsights() {
    const avgDecision = averageOf(state.decisionSamples);
    const recovery = averageOf(state.recoverySamples);
    const insights = [];

    if (avgDecision > 1.7) {
      insights.push("Tip: your average decision speed was slow. Scan board in quadrants to reduce hesitation.");
    } else {
      insights.push("Strength: your decision speed stayed efficient through the run.");
    }

    if (state.missesThisRound >= 4) {
      insights.push("Tip: many late-round misses suggest overload. Pause briefly before second flips.");
    }

    if (recovery > 0) {
      insights.push(`Recovery after mistakes averaged ${formatSeconds(recovery)}.`);
    }

    if (state.activeEventRule) {
      insights.push(`You played under rule: ${state.activeEventRule.label}.`);
    }

    if (state.mode === "afterimage") {
      insights.push(
        `Signal checks: ${state.signalHits} hits, ${state.signalMisses} misses, ${state.signalFalseAlarms} false alarms.`
      );
    }

    if (state.mode === "memory-lock") {
      insights.push(`Memory Lock converted ${state.lockedMemoryCards.size} cards into masked recall states.`);
    }

    if (state.mode === "target-recall") {
      insights.push(`Target Recall reached level ${state.roundNumber}.`);
    }

    insights.push(`Training focus for this run: ${modeFocus[state.mode] || "Memory"}.`);
    return insights.join(" ");
  }

  function endGame(clearedAllLevels, message) {
    state.gameRunning = false;
    clearPendingActions();
    stopBackgroundMusic();
    playSound(audio.gameOver);
    ui.finalTitle.textContent = clearedAllLevels ? "Run Completed" : "Game Over";
    ui.finalSummary.textContent = `${resultText()} ${message} ${buildRunInsights()}`;
    renderFinalAchievements();
    showScreen(ui.endScreen);
  }

  function startNewRun(playerName, mode) {
    state.mode = mode;
    state.playerName = playerName || "Player";
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.levelIndex = 0;
    state.roundNumber = 1;
    state.totalPairsFound = 0;
    state.achievements = new Set();
    state.movesLeft = null;
    state.totalFlips = 0;
    state.decisionSamples = [];
    state.lastActionAt = null;
    state.lastMissAt = null;
    state.recoverySamples = [];
    state.matchedIndices = new Set();
    state.pressureMatches = 0;
    state.activeEventRule = null;
    state.eventIntervals = [];
    state.signalActive = false;
    state.signalHits = 0;
    state.signalMisses = 0;
    state.signalFalseAlarms = 0;
    state.recallTargets = new Set();
    state.recallHits = new Set();
    state.recallRevealId = null;
    state.recallInReveal = false;
    state.afterimageRevealId = null;
    state.lockedMemoryCards = new Set();
    state.memoryLockRevealTimeouts = {};

    state.gameRunning = true;
    renderAchievements();
    showScreen(ui.gameScreen);
    startBackgroundMusic();
    beginRound(true);
  }

  function restartCurrentLevel() {
    if (!state.gameRunning) return;
    clearPendingActions(state.mode !== "time-attack" && state.mode !== "neuro-raid");
    state.streak = 0;
    state.flipped = [];
    state.lockBoard = false;
    if (state.mode === "time-attack" || state.mode === "neuro-raid") {
      setStatus("Wave restarted with remaining time.");
      beginRound(false);
      return;
    }
    setStatus("Round restarted.");
    beginRound(true);
  }

  function bindEvents() {
    ui.startForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const playerName = ui.playerNameInput.value.trim();
      const mode = ui.gameModeSelect.value;
      startNewRun(playerName, mode);
    });

    ui.gameModeSelect.addEventListener("change", () => {
      updateModeHelp(ui.gameModeSelect.value);
    });

    ui.playAgainBtn.addEventListener("click", () => {
      showScreen(ui.startScreen);
      ui.playerNameInput.focus();
    });

    ui.restartLevelBtn.addEventListener("click", () => {
      restartCurrentLevel();
    });

    ui.quitBtn.addEventListener("click", () => {
      endGame(false, "Run aborted by player.");
    });

    document.addEventListener("keydown", (event) => {
      if (event.code !== "Space" || !state.gameRunning || state.mode !== "afterimage") return;
      event.preventDefault();

      if (state.signalActive) {
        state.signalActive = false;
        clearTimeout(state.signalTimeoutId);
        state.signalHits += 1;
        state.score += 20;
        setStatus("Signal captured. Focus bonus +20.");
      } else {
        state.signalFalseAlarms += 1;
        state.score = Math.max(0, state.score - 10);
        setStatus("False signal press. Inhibition penalty.", "warning");
      }
      updateHud();
    });

    if (ui.audioToggle) {
      ui.audioToggle.addEventListener("click", () => {
        state.audioEnabled = !state.audioEnabled;
        updateAudioToggle();

        if (state.audioEnabled) {
          startBackgroundMusic();
        } else {
          stopBackgroundMusic();
        }
      });
    }
  }

  bindEvents();
  renderAchievements();
  updateAudioToggle();
  updateModeHelp("campaign");
  showScreen(ui.startScreen);
});
