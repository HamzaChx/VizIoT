import eventRoutes from './events.js';
import annotationRoutes from './annotations.js';
import sensorRoutes from './sensors.js';
import streamingRoutes from './streaming.js';
import dataRoutes from './data.js';

export default function setupRoutes(app) {

  app.use('/api/events', eventRoutes);
  app.use('/api/annotations', annotationRoutes);
  app.use('/api/sensors', sensorRoutes);
  app.use('/api/streaming', streamingRoutes);
  app.use('/api/data', dataRoutes);
  
//   app.get("/api/config", (req, res) => {
//     res.redirect(301, '/api/streaming/config');
//   });
  
//   app.post("/update-limit", (req, res) => {
//     res.redirect(307, '/api/streaming/limit');
//   });
  
//   app.get("/update-paused-data", (req, res) => {
//     res.redirect(301, '/api/streaming/paused-data');
//   });
  
//   app.post("/pause-stream", (req, res) => {
//     res.redirect(307, '/api/streaming/pause');
//   });
  
//   app.post("/resume-stream", (req, res) => {
//     res.redirect(307, '/api/streaming/resume');
//   });
  
//   app.get("/stream-sliding-window", (req, res) => {
//     res.redirect(301, '/api/streaming/window');
//   });
  
//   app.get("/load-log", (req, res) => {
//     res.redirect(301, '/api/data/load');
//   });

}