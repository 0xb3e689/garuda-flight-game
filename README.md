# garuda-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/0xb3e689/garuda-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/0xb3e689/garuda-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Garuda** is an original offline 3D metropolitan & archipelago flight simulator built for desktop Chrome. Fly **4 genuinely distinct 3D aircraft** (`C-172` high-wing strutted trainer, `G-4 Twin` low-wing T-tail turboprop, `CJ-4` swept-wing rear-turbofan business jet, and `A320` wide-body swept-wing airliner) across a `12 km × 12 km` coastal metropolis and volcanic archipelago featuring 6 glass-skyscraper districts across 4 islands, an international airport terminal, a dredged Panamax container harbor, dynamic weather (`CLEAR / DUSK / RAIN / IMC FOG / STORM`), and three runways with ALS, PAPI, and ILS.

### Key Features & Modular Architecture
- **4 Distinct 3D Airframes & Dual G1000 Glass Cockpit (`aircraft-model.js`, `cockpit-interior.js`, `cockpit-controls.js`, `cockpit-gauges.js`, `procedural-textures.js`)**: Unique wing geometry, tail configs, engine layouts, and physics envelopes per aircraft (`C-172`, `G-4 Twin`, `CJ-4 Jet`, `A320`); fully enclosed 3D cabin (`C`) with sub-panel ram's-horn yoke, seamless articulated 3D human pilot hands, automatic rain wipers, and 1280×480 Dual Garmin G1000 (PFD Synthetic Vision + magenta ILS needles + HSI, center VHF/Autopilot FCU, and MFD EIS + Moving Map + CAS).
- **Career Hub: Certifications, Specializations, Missions & Free Flight (`career-hub.js`, `missions.js`, `hud-instruments.js`, `hud-radar.js`, `main.js`)**: Illustrated Certification paths (`PPL`, `MER`, `IR`, `JET`, `ATPL`) with interactive **Training** checklists, **Checkride Exams** (live engine-out recovery, dense IMC ILS, high-speed jet speedbrake, storm passenger comfort), persistent Winged Pilot Badges in the **Logbook**, context-aware `Esc` menus, ring-free flight-plan waypoint navigation, heading-up topographic TAWS radar, and procedural Web Audio engines + VHF comms.
- **Newtonian 6-DOF Flight, Autopilot & Symmetric Damage (`flight-physics.js`, `flight-collision.js`, `aircraft-breakup.js`, `input-controls.js`)**: ISA density altitude, AoA lift/stall envelope, Autopilot HDG/ALT (`P`), ILS localizer/glideslope, speedbrake/spoilers (`X`), elevator trim (`[`/`]`), 5-point zone-aware airframe collision, glancing wingtip deflection with asymmetric roll/yaw torque, symmetric 5-part detachment + nose crush, inelastic crash stopping, delayed post-impact fuel fire, and buoyant water ditching.
- **12 km Metropolitan Archipelago (`terrain-world.js`, `terrain-height.js`, `ocean-sky.js`, `world-landmarks.js`, `world-foliage.js`, `effects-particles.js`, `camera-rig.js`)**: 45–265 m stepped glass skyscrapers across 4 islands, curved international airport terminal with jetways & parked airliners, dredged deep-water harbor with 142 m Panamax container ships & gantry cranes, suspension bridge, lighthouse, Gerstner ocean waves, and aircraft-scaled chase/cockpit/orbit cameras.

## Run it

```sh
node serve.ts
# Open http://127.0.0.1:8080 in desktop Chrome
# Package entry into out/:
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=93p1fwth&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
