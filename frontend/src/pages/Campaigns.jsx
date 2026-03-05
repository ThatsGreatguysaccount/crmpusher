import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { Plus, Megaphone, ChevronRight, ToggleLeft, ToggleRight, Trash2, Pencil } from 'lucide-react';
import CampaignModal from '../components/CampaignModal';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalCampaign, setModalCampaign] = useState(undefined);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await client.get('/campaigns');
      setCampaigns(res.data.campaigns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  async function handleToggle(id, e) {
    e.preventDefault();
    e.stopPropagation();
    await client.post(`/campaigns/${id}/toggle`);
    fetchCampaigns();
  }

  async function handleDelete(id, name, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete campaign "${name}"?\n\nThis will permanently delete the campaign and ALL its leads.`)) return;
    await client.delete(`/campaigns/${id}`);
    fetchCampaigns();
  }

  function openCreate() {
    setModalCampaign(null);
  }

  function openEdit(campaign, e) {
    e.preventDefault();
    e.stopPropagation();
    setModalCampaign(campaign);
  }

  function handleSaved() {
    setModalCampaign(undefined);
    fetchCampaigns();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-slate-400 text-sm mt-0.5">Each campaign has its own MySQL table — give that table name to Zapier</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-24">
          <Megaphone className="w-14 h-14 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-300 font-semibold text-lg">No campaigns yet</p>
          <p className="text-slate-500 text-sm mt-1">Create a campaign to start forwarding leads from Zapier to your CRM</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              to={`/campaigns/${c.id}`}
              className="block bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-5 h-5 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{c.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/60 text-slate-400'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <span className="text-xs text-slate-500 font-mono">Table: {c.table_name}</span>
                    <span className="text-xs text-slate-500 truncate hidden sm:block">{c.crm_api_url}</span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{c.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => openEdit(c, e)}
                    className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Edit campaign"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleToggle(c.id, e)}
                    className={`p-1.5 rounded-lg transition-colors hover:bg-slate-700 ${
                      c.is_active ? 'text-green-400' : 'text-slate-500'
                    }`}
                    title={c.is_active ? 'Pause campaign' : 'Activate campaign'}
                  >
                    {c.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={(e) => handleDelete(c.id, c.name, e)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Delete campaign"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modalCampaign !== undefined && (
        <CampaignModal
          campaign={modalCampaign}
          onClose={() => setModalCampaign(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
