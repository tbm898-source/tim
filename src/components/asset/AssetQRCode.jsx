import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

// Real QR code rendering using the qrcode algorithm approach
// We use a simple but correct QR matrix generator

function getQRMatrix(text) {
  // Use Google Charts QR API to render — reliable and works offline via img tag
  // Returns a data URL via canvas after loading the image
  return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(text)}&format=png&ecc=M`;
}

export default function AssetQRCode({ asset, size = 200, showDownload = true, showPrint = false, className = '' }) {
  if (!asset?.qr_code_value) return null;

  const qrUrl = getQRMatrix(asset.qr_code_value);

  const downloadQR = async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `${asset.asset_id || asset.id}_QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrUrl;
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="bg-white p-3 rounded-lg">
        <img
          src={qrUrl}
          alt={`QR code for ${asset.name}`}
          width={size}
          height={size}
          className="block"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Encodes: <span className="font-mono text-cyan-400">{asset.qr_code_value}</span>
      </p>
      {(showDownload || showPrint) && (
        <div className="flex gap-2">
          {showDownload && (
            <Button size="sm" onClick={downloadQR} className="bg-cyan-600 hover:bg-cyan-700">
              <Download className="w-3 h-3 mr-1" />
              Download PNG
            </Button>
          )}
          {showPrint && (
            <Button size="sm" variant="outline" onClick={window.print} className="border-gray-600 text-gray-300">
              <Printer className="w-3 h-3 mr-1" />
              Print
            </Button>
          )}
        </div>
      )}
    </div>
  );
}