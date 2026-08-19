# Bloom Busters 🌸🐛

**Guess the garden's magic** — a deduction puzzle game where every level hides its own matching logic.

---

## 🎮 Description

You're a garden guardian! Each level hides a **secret neutralization rule**. Objects at the **top** neutralize targets at the **bottom** — but *what correlates with what* changes every level.

The player **never sees the rule**. They discover it by testing: a correct drop → explosion ✅; a wrong drop → a heart lost 💔. 250 levels across 6 themed worlds, each with unique piece families and objectives.

---

## 🕹️ Controls

### 📱 Mobile (Touch)

| Gesture | Action |
|---|---|
| **Drag** an object from the top toward a target at the bottom | Drop the object on the target |
| **Tap** the pause button ⏸ | Pause the game |

### 💻 Desktop (Mouse + Keyboard)

| Key / Gesture | Action |
|---|---|
| **Click + drag** an object toward a target | Drop the object on the target |
| **Esc** or **P** | Pause the game |
| **Enter** / **Space** | Confirm / Continue |

> 💡 The game uses Pointer Events, so mouse, trackpad and touchscreen all work the same way.

---

## 🎯 Gameplay

### The 8 Secret Rules

Each level uses **one** rule. The player guesses it by testing:

| Rule | What the player sees | Example |
|---|---|---|
| 🎨 By color | Gems of 8 colors | Blue gem goes on blue crystal |
| ⭐ By symbol | Star, heart, cross, arrow… | Star goes on star |
| 🐞 By creature | Elephant, penguin, monkey… | Monkey goes on monkey |
| 🔢 By number | Dominoes with 0–5 pips | Domino ●● goes on domino ●● |
| 🧵 By pattern | Stripes, dots, gingerbread… | Star pattern goes on star pattern |
| 🌱 By element | 6 flowers (water, light, fire…) | 💧 goes on 💧 |
| 🌗 Opposite pairs | Day/night, plus/minus… | ☀️ goes on 🌙 (opposites attract!) |
| 🔀 By position | The order of pieces | 1st piece goes on 1st target |

### Hearts — Your Experiment Budget

You start each level with **5 hearts** ❤️❤️❤️❤️❤️.

- Each mistake costs **1 heart**
- At 0 hearts → **level lost** (but you can retry)
- **Zero mistakes** = 3 stars ⭐⭐⭐

### Worlds

| World | Levels | Piece Family | Main Rule |
|---|---|---|---|
| 🌱 Sprout Meadow | 1–40 | Flowers & pests | By element |
| 🍎 Fruit Grove | 41–80 | 16 fruits | By color + type |
| 🐾 Creature Hollow | 81–120 | 10 animals | By creature + timed |
| 💎 Crystal Falls | 121–160 | 32 gems + 22 symbols | By color + symbol |
| 🁢 Pattern Caverns | 161–200 | 27 dominoes | By number + pattern |
| 🌸 Eternal Bloom | 201–250 | Everything mixed | Random logic + boss |

### Objectives

- 🌸 **Free garden** — destroy all targets
- 🎯 **Score race** — reach the score in X moves
- ⏱ **Time attack** — destroy everything before the timer runs out
- 🎯 **Targeted collect** — neutralize X pieces of a specific type
- 🌸 **Protect the flower** — targets advance toward your flower, stop them!
- 👑 **Boss** — an enemy with multiple HP (every 10 levels)

---

## 🛒 Shop

Buy upgrades with coins earned from levels:

| Item | Price | Effect |
|---|---|---|
| 🌸 Bloom Bonus | 150 | +25% coins per win |
| 🌺 Double Bloom | 600 | ×2 coins per win |
| 🌈 Mega Seeds | 1000 | Combos start at ×2 |
| ❤️ Extra Heart | 800 | +1 heart per level |

---

## 🏗️ Tech

Vanilla JS, Canvas 2D, no framework. 100% of visuals and sounds are real downloaded files (CC0 / CC-BY) — see [CREDITS.md](CREDITS.md).

### Run locally

```bash
python3 -m http.server 8123
# open http://localhost:8123
```

Specifications: [SPEC.md](SPEC.md)
