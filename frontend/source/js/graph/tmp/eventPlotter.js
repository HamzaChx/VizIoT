import { getEventBuffer } from "../buffer.js";

export function plotEvents(renderer, xMin, xMax, newEventCounter) {
  const events = getEventBuffer();
  events.forEach((event) => {
    if (event.x < xMin || event.x > xMax) return;

    if (event.isImportant) {
      renderer.setlinecolorind(2);
      renderer.setlinetype(1);
      renderer.polyline(2, [event.x, event.x], [0, 1]);
    } else if (event.isNew) {
      renderer.setlinecolorind(1);
      renderer.setlinetype(-6);
      renderer.polyline(2, [event.x, event.x], [0.1, 0.95]);
      if (!event.newCounted) {
        newEventCounter.count++;
        event.newCounted = true;
      }
    } else {
      renderer.setlinecolorind(1);
      renderer.setlinetype(3);
      renderer.polyline(2, [event.x, event.x], [0.05, 0.90]);
    }
  });
  renderer.setlinetype(1);
  renderer.setlinecolorind(1);
}
