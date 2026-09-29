
# Shuttle Tactics 🏸

A turn-based 3D badminton singles game built with vanilla JavaScript and Three.js.

Instead of controlling your player in real time, you make tactical decisions for every shot. Choose your stroke, recovery position, and anticipation to outplay the CPU.

## Play Online

🏸 **[Play Shuttle Tactics](https://shuttletactics.ashrafkamarudin.com/)**

Play directly in your browser. No installation required!

## Features

- 3D badminton court with animated players and shuttlecock
- Turn-based singles gameplay against a CPU
- Distance-based shuttle flight and trajectory simulation
- Continuous player movement and recovery
- Trajectory-based interception with racket reach and lunging
- Anticipation that affects reaction time and contact quality
- Shot quality that influences accuracy, depth, and fault probability
- Net and out faults
- CPU decision-making with imperfect information
- Rally logs with interception and recovery details
- Adjustable camera with a default courtside perspective

## How to Play

Each turn, choose three things:

1. **Stroke:** Straight clear, cross clear, straight drop, or cross drop.
2. **Recovery:** Front left, front right, center left, center right, rear left, or rear right.
3. **Anticipation:** Neutral, front left, front right, rear left, or rear right.

Your player attempts the selected shot and moves towards the chosen recovery position while the shuttle is in flight.

Correct anticipation helps you intercept earlier and produce better returns. Poor positioning can result in stretched contact, weaker shots, or a missed interception.

Win points by forcing your opponent out of position or causing them to make an error.

## Getting Started

No installation or build tools are required.

1. Download or clone the project.
2. Open `index.html` in a modern browser.
3. Start a match and play!

An internet connection is required to load Three.js from its CDN.

## Configuration

Gameplay parameters, including net and out fault probabilities, movement, shot quality, and CPU difficulty, can be adjusted directly in the JavaScript inside `index.html`.

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Three.js

## Project Structure

```text
shuttle-tactics/
├── index.html
└── README.md
```

## Status

Version 1.0 — Playable prototype.

The game focuses on tactical positioning, anticipation, and realistic consequences for poor contact rather than real-time reflex controls.

## License

No license specified.
