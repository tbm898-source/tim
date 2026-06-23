import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Package, MapPin, AlertTriangle, Search, LogOut, LogIn, User, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../components/maintenance/QRScanner';
import CheckoutModal from '../components/asset/CheckoutModal';
import CheckinModal from '../components/asset/CheckinModal';

const STATUS_COLORS = {
  available: 'bg-green-500',
  checked_out: 'bg-blue-500',
  maintenance: 'bg-yellow-500',
  missing: 'bg-orange-500',
  retired: 'bg-gray-500',
};

const STATUS_LABELS = {
  available: 'Available',
  checked_out: 'Checked Out',
  maintenance: 'Maintenance',
  missing: 'Missing',
  retired: 'Retired',
};

export default function AssetScanner() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [manualId, setManualId] = useState('');
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  const findAsset = async (query) => {
    setLoading(true);
    setError(null);
    setAsset(null);
    try {
      // Try asset_id first, then asset_tag, then record id
      let found = null;

      // Strip URL prefix if a full URL was scanned
      let searchValue = query.trim();
      const assetIdMatch = searchValue.match(/asset_id=([^&]+)/);
      if (assetIdMatch) searchValue = assetIdMatch[1];

      const byAssetId = await base44.entities.Asset.filter({ asset_id: searchValue });
      if (byAssetId.length > 0) { found = byAssetId[0]; }

      if (!found) {
        const byTag = await base44.entities.Asset.filter({ asset_tag: searchValue });
        if (byTag.length > 0) { found = byTag[0]; }
      }

      if (!found) {
        try { found = await base44.entities.Asset.get(searchValue); } catch {}
      }

      if (!found) {
        setError(`No asset found for: ${searchValue}`);
      } else {
        setAsset(found);
      }
    } catch (err) {
      setError('Failed to look up asset');
    } finally {
      setLoading(false);
      setShowScanner(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualId.trim()) findAsset(manualId.trim());
  };

  const handleAssetActionDone = async () => {
    setShowCheckout(false);
    setShowCheckin(false);
    if (asset) {
      // Reload asset
      await findAsset(asset.asset_id || asset.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Asset Lookup
          </h1>
          <p className="text-gray-400">Scan a QR code or enter an asset ID to find an asset</p>
        </div>

        {/* Manual search */}
        <form onSubmit={handleManualSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              placeholder="Enter Asset ID, e.g. TIM-000001"
              className="pl-10 bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
            Find
          </Button>
        </form>

        {/* Camera scan */}
        {!asset && !loading && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardContent className="py-8 text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
              <p className="text-gray-300 mb-4">Or scan an asset's QR code with your camera</p>
              <Button onClick={() => setShowScanner(true)} className="bg-cyan-600 hover:bg-cyan-700" size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Open Camera Scanner
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Looking up asset...</p>
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <Card className="bg-red-900/20 border-red-500 mb-4">
            <CardContent className="py-6">
              <div className="flex items-center text-red-400 mb-3">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {error}
              </div>
              <Button onClick={() => { setError(null); setManualId(''); }} variant="outline" className="border-gray-600 text-gray-300">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {asset && (
          <div className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white">{asset.name}</CardTitle>
                    <p className="font-mono text-cyan-400 text-sm mt-1">{asset.asset_id || asset.asset_tag}</p>
                  </div>
                  <Badge className={`${STATUS_COLORS[asset.status] || 'bg-gray-500'} text-white`}>
                    {STATUS_LABELS[asset.status] || asset.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Category</p>
                    <p className="text-white capitalize">{asset.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Condition</p>
                    <p className="text-white capitalize">{asset.condition}</p>
                  </div>
                  {(asset.location || asset.location_name) && (
                    <div>
                      <p className="text-gray-400">Location</p>
                      <p className="text-white flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        {asset.location || asset.location_name}
                      </p>
                    </div>
                  )}
                  {asset.manufacturer && (
                    <div>
                      <p className="text-gray-400">Manufacturer</p>
                      <p className="text-white">{asset.manufacturer}</p>
                    </div>
                  )}
                </div>

                {asset.status === 'checked_out' && asset.currently_checked_out_to && (
                  <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                    <p className="text-blue-300 flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" />
                      Currently with: <strong>{asset.currently_checked_out_to}</strong>
                    </p>
                    {asset.expected_return_date && (
                      <p className="text-xs text-gray-400 mt-1 ml-6">
                        Due: {new Date(asset.expected_return_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {asset.notes && (
                  <p className="text-sm text-gray-400 bg-gray-900 rounded p-2">{asset.notes}</p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => navigate(`/AssetDetail?asset_id=${asset.asset_id || asset.id}`)}
                className="w-full bg-gray-700 hover:bg-gray-600"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Full Details & History
              </Button>

              {asset.status === 'available' && (
                <Button onClick={() => setShowCheckout(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                  <LogOut className="w-4 h-4 mr-2" />
                  Check Out This Asset
                </Button>
              )}

              {asset.status === 'checked_out' && (
                <Button onClick={() => setShowCheckin(true)} className="w-full bg-green-600 hover:bg-green-700">
                  <LogIn className="w-4 h-4 mr-2" />
                  Return This Asset
                </Button>
              )}

              <Button
                onClick={() => { setAsset(null); setManualId(''); setError(null); }}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Look Up Another Asset
              </Button>
            </div>
          </div>
        )}

        {showScanner && (
          <QRScanner
            onScanSuccess={findAsset}
            onClose={() => setShowScanner(false)}
          />
        )}

        <CheckoutModal
          asset={asset}
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleAssetActionDone}
        />
        <CheckinModal
          asset={asset}
          isOpen={showCheckin}
          onClose={() => setShowCheckin(false)}
          onSuccess={handleAssetActionDone}
        />
      </div>
    </div>
  );
}