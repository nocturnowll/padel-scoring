# 🎾 Atelier Glass — Padel & Tennis Americano Scorer

An elegant, high-fidelity, dark glassmorphism web application designed for scoring Padel & Tennis matches and hosting tournaments right from the courtside.

Live App URL: **[https://nocturnowll.github.io/padel-scoring/](https://nocturnowll.github.io/padel-scoring/)**

---

## ✨ Features

### 1. Atelier Glass Styling System
- Saturation and backdrop-blur glassmorphic panels.
- Custom sports palettes tailored for different environments:
  - **Court Green / Lime Preset** (Default for Padel)
  - **Clay Terracotta Preset** (For clay-court Tennis)
  - **Ocean Blue Preset** (Hard-court Tennis aesthetic)
- Fully responsive mobile & tablet design, ready for phones courtside.

### 2. Tailored Traditional & Custom Sets Scoring
- **Raw Points:** Simple score counters up to a configurable target (e.g. 24 or 32 total points), rotating server automatically every 4 points (Americano style).
- **Tennis/Padel Sets:**
  - **Best of 3 Sets**
  - **Best of 4 Sets** (Allows **2-2 ties**; standings resolves via games & points diff)
  - **Best of 5 Sets**
  - **First to 3 Sets** (Rest to 3)
- **Advantage Customization:** Select between Deciding **Golden Point** (Golden Point at 40-40) or traditional Advantage (win by 2).
- **Tiebreaker Module:** Automatically triggers standard tiebreakers (first to 7 points, win by 2) or Match tiebreakers (first to 10 points) at 6-6 in games.

### 3. Speech Synthesis Vocal Announcer
- Fully integrated with the native **HTML5 Web Speech API** to serve as a voice referee.
- Automatically reads game scores out loud (e.g. *"15 - 30"* or *"Advantage Team A"*).
- Announces key game updates such as *"Service change"*, *"Deuce"*, *"Tiebreak"*, and *"Game, set, and match!"*.
- Supports multi-lingual referee voice engines customizable via the control sidebar (English, Spanish, Swedish).

### 4. Tournament Formats (Matchmaker)
- **Individual Americano:** Generates rotating pair schedules. Handles resting schedules for odd player rosters so everyone gets equal play time.
- **Team Americano:** Schedules fixed doubles pairs in Berger circle round-robins.
- **Mexicano (Dynamic Levels):** From Round 2 onwards, matching is generated dynamically based on active leaderboard standings (e.g. 1st & 4th vs 2nd & 3rd) keeping play competitive.

### 5. Clubhouse Widescreen TV Cast View
- Premium widescreen scoreboard view designed for casting to clubhouse TVs.
- Shows live leaderboard standings on the left, and active round-robin court schedules on the right side-by-side.

---

## 🚀 How to Run Locally

Since this app is built with a browser-native React & Babel architecture, there are **no compilation pipelines required**!

1. Clone this repository:
   ```bash
   git clone https://github.com/nocturnowll/padel-scoring.git
   ```
2. Double-click `index.html` to open it instantly in your web browser.

If you want to run a local dev server to connect your mobile devices on court over the same Wi-Fi network, execute:
```bash
npx serve ./
```

---

## 🛠️ Technology Stack
- **Structure:** HTML5, CSS3 Custom Properties (Atelier Glass design specs)
- **Logic:** React 18, Babel compiler (Standalone CDN), Lucide Icons
- **Speech Synthesis:** Native Web Speech API

---

*Enjoy your padel and tennis matches! 🎾*
