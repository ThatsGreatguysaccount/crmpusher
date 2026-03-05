const svc = require('../services/leadService');

async function list(req, res) {
  try {
    const { page, limit, status } = req.query;
    const result = await svc.getLeads(req.params.campaignId, { page, limit, status });
    if (!result) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function retry(req, res) {
  try {
    const lead = await svc.retryLead(req.params.campaignId, req.params.leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, retry };
