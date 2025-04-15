# VizIoT

**VizIoT** is an interactive web-based application designed to visualize Internet of Things (IoT) sensor event streams, enabling experts and researchers to explore, monitor, and analyze IoT-driven processes with enhanced process awareness.

![VizIoT Interface](utils/cpp.png)

## Overview

The rapid proliferation of IoT technologies has resulted in an abundance of sensor data, which is often complex and challenging to interpret. **VizIoT** addresses this challenge by providing an intuitive user interface (UI) for visualizing process event data from IoT environments.

The application bridges the gap between raw IoT sensor data and process events, making it easier to identify key events, observe trends, and gain actionable insights into process workflows.

## Key Features

- **Interactive Real-time Visualization**: Displays the flow of events in an IoT process, with dynamic updating of sensor data streams and automatic sliding window.
- **Event Annotation System**: Add, view, and manage annotations for significant events to document insights and observations.
- **Importance Marking**: Flag important events for prioritized attention and easier future reference.
- **Sensor Selection and Filtering**: Control the number of sensors shown in the visualization to focus on relevant data.
- **Playback Controls**: Play, pause, and rewind functionality for reviewing past data.
<!-- - **Multi-dataset Support**: Switch between different sensor log databases. -->
- **Color-coded Groups**: Automatically organized and color-coded sensor groupings for better visual organization.
- **Responsive UI**: Built with Bootstrap for a clean, responsive interface across different devices.

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite
- **Frontend**: Vanilla JavaScript with Bootstrap as UI library
- **Visualization Framework**: GR Framework ([https://gr-framework.org](https://gr-framework.org))

## Research Context

**VizIoT** is developed as part of a bachelor’s thesis titled "Exploring IoT Process Events through Interactive Visualization" at the Technical University of Munich, under the Chair of Information Systems and Business Process Management. The thesis builds upon the framework proposed by Mangler et al. (2024), which addresses the lack of "process awareness" in IoT sensor data.

IoT technologies generate vast amounts of sensor data, but their high complexity and volume often obscure meaningful insights. Traditional methods struggle with real-time, event-based data, especially for non-technical users. This research aims to bridge this gap by transforming raw IoT sensor data into comprehensible process events through interactive visualization.

Key objectives include:
- Enhancing process awareness in IoT environments by visualizing event streams from IoT sensors.
- Supporting experts in detecting, analyzing, and monitoring workflows and significant events in real time.
- Aligning with Industry 4.0 principles to enable smarter, more autonomous manufacturing processes.

The thesis adopts the Design Science Research Methodology (DSRM), focusing on the development of a practical and innovative artifact to address real-world challenges. **VizIoT** embodies this artifact, providing an intuitive and efficient interface for exploring IoT data and empowering users to gain actionable insights.

### Research Questions Addressed:

1. What are the current best practices and methodologies in IoT event data visualization?
2. How can process events be efficiently visualized in a structured IoT sensor data stream to facilitate process monitoring and analysis?
3. How can the effectiveness of the application be evaluated in detecting significant events within IoT sensor data streams?

## Project Structure

The application follows a modular architecture:

### Backend
- `backend/database/`: Database management and query operations
  - `db.js`: Core database setup and connection handling
  - `dataFetching.js`: Functions to retrieve sensor and event data
  - `dataStorage.js`: Functions to store and process incoming data
  - `queries/`: SQL query definitions organized by entity type
- `backend/server/`: Express.js server implementation
  - `server.js`: Main server entry point
  - `streamHandler.js`: Server-Sent Events (SSE) implementation for streaming
  - `routes/`: API route definitions
  - `logs/`: Contains sample data files for the application

### Frontend
- `frontend/`: Client-side code
  - `index.html`: Main application page
  - `public/`: Static assets like images and icons
  - `source/`: Application source code
    - `css/`: Styling for the application
    - `js/`: JavaScript modules
      - `app.js`: Application initialization
      - `state.js`: Application state management
      - `utils.js`: Utility functions
      - `components/`: UI components (modals, annotations, tabs)
      - `graph/`: Visualization components
        - `graph.js`: Main graph management
        - `buffer.js`: Data buffer handling
        - `components/`: Graph subcomponents
      - `streaming/`: Data stream handling

### Data
- `data/`: SQLite database files
  - `evaluation.db`: Smart Home dataset
  - `sensor_logs.db`: Chess Production dataset

## User Guide

### Visualization Controls

- **Play/Pause Button**: Start or pause the data stream visualization
- **Stop Button**: Stop the current visualization session
- **Sensor Slider**: Adjust the number of sensors displayed (1 to maximum available)
- **Rewind**: Go back in time by specifying seconds in the input field

### Interaction

- **Event Lines**: Vertical lines on the graph represent events. Solid yellow lines indicate important events
- **Clicking on Events**: Click on any event line to view details and add annotations
- **Clicking on Sensor Lines**: Click on sensor lines to view detailed readings and values
- **Legend**: Interactive color-coded legend for identifying different sensor groups
- **Heatmap**: Visual representation of group intervals


## Prerequisites
- Node.js (v14.0 or higher)
- npm (v6.0 or higher)

1. Clone the repository:  

   ```bash
   git clone https://github.com/HamzaChkx/VizIoT.git
   ```
2. Navigate to the project directory:

    ```bash
    cd VizIoT
    ```
3. Install Dependencies

    ```bash
    npm install
     ```

4. Run the application

    ```bash
    npm start
    ```

## Acknowledgements

- [Technical University of Munich](https://www.cs.cit.tum.de/bpm/chair/) - Chair of Information Systems and Business Process Management
- [GR Framework](https://gr-framework.org) - Used for graph visualization
- [Bootstrap](https://getbootstrap.com/) - Used for UI components
- [SQLite](https://www.sqlite.org/index.html) - Database engine