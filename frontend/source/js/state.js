const appState = {
  streaming: {
    isPaused: false,
    eventSource: null,
    startTime: null,
    lastTimestamp: null,
    retryCount: 0,
  },

  sensors: {
    limit: 1,
    sensorMap: {},
    groupIntervals: {},
    groupSensorMap: {}
  },

  graph: {
    manager: null,
    isDrawing: false,
    isPaused: false,
    forceRedraw: false,
    lastUpdateTime: 0,
  },

  ui: {
    highlightedSensors: [],
    highlightedEvent: null,
    lastClickY: null
  },

  /**
   * Update a specific portion of the state
   * @param {string} section - Section to update ('streaming', 'sensors', etc.)
   * @param {object} newState - New state to merge
   */
  update(section, newState) {
    if (!this[section]) {
      console.warn(`State section "${section}" doesn't exist`);
      return;
    }

    this[section] = { ...this[section], ...newState };

  },

  /**
   * Reset the entire state or a specific section
   * @param {string} [section] - Optional section to reset
   */
  reset(section) {
    if (section) {
      switch (section) {
        case "streaming":
          this.streaming = {
            isPaused: false,
            eventSource: null,
            startTime: null,
            lastTimestamp: null,
            retryCount: 0,
          };
          break;
        case "sensors":
          this.sensors = {
            limit: 1,
            sensorMap: {},
            groupIntervals: {},
          };
          break;
      }
    } else {
      this.streaming = {
        isPaused: false,
        eventSource: null,
        startTime: null,
        lastTimestamp: null,
        retryCount: 0,
      };
      this.sensors = {
        limit: 1,
        sensorMap: {},
        groupIntervals: {},
      };
      this.graph = {
        manager: null,
      };
      this.ui = {
        highlightedSensors: [],
        highlightedEvent: null,
      };
    }
  },
};

export default appState;
