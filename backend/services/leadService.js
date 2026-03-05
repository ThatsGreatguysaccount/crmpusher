const pool = require('../config/db');
const campaignService = require('./campaignService');

async function getLeads(campaignId, { page = 1, limit = 25, status = '' } = {}) {
  const campaign = await campaignService.getCampaignById(campaignId);
  if (!campaign) return null;

  const t = campaign.table_name;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let where = '';

  if (status) {
    where = 'WHERE forward_status = ?';
    params.push(status);
  }

  const [leads] = await pool.query(
    `SELECT * FROM \`${t}\` ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM \`${t}\` ${where}`,
    params
  );

  return { leads, total, page: parseInt(page), limit: parseInt(limit) };
}

async function retryLead(campaignId, leadId) {
  const campaign = await campaignService.getCampaignById(campaignId);
  if (!campaign) return null;

  const t = campaign.table_name;
  await pool.query(
    `UPDATE \`${t}\` SET forward_status = 'pending', forward_error = NULL, retry_count = retry_count + 1 WHERE id = ?`,
    [leadId]
  );

  const [[lead]] = await pool.query(`SELECT * FROM \`${t}\` WHERE id = ?`, [leadId]);
  return lead || null;
}

module.exports = { getLeads, retryLead };
