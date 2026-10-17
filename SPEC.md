# ExitLab Simulation Rules Spec (v0.2)

Write down every rule here before coding it. If the code and this file disagree, fix one of them.

## 1. World model

- The building is a 2D grid of `width x height` cells. Origin (0,0) is top-left. x grows right, y grows down.
- One cell = 0.5 m x 0.5 m (assumption, shown in the UI). One tick = 0.5 s. An agent moves at most 1 cell per tick (about 1 m/s, a brisk walk).
- Neighbourhood: 4-directional for distance calculation and movement (no diagonals in v1). This keeps corridors and doors easy to reason about.

### Cell types

| Type | Walkable | Notes |
|---|---|---|
| `EMPTY` | yes | Open floor |
| `WALL` | no | |
| `DOOR` | yes | Walkable, drawn differently. Does not limit flow unless it is an exit |
| `EXIT` | yes | Agents who step onto it leave the building. Has `capacity` (agents per tick) |
| `OBSTACLE` | no | Blocked corridor, furniture, debris. Same behaviour as WALL, different colour |
| `SPAWN` | yes | Occupant starting area. Treated as EMPTY once the run starts |

Each `EXIT` also has a state: `open` or `blocked`. A blocked exit behaves like a WALL for routing.

## 2. Routing

1. Build a distance map: BFS outward from every open `EXIT` cell over walkable cells. Each cell gets the number of steps to the nearest open exit.
2. Cells BFS never reaches have distance `Infinity`. They are the cut-off areas.
3. Agents standing on `Infinity` cells are `stuck` from tick 0. They never move and are counted as unreachable.
4. Rebuild the distance map only when the layout or exit states change, never every tick.

## 3. Agents

Each agent has: `id`, `x`, `y`, `status` (`moving` | `waiting` | `exited` | `stuck`), `waitTicks` (total ticks spent unable to advance), `exitedAtTick`.

## 4. Tick procedure (fixed order, same every tick)

1. **Propose.** Each `moving` or `waiting` agent looks at its 4 neighbours that are walkable, not occupied at the start of the tick, and have a strictly lower distance than its current cell. It proposes the one with the lowest distance. Ties between equal-distance neighbours are broken with the seeded RNG. If no such cell exists, the agent proposes to stay.
2. **Resolve conflicts.** Group proposals by target cell.
   - One proposer: it wins.
   - Several proposers: pick one winner with the seeded RNG (uniform). Losers stay and get `waitTicks += 1`.
3. **Apply exit throughput.** For a target cell of type `EXIT`, at most `capacity` winners may enter per tick. Extra winners (chosen by the seeded RNG) stay and wait.
4. **Move.** Winners move. Agents who enter an `EXIT` get status `exited` and are removed from the grid.
5. **Record.** Update metrics (section 6) and the heat counters.
6. **Stop** when no `moving` or `waiting` agents remain, or `tick >= maxTicks` (default 3000 = 25 min).

Rules of thumb:
- Never process agents in array order to decide who wins. Always shuffle or use the RNG, or one group is always favoured.
- All proposals are made from the same snapshot (the grid at the start of the tick). Movement is applied after all decisions. This avoids order-dependent results.
- Agents cannot swap places in v1. Two agents facing each other in a corridor never cross, because a strictly-lower-distance move is required.

## 5. Determinism

- One seeded PRNG (mulberry32) per run. No `Math.random()` anywhere in `engine/`.
- A scenario stores its seed. Same layout + same scenario + same seed = identical run, tick for tick.
- Occupant spawn positions are chosen from SPAWN cells with the seeded RNG and stored in the scenario so comparisons reuse the exact same starting positions.
- Test: run twice, deep-compare the result.

## 6. Metrics

Collected every tick and summarised at the end:

| Metric | Definition |
|---|---|
| `clearanceTicks` | Tick when the last reachable agent exits (or `maxTicks` if the run timed out) |
| `remainingOverTime[]` | Agents still inside, per tick |
| `maxQueueLength` | Max over ticks and exits of agents within 3 cells of an exit with `waiting` status |
| `avgWait`, `maxWait` | Mean and max of `waitTicks` over agents who exited |
| `unreachableCount` | Agents with status `stuck` |
| `heat[y][x]` | Total `waiting` agent-ticks spent on each cell, normalised for the heatmap |
| `exitUsage[exitId]` | Agents that left through each exit |

Comparison output = scenario metrics minus baseline metrics, as absolute and percentage change.

## 7. Bottleneck explanation rules (Phase 5)

Examples of rules, each using only computed data:

- **Door capacity:** an exit with high `exitUsage` and a long queue within 3 cells, and `capacity` reached on most ticks.
- **Merge junction:** a cell with 3+ walkable neighbours that sits on the shortest paths of agents from 2+ different regions and has high `heat`.
- **Narrow corridor:** a run of 3+ cells where each cell has walls on two opposite sides (width 1) and high `heat`.
- **Disconnected region:** the flood-fill reachability set excludes cells containing agents.
- **Rerouting:** compare `exitUsage` against the baseline, e.g. "Exit B blocked, 140 people rerouted to Exit A".

## 8. Known limits (shown in the UI)

- Grid-based movement, 4-neighbour, one agent per cell.
- No panic behaviour, no speed differences, no smoke or fire, no stairs.
- Results are comparative educational estimates, not predictions or safety certification.

## 9. Test checklist for Phase 2 (all done, see engine/simulate.test.ts)

- [x] Single room, one exit, 1 agent: clearance equals the distance.
- [x] Enclosed room with no exit: all agents `stuck`, no crash, no infinite loop.
- [x] Two agents target the same cell: exactly one moves, the loser's `waitTicks` increments.
- [x] Exit `capacity: 1` and 10 agents: at most 1 exits per tick.
- [x] Blocking an exit changes the distance map and agents reroute.
- [x] Same seed gives identical results; a different seed may differ.
- [x] Agent spawned adjacent to an exit exits on tick 1.

## 10. Settled rules (v0.2, decided while implementing Phase 2)

These fill gaps in sections 1-6. The code follows them.

1. **Tick numbering.** Tick 0 is the initial state. The first processed tick is tick 1. An agent next to an exit has `exitedAtTick = 1`. One agent at distance d with a free path exits at tick d, so `clearanceTicks = d`.
2. **EXIT cells never hold an agent.** The "one winner per target cell" rule (4.2) applies to normal cells only. For an EXIT target, all proposers compete and up to `capacity` of them, chosen by the seeded RNG, pass through per tick. The rest wait. Without this, `capacity > 1` would have no effect.
3. **Waiting.** Any `moving` agent that does not advance in a tick (lost a conflict, lost the capacity draw, or had no free lower-distance neighbour) becomes `waiting`, gets `waitTicks += 1`, and adds 1 to `heat` at its cell. An agent that advances is `moving`.
4. **Snapshot lag.** Cells are free only if empty at the start of the tick. A follower behind a leader therefore waits one tick before it can step into the cell the leader just left.
5. **Blocked exits are walls.** A blocked exit's cell is impassable in the BFS, even when it sits in an interior doorway. An open exit covered by an extra obstacle is closed.
6. **Stuck agents** occupy their cell for the whole run. An extra obstacle placed on an agent's start cell traps that agent (distance `Infinity`, status `stuck`).
7. **`remainingOverTime`** counts `moving` + `waiting` agents only (stuck agents never leave). Index 0 is the count before tick 1, so its length is `clearanceTicks + 1`.
8. **`clearanceTicks`** is the tick when the loop stopped: the last exit, or `maxTicks` if timed out. It is 0 when nobody is reachable.
9. **`maxQueueLength`.** A waiting agent counts toward an exit if its walking distance to that exit is 1 to 3 cells. Walking distance is measured by a BFS where only that exit is open (so walls between an agent and the exit are respected).
10. **Heat** is stored raw (agent-ticks) in `RunMetrics.heat`. `normalizeHeat()` scales it to 0..1 for drawing.
11. **Spawn randomness.** Start positions come from their own seeded stream (`seed + 0x9e3779b9`) so spawn choices are not correlated with in-run tie-breaks. Positions are stored in the scenario and reused by every variant (`deriveScenario`).
12. **Validation.** A scenario must have `startPositions.length === occupantCount`, an integer `maxTicks >= 0`, integer exit capacities `>= 0`, and distinct, in-grid, walkable, non-EXIT start cells. Otherwise the engine throws.
13. **Percentage change** is 0 when both values are 0, and `Infinity` when the baseline is 0 and the scenario is higher.
