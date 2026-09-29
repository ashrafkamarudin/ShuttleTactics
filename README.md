# Shuttle Tactics 🏸

A turn-based 3D badminton singles game built with vanilla JavaScript and Three.js. Choose a stroke, recovery position, and anticipation each turn to outplay the CPU.

## Play

Play online at [shuttletactics.ashrafkamarudin.com](https://shuttletactics.ashrafkamarudin.com/).

Each turn, choose a clear or drop, where to recover, and which direction to anticipate. Correct anticipation and positioning improve interception timing and contact quality. Poor contact can weaken a return or cause an error.

## Development

The app uses native JavaScript modules. Serve the project over HTTP:

```sh
npm install
npm run dev
```

Vite prints the local URL. The Three.js module is loaded from a CDN, so an internet connection is required. Run `npm test` for engine regression tests, `npm run build` for a production build, and `npm run format` to apply the repository's Prettier style.

## Architecture

- `src/engine/` contains court rules, shuttle flight, interception, strokes, faults, and CPU decisions. These modules do not depend on the DOM or Three.js.
- `src/game/controller.js` owns match state, turn progression, and rally animation coordination.
- `src/render/scene.js` builds the Three.js scene, court, player models, shuttle visuals, and camera interaction.
- `src/ui/controls.js` wires player input, shot and recovery selection, scoreboard, and rally log.
- `styles/main.css` contains the responsive interface styles; `index.html` provides the page structure.

The controller currently owns shared mutable match state and the animated rally loop. Further separation would affect state ownership and should be handled as a distinct, tested refactor.
