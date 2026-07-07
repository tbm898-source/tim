import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function CheckoutModal({ asset, isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    expected_return_date: '',
    condition: 'good',
    notes: '',
    confirmed: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Recipient name is required'); return; }
    if (!form.confirmed) { setError('Please confirm the checkout'); return; }
    setSaving(true);
    setError('');
    try {
      // Recheck availability (concurrency guard)
      const fresh = await base44.entities.Asset.filter({ asset_id: asset.asset_id });
      const current = fresh[0];
      if (!current || current.status !== 'available') {
        setError('This asset is no longer available. Please refresh and try again.');
        setSaving(false);
        return;
      }
      const user = await base44.auth.me().catch(() => null);
      const transactionId = `TXN-${Date.now()}`;
      const now = new Date().toISOString();
      const tx = await base44.entities.AssetTransaction.create({
        transaction_id: transactionId,
        asset_id: asset.id,
        asset_name: asset.name,
        asset_asset_id: asset.asset_id,
        transaction_type: 'checkout',
        checked_out_to_name: form.name,
        checked_out_to_email: form.email,
        checked_out_by_email: user?.email || 'unknown',
        checkout_date: now,
        expected_return_date: form.expected_return_date || undefined,
        checkout_condition: form.condition,
        checkout_notes: form.notes,
        status: 'active',
      });
      await base44.entities.Asset.update(asset.id, {
        status: 'checked_out',
        currently_checked_out_to: form.name,
        checked_out_to_email: form.email,
        current_checkout_record_id: tx.id,
        expected_return_date: form.expected_return_date || undefined,
      });
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({ name: '', email: '', expected_return_date: '', condition: 'good', notes: '', confirmed: false });
    setError('');
    setDone(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Check Out Asset</DialogTitle>
          <p className="text-gray-400 text-sm">{asset?.name} — {asset?.asset_id}</p>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Checked Out Successfully</h3>
            <p className="text-gray-300">Checked out to <span className="font-semibold text-cyan-400">{form.name}</span></p>
            {form.expected_return_date && (
              <p className="text-gray-400 text-sm">Expected return: {new Date(form.expected_return_date).toLocaleDateString()}</p>
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
              <label className="text-sm text-gray-400 mb-1 block">Recipient Name <span className="text-red-400">*</span></label>
              <Input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Full name" className="bg-gray-800 border-gray-600 text-white" />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Recipient Email</label>
              <Input value={form.email} onChange={e => set('email', e.target.value)}
                type="email" placeholder="email@example.com" className="bg-gray-800 border-gray-600 text-white" />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Expected Return Date</label>
              <Input type="date" value={form.expected_return_date} onChange={e => set('expected_return_date', e.target.value)}
                className="bg-gray-800 border-gray-600 text-white" />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Current Condition</label>
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
              <label className="text-sm text-gray-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                rows={2} placeholder="Any notes about this checkout..."
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.confirmed} onChange={e => set('confirmed', e.target.checked)}
                className="mt-1 w-4 h-4 accent-cyan-500" />
              <span className="text-sm text-gray-300">
                I confirm this asset is being checked out and the recipient is responsible for its return.
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1 border-gray-600 text-gray-300">Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                {saving ? 'Processing...' : 'Confirm Checkout'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}