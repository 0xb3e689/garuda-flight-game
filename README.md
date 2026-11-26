# garuda-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/0xb3e689/garuda-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/0xb3e689/garuda-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Garuda** is an original offline 3D archipelago bush-pilot and maritime rescue flight simulator built for desktop Chrome. Pilot the twin-turboprop **Garuda G-4** across a sunlit volcanic archipelago with terraced basalt cliffs, coastal lighthouses, a suspension bridge, and three airstrips complete with PAPI approach lights and windsocks.

### Key Features
- **6-DOF Flight Physics (`flight-physics.js`)**: Angle-of-attack lift curve, aerodynamic stalls, flaps, landing gear drag, ground effect, volcanic thermal updrafts, crosswind shear, fuel range & burn, and G-load / structural impact damage.
- **Built 3D Aircraft & Illuminated Cockpit (`aircraft-model.js`, `cockpit-interior.js`, `procedural-textures.js`)**: NACA airfoil wings, riveted canvas-textured livery (`PK-GRD`), articulated control surfaces, spinning motion-blurred twin props, real-time shadow mapping, and a toggleable 3D cockpit (`C`) with visible exterior props, 3D glass HUD combiner, and live illuminated analog/glass gauges.
- **Four Distinct Sorties & Dynamic Effects (`missions.js`, `effects-particles.js`)**: *Lighthouse Ring Mail*, *Caldera Supply Drop* (parachute cargo release), *Crosswind Cliff Strip*, and *Storm Sea Rescue* (storm rain, distress flares, soft sprite smoke & wingtip contrails).
- **Flown-Bezel HUD & Procedural Audio (`hud-instruments.js`, `audio-engine.js`)**: Pitch ladder, 3D waypoint distance bracket, airspeed/altitude tapes, heading compass, PAPI glideslope readout, fuel range estimator, sortie diagnostics, and synthesized twin-turboprop + cockpit soundscapes.

## Run it

```sh
node serve.ts
# Open http://127.0.0.1:8080 in desktop Chrome
# Package entry into out/:
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=93p1fwth&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
