# VizIoT

**VizIoT** is an interactive web-based application designed to visualize Internet of Things (IoT) sensor event streams, enabling experts and researchers to explore, monitor, and analyze IoT-driven processes with enhanced process awareness.

## Overview

The rapid proliferation of IoT technologies has resulted in an abundance of sensor data, which is often complex and challenging to interpret. **VizIoT** addresses this challenge by providing an intuitive user interface (UI) for visualizing process event data from IoT environments.

The application bridges the gap between raw IoT sensor data and process events, making it easier to identify key events, observe trends, and gain actionable insights into process workflows.

## Key Features

- **Interactive Visualization**: Displays the flow of events in an IoT process, highlighting key activities and transitions.
- **IoT Sensor Data Integration**: Processes raw IoT sensor streams to derive meaningful event sequences.
- **User-friendly Interface**: Built for accessibility and ease of use.
- **Customization**: Allows selection of time periods and specific sensors for detailed analysis.

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
tbc

## User Guide
tbc

## Prerequisites
tbc

## How to Use

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