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

5. **AI Simulation Assistant ("Ask about this run"):**
   - Grounded natural language explanations powered by Agent 37 Cloud.
   - Explains clearance time surges, exit throughput imbalances, doorway queues, and baseline comparisons.
   - Strict grounding: only analyzes computed simulation metrics and rule-based explanations; never invents metrics or claims safety certification.

6. **Polish & Reporting:**
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

### Installation & Running Locally
```bash
# 1. Clone repository
git clone https://github.com/your-username/exitlab.git
cd exitlab

# 2. Install dependencies
npm install

# 3. Run unit tests
npm test

# 4. Start local development server (Frontend on http://localhost:5173)
npm run dev

# 5. (Optional) Start Simulation Assistant backend service (on http://localhost:3001)
npm run assistant
```

---

## 🤖 Simulation Assistant (Agent 37 Integration)

The Simulation Assistant uses a secure, decoupled architecture:
- **Frontend:** Calls `POST /api/assistant/run-question` with the question and compact simulation metrics.
- **Backend (`backend/server.js`):** Standalone lightweight Node.js service that calls the Agent 37 instance conversation endpoint (`https://{instanceId}.agent37.app/v1/responses`).
- **Security:** `AGENT37_API_KEY` is kept exclusively on the server side. No API keys are ever bundled into Vite frontend code or client responses.

### Local Backend Configuration

Create a `.env` file in the root or `backend/` directory (or set environment variables in your shell):
```bash
# Required for Agent 37 Cloud
AGENT37_API_KEY="sk_live_..."
AGENT37_INSTANCE_ID="ab12cd34ef"  # 10-character instance ID from Agent 37 Cloud

# Optional (defaults to 3001)
PORT=3001
```

> **Note:** The Vite dev server is pre-configured with a reverse proxy for `/api` pointing to `http://localhost:3001`. Running `npm run dev` and `npm run assistant` allows immediate local testing without configuring client environment variables. If the backend is not running or Agent 37 is not configured, ExitLab displays an informative configuration notice without affecting any simulation features.

### Deploying Backend to Render (Web Service)

To deploy the assistant backend alongside the existing Render Static Site:

1. In the **Render Dashboard**, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name:** `exitlab-assistant-api` (or preferred name)
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** *(leave empty or `npm install`)*
   - **Start Command:** `node server.js`
   - **Instance Type:** Free (or Starter)
4. Under **Environment Variables**, add:
   - `AGENT37_API_KEY`: Your Agent 37 API key (`sk_live_...`).
   - `AGENT37_INSTANCE_ID`: Your Agent 37 instance ID (e.g. `ab12cd34ef`).
5. Click **Create Web Service** and note your public service URL (e.g. `https://exitlab-assistant-api.onrender.com`).

### Connecting Frontend Static Site to Deployed Backend

1. In your existing **Render Static Site** dashboard for ExitLab:
2. Go to **Environment** > **Environment Variables**.
3. Add a build-time variable:
   - **Key:** `VITE_ASSISTANT_URL`
   - **Value:** `https://exitlab-assistant-api.onrender.com` *(your backend Render URL, without trailing slash)*
4. Trigger a **Manual Deploy** > **Deploy latest commit** so Vite compiles with the backend URL.
> ⚠️ **Important:** Never put `AGENT37_API_KEY` in `VITE_` variables or the frontend environment.

---

## ⚠️ Known Limits & Disclaimer

- Movement is modeled on a 2D discrete grid (0.5m x 0.5m cells, 0.5s per tick, brisk walk speed ≤ 1 m/s) with 4-directional cardinal adjacency.
- Does not simulate dynamic smoke dispersion, fire thermal radiation, panic behaviors, or multi-floor stairs.
- **Results are comparative educational estimates and do NOT constitute legal life-safety, building code, or certified fire engineering validation.**
