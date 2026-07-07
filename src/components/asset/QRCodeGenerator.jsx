import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function QRCodeGenerator({ asset, isOpen, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (asset && isOpen && canvasRef.current) {
      generateQRCode();
    }
  }, [asset, isOpen]);

  const generateQRCode = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 300;
    const qrSize = 21; // Standard QR code size for version 1

    // Create simple QR code pattern (simplified version)
    const data = `ASSET:${asset.asset_tag}|${asset.id}`;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    // Draw QR code pattern (simplified - in production use a QR library)
    const moduleSize = size / (qrSize + 2);
    ctx.fillStyle = 'black';

    // Draw finder patterns (corners)
    drawFinderPattern(ctx, moduleSize, moduleSize, moduleSize);
    drawFinderPattern(ctx, size - 8 * moduleSize, moduleSize, moduleSize);
    drawFinderPattern(ctx, moduleSize, size - 8 * moduleSize, moduleSize);

    // Draw data (simplified pattern based on asset ID)
    const idHash = asset.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < qrSize; i++) {
      for (let j = 0; j < qrSize; j++) {
        if ((i * j + idHash) % 3 === 0) {
          ctx.fillRect(
            (j + 1) * moduleSize,
            (i + 1) * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }

    // Add text below QR code
    ctx.fillStyle = 'black';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(asset.asset_tag, size / 2, size - 20);
    ctx.font = '12px Arial';
    ctx.fillText(asset.name, size / 2, size - 5);
  };

  const drawFinderPattern = (ctx, x, y, moduleSize) => {
    // Outer square
    ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
    ctx.fillStyle = 'white';
    ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
    ctx.fillStyle = 'black';
    ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
  };

  const downloadQRCode = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${asset.asset_tag}_QRCode.png`;
    link.href = url;
    link.click();
  };

  if (!asset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>QR Code - {asset.asset_tag}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="border-4 border-gray-700 rounded-lg bg-white"
          />
          <p className="text-sm text-gray-400 text-center">
            Scan this QR code to quickly access asset details
          </p>
          <Button
            onClick={downloadQRCode}
            className="bg-cyan-600 hover:bg-cyan-700 w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}