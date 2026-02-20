import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, CheckCircle } from 'lucide-react';

export default function QRScanner({ onScanSuccess, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          stopScanner();
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors - they happen constantly
        }
      );
      
      setScanning(true);
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Camera className="w-5 h-5 mr-2 text-cyan-400" />
              Scan Asset QR Code
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            id="qr-reader"
            className="w-full rounded-lg overflow-hidden"
            style={{ minHeight: scanning ? '300px' : '0' }}
          />

          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!scanning && !error && (
            <div className="text-center py-8">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-4">
                Position the QR code within the camera frame
              </p>
              <Button
                onClick={startScanner}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            </div>
          )}

          {scanning && (
            <div className="text-center text-gray-400 text-sm">
              <CheckCircle className="w-5 h-5 mx-auto mb-2 animate-pulse text-cyan-400" />
              Scanning... Point camera at QR code
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}