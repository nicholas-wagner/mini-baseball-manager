# Mini Baseball Manager — Simulation Math & Gameplay Formula Guide

This document explains **exactly how every pitch, swing, stolen base, defensive play, national heritage power, individual special power, relic, and coaching bonus is calculated** inside the pure TypeScript simulation engine (`src/engine/simulation/` & `src/engine/rpg/`).

---

## 1. Core Philosophy: Real Player Ratings + Seeded "Dice Rolls"

Mini Baseball Manager uses a **tabletop-RPG-inspired probabilistic pitch-by-pitch engine** backed by a deterministic **Mulberry32 Seeded PRNG** (`src/engine/rng/seededRng.ts`).

- **Zero `Math.random()`**: Every pitch derives its own deterministic "dice roll" seed from:
  ```ts
  stepSeed = (session.rngSeed ^ Math.imul(session.stepCounter, 0x9e3779b1)) >>> 0
  ```
- **Attributes Drive the Odds, Dice Rolls Resolve the Play**: Just like classic Strat-O-Matic or tabletop baseball RPGs, every real player's ratings (`1–99`), current condition, handedness platoon, pitch arsenal, relics, coaches, and powers compute exact probabilities (`0.00..1.00`), and seeded RNG rolls (`rng.chance(prob)` / `rng.next()`) resolve each stage sequentially!

---

## 2. How Every One of the 15 Player Attributes Affects Outcomes

| Attribute (`1..99`) | Role | Exact Mathematical Effect in Gameplay | Source Module |
| :--- | :--- | :--- | :--- |
| **`contact`** | Batter | Raises **In-Zone & Out-of-Zone Contact %** (`+0.48%` / `+0.32%` per point vs Pitcher Stuff) and raises **Ball-in-Play Hit %** (`+0.44%` per point vs Stuff). | `pitchResolver.ts` |
| **`power`** | Batter | Drives **Home Run %** on hits (`+0.38%` base × batted-ball & park HR multipliers) and **Double %** (`+0.18%` per point). | `pitchResolver.ts` |
| **`gapPower`** | Batter | Shifts **Double %** (`+0.24%` per point above 60) and **Triple %** (`+0.096%` per point above 60). | `pitchResolver.ts` |
| **`eye`** | Batter | Shrinks **Zone Strike %** (`-0.25%` per point vs Pitcher Control) and cuts **Out-of-Zone Chase %** (`-0.20%` per point above 65), producing more walks & fewer chases. | `pitchResolver.ts` |
| **`bunt`** | Batter | Directly sets **Bunt-Single Success %**: `0.24 + (bunt + bonuses - 0.25 * pitcherFielding - 55) * 0.006`. | `pitchResolver.ts` |
| **`velocity`** | Pitcher | Forms 50% of **Pitcher Stuff** (`(velo + movement) / 2`), sets **Radar Gun MPH**, and slightly penalizes base stealers (`-0.14%` per point above 65). | `pitchResolver.ts`, `pitchArsenals.ts`, `baserunning.ts` |
| **`movement`** | Pitcher | Forms 50% of **Pitcher Stuff**, sharpens breaking-ball whiff/chase bite, and suppresses batter contact/BABIP. | `pitchResolver.ts`, `pitchArsenals.ts` |
| **`control`** | Pitcher | Raises **Strike Zone %** (`+0.25%` per point vs Batter Eye), lowering walks and raising called strikes. | `pitchResolver.ts` |
| **`stamina`** | Pitcher | Controls **Mound Endurance Drain per Pitch** — higher stamina slows fatigue, preventing late-inning velocity drop (`-1..-7 mph`), hanging breakers, and control loss. | `pitcherEndurance.ts`, `baseballEngine.ts` |
| **`speed`** | Batter / Runner | Primary driver of **Base Stealing %** (`+0.78%` per point >= 60, `-1.15%` below 60), boosts **Ground-Ball Infield Single %** (`+0.22%` per point above 60), and boosts **Triple %** (`+0.22%` per point above 65). | `baserunning.ts`, `pitchResolver.ts` |
| **`fielding`** | Defender / Catcher | Lowers **Fielding Error %** (`-0.06%` per point above 60), strengthens **Catcher Throwouts** (`28%` weight vs stealers), and reduces opponent bunt hits (`-0.25×` for pitcher). | `pitchResolver.ts`, `baserunning.ts` |
| **`range`** | Defender | Suppresses **Hits on Balls in Play (BABIP)** (`-0.18%` per point above 62) by turning gap shots and liners into outs. | `pitchResolver.ts` |
| **`arm`** | Defender / Catcher | Primary defensive counter to **Base Steals** (`72%` catcher throw weight) and suppresses **Sacrifice Fly tag-ups** (`-0.25%` per point above 65). | `baserunning.ts`, `pitchResolver.ts` |
| **`clutch`** | All Players | Amplifies **High-Leverage (`LI >= 1.55`) Pressure Modifiers** alongside Mental Traits (`ice_veins`, `pressure_riser`, `pressure_wilt`). | `mentalAndLeverage.ts` |
| **`luck`** | All Players | Subtle universal nudge on **Bloop Hits** (`luckHitProbDelta`), **Borderline Strike Calls** (`luckZoneProbDelta`), and **Error Variance** (`luckErrorMultiplier`). | `mentalAndLeverage.ts`, `pitchResolver.ts` |

---

## 3. Modifier Layers Stacked Before Every Pitch Roll

Before the dice roll on a pitch, `computeEffectiveMatchupNumbers()` in `src/engine/simulation/pitchResolver.ts` builds each actor's **Effective Rating** by summing every active RPG & baseball layer:

```text
effContact = base.contact
           + healthPenalties.contact          (active play-through injury/illness dip)
           + platoon.batterContactDelta       (L/R/Switch handedness matchup)
           + tacticalCall.contactMod          (Contact +9 / Power -8 / Normal 0)
           + hotColdForm.contactDelta         (🔥 On Fire / 🧊 Cold Slump)
           + pitchMatchup.batterContactDelta  (Batter favorite vs weak pitch + repeat read!)
           + mentalPressure.pressureDelta     (Clutch + Mental Trait × Leverage Index LI)
           + veteranSavvy.composureDelta      (Multi-season Career Experience edge)
           + nationalHeritage.batterContact   (Tier 0..3 National Cultural Heritage Power)
           + individualCapstones.contact      (Equipped Skill Tree Capstone Powers)
           + playerRelics.contact             (90s Gear × Equipment Manager multiplier)
           + coachingStaff.battingContact     (Hitting Coach philosophy)
           + clubhouseChemistry.contact       (Synergy Bonds: Bash Brothers, etc.)
           + coEdSynergy.contactDelta         (Co-ed archetype traits & roster mix)
           + activePowerSurge.contactDelta    (⚡ Armed Active Power burst!)
```

The exact same layered composition builds **`effPower`**, **`effEye`**, **`effStuff`**, **`effControl`**, **`defenderRange`**, **`defenderFielding`**, **`defenderArm`**, and **`effSpeed`**.

---

## 4. The 7-Stage Pitch-by-Pitch Dice-Roll Pipeline

Every tap of **Next Pitch** (or every pitch inside **Sim At-Bat / Sim Half-Inning / Sim Full Game**) runs through `stepPitch()` → `resolveSinglePitch()`:

### Stage 0 — Pre-Pitch Tactical Plays (No Pitch Thrown / Special Play)
1. **Intentional Walk (`IBB`)**: Immediate 4-ball walk, forces occupied runners.
2. **Base Steal (`Steal 2B / 3B / Double Steal / Home`)**:
   - Computes `stealProb`:
     ```text
     stealProb = clamp(
       0.62
       + speedCurve(effSpeed)          // Runner Speed + Relics + Baserunning Heritage + Ninja Bunt - Fatigue
       - catcherEdge(arm, fld, popTime)// Catcher Arm (72%) + Fld (28%) + Cannon Arm + Bullpen Coach
       - lhpPickoffHoldBonus * 0.014   // Left-handed pitcher runner-hold advantage
       + pitcherFatigueJump            // Up to +6% jump against tired pitchers
       - (pitcherVelo - 65) * 0.0014   // Harder throwers reach catcher faster
       + baseDifficulty                // 2B: 0, Double: -5%, 3B: -8%, Home: -44%
       + defenseCallMod                // Hold Runner: -8%, Pitchout: -32%
     )
     ```
   - **Dice Roll**: `rng.chance(stealProb)` → **Safe (SB)** vs **Caught Stealing (CS, +1 Out)**.
3. **Bunt (`bunt`)**:
   - Computes `hitProb = clamp(0.24 + (bunt + ninjaBunt + relics + 2*lhbStep - 0.25*pitcherFld - 55) * 0.006, 0.14, 0.72)`.
   - **Dice Roll**: `rng.chance(hitProb)` → **Bunt Single** vs **Bunt Out**.

### Stage 1 — Pitch Selection & Endurance Velocity Drop
- Pitcher chooses a pitch from their **2–3 pitch (`RP`)** or **4–5 pitch (`SP`)** arsenal (or obeys the human manager's **Call Pitch** selection).
- Throwing the same pitch back-to-back in an at-bat triggers a **Pitch Repeat Read** bonus for the batter.
- Pitcher **Endurance (`100% → 0%`)** reduces radar MPH (`-1..-7 mph`), flattens breaking-ball spin, reduces sinker groundball bias, and hurts control.
- Equipped **`Blazing Comet` (+3 mph passive / +6 mph active)** or **`Tornado Slider` (+1 / +2 mph)** adds live radar velocity.

### Stage 2 — Strike Zone Roll ("Is the Pitch a Strike or Ball?")
```text
zoneProb = clamp(0.55 + (effControl - effEye) * 0.0025 + luckZoneShift + catcherFraming, 0.38, 0.76)
inZone   = rng.chance(zoneProb)
```

### Stage 3 — Swing Decision Roll ("Does the Batter Swing?")
```text
swingProb = inZone
  ? clamp(0.67 + tactical.swingMod, 0.52, 0.86)
  : clamp(0.26 - (effEye - 65) * 0.002 + chaseModifiers, 0.08, 0.54)
swings = rng.chance(swingProb)
```
- **If NO Swing**:
  - `inZone === true` → **Called Strike** (or **Strikeout Looking** on 2 strikes).
  - `inZone === false` → **Ball** (or **4-Ball Walk** on 3 balls).

### Stage 4 — Contact & Foul Ball Rolls (When Batter Swings)
```text
contactProb = inZone
  ? clamp(0.76 + (effContact - effStuff) * 0.0048 - whiffBonus, 0.34, 0.95)
  : clamp(0.48 + (effContact - effStuff) * 0.0032 - whiffBonus, 0.16, 0.76)
```
- **Roll 1 (`!rng.chance(contactProb)`)**: **Swinging Strike** (or **Strikeout Swinging** on 2 strikes).
- **Roll 2 (`rng.chance(foulRate)`)** (`31%` in-zone / `62%` out-of-zone): **Foul Ball** (adds strike if `< 2` strikes).

### Stage 5 — Batted-Ball Profile & Ball-in-Play Hit Roll (BABIP)
1. **Batted-Ball Type Roll**: Samples `ground_ball`, `line_drive`, `fly_ball`, or `pop_up` from the batter's profile, pitcher's (fatigue-adjusted) profile, and pitch type (e.g., sinkers induce more grounders).
2. **Hit vs. Out Roll**:
   ```text
   hitProb = clamp(
     0.295
     + (effContact - effStuff) * 0.0044
     + lhbFirstBaseStep * 0.008
     + luckHitShift
     + activePowerHitBonus
     + battedBallBabipShift          // LD +16%, GB -2%, FB -3%, PopUp -22%
     + groundballSpeedAndTurfBonus   // (effSpeed - 60) * 0.0022 + fast turf bonus
     - (defenderRange - 62) * 0.0018 // Defender Range + Heritage + Capstones + Relics
     , 0.04, 0.76
   )
   ```

### Stage 6 — Hit Type Roll (1B / 2B / 3B / HR + Wall Robbery!)
If `rng.chance(hitProb)` succeeds, a single uniform roll `r = rng.next()` buckets the hit:
```text
hrChance     = clamp((0.11 + (effPower - 60) * 0.0038) * bbHrMult * parkHr * powerHrMult, 0.01, 0.56)
tripleChance = clamp((0.045 + (effSpeed - 65) * 0.0022 + gapBonus * 0.4) * parkXbh * powerXbh, 0.015, 0.16)
doubleChance = clamp((0.22 + (effPower - 60) * 0.0018 + gapBonus + ldBonus) * parkXbh * powerXbh, 0.12, 0.44)
```
- `r < hrChance` → **Home Run** *(UNLESS the outfielder has **`Sky-High Leap`** equipped and wins the **22% Wall-Robbery Roll**, converting the HR into a highlight-reel leaping out!)*
- `r < hrChance + tripleChance` → **Triple**
- `r < hrChance + tripleChance + doubleChance` → **Double**
- Otherwise → **Single**

### Stage 7 — Out Resolution Roll (Fielding Error / Double Play / Sac Fly / Clean Out)
If `rng.chance(hitProb)` misses:
1. **Error Roll**: `errorProb = clamp((0.055 - (effFielding - 60) * 0.0006) * posRust * luckErr * heritageErr * ironVacuumErr, 0.006, 0.16)` → **Fielding Error** (batter safe at 1B, unearned runs).
2. **Double Play Roll** (`< 2 outs` & runner on 1B): `36%` on ground balls / `10%` otherwise → **6-4-3 Double Play** (`+2 outs`).
3. **Sacrifice Fly Roll** (`< 2 outs` & runner on 3B): `clamp(0.34 - (effArm - 65) * 0.0025, 0.10, 0.48)` on fly balls → **Sac Fly** (runner scores from 3B, `+1 out`).
4. Otherwise → **Clean Ground Out / Fly Out / Line Out / Pop Out** (`+1 out`).

---

## 5. National Cultural Heritage Powers & Individual Special Powers

Every player carries **both** their **National Cultural Heritage Power** (22+ nations across 5 categories) and any unlocked **Individual Skill Tree Capstone Powers** (11 capstones across Pitcher, Batter, and Fielder branches), implemented in `src/engine/rpg/specialPowerEffects.ts`:

1. **Always-Active Passive Flavor (Scales Tier 0 → Tier 3 & `+30%` in High-Leverage `LI >= 1.55`)**:
   - **Batting Nations** (*USA Eagle Soar*, *DOM Huracán Swing*, *CUB Trogon Flight*, *NCA Motmot Flick*): boost `Contact`, `Power`, `Eye`, `HR Carry`, and `Hype Gain`.
   - **Pitching Nations** (*JPN Kitsune Mirage*, *MEX Serpent Wind*, *CHN Crane Arc*, *GBR Kite Sweep*): boost `Stuff`, `Control`, and `Whiff %`.
   - **Fielding Nations** (*KOR White Tiger Pounce*, *PRI Coquí Leap*, *ARG Condor Glide*, *AUS Kangaroo Bounce*, *ITA Wolf Relay*, *NED Heron Step*, *VEN Troupial Call*, *PAN Harpy Reach*, *ISR Ibex Climb*, *CZE Lynx Read*, *ESP Iberian Pounce*): boost `Range`, `Fielding`, `Arm` (suppressing hits, errors, sac flies, and base steals).
   - **Baserunning Nations** (*CAN Moose Charge*, *BRA Jaguar Dash*, *TPE Magpie Turn*, *COL Hummingbird Jump*, *RSA Springbok Bound*): boost `Steal Speed`, `XBH Stretch`, and cut fatigue drain.
   - **Luck Nations** (*IRL Leprechaun's Luck*): boost bloop `Hit Luck`, borderline `Zone Luck`, and lower errors.
2. **Individual Skill Tree Capstones**:
   - **Pitcher**: `Blazing Comet` (`+3 mph`, `+whiff`), `Ghost Knuckle` (`+whiff`, `+chase`), `Tornado Slider` (`+velo/break/chase`), `Ice Veins` (`+4/+8 control` in high leverage).
   - **Batter**: `Moonshot Bomb-Swing` (`+18% HR carry`, `+4 power`), `Rally Spark` (`+4 contact`, `+20% Hype`), `Laser Eye` (`+5 eye`, `-6% chase`), `Ninja Bunt` (`+18 bunt`, `+5 steal speed`).
   - **Fielder**: `Sky-High Leap` (`+6 range`, `22% HR wall-robbery chance`), `Cannon Arm` (`+12 arm` vs stealers & sac flies), `Iron Vacuum` (`+7 fielding`, `-55% error rate`).
3. **Active Clutch Trigger ("⚡ Unleash Power!" in Game Day)**:
   - Costs **75 Hype**, obeys strict per-game charges (`SP: 2`, `RP: 1`, `Batter: 1` / `2` at Lv 12+) & multi-PA/batter cooldowns, and adds `+8` pitcher fatigue.
   - Applies a dramatic **pre-pitch combat surge** (e.g., `+6 mph / +14 stuff / +16% whiff` for `Blazing Comet`, or `+18 power / 1.85× HR carry` for `Moonshot Bomb`, or category-tuned `+11..+15` surges for every National Heritage Power!), fires bespoke VFX & SFX, and logs the comic starburst banner!

---

- **All-Weather & Shift Modifiers (Live in `pitchResolver.ts`)**:
  - **Defensive Shifts (`DEFENSIVE_SHIFTS`)**:
    - *Infield In*: `-4%` groundball hit chance, `-6%` bunt-single chance, slightly opens extra-base alleys (`+2%` XBH).
    - *No Doubles*: cuts extra-base (`2B`/`3B`) multiplier sharply (`-24%` XBH scale) at the cost of `+2%` groundball singles.
    - *Bunt Defense*: slashes bunt-single probability by **`-16%`** (`buntOutBonus`).
  - **Dynamic Ballpark Weather (`evaluateWeatherSimulationImpact`)**:
    - *Wind Blowing Out / In*: multiplies live Home Run carry by **`0.85×..1.18×`**.
    - *Wet Drizzle*: penalizes pitcher grip control (**`-3` Control**) and increases wet-grass error probability (**`1.12×`**).
- **In-Game Pitch Math & d100 Dice-Roll Inspector**:
  - Every resolved pitch attaches a structured `PlayMathBreakdown` (`effContact`, `effPower`, `effStuff`, `effControl`, `zonePct`, `hitPct`, `hrPct`, `diceRoll` `1..100`, and active modifier badges) — toggleable live on the Game Day Play-by-Play Ticker via **Show Math / Dice Rolls**.
- **Pitcher/Batter Mind Games & Persistent Nemesis Grudges (`pitchMindGames.ts`, `nemesisTracker.ts`)**:
  - **Pitch Target Intent (Pitching)**: `Attack Zone` (`+9%` zone strike prob), `Paint Corners` (`+5` control / `+4%` whiff), `High Heat` (`+2 mph` / `+7%` whiff on fastballs with slightly higher HR carry), and `Bury Chase` (`+11%` chase rate / `+8%` whiff on offspeed pitches at the cost of fewer zone strikes).
  - **Guess Pitch (Batting)**: `Sit Fastball` or `Sit Offspeed` — guessing the pitch family correctly triggers **🎯 LOCKED IN** (`+14 CON / +12 PWR / +6% Hit`), while guessing wrong triggers **😵 FOOLED** (`-8 CON` & `+8%` whiff penalty).
  - **Persistent Nemesis Grudges**: Tracks career batter-vs-pitcher plate appearances across games & seasons — **`🔥 OWNS HIM`** grants `+4 CON / +4 PWR` (`-1 STU / -1 CTL`), **`❄️ REVENGE SPOT`** grants `+4 STU / +3 CTL` (`-1 CON`), and **`⚔️ HEATED GRUDGE`** (4+ career battles) amps both sides (`+2 CON / +1 PWR` vs `+2 STU / +1 CTL`).
- **Automatic Player & Manager Progression & Series Gameplans (`rewards.ts`, `managerActionInbox.ts`, `gmSeasonPulse.ts`)**:
  - Both single played/simmed games (`commitCompletedGame`) and fast-simmed 3-game series (`simNextSeriesRound`, plus 1-per-game focused **Team Practice** with 4 trade-off focuses) automatically award XP, auto-level players (`level * 200` XP curve), auto-bump core role ratings within `statCaps` & `totalRatingBudget`, and grant **Skill Points (`+1 SP`)** specifically for Player & Manager **Special Skill Trees**.
  - **Pre-Series Gameplans** apply live rating & HR-carry trade-offs across both Live 3D Games and Simmed Series (`Swing for the Fences`: `+6 PWR / +18% HR / -5 CON / +5% Whiffs`; `Small-Ball Chaos`: `+6 CON / -6 PWR / -16% HR`; `Bullpen Lockdown`: `+5 CTL / +4 STU / -3 CON`).

---

## 6. How a Full Game Plays Out (Worked Example)

1. **Opening Pitch (Top 1, 0–0 count, LI 0.95)**:
   - Starter throws from a 4–5 pitch arsenal (`100%` fresh endurance).
   - Hype starts at `25/100` for both clubs and climbs on pitches (`+4`), hits (`+16`), and outs (`+14`), scaled by Clubhouse Mental Aura & Co-Ed Synergy.
2. **Mid-Game Strategy (Innings 3–6)**:
   - Repeating the same pitch lets batters sit on it; mixing favorite/weak pitches keeps hitters guessing.
   - Speedsters (`SPD 80+` or *Jaguar Dash*) flash green **Steal 2B / Double Steal** odds (`75%+`); defense counters with **Hold Runner** (`-8%`) or **Pitchout** (`-32%`).
   - Starters tire (`Endurance < 50%`), losing `-2..-5 mph` and flattening sinkers — prompting you to warm up a **Setup / LOOGY / Fireman / Closer** in the Bullpen Phone!
3. **Late-Inning Drama (Innings 7–9 & Extra Innings)**:
   - Tight games spike **Leverage Index (`LI 1.60–2.80`)**, awakening **Clutch / Ice Veins / Pressure Riser / National Heritage Tier 2–3** bonuses while testing **Pressure Wilter** rookies.
   - Once Hype hits `75`, the glowing **⚡ Active Powers Dock** unlocks — arming *Eagle Soar*, *Kitsune Mirage*, *Blazing Comet*, or *Moonshot Bomb* for a game-deciding pitch!
   - Tied games after regulation (5 / 7 / 9 innings) automatically place a **2B Ghost Runner** in the 1st extra inning so every game resolves cleanly with high tension and walk-off fireworks!
