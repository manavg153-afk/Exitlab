# 🚪 ExitLab — Evacuation Stress-Testing Simulator

> **"What if this exit is blocked?"**
> A browser-based evacuation simulator that models pedestrian egress dynamics, bottlenecks, and disruption scenarios through deterministic cellular routing.

![ExitLab Status](https://img.shields.io/badge/Status-Complete-22c55e)
![TypeScript](https://img.shields.io/badge/TypeScript-ES2022-3178c6)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vite](https://img.shields.io/badge/Vite-5-646cff)

---

## 🌟 Key Features

1. **Interactive Canvas Floor-Plan Editor:**
   - Draw walls, doors, exits (with capacity limits), obstacles, and occupant spawn zones.
   - Undo / Redo history stack, full clear, and JSON import/export.
   - Built-in presets: *Demo 2-Wing Bottleneck*, *Classroom Floor*, and *Retail Store*.

2. **Stepwise Simulation Core:**
   - 4-directional cellular automaton with BFS shortest-path distance fields.
   - Deterministic mulberry32 PRNG — identical seeds guarantee tick-for-tick reproducible runs.
   - Finite exit throughput capacity (queues form dynamically at restricted doors).
   - Play, Pause, Single-Step (⏭), Restart, and Instant Run (⚡) with speed controls (0.5x to 5x).

3. **Disruption & What-If Stress Testing:**
   - Block or unblock any emergency exit with a single click.
   - Click simulation cells on the fly to add obstacles/debris.
   - Occupant density slider and repeatable random seed controls.

4. **Analytics & Visualizations:**
   - Live KPI dashboard: clearance duration, peak doorway queue, average/max wait times, and cut-off/trapped count.
   - Color-coded 🔥 **Congestion Heatmap** overlay derived from accumulated agent wait ticks.
   - Dynamic **Recharts** curve comparing remaining occupants over time (current vs. baseline).
   - Plain-language bottleneck explanations flagging exit starvation, doorway saturation, and disconnected zones.

5. **Polish & Reporting:**
   - Print-ready and downloadable Markdown evacuation reports.
   - Keyboard accessibility shortcuts (`Space`, `S`, `R`, `H`).
   - First-time user guided tutorial overlay.

---

## 🚀 60-Second Demo Script

Follow this script to experience the core value proposition:

1. **Baseline Run:**
   - Open ExitLab and select the **"Demo: Two-Wing Complex"** preset.
   - In the *Simulation & Stress-Test* tab, click **"Instant Run (⚡)"**.
   - Note the swift clearance time as occupants disperse through exits **A** and **B**.
   - Click **"📌 Set This Run As Baseline"**.

2. **Introduce Disruption:**
   - In the right-hand *Disruptions* panel, click on **Exit B** to toggle it to **BLOCKED**.
   - Notice how all occupants in the right wing now have to redirect through the narrow 1-cell central hallway.

3. **Observe the Breakdown:**
   - Click **"▶ Play"** or **"Instant Run (⚡)"**.
   - Turn on **"🔥 Heatmap: ON"**.
   - Watch the central bottleneck and Exit A flare red with accumulated wait ticks.
   - Review the metrics delta (e.g. clearance duration surging by +100% or more, peak queues spiking).
   - Read the automatically generated bottleneck explanation card.

4. **Export Report:**
   - Click **"📄 Report"** in the top navigation bar.
   - Inspect the conditions, KPIs, and baseline deltas, then click **"Download .MD"** or **"Print / Save PDF"**.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Play / Pause simulation |
| <kbd>S</kbd> | Advance forward by 1 tick |
| <kbd>R</kbd> | Restart simulation to tick 0 |
| <kbd>H</kbd> | Toggle Congestion Heatmap overlay |

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js (v18+) & npm

### Installation
```bash
# 1. Clone repository
git clone https://github.com/your-username/exitlab.git
cd exitlab

# 2. Install dependencies
npm install

# 3. Run unit tests
npm test

# 4. Start local development server
npm run dev
```

---

## ⚠️ Known Limits & Disclaimer

- Movement is modeled on a 2D discrete grid (0.5m x 0.5m cells, 0.5s per tick, brisk walk speed ≤ 1 m/s) with 4-directional cardinal adjacency.
- Does not simulate dynamic smoke dispersion, fire thermal radiation, panic behaviors, or multi-floor stairs.
- **Results are comparative educational estimates and do NOT constitute legal life-safety, building code, or certified fire engineering validation.**
