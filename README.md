# Memory Raid

A stylized vanilla JavaScript memory game with a neon arcade theme, multiple modes, achievements, sound effects, and a full start-to-finish game flow.

## Features

- Start screen with player name entry
- Four game modes
  - Campaign
  - Time Attack
  - Endless
  - Daily Challenge
- Visible score, level, best streak, and timer
- Achievement system
- Restart level button
- Quit run button
- Audio toggle with background music and sound effects
- Game over / run complete screen

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

### Daily Challenge

- Fixed daily board and timer setup.
- Same challenge for everyone on the same day.

## Controls

- Mouse or touch: flip cards
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
