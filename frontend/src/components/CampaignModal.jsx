import { useState, useEffect } from 'react';
import client from '../api/client';
import { X } from 'lucide-react';

const FIELD = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const INPUT_CLS =
  'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm';

export default function CampaignModal({ campaign, onClose, onSaved }) {
  const isEdit = !!campaign;
  const [form, setForm] = useState({
    name: '',
    crm_api_url: '',
    crm_api_key: '',
    default_status: 'New Lead',
    description: '',
    is_active: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name || '',
        crm_api_url: campaign.crm_api_url || '',
        crm_api_key: campaign.crm_api_key || '',
        default_status: campaign.default_status || 'New Lead',
        description: campaign.description || '',
        is_active: campaign.is_active ?? 1,
      });
    }
  }, [campaign]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await client.put(`/campaigns/${campaign.id}`, form);
      } else {
        await client.post('/campaigns', form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Campaign' : 'New Campaign'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <FIELD label="Campaign Name *">
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              className={INPUT_CLS}
              placeholder="e.g. Campaign 1 — EU Facebook Leads"
              required
            />
          </FIELD>

          <FIELD label="CRM API URL *">
            <input
              type="url"
              value={form.crm_api_url}
              onChange={set('crm_api_url')}
              className={INPUT_CLS}
              placeholder="https://perfectoscrmus.com/api/lead/v1"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              e.g. <span className="font-mono text-slate-400">https://perfectoscrmus.com/api/lead/v1</span> — do not include /public
            </p>
          </FIELD>

          <FIELD label="CRM Affiliate API Key *">
            <input
              type="text"
              value={form.crm_api_key}
              onChange={set('crm_api_key')}
              className={`${INPUT_CLS} font-mono`}
              placeholder="Paste the API key from RichardCRM settings"
              required
            />
          </FIELD>

          <FIELD label="Default Lead Status">
            <input
              type="text"
              value={form.default_status}
              onChange={set('default_status')}
              className={INPUT_CLS}
              placeholder="New Lead"
            />
          </FIELD>

          <FIELD label="Description (optional)">
            <textarea
              value={form.description}
              onChange={set('description')}
              className={`${INPUT_CLS} resize-none`}
              placeholder="Internal notes about this campaign..."
              rows={2}
            />
          </FIELD>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
