const { RateLimiter } = require('limiter');

// Create a Token Bucket limiter: 1 token removed per 2000ms (2 seconds)
// This strictly enforces 0.5 requests per second.
const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 2000 });

/**
 * Schedules a function execution to respect the rate limit.
 * @param {Function} taskFn - An async function representing the API call.
 * @returns {Promise<any>} - The result of the taskFn.
 */
function scheduleRequest(taskFn) {
    return new Promise((resolve, reject) => {
        limiter.removeTokens(1, async (err, remainingRequests) => {
            if (err) {
                return reject(err);
            }
            try {
                const result = await taskFn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    });
}

/**
 * Gets the number of tokens remaining in the current interval.
 * Good for showing "System Load" status.
 */
function getQueueStatus() {
    return limiter.getTokensRemaining();
}

module.exports = { scheduleRequest, getQueueStatus };
