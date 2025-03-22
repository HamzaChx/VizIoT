import eventRoutes from './events.js';
import annotationRoutes from './annotations.js';
import sensorRoutes from './sensors.js';
import streamingRoutes from './streaming.js';
import dataRoutes from './data.js';
import configRouter from './config.js';

export default function setupRoutes(app) {

  app.use('/api/events', eventRoutes);
  app.use('/api/annotations', annotationRoutes);
  app.use('/api/sensors', sensorRoutes);
  app.use('/api/streaming', streamingRoutes);
  app.use('/api/data', dataRoutes);
  app.use('/api/config', configRouter);

}