'use client';

import { useState } from 'react';
import { generateQRCode, ErrorCorrectionLevel } from '@/lib/qr-generator';

export default function QRCodeGenerator() {
  const [url, setUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [qrPng, setQrPng] = useState('');
  const [format, setFormat] = useState<'svg' | 'png'>('svg');
  const [error, setError] = useState('');

  const handleGenerate = () => {
    setError('');
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      const qr = generateQRCode(url, ErrorCorrectionLevel.M);
      const svg = qr.toSVG(8, 4);
      const png = qr.toPNG(8, 4);
      
      setQrSvg(svg);
      setQrPng(png);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    }
  };

  const handleDownload = () => {
    if (format === 'svg' && qrSvg) {
      const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.svg';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png' && qrPng) {
      const a = document.createElement('a');
      a.href = qrPng;
      a.download = 'qrcode.png';
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          QR Code Generator
        </h1>
        <p className="text-center text-slate-300 mb-12">
          Generate QR codes from URLs - Zero dependencies, 100% client-side
        </p>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                Enter URL
              </label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
              />
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Output Format
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setFormat('svg')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    format === 'svg'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  SVG
                </button>
                <button
                  onClick={() => setFormat('png')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    format === 'png'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  PNG
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              Generate QR Code
            </button>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
                {error}
              </div>
            )}

            {/* QR Code Display */}
            {(qrSvg || qrPng) && (
              <div className="mt-8 space-y-4">
                <div className="bg-white rounded-xl p-8 flex items-center justify-center">
                  {format === 'svg' && qrSvg && (
                    <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  )}
                  {format === 'png' && qrPng && (
                    <img src={qrPng} alt="QR Code" className="max-w-full" />
                  )}
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Download {format.toUpperCase()}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-semibold mb-2">Zero Dependencies</h3>
            <p className="text-sm text-slate-300">
              Pure TypeScript implementation with no external libraries
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold mb-2">100% Client-Side</h3>
            <p className="text-sm text-slate-300">
              No API calls, all processing happens in your browser
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="font-semibold mb-2">Multiple Formats</h3>
            <p className="text-sm text-slate-300">
              Export as SVG or PNG with customizable sizes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

