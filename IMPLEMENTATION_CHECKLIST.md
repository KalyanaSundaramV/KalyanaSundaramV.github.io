# V3: precise implementation and regression checklist

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Pointer looks like the supplied cohesive white blob, not a neon orb | `pearl-pointer.js`: thresholded pearlescent metaball membrane with connected spring ligament | Captured desktop motion and still image |
| Fluid streaks and droplets | Velocity-based emissions, attached gravity drips, tapering fade | Captured motion clip; algorithm inspected |
| Interacts with page elements | DOM-boundary collision, compression lobes, rim ripple and contact-glow CSS | Interaction path included, browser event checks |
| Cursor respects accessibility | No custom pointer on coarse-touch or reduced motion | Verified on touch emulation |
| Bring back game demo | New playable Demolition Lab linked in hero and Selected Work | Click / tap fires, charge decreases |
| Multi-contract gameplay | Three procedural destruction goals, scoring and Next Contract button | Contract completion and reset verified |
| Preserve existing content | Eight projects and supplied biographical content | Eight cards verified |
| Preserve palettes | All ten themes and randomized cinematic transitions remain | Ten options verified |
| Resume first in hero | Resume (PDF) remains first button | Confirmed markup |
| PDF works offline | bundled in assets and embedded in standalone | Valid file exists; standalone includes data URI |
| Mobile responsive | Scrollable game panel, tap input, native pointer | 320px/390px tested without horizontal overflow |

**Known limits:** The liquid is a stylized real-time surface, not a real-world viscous fluid simulation, and demolition physics are a lightweight Canvas approximation. The playable lab is an illustrative prototype, not the original game. WebGL transition performance should be checked on your own GPU and phone.
