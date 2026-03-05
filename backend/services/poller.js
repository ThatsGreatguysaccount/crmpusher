const axios = require('axios');
const pool = require('../config/db');
const env = require('../config/environment');

let isRunning = false;
let isSyncing = false;

// ─── Forward a single lead to the CRM ────────────────────────────────────────

async function forwardLead(campaign, lead) {
  const payload = {
    firstName: lead.first_name || '',
    lastName:  lead.last_name  || '',
    email:     lead.email      || '',
    phone:     lead.phone      || '',
    source:    'facebook',
  };

  if (lead.country)  payload.country  = lead.country;
  if (lead.city)     payload.city     = lead.city;

  // Build comment: combine free-text comment + custom question answers
  const commentParts = [];
  if (lead.comment)          commentParts.push(lead.comment);
  if (lead.canadian_citizen) commentParts.push(`Canadian Citizen: ${lead.canadian_citizen}`);
  if (lead.how_much_lost)    commentParts.push(`How Much Lost: ${lead.how_much_lost}`);
  if (lead.how_long_ago)     commentParts.push(`How Long Ago: ${lead.how_long_ago}`);
  if (commentParts.length)   payload.comment = commentParts.join(' | ');

  const response = await axios.post(
    `${campaign.crm_api_url.replace(/\/$/, '')}/public`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${campaign.crm_api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  return response.data;
}

// ─── Fetch current CRM status for a single lead ───────────────────────────────

async function fetchCrmStatus(campaign, crmLeadId) {
  const response = await axios.get(
    `${campaign.crm_api_url.replace(/\/$/, '')}/status/${crmLeadId}`,
    {
      headers: { Authorization: `Bearer ${campaign.crm_api_key}` },
      timeout: 10000,
    }
  );
  return response.data?.data?.status || null;
}

// ─── Main poll: pick up pending leads and push them ──────────────────────────

async function processLeads() {
  if (isRunning) return;
  isRunning = true;

  try {
    const [campaigns] = await pool.query("SELECT * FROM campaigns WHERE is_active = 1");

    for (const campaign of campaigns) {
      try {
        const [leads] = await pool.query(
          `SELECT * FROM \`${campaign.table_name}\` WHERE forward_status = 'pending' ORDER BY id ASC LIMIT 50`
        );

        if (leads.length > 0) {
          console.log(`[Poller] Campaign "${campaign.name}": processing ${leads.length} pending lead(s)`);
        }

        for (const lead of leads) {
          try {
            const result  = await forwardLead(campaign, lead);
            const leadObj = result?.data?.lead || result?.lead || {};
            const crmId   = leadObj._id || leadObj.id || result?._id || result?.id || null;
            const crmStatus = leadObj.status || null;

            await pool.query(
              `UPDATE \`${campaign.table_name}\`
               SET forward_status = 'forwarded',
                   forwarded_at = NOW(),
                   crm_lead_id = ?,
                   crm_status = ?,
                   crm_status_updated_at = NOW(),
                   crm_raw_response = ?,
                   forward_error = NULL
               WHERE id = ?`,
              [crmId ? String(crmId) : null, crmStatus, JSON.stringify(result), lead.id]
            );

            console.log(`[Poller] ✅ Lead #${lead.id} (${lead.email || lead.phone}) → CRM ID: ${crmId || 'n/a'} | CRM Status: ${crmStatus || 'n/a'}`);
          } catch (leadErr) {
            const errMsg =
              leadErr.response?.data?.message ||
              leadErr.response?.data?.error   ||
              leadErr.message                 ||
              'Unknown error';

            const errResponse = leadErr.response?.data || { message: errMsg };
            await pool.query(
              `UPDATE \`${campaign.table_name}\`
               SET forward_status = 'failed', forward_error = ?, crm_raw_response = ?
               WHERE id = ?`,
              [String(errMsg).slice(0, 500), JSON.stringify(errResponse), lead.id]
            );

            console.error(`[Poller] ❌ Lead #${lead.id} failed: ${errMsg}`);
          }
        }
      } catch (campaignErr) {
        console.error(`[Poller] Error on campaign "${campaign.name}": ${campaignErr.message}`);
      }
    }
  } catch (err) {
    console.error('[Poller] Fatal error:', err.message);
  } finally {
    isRunning = false;
  }
}

// ─── Status sync: refresh CRM status for forwarded leads ─────────────────────
// Runs every 5 minutes. Picks up to 100 forwarded leads per campaign that have
// a crm_lead_id and syncs their CRM-side status (New → Contacted → etc.).

async function syncCrmStatuses() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const [campaigns] = await pool.query("SELECT * FROM campaigns WHERE is_active = 1");

    for (const campaign of campaigns) {
      try {
        const [leads] = await pool.query(
          `SELECT id, crm_lead_id, crm_status
           FROM \`${campaign.table_name}\`
           WHERE forward_status = 'forwarded'
             AND crm_lead_id IS NOT NULL
           ORDER BY crm_status_updated_at ASC
           LIMIT 100`
        );

        if (leads.length === 0) continue;

        let updated = 0;
        for (const lead of leads) {
          try {
            const newStatus = await fetchCrmStatus(campaign, lead.crm_lead_id);
            if (newStatus && newStatus !== lead.crm_status) {
              await pool.query(
                `UPDATE \`${campaign.table_name}\`
                 SET crm_status = ?, crm_status_updated_at = NOW()
                 WHERE id = ?`,
                [newStatus, lead.id]
              );
              updated++;
            } else {
              // Still update the timestamp so we rotate through leads evenly
              await pool.query(
                `UPDATE \`${campaign.table_name}\` SET crm_status_updated_at = NOW() WHERE id = ?`,
                [lead.id]
              );
            }
          } catch {
            // Skip individual failures silently to not spam logs
          }
        }

        if (updated > 0) {
          console.log(`[Sync] Campaign "${campaign.name}": updated CRM status for ${updated} lead(s)`);
        }
      } catch (campaignErr) {
        console.error(`[Sync] Error on campaign "${campaign.name}": ${campaignErr.message}`);
      }
    }
  } catch (err) {
    console.error('[Sync] Fatal error:', err.message);
  } finally {
    isSyncing = false;
  }
}

// ─── Migration: add crm_status columns to existing tables ────────────────────

async function migrateExistingTables() {
  try {
    const [campaigns] = await pool.query("SELECT table_name FROM campaigns");
    for (const { table_name } of campaigns) {
      const [cols] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'crm_status'`,
        [table_name]
      );
      if (cols.length === 0) {
        await pool.query(
          `ALTER TABLE \`${table_name}\`
           ADD COLUMN crm_status VARCHAR(100) DEFAULT NULL AFTER crm_lead_id,
           ADD COLUMN crm_status_updated_at DATETIME DEFAULT NULL AFTER crm_status`
        );
        console.log(`[Migration] Added crm_status columns to \`${table_name}\``);
      }

      // comment column
      const [commentCols] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'comment'`,
        [table_name]
      );
      if (commentCols.length === 0) {
        await pool.query(
          `ALTER TABLE \`${table_name}\` ADD COLUMN comment TEXT DEFAULT NULL AFTER city`
        );
        console.log(`[Migration] Added comment column to \`${table_name}\``);
      }

      // crm_raw_response column
      const [crmRespCols] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'crm_raw_response'`,
        [table_name]
      );
      if (crmRespCols.length === 0) {
        await pool.query(
          `ALTER TABLE \`${table_name}\` ADD COLUMN crm_raw_response TEXT DEFAULT NULL AFTER crm_status_updated_at`
        );
        console.log(`[Migration] Added crm_raw_response column to \`${table_name}\``);
      }

      // custom question columns
      const [canadianCols] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'canadian_citizen'`,
        [table_name]
      );
      if (canadianCols.length === 0) {
        await pool.query(
          `ALTER TABLE \`${table_name}\`
           ADD COLUMN canadian_citizen TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER comment,
           ADD COLUMN how_much_lost TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER canadian_citizen,
           ADD COLUMN how_long_ago TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER how_much_lost`
        );
        console.log(`[Migration] Added custom question columns to \`${table_name}\``);
      }
    }
  } catch (err) {
    console.error('[Migration] Failed:', err.message);
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

function startPoller() {
  const intervalMs = env.POLL_INTERVAL_SECONDS * 1000;
  const syncIntervalMs = 5 * 60 * 1000; // 5 minutes

  console.log(`[Poller] Started — checking every ${env.POLL_INTERVAL_SECONDS}s for new leads`);

  migrateExistingTables().then(() => {
    processLeads();
    setInterval(processLeads, intervalMs);

    // Kick off first sync after 1 minute, then every 5 minutes
    setTimeout(() => {
      syncCrmStatuses();
      setInterval(syncCrmStatuses, syncIntervalMs);
    }, 60 * 1000);
  });
}

module.exports = { startPoller };
