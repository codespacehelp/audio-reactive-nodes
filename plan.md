Below is a v1 implementation spec for the software agent.

# v1 Spec: Audio-Reactive Node Editor SPA

## 1. Product summary

Build a desktop-only SPA for viewing and editing parameters of a node-based audiovisual project.

The app loads a project JSON file, renders:
- a node network canvas
- a right-side properties panel
- node previews embedded inside nodes
- a fullscreen present mode showing only the final output

The default demo reacts to microphone input:
- `audio_in1 -> audio_analyzer1 -> channel_rename1 -> channel_lag1 -> channel_map1`
- `sphere1 -> transform1`
- `plane1`
- `transform1 + plane1 -> geo_merge1 -> scene1 -> materials1 -> out1`
- `transform1.uniform_scale = @channel_map1:low`

## 2. Scope

### In scope
- Load project JSON from URL query: `?project=file.json`
- Fallback to `default.json` if query is absent
- Render node graph from JSON
- Select and move nodes
- Multi-select via drag box
- Edit node parameters in right-side properties panel
- Switch numeric parameters/components between literal and expression mode
- Evaluate expressions
- Render embedded previews for applicable nodes
- Present button enters fullscreen output-only mode
- Export current project JSON
- Undo/redo for project-affecting edits

### Out of scope
- Creating/deleting nodes
- Creating/deleting connections
- Editing node names
- Editing port structure
- LocalStorage/autosave
- Backend, auth, collaboration
- Mobile/tablet
- WebGPU fallback
- React Flow

## 3. Tech stack

- React
- Vite
- TypeScript
- Tailwind CSS, zinc palette, orange accents
- Zustand for app/editor state
- Immer for immutable project updates
- Three.js with WebGPU renderer
- Optional: react-three-fiber for 3D scene/view management if it simplifies implementation

Decision:
- Do not use `react-flow`
- Draw the network canvas directly using Three.js/WebGPU primitives and DOM overlays where helpful

## 4. Visual design

### Theme
- Dark mode only
- Tailwind zinc palette
- Orange accent for active/highlight/bind states
- Error color: red overlay/border
- Muted grid background
- Clean properties panel inspired by Figma

### Main layout
- Top toolbar
- Center network canvas
- Right properties panel
- No minimap
- No left library panel

## 5. Application structure

### Top toolbar
Contains:
- project title / loaded filename
- present button
- export JSON button
- undo / redo
- optional WebGPU support badge
- optional error status

### Main content
- Network canvas is the primary workspace
- Nodes are positioned from project JSON
- Each node shows:
  - title
  - type/category icon
  - ports
  - preview area if applicable
  - error overlay when invalid
  - preview enable/disable button

### Right properties panel
Shows selected node properties only.
Single-node edit only.

## 6. Runtime model

## 6.1 Graph type
- Directed acyclic graph only
- Cycles are invalid
- The loaded JSON must be validated for cycles

## 6.2 Evaluation model
- Primary model: pull from `out`
- Nodes may declare `needsFrame = true`
- Per frame:
  - determine live subgraph reachable from `out`
  - if any live node needs frame updates, evaluate live graph
  - otherwise evaluate only when something is dirty
- Dirty causes:
  - parameter value change
  - expression change
  - connection changes from loaded project updates
  - upstream output change
  - frame tick for frame-driven nodes

## 6.3 Liveness
- Only nodes reachable from `out` are live
- Unreachable nodes are displayed but not evaluated
- Offscreen previews are paused

## 6.4 Error handling
If a node errors:
- node gets red overlay
- hover shows tooltip with error message
- node keeps last valid output if one exists
- downstream nodes are not reevaluated from that branch
- downstream consumers continue using last valid upstream output

Examples:
- microphone permission denied
- invalid expression
- duplicate channel name after rename
- type mismatch
- bad project file

## 7. Data model

## 7.1 Identity
Every node has:
- stable internal `id`
- non-editable unique user-visible `name`
- `type`
- position on canvas

Names must match:
- snake_case with digits allowed
- recommended regex: `^[a-z0-9_]+$`

Channel names use the same rule.

## 7.2 Port types
Port data types in v1:
- `audio_stream`
- `channel_set`
- `geometry`
- `scene`

## 7.3 Parameter types
Parameter value types in v1:
- `int`
- `float`
- `bool`
- `string`
- `color`
- `vec2`
- `vec3`

Expression support:
- only `int` and `float`
- `vec2` and `vec3` support expressions per component
- no expressions for `string`, `bool`, or `color` in v1

## 7.4 Channel set
A `channel_set` is one output carrying multiple named scalar channels.

Runtime shape:
- channel names
- current numeric values
- optional runtime-only history buffers for previews

History is:
- runtime-only
- not serialized
- not in undo state

## 7.5 Connections
One output may feed multiple inputs.
One input accepts a single upstream connection.
Merge-style nodes expose multiple distinct input ports.

## 8. Binding and expressions

## 8.1 Parameter modes
Each numeric parameter/component supports:
- literal mode
- expression mode

A literal may be represented internally as an expression string later, but UI still distinguishes modes.

Examples:
- literal: `1.2`
- expression: `@channel_map1:low * 1.5 + 0.8`

## 8.2 Expression references
- other node channel: `@node_name:channel_name`
- same node sibling param: `@:param_name`

Examples:
- `@channel_map1:low`
- `@:x * 2`

No dotted edge is shown for same-node references.

## 8.3 Expression language
Supported:
- numeric literals
- `+ - * /`
- parentheses
- unary minus
- functions:
  - `clamp`
  - `min`
  - `max`
  - `floor`
  - `ceil`
  - `round`
  - `map(in_val, in_min, in_max, out_min, out_max)`

Notes:
- `map` is unclamped
- numeric result only
- custom parser/interpreter, no JS `eval`

## 8.4 Expression evaluation rules
- expressions are parsed and compiled once when changed
- cached compiled form is reused
- if evaluation fails:
  - property shows error
  - node enters error state if the value is required
  - last valid value is retained

## 8.5 Visual binding
- dotted lines are shown only for expressions referencing other nodes
- no separate direct-binding type in v1
- expression `@node:channel` is the direct binding equivalent

## 9. Node categories and catalog

Categories are mainly based on output type.

### Audio
- `audio_in`
- `audio_analyzer`

### Channels
- `channel_rename`
- `channel_lag`
- `channel_map`

### Geometry
- `sphere`
- `plane`
- `transform`
- `geo_merge`

### Scene
- `scene`
- `materials`
- `out`

## 10. Node specs

## 10.1 `audio_in`
Category: audio

Outputs:
- `audio` : `audio_stream`

Parameters:
- `source` : string, fixed to `"microphone"` in v1

Behavior:
- requests mic access through Web Audio API
- frame-driven
- provides audio stream to downstream nodes
- preview shows waveform over time, 3-second history

Errors:
- mic denied
- no audio device
- browser audio init failure

## 10.2 `audio_analyzer`
Category: channels

Inputs:
- `audio` : `audio_stream`

Outputs:
- `channels` : `channel_set` named `band0`, `band1`, `band2` by default

Parameters:
- `fft_size` : int, default `1024`
- `band_count` : int, default `3`
- `smoothing` : float, default `0.7`

Behavior:
- uses Web Audio `AnalyserNode`
- internal FFT bins aggregated into logarithmic groups
- output values are raw numeric magnitudes, not normalized
- preview shows output band histories over time

Validation:
- `band_count >= 1`
- `fft_size` must be valid for Web Audio usage

## 10.3 `channel_rename`
Category: channels

Inputs:
- `in` : `channel_set`

Outputs:
- `out` : `channel_set`

Parameters:
- 5 rename rules:
  - `from_1`, `to_1`
  - ...
  - `from_5`, `to_5`

Behavior:
- renames matching channels
- non-matching rules are ignored
- output preserves values/history semantics

Errors:
- duplicate resulting channel names
- invalid target channel names

Preview:
- line history per channel

## 10.4 `channel_lag`
Category: channels

Inputs:
- `in` : `channel_set`

Outputs:
- `out` : `channel_set`

Parameters:
- `attack_ms` : float
- `release_ms` : float
- `gain` : float

Behavior:
- per-channel attack/release smoothing
- intended to catch spikes and let them linger
- output value = smoothed(input * gain)

Defaults:
- choose sensible musical defaults, e.g.
  - `attack_ms = 30`
  - `release_ms = 220`
  - `gain = 1`

Preview:
- line history per channel

## 10.5 `channel_map`
Category: channels

Inputs:
- `in` : `channel_set`

Outputs:
- `out` : `channel_set`

Parameters:
- `in_min` : float
- `in_max` : float
- `out_min` : float
- `out_max` : float
- `clip_mode` : enum `none | clamp`

Behavior:
- applies the same mapping to all channels
- `none`: straight linear map
- `clamp`: clamp to output range after mapping

Preview:
- line history per channel

## 10.6 `sphere`
Category: geometry

Outputs:
- `geometry` : `geometry`

Parameters:
- `radius` : float
- `width_segments` : int
- `height_segments` : int

Behavior:
- outputs geometry named after the node name
- preview is mini 3D scene

Defaults:
- sensible sphere defaults

## 10.7 `plane`
Category: geometry

Outputs:
- `geometry` : `geometry`

Parameters:
- `size_x` : float
- `size_y` : float
- `rows` : int
- `columns` : int
- `orientation` : enum `xy | xz | yz`

Behavior:
- outputs geometry named after the node name
- floor-plane default orientation is `xz`

Preview:
- mini 3D scene

## 10.8 `transform`
Category: geometry

Inputs:
- `in` : `geometry`

Outputs:
- `out` : `geometry`

Parameters:
- `translate_x`
- `translate_y`
- `translate_z`
- `rotate_x`
- `rotate_y`
- `rotate_z`
- `scale_x`
- `scale_y`
- `scale_z`
- `uniform_scale`
- `transform_order` : enum of supported permutations

Behavior:
- transforms incoming geometry as one unit
- component values can each be literal/expression where numeric
- `uniform_scale` multiplies with per-axis scale

Preview:
- mini 3D scene

## 10.9 `geo_merge`
Category: geometry

Inputs:
- `in1` ... `in5` : `geometry`

Outputs:
- `out` : `geometry`

Behavior:
- combines up to 5 geometry inputs
- preserves geometry object names where possible

Preview:
- mini 3D scene

## 10.10 `scene`
Category: scene

Inputs:
- `geometry` : `geometry`

Outputs:
- `scene` : `scene`

Parameters:
- `camera_pos_x`
- `camera_pos_y`
- `camera_pos_z`
- `camera_target_x`
- `camera_target_y`
- `camera_target_z`
- `ambient_color`
- `ambient_intensity`
- `dir_color`
- `dir_intensity`
- `dir_pos_x`
- `dir_pos_y`
- `dir_pos_z`
- `background_color`

Behavior:
- wraps geometry into a renderable three.js scene
- creates default camera + ambient light + directional light

Preview:
- mini 3D scene

## 10.11 `materials`
Category: scene

Inputs:
- `scene` : `scene`

Outputs:
- `out` : `scene`

Parameters:
- `target_name` : string, empty means all geometry
- `material_mode` : enum `standard | wireframe`
- `color` : color
- `roughness` : float
- `metalness` : float

Behavior:
- clones/applies material settings to targeted geometry in the scene
- if `target_name` is empty, applies to all geometry

Preview:
- mini 3D scene

## 10.12 `out`
Category: scene

Inputs:
- `scene` : `scene`

Outputs:
- none

Behavior:
- designates final render output
- present mode shows this node fullscreen
- exactly one per project

Preview:
- same as final render thumbnail or small viewport

## 11. Default demo project

Default graph:
- `audio_in1`
- `audio_analyzer1`
- `channel_rename1`
- `channel_lag1`
- `channel_map1`
- `sphere1`
- `transform1`
- `plane1`
- `geo_merge1`
- `scene1`
- `materials1`
- `out1`

Connections:
- `audio_in1.audio -> audio_analyzer1.audio`
- `audio_analyzer1.channels -> channel_rename1.in`
- `channel_rename1.out -> channel_lag1.in`
- `channel_lag1.out -> channel_map1.in`
- `sphere1.geometry -> transform1.in`
- `transform1.out -> geo_merge1.in1`
- `plane1.geometry -> geo_merge1.in2`
- `geo_merge1.out -> scene1.geometry`
- `scene1.scene -> materials1.scene`
- `materials1.out -> out1.scene`

Rename rules:
- `band0 -> low`
- `band1 -> mid`
- `band2 -> high`

Binding:
- `transform1.uniform_scale = @channel_map1:low`

If no `?project=` query exists, load `default.json`, which is a simpler starter graph:
- sphere
- scene
- out

## 12. Network canvas implementation

## 12.1 Rendering approach
Do not use React Flow.

Implement a custom graph canvas with:
- one main WebGPU-backed render layer for node boxes, grid, connectors, selection frames, previews where feasible
- optional DOM overlay layer for crisp text and inputs if needed

Recommended approach:
- use Three.js/WebGPU to draw:
  - background grid
  - node quads
  - port markers
  - solid connections
  - dotted expression connections
  - selection box
- use DOM/CSS for:
  - labels
  - inline buttons/icons
  - hover tooltips
  - property panel

If react-three-fiber reduces complexity, use it.

## 12.2 Interaction
Supported in v1:
- click node to select
- drag node to move
- drag-select multiple nodes
- right mouse drag to pan
- mouse wheel to zoom
- no graph editing beyond movement

## 12.3 Ports and edges
- ports are color-coded by type
- solid lines for port connections
- dotted lines for expression references across nodes
- graph connections are read-only in v1

## 13. Previews

## 13.1 General
- 3-second history window for time-series previews
- visible nodes update continuously
- offscreen previews are paused
- each node has preview enable/disable toggle

## 13.2 Preview types
- `audio_in`: waveform history
- `audio_analyzer`: output band histories
- `channel_*`: channel histories
- `geometry`/`scene`: mini 3D viewport

## 13.3 Auto-scaling
For line previews:
- vertical scale auto-fits visible history
- add small top/bottom padding to avoid touching bounds
- per-node independent scaling

## 13.4 Shared preview infrastructure
Build one reusable preview renderer/helper so line previews share the same WebGPU path.

It should support:
- N colored lines
- ring-buffer input
- viewport clipping
- auto-scale
- pause/resume

## 14. Properties panel

## 14.1 Behavior
- only shown for single selected node
- flat parameter list
- no grouping in v1
- all editable params update node dirty state immediately

## 14.2 Numeric editing
Each numeric field supports:
- direct text entry
- parameter-defined step
- toggle between literal and expression mode

Display suggestions:
- literal mode: numeric input
- expression mode: text input with monospace styling and binding badge

## 14.3 Vec2/Vec3 editing
Show component inputs separately.
Each component can independently be:
- literal
- expression

## 14.4 Expression UX
For numeric params/components:
- button/icon to switch mode
- when in expression mode, show source references if parseable
- invalid expression shows inline error

## 15. Present mode

- Triggered by toolbar button
- Enters fullscreen if allowed by browser
- Shows only final output from `out`
- Exits back to editor without altering project state

## 16. Project file format

## 16.1 Top-level shape
```text
{
  "schemaVersion": 1,
  "nodes": [...],
  "connections": [...],
  "viewport": { ... }
}
```

## 16.2 Nodes
Each node stores:
- `id`
- `name`
- `type`
- `position`
- `params`

Only changed params are stored.

Example shape:
```text
{
  "id": "n_01",
  "name": "transform1",
  "type": "transform",
  "position": { "x": 320, "y": 180 },
  "params": {
    "uniform_scale": {
      "mode": "expression",
      "value": "@channel_map1:low"
    },
    "translate_y": {
      "mode": "literal",
      "value": 0.2
    }
  }
}
```

## 16.3 Connections
Each stores:
- `id`
- `fromNode`
- `fromPort`
- `toNode`
- `toPort`

## 16.4 Viewport
Stores:
- pan x/y
- zoom

## 16.5 Not serialized
Do not serialize:
- runtime outputs
- history buffers
- preview enabled state if considered ephemeral
- mic permission state
- error states
- compiled expressions
- selection
- undo stack

## 17. State management

## 17.1 Project state
In Zustand + Immer:
- loaded project data
- selected node id
- viewport
- undo/redo stacks
- UI mode flags

## 17.2 Runtime state
Separate from project state:
- evaluated node outputs
- dirty flags
- compiled expressions
- preview buffers
- audio resources
- WebGPU/Three scene resources
- error cache
- live graph cache/topological ordering

Rule:
- runtime state must not be in undo snapshots

## 18. Undo/redo

Undo applies only to project-affecting changes.

Undoable:
- node move
- param literal change
- expression change
- literal/expression mode switch

Not undoable:
- selection change
- hover
- preview pause/play
- mic permission result
- runtime values

Use transaction coalescing for:
- drag move
- scrub-like repeated edits if later added

## 19. Browser/platform support

Required:
- Chrome with WebGPU support

Best effort:
- Firefox only if current WebGPU support works in the environment
- no special Firefox accommodation required

Unsupported:
- browsers without WebGPU

Unsupported browser behavior:
- show blocking message: WebGPU required

Target performance:
- 60 FPS on modern MacBook Pro for default demo and typical visible graph

## 20. Validation and errors

## 20.1 Project load errors
If project file:
- missing
- invalid JSON
- invalid schema
- contains cycle
- contains unknown node type

Show a user-friendly blocking error:
- “Cannot load project”
- include concise reason

## 20.2 Node validation examples
- duplicate channel names after rename
- invalid expression
- unsupported port type connection
- missing required input
- out node missing scene input

## 20.3 Error propagation
- errored node keeps last valid output if available
- downstream nodes remain visually rendered using last valid data
- affected nodes show warning/error indication as needed

## 21. Testing

## 21.1 Unit tests
Required for:
- graph validation
- DAG cycle detection
- topological sorting
- liveness/reachability from `out`
- dirty propagation
- expression parsing/interpreting
- channel rename behavior
- channel lag behavior
- channel map behavior
- project schema validation

## 21.2 E2E smoke tests
Playwright:
- app loads `default.json`
- app loads a specified project via query param
- selecting a node opens properties
- editing a parameter updates preview/output
- present mode opens and renders output
- export JSON produces valid project data

## 21.3 Bug workflow
When fixing a discovered bug:
- write failing test first
- implement fix
- confirm test passes

## 22. Implementation plan

Make Git commits after every significant change + milestone.

## Milestone 1: Foundations
- project schema types
- JSON loader/validator
- Zustand + Immer project store
- runtime state separation
- custom graph model + topological utilities
- basic app shell

## Milestone 2: Custom node canvas
- pan/zoom
- node rendering
- node selection
- node dragging
- multi-select box
- solid and dotted edge rendering
- node text/icons

## Milestone 3: Property panel
- single-node property rendering from schema
- numeric editing
- vec component editing
- literal/expression toggle
- inline validation

## Milestone 4: Expression engine
- parser
- AST/interpreter
- refs resolution
- dependency extraction for dotted edges
- error reporting

## Milestone 5: Runtime graph execution
- live subgraph computation from `out`
- dirty propagation
- frame-driven node support
- cached outputs
- last-valid-output handling

## Milestone 6: Audio + channel nodes
- `audio_in`
- `audio_analyzer`
- `channel_rename`
- `channel_lag`
- `channel_map`
- line preview infrastructure

## Milestone 7: Geometry + scene nodes
- `sphere`
- `plane`
- `transform`
- `geo_merge`
- `scene`
- `materials`
- `out`
- mini 3D previews

## Milestone 8: Present mode + export
- fullscreen output
- export JSON
- load from query param
- error screens

## Milestone 9: Undo/redo + polish
- transaction boundaries
- tooltips/errors
- preview pause control
- performance pass

## 23. Acceptance criteria

MVP is done when all of the following are true:

1. App loads `default.json` when no query param is present.
2. App loads `?project=...` JSON and renders the graph.
3. The provided demo graph evaluates correctly.
4. All nodes are drawn on the network canvas.
5. All applicable previews render inside nodes.
6. Clicking a node shows its parameters in the right panel.
7. Editable parameters can be changed.
8. Numeric params/components can switch between literal and expression mode.
9. Editing a parameter marks the node dirty and updates output on the next frame/evaluation.
10. `transform1.uniform_scale = @channel_map1:low` affects the sphere reactively.
11. `audio_in` enters error state when mic permission is denied.
12. Error states show red overlay and explanatory tooltip.
13. Present mode shows only the `out` node result fullscreen.
14. Export JSON returns a valid schema-compliant project containing only changed params.
15. Undo/redo works for node movement and parameter/expression edits.
16. Offscreen previews pause.
17. Unsupported non-WebGPU environments show a blocking unsupported message.

If you want, next I can turn this into an even more implementation-ready package with:
- exact TypeScript interfaces
- a JSON schema draft
- node parameter schemas/defaults
- a concrete Zustand store shape
- a runtime evaluator design document
