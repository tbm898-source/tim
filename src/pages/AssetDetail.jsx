import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Edit, QrCode, Printer, LogIn, LogOut,
  User, Clock, AlertTriangle, CheckCircle, Package, MapPin, Wrench
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AssetQRCode from '../components/asset/AssetQRCode';
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

const CONDITION_COLORS = {
  excellent: 'text-green-400',
  good: 'text-cyan-400',
  fair: 'text-yellow-400',
  poor: 'text-red-400',
};

export default function AssetDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const assetIdParam = urlParams.get('asset_id') || urlParams.get('id');

  const [asset, setAsset] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [user, setUser] = useState(null);

  const loadAsset = useCallback(async () => {
    if (!assetIdParam) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    try {
      const [u] = await Promise.all([base44.auth.me().catch(() => null)]);
      setUser(u);
      // Try asset_id field first, then fall back to record id
      let found = null;
      const byAssetId = await base44.entities.Asset.filter({ asset_id: assetIdParam });
      if (byAssetId.length > 0) {
        found = byAssetId[0];
      } else {
        try { found = await base44.entities.Asset.get(assetIdParam); } catch {}
      }
      if (!found) { setNotFound(true); setLoading(false); return; }
      setAsset(found);
      const txns = await base44.entities.AssetTransaction.filter({ asset_id: found.id });
      setTransactions(txns.sort((a, b) => new Date(b.checkout_date || b.created_date) - new Date(a.checkout_date || a.created_date)));
    } catch (err) {
      console.error(err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [assetIdParam]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  const handlePrintLabel = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center text-white p-6">
        <div className="text-center max-w-sm">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Asset Not Found</h2>
          <p className="text-gray-400 mb-6">No asset found for ID: <span className="font-mono text-cyan-400">{assetIdParam}</span></p>
          <Link to="/AssetManagement">
            <Button className="bg-cyan-600 hover:bg-cyan-700">Back to Assets</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOverdue = asset.expected_return_date && asset.status === 'checked_out' && new Date(asset.expected_return_date) < new Date();

  return (
    <>
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .print-label {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            padding: 20px !important;
            font-family: Arial, sans-serif;
            border: 2px solid #000;
            width: 4in;
            margin: auto;
          }
        }
        .print-only { display: none; }
      `}</style>

      {/* Print Label (hidden on screen) */}
      <div className="print-only print-label">
        <h2 style={{ fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px' }}>TIM Asset</h2>
        <h3 style={{ fontSize: '16px', margin: '0 0 8px' }}>{asset.name}</h3>
        <p style={{ fontFamily: 'monospace', fontSize: '14px', margin: '0 0 8px' }}>{asset.asset_id}</p>
        {asset.qr_code_value && (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(asset.qr_code_value)}&format=png&ecc=M`}
            alt="QR Code"
            style={{ width: '200px', height: '200px', margin: '8px 0' }}
          />
        )}
        <p style={{ fontSize: '12px', margin: '4px 0' }}>Category: {asset.category}</p>
        {asset.serial_number && <p style={{ fontSize: '12px', margin: '4px 0' }}>S/N: {asset.serial_number}</p>}
        <p style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>Property of TIM</p>
      </div>

      {/* Main Page */}
      <div className="no-print min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Link to="/AssetManagement">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">{asset.name}</h1>
                <p className="font-mono text-cyan-400 text-sm mt-1">{asset.asset_id}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowQR(true)} className="border-gray-600 text-gray-300 no-print">
                <QrCode className="w-4 h-4 mr-1" />
                QR Code
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintLabel} className="border-gray-600 text-gray-300 no-print">
                <Printer className="w-4 h-4 mr-1" />
                Print Label
              </Button>
              <Link to={`/AssetForm?edit=${asset.id}`}>
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 no-print">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>

          {/* Status Banner */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Badge className={`${STATUS_COLORS[asset.status] || 'bg-gray-500'} text-white text-sm px-3 py-1`}>
              {STATUS_LABELS[asset.status] || asset.status}
            </Badge>
            {asset.condition && (
              <span className={`text-sm font-medium capitalize ${CONDITION_COLORS[asset.condition] || ''}`}>
                Condition: {asset.condition}
              </span>
            )}
            {isOverdue && (
              <Badge className="bg-red-600 text-white animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1 inline" />
                OVERDUE
              </Badge>
            )}
          </div>

          {/* Checkout / Checkin Actions */}
          <div className="mb-6 flex gap-3 no-print">
            {asset.status === 'available' && (
              <Button onClick={() => setShowCheckout(true)} className="bg-blue-600 hover:bg-blue-700">
                <LogOut className="w-4 h-4 mr-2" />
                Check Out
              </Button>
            )}
            {asset.status === 'checked_out' && (
              <Button onClick={() => setShowCheckin(true)} className="bg-green-600 hover:bg-green-700">
                <LogIn className="w-4 h-4 mr-2" />
                Check In
              </Button>
            )}
            {asset.status === 'checked_out' && (
              <div className="flex items-center gap-2 text-blue-300 text-sm">
                <User className="w-4 h-4" />
                <span>With: <strong>{asset.currently_checked_out_to}</strong></span>
                {asset.expected_return_date && (
                  <span className={`ml-2 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    Due: {new Date(asset.expected_return_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="bg-gray-800 border border-gray-700">
              <TabsTrigger value="details" className="data-[state=active]:bg-cyan-600">Details</TabsTrigger>
              <TabsTrigger value="qr" className="data-[state=active]:bg-cyan-600">QR Code</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-cyan-600">
                History ({transactions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader><CardTitle className="text-white text-base">Basic Info</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {[
                      ['Category', asset.category],
                      ['Location', asset.location || asset.location_name],
                      ['Manufacturer', asset.manufacturer],
                      ['Model', asset.model],
                      ['Serial Number', asset.serial_number],
                    ].map(([label, val]) => val ? (
                      <div key={label}>
                        <p className="text-gray-400">{label}</p>
                        <p className="text-white capitalize">{val}</p>
                      </div>
                    ) : null)}
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader><CardTitle className="text-white text-base">Purchase Info</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {[
                      ['Purchase Date', asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : null],
                      ['Purchase Price', asset.purchase_price ? `$${asset.purchase_price.toLocaleString()}` : null],
                      ['Replacement Value', asset.replacement_value ? `$${asset.replacement_value.toLocaleString()}` : null],
                      ['Created By', asset.created_by_email],
                    ].map(([label, val]) => val ? (
                      <div key={label}>
                        <p className="text-gray-400">{label}</p>
                        <p className="text-white">{val}</p>
                      </div>
                    ) : null)}
                  </CardContent>
                </Card>

                {asset.description && (
                  <Card className="bg-gray-800 border-gray-700 md:col-span-2">
                    <CardHeader><CardTitle className="text-white text-base">Description</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-300 text-sm">{asset.description}</p></CardContent>
                  </Card>
                )}

                {asset.notes && (
                  <Card className="bg-gray-800 border-gray-700 md:col-span-2">
                    <CardHeader><CardTitle className="text-white text-base">Notes</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-300 text-sm">{asset.notes}</p></CardContent>
                  </Card>
                )}

                {(asset.photo || asset.image_url) && (
                  <Card className="bg-gray-800 border-gray-700 md:col-span-2">
                    <CardHeader><CardTitle className="text-white text-base">Photo</CardTitle></CardHeader>
                    <CardContent>
                      <img src={asset.photo || asset.image_url} alt={asset.name} className="rounded-lg max-w-full max-h-64 object-contain" />
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="qr">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader><CardTitle className="text-white text-base">Asset QR Code</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center py-6">
                  {asset.qr_code_value ? (
                    <AssetQRCode asset={asset} size={240} showDownload showPrint />
                  ) : (
                    <div className="text-center text-gray-400">
                      <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No QR code for this asset. Re-save the asset to generate one.</p>
                    </div>
                  )}
                  <div className="mt-6 p-4 bg-gray-900 rounded-lg w-full max-w-sm">
                    <p className="text-sm text-gray-400 mb-1">Asset ID</p>
                    <p className="font-mono text-cyan-400 text-lg font-bold">{asset.asset_id}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader><CardTitle className="text-white text-base">Transaction History</CardTitle></CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No transactions yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map(tx => (
                        <div key={tx.id} className="border border-gray-700 rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {tx.transaction_type === 'checkout' ? (
                                <Badge className="bg-blue-600">Checkout</Badge>
                              ) : (
                                <Badge className="bg-green-600">Checkin</Badge>
                              )}
                              {tx.status === 'active' && <Badge className="bg-yellow-600">Active</Badge>}
                              {tx.issue_reported && <Badge className="bg-red-600">Issue Reported</Badge>}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(tx.checkout_date || tx.created_date).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-gray-400">Recipient</p>
                              <p className="text-white">{tx.checked_out_to_name}</p>
                              {tx.checked_out_to_email && <p className="text-gray-500 text-xs">{tx.checked_out_to_email}</p>}
                            </div>
                            {tx.expected_return_date && (
                              <div>
                                <p className="text-gray-400">Expected Return</p>
                                <p className="text-white">{new Date(tx.expected_return_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            {tx.checkout_condition && (
                              <div>
                                <p className="text-gray-400">Condition at Checkout</p>
                                <p className="text-white capitalize">{tx.checkout_condition}</p>
                              </div>
                            )}
                            {tx.checkin_date && (
                              <div>
                                <p className="text-gray-400">Returned</p>
                                <p className="text-white">{new Date(tx.checkin_date).toLocaleString()}</p>
                              </div>
                            )}
                            {tx.checkin_condition && (
                              <div>
                                <p className="text-gray-400">Condition at Return</p>
                                <p className="text-white capitalize">{tx.checkin_condition}</p>
                              </div>
                            )}
                            {tx.checked_out_by_email && (
                              <div>
                                <p className="text-gray-400">Checked Out By</p>
                                <p className="text-white text-xs">{tx.checked_out_by_email}</p>
                              </div>
                            )}
                            {tx.checked_in_by_email && (
                              <div>
                                <p className="text-gray-400">Checked In By</p>
                                <p className="text-white text-xs">{tx.checked_in_by_email}</p>
                              </div>
                            )}
                          </div>
                          {tx.checkout_notes && (
                            <p className="text-sm text-gray-400 bg-gray-900 rounded p-2">{tx.checkout_notes}</p>
                          )}
                          {tx.checkin_notes && (
                            <p className="text-sm text-gray-400 bg-gray-900 rounded p-2">Return note: {tx.checkin_notes}</p>
                          )}
                          {tx.issue_reported && tx.issue_description && (
                            <div className="bg-red-900/20 border border-red-700 rounded p-2">
                              <p className="text-xs text-red-400 font-bold">Issue Reported:</p>
                              <p className="text-sm text-red-300">{tx.issue_description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 no-print">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-white text-lg font-bold text-center">{asset.name}</h3>
            <p className="text-center font-mono text-cyan-400">{asset.asset_id}</p>
            <AssetQRCode asset={asset} size={250} showDownload showPrint />
            <Button onClick={() => setShowQR(false)} variant="outline" className="w-full border-gray-600 text-gray-300">Close</Button>
          </div>
        </div>
      )}

      <CheckoutModal
        asset={asset}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={loadAsset}
      />
      <CheckinModal
        asset={asset}
        isOpen={showCheckin}
        onClose={() => setShowCheckin(false)}
        onSuccess={loadAsset}
      />
    </>
  );
}