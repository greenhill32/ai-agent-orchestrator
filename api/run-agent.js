// api/run-agent.js
// This Vercel Function acts as the central AI Agent Orchestrator.
// It discovers capabilities from other sites (via agent.json) and executes commands.

export default async (request, response) => {
  // Allow CORS for the visualization panel to call this endpoint
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests (OPTIONS method)
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ status: 'error', message: 'Method Not Allowed. This endpoint only accepts POST requests.' });
  }

  let command;
  try {
    const requestBody = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    command = requestBody.command; // Expecting a JSON body with a 'command' string
  } catch (error) {
    return response.status(400).json({ status: 'error', message: 'Invalid JSON in request body.' });
  }


  if (!command) {
    return response.status(400).json({ status: 'error', message: 'Missing "command" in request body.' });
  }

  const log = []; // To store the step-by-step process for the UI
  const results = []; // To store the final results of each action

  log.push({ type: 'info', message: `AI Agent Activated. Processing command: "${command}"` });

  // --- 1. Define Known AI-Actionable Sites (YOUR ACTUAL VERCEl URLs) ---
  const aiActionableSites = {
    creator: "https://creator-demo-rlqt.vercel.app", // Your Creator Demo URL
    publisher: "https://publish-demo-xi.vercel.app", // Your Publisher Demo URL
    scheduler: "https://schedule-demo-gold.vercel.app" // Your Scheduler Demo URL
  };

  // --- 2. Discover Capabilities (Fetch agent.json from each site) ---
  const discoveredIntents = {};
  for (const [siteName, baseUrl] of Object.entries(aiActionableSites)) {
    try {
      const agentJsonUrl = `${baseUrl}/agent.json`;
      log.push({ type: 'info', message: `Discovering capabilities from ${siteName.toUpperCase()} Site: ${agentJsonUrl}` });
      const res = await fetch(agentJsonUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch agent.json from ${siteName}: ${res.statusText}`);
      }
      const agentData = await res.json();
      log.push({ type: 'success', message: `Discovered ${agentData.intents.length} intents from ${siteName}.` });
      discoveredIntents[siteName] = agentData.intents.map(intent => ({
        ...intent,
        baseUrl: baseUrl // Attach the base URL for later use
      }));
    } catch (error) {
      log.push({ type: 'error', message: `Error discovering from ${siteName}: ${error.message}` });
    }
  }

  // Consolidate all intents for easier lookup
  const allIntents = Object.values(discoveredIntents).flat();

  // --- 3. "Reasoning" & Execute Actions (Simplified for Demo) ---
  // This is where a more sophisticated AI would use NLP/LLMs to map command to intents.
  // For this demo, we use simple keyword matching.

  log.push({ type: 'info', message: `Analyzing command and executing identified actions...` });

  // Flag to track if any action was taken
  let actionTaken = false;

  // --- Action 1: Handle Video/Merch/Availability (Creator Site) ---
  if (command.toLowerCase().includes('video') || command.toLowerCase().includes('youtube')) {
    const intent = allIntents.find(i => i.name === 'get_latest_youtube_video');
    if (intent) {
      actionTaken = true;
      log.push({ type: 'action', message: `Executing: ${intent.description}` });
      try {
        const res = await fetch(`${intent.baseUrl}${intent.endpoint}`);
        const data = await res.json();
        results.push({ intent: intent.name, site: 'creator', status: 'success', data });
        log.push({ type: 'success', message: `Video details fetched: ${data.title}` });
      } catch (error) {
        results.push({ intent: intent.name, site: 'creator', status: 'failed', error: error.message });
        log.push({ type: 'error', message: `Failed to get video: ${error.message}` });
      }
    }
  }

  if (command.toLowerCase().includes('merch') || command.toLowerCase().includes('t-shirt') || command.toLowerCase().includes('mug')) {
    const intent = allIntents.find(i => i.name === 'get_merch_item');
    if (intent) {
      actionTaken = true;
      const itemName = command.toLowerCase().includes('t-shirt') ? 'new t-shirt' : 'creator mug'; // Simple parameter inference
      log.push({ type: 'action', message: `Executing: ${intent.description} for '${itemName}'` });
      try {
        const res = await fetch(`${intent.baseUrl}${intent.endpoint}?item_name=${encodeURIComponent(itemName)}`);
        const data = await res.json();
        results.push({ intent: intent.name, site: 'creator', status: 'success', data });
        log.push({ type: 'success', message: `Merch details fetched: ${data.name} - ${data.price}` });
      } catch (error) {
        results.push({ intent: intent.name, site: 'creator', status: 'failed', error: error.message });
        log.push({ type: 'error', message: `Failed to get merch: ${error.message}` });
      }
    }
  }

  if (command.toLowerCase().includes('availability') || command.toLowerCase().includes('check date')) {
    const intent = allIntents.find(i => i.name === 'get_availability');
    if (intent) {
      actionTaken = true;
      const checkDate = new Date().toISOString().split('T')[0]; // Check today's date
      log.push({ type: 'action', message: `Executing: ${intent.description} for '${checkDate}'` });
      try {
        const res = await fetch(`${intent.baseUrl}${intent.endpoint}?date=${encodeURIComponent(checkDate)}`);
        const data = await res.json();
        results.push({ intent: intent.name, site: 'creator', status: 'success', data });
        log.push({ type: 'success', message: `Availability for ${data.date}: ${data.available_slots.join(', ')}` });
      } catch (error) {
        results.push({ intent: intent.name, site: 'creator', status: 'failed', error: error.message });
        log.push({ type: 'error', message: `Failed to get availability: ${error.message}` });
      }
    }
  }

  // --- Action 2: Handle Publishing (Publisher Site) ---
  if (command.toLowerCase().includes('publish') || command.toLowerCase().includes('post') || command.toLowerCase().includes('social media')) {
    const intent = allIntents.find(i => i.name === 'publish_post');
    if (intent) {
      actionTaken = true;
      const postContent = `AI orchestrated post: "${command.substring(0, 80)}..." - Learn more at the AI-First Web Demo!`; // Simple content generation
      const platform = command.toLowerCase().includes('twitter') ? 'twitter' : (command.toLowerCase().includes('facebook') ? 'facebook' : (command.toLowerCase().includes('linkedin') ? 'linkedin' : 'twitter')); // Simple platform inference
      log.push({ type: 'action', message: `Executing: ${intent.description} to ${platform}` });
      try {
        const res = await fetch(`${intent.baseUrl}${intent.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, content: postContent, media_url: 'https://example.com/demo-image.jpg' })
        });
        const data = await res.json();
        results.push({ intent: intent.name, site: 'publisher', status: 'success', data });
        log.push({ type: 'success', message: `Post simulated: ${data.message}` });
      } catch (error) {
        results.push({ intent: intent.name, site: 'publisher', status: 'failed', error: error.message });
        log.push({ type: 'error', message: `Failed to publish post: ${error.message}` });
      }
    }
  }

  // --- Action 3: Handle Scheduling (Scheduler Site) ---
  if (command.toLowerCase().includes('book interview') || command.toLowerCase().includes('schedule')) {
    const intent = allIntents.find(i => i.name === 'book_interview');
    if (intent) {
      actionTaken = true;
      const intervieweeName = 'Jane Doe'; // Simple parameter inference
      const interviewDate = '2025-08-05'; // Example date for consistency
      const timeSlot = '10:00 AM'; // Example time
      log.push({ type: 'action', message: `Executing: ${intent.description} for ${intervieweeName}` });
      try {
        const res = await fetch(`${intent.baseUrl}${intent.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewee_name: intervieweeName, date: interviewDate, time_slot: timeSlot, duration_minutes: 60 })
        });
        const data = await res.json();
        results.push({ intent: intent.name, site: 'scheduler', status: 'success', data });
        log.push({ type: 'success', message: `Booking simulated: ${data.message}` });
      } catch (error) {
        results.push({ intent: intent.name, site: 'scheduler', status: 'failed', error: error.message });
        log.push({ type: 'error', message: `Failed to book interview: ${error.message}` });
      }
    }
  }

  if (!actionTaken) {
    log.push({ type: 'warning', message: `No specific actionable intents found for command: "${command}"` });
  }

  log.push({ type: 'info', message: `AI Agent Orchestration Complete.` });

  // --- Final Response to the UI ---
  response.status(200).json({
    status: 'success',
    log: log, // The step-by-step process for visualization
    results: results // The final data returned from actions
  });
};