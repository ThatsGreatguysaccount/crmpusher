const pool = require('../config/db');

function buildTableName(campaignId) {
  return `leads_campaign_${campaignId}`;
}

async function createLeadTable(tableName) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(255) DEFAULT NULL,
      last_name VARCHAR(255) DEFAULT NULL,
      email VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      country VARCHAR(100) DEFAULT NULL,
      city VARCHAR(100) DEFAULT NULL,
      comment TEXT DEFAULT NULL,
      canadian_citizen TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      how_much_lost TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      how_long_ago TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      forward_status ENUM('pending','forwarded','failed') DEFAULT 'pending',
      forwarded_at DATETIME DEFAULT NULL,
      crm_lead_id VARCHAR(255) DEFAULT NULL,
      crm_status VARCHAR(100) DEFAULT NULL,
      crm_status_updated_at DATETIME DEFAULT NULL,
      crm_raw_response TEXT DEFAULT NULL,
      forward_error TEXT DEFAULT NULL,
      retry_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_forward_status (forward_status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getCampaigns() {
  const [rows] = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
  return rows;
}

async function getCampaignById(id) {
  const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createCampaign({ name, crm_api_url, crm_api_key, default_status, description }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO campaigns (name, table_name, crm_api_url, crm_api_key, default_status, description) VALUES (?, ?, ?, ?, ?, ?)',
      [name, 'temp_placeholder', crm_api_url, crm_api_key, default_status || 'New Lead', description || null]
    );
    const campaignId = result.insertId;
    const tableName = buildTableName(campaignId);

    await conn.query('UPDATE campaigns SET table_name = ? WHERE id = ?', [tableName, campaignId]);
    await conn.commit();

    await createLeadTable(tableName);

    const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
    return rows[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateCampaign(id, { name, crm_api_url, crm_api_key, default_status, description, is_active }) {
  await pool.query(
    'UPDATE campaigns SET name = ?, crm_api_url = ?, crm_api_key = ?, default_status = ?, description = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
    [name, crm_api_url, crm_api_key, default_status || 'New Lead', description || null, is_active !== undefined ? is_active : 1, id]
  );
  return getCampaignById(id);
}

async function deleteCampaign(id) {
  const campaign = await getCampaignById(id);
  if (!campaign) return false;
  await pool.query(`DROP TABLE IF EXISTS \`${campaign.table_name}\``);
  await pool.query('DELETE FROM campaigns WHERE id = ?', [id]);
  return true;
}

async function toggleCampaign(id) {
  await pool.query('UPDATE campaigns SET is_active = NOT is_active, updated_at = NOW() WHERE id = ?', [id]);
  return getCampaignById(id);
}

async function getCampaignStats(id) {
  const campaign = await getCampaignById(id);
  if (!campaign) return null;
  const t = campaign.table_name;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM \`${t}\``);
  const [[{ forwarded }]] = await pool.query(`SELECT COUNT(*) as forwarded FROM \`${t}\` WHERE forward_status = 'forwarded'`);
  const [[{ pending }]] = await pool.query(`SELECT COUNT(*) as pending FROM \`${t}\` WHERE forward_status = 'pending'`);
  const [[{ failed }]] = await pool.query(`SELECT COUNT(*) as failed FROM \`${t}\` WHERE forward_status = 'failed'`);

  return { total, forwarded, pending, failed };
}

module.exports = { getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign, toggleCampaign, getCampaignStats };
