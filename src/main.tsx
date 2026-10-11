import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./glass.css";

// No <StrictMode>: its development-only double mount makes the lazily loaded
// react-three-fiber canvas force a WebGL context loss and then reuse the dead
// canvas, so the 3D demo rendered blank on the dev server. Production builds
// were unaffected.
createRoot(document.getElementById("root")!).render(<App />);
