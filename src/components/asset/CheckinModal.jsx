import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const FINAL_STATUSES = [
  { value: 'available', label: 'Available — Return to service' },
  { value: 'maintenance', label: 'Maintenance — Needs repair' },
  { value: 'missing', label: 'Missing — Could not return' },
  { value: 'retired', label: 'Retired — Decommission' },
];

export default function CheckinModal({ asset, isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    condition: 'good',
    notes: '',
    issue_reported: false,
    issue_description: '',
    final_status: 'available',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const user = await base44.auth.me().catch(() => null);
      const now = new Date().toISOString();

      // Close the active transaction
      if (asset.current_checkout_record_id) {
        await base44.entities.AssetTransaction.update(asset.current_checkout_record_id, {
          transaction_type: 'checkin',
          checkin_date: now,
          checkin_condition: form.condition,
          checkin_notes: form.notes,
          checked_in_by_email: user?.email || 'unknown',
          issue_reported: form.issue_reported,
          issue_description: form.issue_reported ? form.issue_description : undefined,
          final_status: form.final_status,
          status: 'closed',
        });
      }

      // Determine final status: if damage reported and user picked available, override to maintenance
      const finalStatus = form.issue_reported && form.final_status === 'available' ? 'maintenance' : form.final_status;

      await base44.entities.Asset.update(asset.id, {
        status: finalStatus,
        currently_checked_out_to: null,
        checked_out_to_email: null,
        current_checkout_record_id: null,
        expected_return_date: null,
        condition: form.condition,
      });

      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Check-in failed');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({ condition: 'good', notes: '', issue_reported: false, issue_description: '', final_status: 'available' });
    setError('');
    setDone(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Check In Asset</DialogTitle>
          <p className="text-gray-400 text-sm">{asset?.name} — returning from {asset?.currently_checked_out_to}</p>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Asset Returned</h3>
            <p className="text-gray-300">
              Status set to <span className="font-semibold text-cyan-400 capitalize">{form.final_status}</span>
            </p>
            {form.issue_reported && (
              <p className="text-yellow-400 text-sm">⚠ Issue has been recorded and asset flagged for maintenance.</p>
            )}
            <Button onClick={handleClose} className="bg-cyan-600 hover:bg-cyan-700 w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {error && (
              <div className="bg-red-900/30 border border-red-500 rounded p-2 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Returned Condition <span className="text-red-400">*</span></label>
              <Select value={form.condition} onValueChange={v => set('condition', v)}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  {['excellent', 'good', 'fair', 'poor'].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Return Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                rows={2} placeholder="Any notes about the return..."
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.issue_reported} onChange={e => set('issue_reported', e.target.checked)}
                className="mt-1 w-4 h-4 accent-red-500" />
              <span className="text-sm text-gray-300">Report damage or problem</span>
            </label>

            {form.issue_reported && (
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Issue Description</label>
                <textarea value={form.issue_description} onChange={e => set('issue_description', e.target.value)}
                  rows={2} placeholder="Describe the damage or issue..."
                  className="w-full bg-gray-800 border border-red-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            )}

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Asset Status After Return</label>
              <Select value={form.final_status} onValueChange={v => set('final_status', v)}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  {FINAL_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.issue_reported && form.final_status === 'available' && (
                <p className="text-yellow-400 text-xs mt-1">Note: Will be set to Maintenance since an issue was reported.</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1 border-gray-600 text-gray-300">Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
                {saving ? 'Processing...' : 'Confirm Return'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}