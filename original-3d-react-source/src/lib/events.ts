/** Strikes with the active tool; DestructionLab listens once it is mounted. */
export const DESTRUCTION_USE_TOOL_EVENT = "destruction-use-active-tool";

/**
 * Asks the demo to load (if it has not yet) and strike once it is ready.
 * Page controls fire this instead of the tool event, so a click is never lost
 * while the lazily loaded scene is still downloading.
 */
export const DEMO_PLAY_REQUEST_EVENT = "portfolio-demo-play-request";
