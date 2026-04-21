# Memory Raid

A stylized vanilla JavaScript memory game with a neon arcade theme, multiple modes, achievements, sound effects, and a full start-to-finish game flow.

## Features

- Start screen with player name entry
- Four game modes
  - Campaign
  - Time Attack
  - Endless
  - Distractor Mode
- Five advanced training modes
  - Target Recall
  - Afterimage Lab
  - Memory Lock
  - Limited Moves
  - Neuro Raid
- Visible score, level, best streak, and timer
- Visible moves counter, training focus, decision speed, and recovery speed
- Achievement system
- Restart level button
- Quit run button
- Audio toggle with background music and sound effects
- Game over / run complete screen
- Round briefing and run-end learning insights
- Random event rules that can alter round difficulty

## How to play

1. Enter a player name on the start screen.
2. Choose a mode.
3. Click Start New Game.
4. Flip two cards at a time and try to find matching pairs.
5. Matching cards stay revealed and count toward your score.
6. Wrong matches flip back after a short delay.
7. Clear the current round or level before time runs out, depending on the mode.

## Game modes

### Campaign

- Classic progression mode.
- Starts with fewer pairs and becomes harder over time.
- Each new level adds more pairs and increases pressure.

### Time Attack

- Shared timer challenge.
- Clear waves as fast as possible.
- The timer keeps pressure on the entire run.

### Endless

- No fixed end point.
- Keep clearing stage after stage.
- Good for score chasing.

### Distractor Mode

- Timed memory challenge with periodic blackout pulses.
- Trains attention control and recovery after interruptions.

### Target Recall

- Level-based position memory challenge inspired by enchanting minigames.
- Starts with 20 cards and 3 highlighted targets on level 1.
- Every new level adds +1 target card to memorize.
- On level 20 the board expands to 30 cards.
- Max level is 30; one wrong tile ends the run.

### Afterimage Lab

- At round start, card faces are shown briefly for preview.
- After preview, every card is masked to a generic image (correct.png), including when clicked.
- You must remember what was shown even after visual identity disappears.
- Includes signal checks (Space key) to train inhibition and reaction control.

### Memory Lock

- Clicking a card shows the original image once.
- After 1.5 seconds, that card is permanently masked to correct.png for the rest of the round.
- Clicking that same card again shows correct.png, never the original image again.
- Uses pair matching flow, but with permanent per-card masking pressure.

### Limited Moves

- Strategy mode with move budget instead of timer.
- Teaches planning and efficient decision making.

### Neuro Raid

- Extreme pressure mode with one shared run timer.
- Periodic visual jam and board scramble events.
- Misses reduce timer and long hesitation breaks combo momentum.

### Event Rules

- Some rounds roll an active rule (for example Freeze Pulse, Panic Tax, or Fragile Combo).
- In April, a seasonal Easter Shuffle rule may appear and reshuffle unmatched cards mid-round.

## Controls

- Mouse or touch: flip cards
- Keyboard: press Space during signal checks in Afterimage Lab
- Restart Level: resets the current round
- Quit Run: ends the current run
- Audio button: toggles music and effects

## Audio

The game uses the files in the `audio/` folder:

- `background.mp3` for the looping background track
- `cardFlip.mp3` for card reveal sound
- `gameOver.wav` for the end-of-run sound

## Project structure

- `index.html` - game layout and screens
- `style.css` - full visual theme and layout
- `app.js` - game logic
- `images/` - card artwork
- `audio/` - music and sound effects

## Credit

This project started from the original Memory Game idea by Ania Kubow and was expanded into a custom neon arcade version with new modes, UI, and audio.

## License

MIT License

Original code base credit: Ania Kubow
