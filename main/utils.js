const tcpPortUsed = require('tcp-port-used');
const fetch = require('node-fetch');
const logger = require('./logger');

const MAX_WAIT_TIME = 60000; // 60 seconds
const CHECK_INTERVAL = 1000; // 1 second

async function waitForN8n(url, timeout = MAX_WAIT_TIME) {
  const startTime = Date.now();
  const healthUrl = `${url}/healthz`;

  logger.info(`[health] Waiting for n8n at ${healthUrl} (timeout: ${timeout}ms)`);

  let attempts = 0;
  while (Date.now() - startTime < timeout) {
    attempts++;
    try {
      const response = await fetch(healthUrl, {
        timeout: 5000
      });

      if (response.ok) {
        logger.info(`[health] n8n is ready after ${attempts} attempts (${Date.now() - startTime}ms)`);
        return true;
      } else {
        logger.debug(`[health] Attempt ${attempts}: Got response ${response.status}`);
      }
    } catch (error) {
      // n8n not ready yet
      if (attempts % 5 === 0) {
        logger.debug(`[health] Attempt ${attempts}: ${error.message}`);
      }
    }

    await sleep(CHECK_INTERVAL);
  }

  const errorMsg = `n8n failed to start within ${timeout}ms (${attempts} attempts)`;
  logger.error(`[health] ${errorMsg}`);
  throw new Error(errorMsg);
}

async function isPortAvailable(port) {
  try {
    const inUse = await tcpPortUsed.check(port, 'localhost');
    logger.debug(`[port] Port ${port} in use: ${inUse}`);
    return !inUse;
  } catch (error) {
    logger.debug(`[port] Port check error: ${error.message}`);
    return true; // Assume available if check fails
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { waitForN8n, isPortAvailable, sleep };
