'use client';

import { useState } from 'react';
import { Download, FileImage, FileText, Loader2, Share2 } from 'lucide-react';
import { createReportExport, downloadBlob, shareBlob } from '@/lib/reportExport';

export default function ReportExportMenu({ payload, title = 'Report', className = '', tone = 'light' }) {
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState('');

  const run = async (format, share) => {
    const key = `${share ? 'share' : 'download'}-${format}`;
    setLoading(key); setMessage('');
    try {
      const { blob, filename } = await createReportExport(payload, format);
      if (share) {
        const shared = await shareBlob(blob, filename, title);
        if (!shared) { downloadBlob(blob, filename); setMessage('File downloaded because sharing is unavailable on this device.'); }
      } else downloadBlob(blob, filename);
    } catch (error) { setMessage(error.name === 'AbortError' ? 'Sharing cancelled.' : error.message); }
    finally { setLoading(null); }
  };
  const lightButton = 'bg-slate-100 hover:bg-slate-200 text-slate-700';
  const darkButton = 'bg-white text-slate-950 hover:bg-slate-100';
  const buttonClass = tone === 'dark' ? darkButton : lightButton;
  const messageClass = tone === 'dark' ? 'text-amber-200' : 'text-amber-700';
  const button = (format, share, label, Icon) => <button key={`${format}-${share}`} onClick={() => run(format, share)} disabled={Boolean(loading)} className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50 ${buttonClass}`}><Icon size={15} />{loading === `${share ? 'share' : 'download'}-${format}` ? <Loader2 size={14} className="animate-spin" /> : label}</button>;
  return <div className={`flex flex-wrap gap-2 ${className}`}><div className="grid grid-cols-2 gap-2 sm:flex">{button('pdf', false, 'PDF', FileText)}{button('png', false, 'Image', FileImage)}</div><div className="grid grid-cols-2 gap-2 sm:flex">{button('pdf', true, 'Share PDF', Share2)}{button('png', true, 'Share image', Share2)}</div>{message && <p className={`basis-full text-xs font-bold ${messageClass}`}>{message}</p>}</div>;
}
