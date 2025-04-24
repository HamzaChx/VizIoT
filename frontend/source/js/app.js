import { initializeControls } from "./streaming/controls.js";
import {
  startSlidingWindowStream,
  stopSlidingWindowStream,
} from "./streaming/streamHandler.js";
import { showToast } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {

    highlightActiveDatabaseLink();

    initializeControls();

    const response = await fetch("/api/config/database");
    if (response.ok) {
      const data = await response.json();
      const dbName = data.databases[data.current];
      showToast("info", "Database", `Using ${dbName} database`);
    }
  } catch (error) {
    console.error("Error initializing app:", error);
    showToast("danger", "Error", "Failed to initialize application");
  }
});

function highlightActiveDatabaseLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const currentDb = urlParams.get("db") || "chess";

  document.querySelectorAll(".navbar .nav-link").forEach((link) => {
    link.classList.remove("active", "fw-bold");
  });

  const activeLink =
    currentDb === "chess"
      ? document.getElementById("chess-db-link")
      : document.getElementById("home-db-link");

  if (activeLink) {
    activeLink.classList.add("active", "fw-bold");
  }
}

export { startSlidingWindowStream, stopSlidingWindowStream };
