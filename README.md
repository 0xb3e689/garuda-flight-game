# garuda-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/0xb3e689/garuda-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/0xb3e689/garuda-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Garuda** is an original offline 3D archipelago bush-pilot and maritime rescue flight simulator built for desktop Chrome. Pilot the twin-turboprop **Garuda G-4** across a `9.2 km × 9.2 km` volcanic archipelago with 9 islands, ridged multifractal peaks, Gerstner ocean waves, dynamic weather (`CLEAR / DUSK / RAIN / STORM`), and three runways complete with live PAPI glideslope lamps and windsocks.

### Key Features & Modular Architecture
- **Newtonian 6-DOF Flight & Zone-Based Structural Damage (`flight-physics.js`, `flight-collision.js`, `aircraft-breakup.js`)**: ISA density altitude, aspect-ratio induced drag, AoA lift/stall envelope, gimbal-safe anti-flip clamping, 5-point zone-aware airframe collision (`leftWing`, `rightWing`, `nose`, `tail`, `belly`), glancing wingtip deflection with asymmetric broken-wing roll/yaw torque, symmetric 5-part physical detachment (`leftWing`, `rightWing`, `leftProp`, `rightProp`, `tail`) + nose crush, progressive malfunctions (`PORT/STBD ENG OUT`, `FUEL LEAK`, `FLAPS JAMMED`, `GEAR DAMAGE`), rotational prop spin-down, surface-dependent inelastic crash stopping, delayed post-impact fuel fire (no instant Hollywood explosion), buoyant water ditching, and persistent ground gouge trenches.
- **Built 3D Aircraft & King Air Cockpit (`aircraft-model.js`, `cockpit-interior.js`, `cockpit-controls.js`, `cockpit-gauges.js`, `procedural-textures.js`)**: NACA airfoil wings, riveted livery (`PK-GRD`), ICAO nav lights, toggleable 3D cockpit (`C`) with sculpted ram's-horn yoke, PT6 power/prop/cond pedestal quadrant, articulated 3D pilot hands & sleeves (2-link IK), automatic rain wipers, 3D glass HUD combiner, and 1280×480 live illuminated 6-pack gauges.
- **9.2 km Volcanic Archipelago (`terrain-world.js`, `terrain-height.js`, `ocean-sky.js`, `world-landmarks.js`, `world-foliage.js`)**: `420×420` terrain mesh with normal maps, wave-warped aircraft ocean shadow/reflection, volumetric lighthouse beam, suspension bridge, 860 branching highland trees, 340 coastal palms, 640 craggy boulders, and 64 painted cumulus cloud banks.
- **Four Sorties, Topographic TAWS Radar & Procedural VHF Radio (`missions.js`, `hud-instruments.js`, `hud-radar.js`, `effects-particles.js`, `audio-engine.js`, `camera-rig.js`, `input-controls.js`)**: *Lighthouse Mail*, *Caldera Drop*, *Cliff Crosswind*, and *Storm Rescue* with onboarding Flight Briefing modal, heading-up topographic TAWS radar, thumbnail-clear HUD & outcome debrief cards, and Web Audio turboprop + bandpass VHF radio comms.

## Run it

```sh
node serve.ts
# Open http://127.0.0.1:8080 in desktop Chrome
# Package entry into out/:
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=93p1fwth&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
