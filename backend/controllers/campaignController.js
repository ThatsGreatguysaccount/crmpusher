const svc = require('../services/campaignService');

async function list(req, res) {
  try {
    res.json({ campaigns: await svc.getCampaigns() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function get(req, res) {
  try {
    const campaign = await svc.getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const stats = await svc.getCampaignStats(req.params.id);
    res.json({ campaign, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const { name, crm_api_url, crm_api_key, default_status, description } = req.body;
    if (!name || !crm_api_url || !crm_api_key) {
      return res.status(400).json({ error: 'name, crm_api_url and crm_api_key are required' });
    }
    const campaign = await svc.createCampaign({ name, crm_api_url, crm_api_key, default_status, description });
    res.status(201).json({ campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const campaign = await svc.updateCampaign(req.params.id, req.body);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const deleted = await svc.deleteCampaign(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ message: 'Campaign deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function toggle(req, res) {
  try {
    const campaign = await svc.toggleCampaign(req.params.id);
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, get, create, update, remove, toggle };
