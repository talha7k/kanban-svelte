// src/routes/api/greeting/+server.js
import { json } from '@sveltejs/kit';

export async function GET(event) {
  // You can access request details from the 'event' object
  // e.g., event.params, event.url, event.request

  const greetingData = {
    message: 'Hello from the SvelteKit API! 👋'
  };

  // The json() helper correctly sets the Content-Type header
  // to 'application/json'
  return json(greetingData);
}