import { initializeControls } from "./streaming/controls.js";
import { startSlidingWindowStream, stopSlidingWindowStream } from "./streaming/streamHandler.js";

initializeControls();

export { startSlidingWindowStream, stopSlidingWindowStream };