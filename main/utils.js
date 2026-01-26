const tcpPortUsed = require('tcp-port-used');
const fetch = require('node-fetch');

const MAX_WAIT_TIME = 60000; // 60 seconds
const CHECK_INTERVAL = 1000; // 1 second

async function waitForN8n(url, timeout = MAX_WAIT_TIME) {
  const startTime = Date.now();
  const healthUrl = `${url}/healthz`;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(healthUrl, {
        timeout: 5000
      });

      if (response.ok) {
        console.log('n8n is ready');
        return true;
      }
    } catch (error) {
      // n8n not ready yet
    }

    await sleep(CHECK_INTERVAL);
  }

  throw new Error(`n8n failed to start within ${timeout}ms`);
}

async function isPortAvailable(port) {
  try {
    const inUse = await tcpPortUsed.check(port, 'localhost');
    return !inUse;
  } catch (error) {
    return true; // Assume available if check fails
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { waitForN8n, isPortAvailable, sleep };
