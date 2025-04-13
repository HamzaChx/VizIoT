export default class EventPlotter {
    constructor() {
      this.eventHeights = {
        important: { start: 0, end: 1 },
        new: { start: 0.1, end: 0.95 },
        regular: { start: 0.05, end: 0.90 }
      };
    }
  
    plotEventLines(renderer, events, range) {
      if (!events.length || !renderer || !range) return;
      
      const extendedRange = {
        xMin: range.xMin - 5,
        xMax: range.xMax
      };
      
      const { xMin, xMax } = extendedRange;
      
      const importantEvents = [];
      const newEvents = [];
      const regularEvents = [];
      
      events.forEach(event => {
        if (event.x < xMin || event.x > xMax) return;
        if (event.isImportant) importantEvents.push(event);
        else if (event.isNew) newEvents.push(event);
        else regularEvents.push(event);
      });
  
      this.batchRenderEvents(renderer, importantEvents, 2, 1, 
        this.eventHeights.important.start, this.eventHeights.important.end);
      
      this.batchRenderEvents(renderer, newEvents, 1, -6, 
        this.eventHeights.new.start, this.eventHeights.new.end);
      
      this.batchRenderEvents(renderer, regularEvents, 1, 3, 
        this.eventHeights.regular.start, this.eventHeights.regular.end);

      renderer.setLineProperties(1, 1, 1);
    }
    
    batchRenderEvents(renderer, events, colorInd, lineType, yStart, yEnd) {
      if (!events.length) return;
      
      renderer.setLineProperties(colorInd, 1, lineType);
      
      events.forEach(event => {
        renderer.drawLine(event.x, yStart, event.x, yEnd);
      });
    }

    batchRenderAnnotatedEvents(renderer, events) {
      if (!events.length) return;
      
      events.forEach(event => {
        const heightRange = event.isImportant
          ? this.eventHeights.important
          : event.isNew
          ? this.eventHeights.new
          : this.eventHeights.regular;
          
        renderer.drawLine(event.x, heightRange.start, event.x, heightRange.end);
        
        renderer.drawCircle(event.x, heightRange.end, 3);
      });
    }

}