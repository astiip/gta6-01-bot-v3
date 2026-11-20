# NEON HARBOR: RAIN HEIST

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/astiip/gta6-01-bot-v3/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/astiip/gta6-01-bot-v3/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the browser, built for the make.fun **gta6-01** bounty. One rainy night in Meridian Bay. Eight jobs. One way out — the boat at Pier 9.

## Why rain, not sunset

Most open-world crime games chase the golden hour. This one does the opposite: a cold, wet, neon night where the rain never stops. The rain is the whole design — it hides Mara from cameras, it makes the NIGHTHAWK slide through corners, it turns every streetlight into a smear of colour on wet asphalt, and it gives the MBPD a reason to lose her. The city is built to be read in the dark: lit windows, buzzing neon signs, police light bars, and one teal car with a cyan underglow cutting through it all.

## The story

Mara Voss came back to Meridian Bay to rob the Meridian Vault and vanish before dawn. The MBPD, the storm surge rolling up the harbour road, and a rival crew that set a trap at Pier 9 all have other plans. Her crew is one voice on the radio — Wren, who can jam police dispatch when the heat gets too high.

**Eight jobs, one night:**

1. **THE VAULT** — crack the Meridian Vault on foot and take $48,000.
2. **SMOKE & MIRRORS** — lose a two-star wanted level.
3. **THE FENCE** — drive the take to a buyer in the north-east lot.
4. **BLACKOUT** — kill the city grid at Substation 7 (the whole bay goes dark).
5. **PIER 9 MEET** — walk the boardwalk to the buyer, umbrellas up.
6. **DOUBLE CROSS** — survive a 75-second ambush by a rival crew on the pier.
7. **STORM SURGE** — six gates up the harbour road before the water takes it.
8. **CLEAN GETAWAY** — drive to Pier 9, board the boat, and become a ghost.

## What is in the game

- **A living city**: a 10×10 street grid of towers with lit windows and neon signs (NOODLES, HOTEL, KTV, PIER 9…), the NEON HARBOR gantry over the harbour road, the Meridian Vault casino, the NIGHTHAWK Garage, Substation 7, a safehouse, and the Pier 9 boardwalk over the water.
- **Driving with wet-road feel**: the NIGHTHAWK (dark teal, cyan underglow, headlights that cut the rain) slides a little on every corner; traffic cars cruise the grid; carjacking a stranger's car brings the heat.
- **MBPD dispatch**: a 0–5 star wanted system with named units (Calloway, Okonkwo, Mercer, Ibarra, Vance), pursuit cars, roadblocks at 3+ stars, and the Air One helicopter at 5 stars — all tracked on a live PD panel with distances.
- **On-foot moments**: step out of the vault with the take, walk the neon boulevard between umbrella pedestrians, fight the ambush at the pier.
- **Progression that sticks**: money, a respect rank (ROOKIE → LEGEND), and a garage where the take buys engine, armour, nitro and rain tyres. Progress saves in the browser.
- **Crew ability**: press **C** and Wren jams police radios for twelve seconds.
- **Street race side activity**: six gates against the storm surge clock.
- **Three synth radio stations** (RAIN FM, NEON 99, STATIC), rain noise, engine hum and sirens — all synthesised live with the Web Audio API. No audio files, no network requests. The game runs 100% offline.

## How to play

Serve the folder and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Drive or walk (camera-relative on foot) |
| E | Enter / exit a car · interact |
| F | Fire (Pistol / SMG / Shotgun) |
| Q | Swap weapon |
| J | Take the next job |
| C | Wren jams police radio (12 s, 60 s cooldown) |
| G | NIGHTHAWK Garage menu (near the garage, on foot) |
| SHIFT | Nitro boost (once fitted) · run on foot |
| 1 / 2 / 3 | Radio station |
| M | Mute |
| P | Pause |
| ENTER | Start / retry |

## Screenshots

| Shot | Scene |
| --- | --- |
| `screenshots/1-chase.jpg` | Five stars, 223 KM/H under the NEON HARBOR gantry |
| `screenshots/2-city.jpg` | On foot on the neon boulevard, umbrellas up |
| `screenshots/3-heist.jpg` | Out of the Meridian Vault with $48,000, MBPD closing in |
| `screenshots/4-finale.jpg` | The getaway boat at Pier 9 — CLEAN GETAWAY |

## Files

```
game/
  index.html            page + HUD shell
  vendor/three.min.js   three.js r152 (vendored)
  src/config.js         tuning, jobs, locations, ranks
  src/random.js         seeded RNG (the city is deterministic per seed)
  src/util.js           maths helpers
  src/input.js          keyboard
  src/textures.js       procedural canvas textures (windows, neon, roads)
  src/audio.js          synthesised rain, engine, sirens, radio
  src/city.js           Meridian Bay: streets, towers, vault, pier, gantry
  src/vehicles.js       NIGHTHAWK, traffic, police cars, heli, boat
  src/people.js         Mara, umbrella pedestrians, rival crew
  src/police.js         wanted system, dispatch, roadblocks, heli
  src/missions.js       the eight-job story + race + garage hooks
  src/combat.js         hitscan shooting with tracers
  src/weather.js        rain + lightning
  src/save.js           localStorage save
  src/hud.js            HUD, minimap, PD panel, garage menu
  src/shots.js          staged screenshot scenes (?shot=chase|city|heist|finale)
  src/main.js           boot, loop, camera, screens
main.ts                 hands game/ + screenshots/ to the judge (starter plumbing)
serve.ts                tiny static server for local play (starter plumbing)
shots.json              the four staged screenshots
screenshots/            the four staged frames, first one is the cover
```

## Notes

- Meridian Bay, Mara Voss, the NIGHTHAWK and the MBPD are all fictional — no real places, brands or licensed material appear anywhere.
- Everything is procedural or synthesised at runtime: no downloaded models, images or sounds. The only third-party file is the vendored three.js build.
- Deterministic per seed: `?seed=1` always builds the same city; `?shot=chase&seed=1` (and `city`, `heist`, `finale`) stages the matching screenshot scene.

## License

MIT — see [LICENSE](LICENSE).
