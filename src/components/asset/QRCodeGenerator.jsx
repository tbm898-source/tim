import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AssetQRCode, { getAssetQrValue } from './AssetQRCode';

export default function QRCodeGenerator({ asset, isOpen, onClose }) {
  if (!asset) return null;

  const qrValue = getAssetQrValue(asset);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>QR Code - {asset.asset_id || asset.asset_tag || asset.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <AssetQRCode asset={{ ...asset, qr_code_value: qrValue }} size={300} showDownload showPrint />
          <p className="text-sm text-gray-400 text-center">
            Scan this QR code to open the asset detail page or paste the encoded value into Asset Lookup.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
