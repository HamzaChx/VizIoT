import { setupSlidingWindow } from './slidingWindow.js';
import { setupButtonListeners, setupMutationObserver } from './domHandler.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    setupSlidingWindow(); // Initialize sliding window logic
    setupButtonListeners(); // Add event listeners for existing buttons
    setupMutationObserver();
});