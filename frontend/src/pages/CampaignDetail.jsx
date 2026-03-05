import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, RefreshCw,
  Copy, Check, Zap, ChevronLeft, ChevronRight, Database,
} from 'lucide-react';

function CopyField({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="bg-slate-900/60 rounded-lg px-4 py-3 flex items-center gap-3 group">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className={`text-sm text-white truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
      <button
        onClick={copy}
        className="flex-shrink-0 text-slate-500 hover:text-white transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value ?? '—'}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   { cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20', label: 'Pending',   Icon: Clock },
    forwarded: { cls: 'bg-green-500/15 text-green-400 border-green-500/20',   label: 'Forwarded', Icon: CheckCircle2 },
    failed:    { cls: 'bg-red-500/15 text-red-400 border-red-500/20',         label: 'Failed',    Icon: XCircle },
  };
  const cfg = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function CrmStatusBadge({ status }) {
  if (!status) return <span className="text-slate-600 text-xs">—</span>;

  const map = {
    'New':          'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Contacted':    'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'Qualified':    'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    'Unqualified':  'bg-slate-500/15 text-slate-400 border-slate-500/20',
    'No Answer':    'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'Callback':     'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    'Converted':    'bg-green-500/15 text-green-400 border-green-500/20',
    'Duplicate':    'bg-red-500/15 text-red-400 border-red-500/20',
  };
  const cls = map[status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20';
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

const LIMIT = 25;

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [connInfo, setConnInfo] = useState(null);
  const [retrying, setRetrying] = useState(null);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await client.get(`/campaigns/${id}`);
      setCampaign(res.data.campaign);
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const res = await client.get(`/campaigns/${id}/leads`, {
        params: { page, limit: LIMIT, status: statusFilter },
      });
      setLeads(res.data.leads);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLeadsLoading(false);
    }
  }, [id, page, statusFilter]);

  const fetchConnInfo = useCallback(async () => {
    try {
      const res = await client.get('/settings/connection');
      setConnInfo(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchCampaign(); fetchConnInfo(); }, [fetchCampaign, fetchConnInfo]);
  useEffect(() => { if (!loading) fetchLeads(); }, [fetchLeads, loading]);

  async function handleRetry(leadId) {
    setRetrying(leadId);
    try {
      await client.post(`/campaigns/${id}/leads/${leadId}/retry`);
      await Promise.all([fetchLeads(), fetchCampaign()]);
    } catch (err) {
      console.error(err);
    } finally {
      setRetrying(null);
    }
  }

  function refresh() {
    fetchCampaign();
    fetchLeads();
  }

  const totalPages = Math.ceil(total / LIMIT);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">Campaign not found.</p>
        <Link to="/campaigns" className="text-blue-400 hover:underline mt-2 inline-block text-sm">
          ← Back to campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/campaigns" className="text-slate-400 hover:text-white transition-colors mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              campaign.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/60 text-slate-400'
            }`}>
              {campaign.is_active ? 'Active' : 'Paused'}
            </span>
          </div>
          {campaign.description && (
            <p className="text-slate-400 text-sm mt-0.5">{campaign.description}</p>
          )}
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm flex-shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Leads"  value={stats.total}     color="text-white" />
          <StatCard label="Forwarded"    value={stats.forwarded} color="text-green-400" />
          <StatCard label="Pending"      value={stats.pending}   color="text-yellow-400" />
          <StatCard label="Failed"       value={stats.failed}    color="text-red-400" />
        </div>
      )}

      {/* Zapier Connection Card */}
      <div className="bg-slate-800 border border-blue-500/25 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700 bg-blue-600/5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">Zapier MySQL Connection Details</h2>
            <p className="text-xs text-slate-400">Configure Zapier with these details to push Facebook leads into this campaign</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 flex-shrink-0">
            <Database className="w-3 h-3" />
            Give to affiliator
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Step 1 — In Zapier, create a new Zap: Facebook Lead Ads → MySQL (Create Row)
            </p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Step 2 — MySQL Connection Details
            </p>
            {connInfo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CopyField label="Host"      value={connInfo.host} />
                <CopyField label="Port"      value={connInfo.port || 3306} />
                <CopyField label="Database"  value={connInfo.database} />
                <CopyField label="Username"  value={connInfo.user} />
                <CopyField label="Password"  value={connInfo.password} />
                <CopyField label="Table Name" value={campaign.table_name} />
              </div>
            ) : (
              <div className="text-slate-500 text-sm">Loading...</div>
            )}
          </div>

          <div className="bg-slate-900/60 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Step 3 — Field Mapping in Zapier (Facebook field → MySQL column)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                ['First Name', 'first_name'],
                ['Last Name', 'last_name'],
                ['Email', 'email'],
                ['Phone Number', 'phone'],
                ['Country', 'country'],
                ['City', 'city'],
                ['Comment / Note', 'comment'],
              ].map(([fb, col]) => (
                <div key={col} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-400 flex-1">{fb}</span>
                  <span className="text-xs font-mono text-blue-400">→ {col}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              ⚠️ Do NOT map the <span className="font-mono text-slate-400">forward_status</span>,{' '}
              <span className="font-mono text-slate-400">forwarded_at</span>, or{' '}
              <span className="font-mono text-slate-400">crm_lead_id</span> columns — CRMPusher manages those automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="font-semibold text-white text-sm">Leads</h2>
            <p className="text-xs text-slate-500">{total} total</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-700 border border-slate-600 text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="forwarded">Forwarded</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700 uppercase tracking-wide">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Country</th>
                <th className="px-5 py-3">Push Status</th>
                <th className="px-5 py-3">CRM Status</th>
                <th className="px-5 py-3">CRM Lead ID</th>
                <th className="px-5 py-3">Received At</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leadsLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 text-sm">
                    No leads yet. Configure Zapier with the details above to start receiving leads.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors text-sm"
                  >
                    <td className="px-5 py-3 text-white font-medium">
                      {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{lead.email || '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{lead.phone || '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{lead.country || '—'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={lead.forward_status} />
                      {lead.forward_error && (
                        <p
                          className="text-xs text-red-400 mt-1 max-w-xs truncate"
                          title={lead.forward_error}
                        >
                          {lead.forward_error}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <CrmStatusBadge status={lead.crm_status} />
                      {lead.crm_status_updated_at && (
                        <p className="text-xs text-slate-600 mt-0.5">
                          {new Date(lead.crm_status_updated_at).toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono">
                      {lead.crm_lead_id ? (
                        <span className="text-green-400">{lead.crm_lead_id}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(lead.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      {lead.forward_status === 'failed' && (
                        <button
                          onClick={() => handleRetry(lead.id)}
                          disabled={retrying === lead.id}
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${retrying === lead.id ? 'animate-spin' : ''}`} />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
