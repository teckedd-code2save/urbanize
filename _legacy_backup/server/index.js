require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { fetchSnapshot } = require('./utils/overpass');
const { computeDiff } = require('./utils/diff');
const { getQueueStatus } = require('./utils/queue');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', queueTokens: getQueueStatus() });
});

// Metrics Endpoint
app.post('/api/metrics/fetch', async (req, res) => {
    const { lat, lng, radius, year } = req.body;

    // 1. Validation (Constraint Check)
    if (!lat || !lng || !radius) {
        return res.status(400).json({ error: 'Missing lat, lng, or radius' });
    }

    // MAX RADIUS: 1 Mile (~1609 meters)
    if (radius > 1610) {
        return res.status(400).json({ error: 'Radius constrained to 1 mile (1609m) max.' });
    }

    // 2. Fetch Data
    try {
        console.log(`[API] Processing request for ${lat},${lng} (r=${radius})`);

        // Parallel Fetch? 
        // Note: Our Queue limits this to 1 at a time globally, but we can queue them together.
        // We'll fetch Current first, then Historic.

        const pCurrent = fetchSnapshot(lat, lng, radius, null); // Current
        let resultGeoJSON;

        if (year) {
            // Historical Analysis Requested
            // Example Year format: '2020-01-01T00:00:00Z'
            const historicDate = `${year}-01-01T00:00:00Z`; // Construct ISO if just year passed

            const pHistoric = fetchSnapshot(lat, lng, radius, historicDate);

            const [currentSnapshot, historicSnapshot] = await Promise.all([pCurrent, pHistoric]);

            // 3. Compute Diff
            resultGeoJSON = computeDiff(historicSnapshot, currentSnapshot);
        } else {
            // Just return current 
            resultGeoJSON = await pCurrent;
        }

        res.json(resultGeoJSON);

    } catch (error) {
        console.error('[API] Error:', error.message);
        res.status(500).json({ error: 'Data fetch failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
});
