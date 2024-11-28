export async function fetchCurrentWindow(start, end, sensorId = null) {
  let url = `/data/sliding-window?start=${start}&end=${end}`;
  if (sensorId) {
      url += `&sensor_id=${sensorId}`;
  }

  try {
      const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          headers: {
              'Content-Type': 'application/json',
          },
      });

      if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      return await response.json();
  } catch (error) {
      console.error('Error in fetchCurrentWindow:', error);
      return null;
  }
}



