import { startSlidingWindow, pauseSlidingWindow, stopSlidingWindow } from './slidingWindow.js';

function setupButtonListeners() {
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const resetButton = document.getElementById('reset-button');

    if (playButton) {
        playButton.addEventListener('click', () => {
            startSlidingWindow();
            const alert = document.getElementById('start-alert');
            if (alert) alert.style.display = 'none';
        });
    }
    if (pauseButton) pauseButton.addEventListener('click', pauseSlidingWindow);
    if (resetButton) resetButton.addEventListener('click', stopSlidingWindow);
}

function setupMutationObserver() {
    // First handle any existing buttons
    setupButtonListeners();

    // Target the container that holds the buttons
    const buttonContainer = document.querySelector('.d-flex.justify-content-center');
    if (!buttonContainer) return;

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const buttons = {
                    'play-button': () => {
                        startSlidingWindow();
                        const alert = document.getElementById('start-alert');
                        if (alert) alert.style.display = 'none';
                    },
                    'pause-button': pauseSlidingWindow,
                    'reset-button': stopSlidingWindow
                };

                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.id in buttons) {
                        node.addEventListener('click', buttons[node.id]);
                        console.log(`${node.id} event listener added (dynamic).`);
                    }
                });
            }
        });
    });

    // Only observe the button container for child changes
    observer.observe(buttonContainer, { 
        childList: true,
        subtree: false 
    });

    // Cleanup function
    return () => observer.disconnect();
}

export { setupButtonListeners, setupMutationObserver };