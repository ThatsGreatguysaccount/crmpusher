require('dotenv').config();
const express = require('express');
const cors = require('cors');
const env = require('./config/environment');
const { startPoller } = require('./services/poller');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/campaigns/:campaignId/leads', require('./routes/leadRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.PORT, () => {
  console.log(`\n🚀 CRMPusher backend running on http://localhost:${env.PORT}`);
  console.log(`📊 Poll interval: every ${env.POLL_INTERVAL_SECONDS} seconds\n`);
  startPoller();
});
