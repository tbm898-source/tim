import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

export function getAssetQrValue(asset) {
  if (!asset) return '';
  if (asset.qr_code_value) return asset.qr_code_value;

  const stableId = asset.asset_id || asset.asset_tag || asset.id;
  return stableId ? `/AssetDetail?asset_id=${encodeURIComponent(stableId)}` : '';
}

export default function AssetQRCode({
  asset,
  size = 200,
  showDownload = true,
  showPrint = false,
  showEncodedValue = true,
  className = '',
}) {
  const qrValue = useMemo(() => getAssetQrValue(asset), [asset]);
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function renderQr() {
      if (!qrValue) {
        setDataUrl('');
        return;
      }

      try {
        setError('');
        const url = await QRCode.toDataURL(qrValue, {
          width: size,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        if (!cancelled) setDataUrl(url);
      } catch (err) {
        if (!cancelled) {
          setDataUrl('');
          setError(err?.message || 'QR code generation failed');
        }
      }
    }

    renderQr();
    return () => {
      cancelled = true;
    };
  }, [qrValue, size]);

  if (!qrValue) return null;

  const downloadQR = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${asset.asset_id || asset.asset_tag || asset.id || 'asset'}_QR.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="bg-white p-3 rounded-lg">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR code for ${asset.name || asset.asset_id || 'asset'}`}
            width={size}
            height={size}
            className="block"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div
            className="flex items-center justify-center text-gray-500 text-xs"
            style={{ width: size, height: size }}
          >
            {error || 'Generating QR...'}
          </div>
        )}
      </div>
      {showEncodedValue && (
        <p className="text-xs text-gray-400 text-center break-all max-w-xs">
          Encodes: <span className="font-mono text-cyan-400">{qrValue}</span>
        </p>
      )}
      {(showDownload || showPrint) && (
        <div className="flex gap-2 no-print">
          {showDownload && (
            <Button size="sm" onClick={downloadQR} disabled={!dataUrl} className="bg-cyan-600 hover:bg-cyan-700">
              <Download className="w-3 h-3 mr-1" />
              Download PNG
            </Button>
          )}
          {showPrint && (
            <Button size="sm" variant="outline" onClick={() => window.print()} className="border-gray-600 text-gray-300">
              <Printer className="w-3 h-3 mr-1" />
              Print
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
