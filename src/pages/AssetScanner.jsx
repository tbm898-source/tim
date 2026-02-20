import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Package, MapPin, Wrench, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import QRScanner from '../components/maintenance/QRScanner';

export default function AssetScanner() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScanSuccess = async (assetTag) => {
    setLoading(true);
    setError(null);
    
    try {
      const assets = await base44.entities.Asset.filter({ asset_tag: assetTag });
      
      if (assets.length === 0) {
        setError(`No asset found with tag: ${assetTag}`);
        setAsset(null);
      } else {
        setAsset(assets[0]);
      }
    } catch (err) {
      setError('Failed to load asset information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational': return <Package className="w-6 h-6 text-green-500" />;
      case 'maintenance_required': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'under_maintenance': return <Wrench className="w-6 h-6 text-blue-500" />;
      default: return <Package className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Asset QR Scanner
          </h1>
          <p className="text-gray-400">Quickly identify assets with your mobile camera</p>
        </div>

        {!asset && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardContent className="py-12 text-center">
              <Camera className="w-24 h-24 mx-auto mb-6 text-cyan-400" />
              <p className="text-gray-300 mb-6">
                Scan an asset's QR code to view details and manage maintenance
              </p>
              <Button
                onClick={() => setShowScanner(true)}
                className="bg-cyan-600 hover:bg-cyan-700"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Start Scanning
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading asset information...</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="bg-red-900/20 border-red-500">
            <CardContent className="py-6">
              <div className="flex items-center text-red-400">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {error}
              </div>
              <Button
                onClick={() => {
                  setError(null);
                  setShowScanner(true);
                }}
                className="mt-4 bg-cyan-600 hover:bg-cyan-700"
              >
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
                    <CardTitle className="text-2xl text-white mb-2">{asset.name}</CardTitle>
                    <p className="text-gray-400">Tag: {asset.asset_tag}</p>
                  </div>
                  {getStatusIcon(asset.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Category</p>
                    <p className="text-white capitalize">{asset.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Condition</p>
                    <Badge className="capitalize">{asset.condition}</Badge>
                  </div>
                </div>

                {asset.location_name && (
                  <div>
                    <p className="text-sm text-gray-400">Location</p>
                    <p className="text-white flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-cyan-400" />
                      {asset.location_name}
                    </p>
                  </div>
                )}

                {asset.manufacturer && (
                  <div>
                    <p className="text-sm text-gray-400">Manufacturer</p>
                    <p className="text-white">{asset.manufacturer} - {asset.model}</p>
                  </div>
                )}

                {asset.next_maintenance_due && (
                  <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3">
                    <p className="text-yellow-400 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Next maintenance due: {new Date(asset.next_maintenance_due).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {asset.notes && (
                  <div>
                    <p className="text-sm text-gray-400">Notes</p>
                    <p className="text-gray-300">{asset.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => navigate(createPageUrl('AssetDetails') + '?id=' + asset.id)}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                <Package className="w-4 h-4 mr-2" />
                View Full Details
              </Button>
              <Button
                onClick={() => {
                  setAsset(null);
                  setShowScanner(true);
                }}
                variant="outline"
                className="flex-1 border-gray-600 text-white hover:bg-gray-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Scan Another
              </Button>
            </div>
          </div>
        )}

        {showScanner && (
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  );
}