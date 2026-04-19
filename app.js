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
    daily: "Daily Challenge",
  };

  const achievementCatalog = [
    { id: "first-match", title: "First Match", text: "Find your first pair." },
    { id: "streak-3", title: "Combo Chef", text: "Reach 3-match streak." },
    { id: "clean-level", title: "Clean Run", text: "Clear a level with zero misses." },
    { id: "speed-clear", title: "Speed Slice", text: "Clear with over 20s left." },
    { id: "all-levels", title: "Bistro Legend", text: "Beat all Campaign levels." },
    { id: "marathon", title: "Marathon", text: "Clear 3 rounds in one run." },
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
    dailySeed: "",
    audioEnabled: true,
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
    hudTurn: document.querySelector("#hud-turn"),
    scoreA: document.querySelector("#score-a span"),
    bestStreak: document.querySelector("#best-streak span"),
    statusText: document.querySelector("#status-text"),
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
    clearTimeout(state.levelTransitionId);
    clearTimeout(state.flipBackId);
    state.levelTransitionId = null;
    state.flipBackId = null;
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
    } else {
      ui.hudLevel.textContent = "Daily";
    }

    ui.hudTimer.textContent = state.secondsLeft === null ? "--:--" : formatTime(state.secondsLeft);
    ui.hudTurn.textContent = modeLabels[state.mode];
    ui.scoreA.textContent = state.score;
    ui.bestStreak.textContent = state.bestStreak;
    ui.result.textContent = state.totalPairsFound;
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
    button.setAttribute("aria-label", "Memory card");

    const img = document.createElement("img");
    img.src = card.img;
    img.alt = card.name;

    button.appendChild(img);
    button.addEventListener("click", onCardClick);
    return button;
  }

  function renderBoard() {
    ui.grid.innerHTML = "";
    state.deck.forEach((card, index) => {
      const cardEl = createCardElement(card, index);
      ui.grid.appendChild(cardEl);
    });
  }

  function resetLevelState() {
    state.flipped = [];
    state.matchedCount = 0;
    state.missesThisRound = 0;
    state.lockBoard = false;
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
    const keepRunningTimer = state.mode === "time-attack" && !isFreshRun;
    clearPendingActions(!keepRunningTimer);

    resetLevelState();

    if (state.mode === "campaign") {
      const level = currentLevel();
      state.secondsLeft = level.time;
      buildDeck(level.pairs);
      setStatus(`Campaign level ${level.id}: find ${level.pairs} pairs.`);
      startTimer();
    } else if (state.mode === "time-attack") {
      const pairs = Math.min(6, 3 + Math.floor((state.roundNumber - 1) / 2));
      buildDeck(pairs);
      if (isFreshRun) {
        state.secondsLeft = 90;
        startTimer();
      }
      setStatus(`Time Attack wave ${state.roundNumber}: clear ${pairs} pairs before timer ends.`);
    } else if (state.mode === "endless") {
      const pairs = Math.min(6, 3 + ((state.roundNumber - 1) % 4));
      state.secondsLeft = null;
      buildDeck(pairs);
      setStatus(`Endless stage ${state.roundNumber}: no timer, keep climbing.`);
    } else {
      const dateKey = new Date().toISOString().slice(0, 10);
      state.dailySeed = `${dateKey}:${state.playerName.toLowerCase()}`;
      const rng = seededRandom(hashText(state.dailySeed));
      state.secondsLeft = 75;
      buildDeck(6, rng);
      setStatus("Daily Challenge: one fixed board per day.");
      startTimer();
    }

    renderBoard();
    updateHud();
  }

  function registerMiss() {
    const level = currentLevel();
    const penalty = state.mode === "campaign" ? level.missPenalty : 8;
    state.score = Math.max(0, state.score - penalty);
    state.streak = 0;
    state.missesThisRound += 1;
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
            : 130;

    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    const streakBonus = Math.max(0, state.streak - 1) * 10;
    state.score += basePoints + streakBonus;
    state.matchedCount += 1;
    state.totalPairsFound += 1;

    if (state.matchedCount === 1) unlockAchievement("first-match");
    if (state.bestStreak >= 3) unlockAchievement("streak-3");

    setStatus("Great. Pair found.");
    updateHud();
  }

  function currentRoundTargetPairs() {
    if (state.mode === "campaign") return currentLevel().pairs;
    if (state.mode === "time-attack") return Math.min(6, 3 + Math.floor((state.roundNumber - 1) / 2));
    if (state.mode === "endless") return Math.min(6, 3 + ((state.roundNumber - 1) % 4));
    return 6;
  }

  function checkRoundCompleted() {
    const targetPairs = currentRoundTargetPairs();
    if (state.matchedCount !== targetPairs) return;

    if (state.missesThisRound === 0) unlockAchievement("clean-level");
    if (state.secondsLeft !== null && state.secondsLeft >= 20) unlockAchievement("speed-clear");

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

    endGame(true, "Daily challenge completed.");
  }

  function onCardClick(event) {
    if (!state.gameRunning || state.lockBoard) return;

    const cardEl = event.currentTarget;
    const idx = Number(cardEl.dataset.index);
    const card = state.deck[idx];

    if (!Number.isInteger(idx) || cardEl.classList.contains("matched") || cardEl.classList.contains("revealed")) {
      return;
    }

    cardEl.classList.add("revealed");
    playSound(audio.cardFlip);
    state.flipped.push({ index: idx, pairId: card.pairId, element: cardEl });

    if (state.flipped.length < 2) return;

    state.lockBoard = true;
    const [first, second] = state.flipped;

    if (first.index === second.index) {
      first.element.classList.remove("revealed");
      state.flipped = [];
      state.lockBoard = false;
      return;
    }

    if (first.pairId === second.pairId) {
      first.element.classList.add("matched");
      second.element.classList.add("matched");
      first.element.classList.remove("revealed");
      second.element.classList.remove("revealed");
      state.flipped = [];
      state.lockBoard = false;
      registerMatch();
      checkRoundCompleted();
      return;
    }

    state.flipBackId = setTimeout(() => {
      first.element.classList.remove("revealed");
      second.element.classList.remove("revealed");
      state.flipped = [];
      state.lockBoard = false;
      registerMiss();
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

  function endGame(clearedAllLevels, message) {
    state.gameRunning = false;
    clearPendingActions();
    stopBackgroundMusic();
    playSound(audio.gameOver);
    ui.finalTitle.textContent = clearedAllLevels ? "Run Completed" : "Game Over";
    ui.finalSummary.textContent = `${resultText()} ${message}`;
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

    state.gameRunning = true;
    renderAchievements();
    showScreen(ui.gameScreen);
    startBackgroundMusic();
    beginRound(true);
  }

  function restartCurrentLevel() {
    if (!state.gameRunning) return;
    clearPendingActions(state.mode !== "time-attack");
    state.streak = 0;
    state.flipped = [];
    state.lockBoard = false;
    if (state.mode === "time-attack") {
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
  showScreen(ui.startScreen);
});
