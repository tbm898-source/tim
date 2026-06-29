import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const CATEGORIES = ['equipment', 'tool', 'vehicle', 'facility', 'technology', 'furniture', 'other'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

async function generateAssetId() {
  // Find highest existing TIM- number
  const allAssets = await base44.entities.Asset.list();
  let max = 0;
  for (const a of allAssets) {
    const match = (a.asset_id || '').match(/^TIM-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  return `TIM-${String(max + 1).padStart(6, '0')}`;
}

export default function AssetForm() {
  const navigate = useNavigate();
  const editId = new URLSearchParams(window.location.search).get('edit');
  const [user, setUser] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [loading, setLoading] = useState(Boolean(editId));
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    condition: 'good',
    location: '',
    notes: '',
    purchase_date: '',
    purchase_price: '',
    replacement_value: '',
    photo: '',
    clickup_task_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [serialWarning, setSerialWarning] = useState(false);
  const [serialConfirmed, setSerialConfirmed] = useState(false);
  const [success, setSuccess] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const loadAssetForEdit = useCallback(async () => {
    if (!editId) return;

    setLoading(true);
    try {
      let asset = null;
      try {
        asset = await base44.entities.Asset.get(editId);
      } catch {
        const matches = await base44.entities.Asset.filter({ asset_id: editId });
        asset = matches[0] || null;
      }

      if (!asset) {
        setErrors({ _global: `Asset not found: ${editId}` });
        return;
      }

      setEditingAsset(asset);
      setForm({
        name: asset.name || '',
        category: asset.category || '',
        description: asset.description || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        condition: asset.condition || 'good',
        location: asset.location || asset.location_name || '',
        notes: asset.notes || '',
        purchase_date: asset.purchase_date || '',
        purchase_price: asset.purchase_price != null ? String(asset.purchase_price) : '',
        replacement_value: asset.replacement_value != null ? String(asset.replacement_value) : '',
        photo: asset.photo || asset.image_url || '',
        clickup_task_id: asset.clickup_task_id || '',
      });
    } catch (err) {
      setErrors({ _global: err.message || 'Failed to load asset for editing' });
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useEffect(() => {
    loadAssetForEdit();
  }, [loadAssetForEdit]);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const checkSerialDuplicate = async (serial) => {
    if (!serial) return;
    const matches = await base44.entities.Asset.filter({ serial_number: serial });
    const duplicate = matches.some(match => match.id !== editingAsset?.id);
    if (duplicate) {
      setSerialWarning(true);
    } else {
      setSerialWarning(false);
      setSerialConfirmed(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('photo', file_url);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Asset name is required';
    if (!form.category) errs.category = 'Category is required';
    if (serialWarning && !serialConfirmed) errs.serial_number = 'Confirm duplicate serial or change the serial number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const assetId = editingAsset?.asset_id || editingAsset?.asset_tag || await generateAssetId();
      const qrCodeValue = editingAsset?.qr_code_value || `/AssetDetail?asset_id=${assetId}`;
      const assetData = {
        asset_id: assetId,
        qr_code_value: qrCodeValue,
        name: form.name.trim(),
        category: form.category,
        description: form.description,
        manufacturer: form.manufacturer,
        model: form.model,
        serial_number: form.serial_number,
        condition: form.condition,
        location: form.location,
        notes: form.notes,
        purchase_date: form.purchase_date || undefined,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined,
        replacement_value: form.replacement_value ? parseFloat(form.replacement_value) : undefined,
        photo: form.photo || undefined,
        clickup_task_id: form.clickup_task_id || undefined,
        status: editingAsset?.status || 'available',
        created_by_email: editingAsset?.created_by_email || user?.email || '',
        // legacy compat
        asset_tag: assetId,
        location_name: form.location,
        image_url: form.photo || undefined,
      };
      const saved = editingAsset
        ? await base44.entities.Asset.update(editingAsset.id, assetData)
        : await base44.entities.Asset.create(assetData);
      setSuccess(saved);
    } catch (err) {
      setErrors({ _global: err.message || 'Failed to save asset' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
        <div className="max-w-xl mx-auto">
          <Card className="bg-gray-800 border-green-500">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h2 className="text-2xl font-bold text-white">{editingAsset ? 'Asset Updated!' : 'Asset Created!'}</h2>
              <p className="text-gray-300">
                <span className="font-mono text-cyan-400 text-lg">{success.asset_id}</span>
              </p>
              <p className="text-gray-400 text-sm">
                The asset QR code is available on the asset detail page and remains stable for scanning.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700 w-full"
                  onClick={() => navigate(`/AssetDetail?asset_id=${success.asset_id}`)}
                >
                  View Asset & Print Label
                </Button>
                {!editingAsset && (
                  <Button
                    variant="outline"
                    className="border-gray-600 text-white hover:bg-gray-700 w-full"
                    onClick={() => {
                      setSuccess(null);
                      setForm({ name: '', category: '', description: '', manufacturer: '', model: '', serial_number: '', condition: 'good', location: '', notes: '', purchase_date: '', purchase_price: '', replacement_value: '', photo: '', clickup_task_id: '' });
                      setSerialWarning(false);
                      setSerialConfirmed(false);
                    }}
                  >
                    Add Another Asset
                  </Button>
                )}
                <Link to="/AssetManagement">
                  <Button variant="ghost" className="text-gray-400 hover:text-white w-full">Back to Asset List</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/AssetManagement">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {editingAsset ? 'Edit Asset' : 'Add New Asset'}
            </h1>
            <p className="text-gray-400 text-sm">
              {editingAsset
                ? 'Update details without changing the asset ID or QR code.'
                : 'A unique ID and QR code will be generated automatically.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors._global && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {errors._global}
            </div>
          )}

          {/* Required Fields */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white text-lg">Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Asset Name <span className="text-red-400">*</span></label>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Canon DSLR Camera"
                  className="bg-gray-900 border-gray-600 text-white"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Category <span className="text-red-400">*</span></label>
                <Select value={form.category} onValueChange={v => set('category', v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Brief description of the asset..."
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Condition</label>
                <Select value={form.condition} onValueChange={v => set('condition', v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    {CONDITIONS.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Location</label>
                <Input
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="e.g. Main Office, Room 101"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Manufacturer / Serial */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white text-lg">Identification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Manufacturer</label>
                  <Input
                    value={form.manufacturer}
                    onChange={e => set('manufacturer', e.target.value)}
                    placeholder="e.g. Canon"
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Model</label>
                  <Input
                    value={form.model}
                    onChange={e => set('model', e.target.value)}
                    placeholder="e.g. EOS R5"
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Serial Number</label>
                <Input
                  value={form.serial_number}
                  onChange={e => {
                    set('serial_number', e.target.value);
                    setSerialWarning(false);
                    setSerialConfirmed(false);
                  }}
                  onBlur={e => checkSerialDuplicate(e.target.value)}
                  placeholder="Manufacturer serial number"
                  className="bg-gray-900 border-gray-600 text-white"
                />
                {serialWarning && !serialConfirmed && (
                  <div className="mt-2 bg-yellow-900/30 border border-yellow-500 rounded p-2">
                    <p className="text-yellow-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      An asset with this serial number already exists.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSerialConfirmed(true)}
                      className="text-xs text-yellow-300 underline mt-1"
                    >
                      This is a legitimate duplicate — confirm and continue
                    </button>
                  </div>
                )}
                {serialWarning && serialConfirmed && (
                  <p className="text-green-400 text-xs mt-1">Duplicate confirmed by administrator.</p>
                )}
                {errors.serial_number && <p className="text-red-400 text-xs mt-1">{errors.serial_number}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Purchase Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white text-lg">Purchase Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Purchase Date</label>
                  <Input
                    type="date"
                    value={form.purchase_date}
                    onChange={e => set('purchase_date', e.target.value)}
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Purchase Price ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchase_price}
                    onChange={e => set('purchase_price', e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Replacement Value ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.replacement_value}
                  onChange={e => set('replacement_value', e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* ClickUp Integration */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2">ClickUp Integration <span className="text-xs font-normal text-gray-400">(optional)</span></CardTitle></CardHeader>
            <CardContent>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">ClickUp Task ID</label>
                <Input
                  value={form.clickup_task_id}
                  onChange={e => set('clickup_task_id', e.target.value)}
                  placeholder="e.g. 8abc12345"
                  className="bg-gray-900 border-gray-600 text-white font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When linked, asset status changes will automatically update this ClickUp task.
                  Find the task ID in the ClickUp task URL: app.clickup.com/t/<strong>TASK_ID</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Photo & Notes */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white text-lg">Photo & Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Asset Photo</label>
                {form.photo ? (
                  <div className="space-y-2">
                    <img src={form.photo} alt="Asset" className="w-full max-h-48 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300"
                      onClick={() => set('photo', '')}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400 text-sm">
                      {uploadingPhoto ? 'Uploading...' : 'Click to upload photo'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 text-base"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {editingAsset ? 'Updating...' : 'Saving...'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editingAsset ? 'Update Asset' : 'Save Asset'}
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}