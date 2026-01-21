'use client';

import { useState, useEffect } from 'react';
import { QrCode, Copy, Check, Edit2, X, Loader2 } from 'lucide-react';
import { getApiToken } from '@/utils/auth';

export default function UpiQrWidget() {
  const [upiId, setUpiId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tempUpiId, setTempUpiId] = useState('');
  const [tempName, setTempName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load UPI details from server
    loadUpiDetails();
  }, []);

  const loadUpiDetails = async () => {
    setLoading(true);
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const savedUpi = data.user?.upiId || '';
        const savedName = data.user?.shopName || data.user?.name || '';
        setUpiId(savedUpi);
        setMerchantName(savedName);
        setTempUpiId(savedUpi);
        setTempName(savedName);
      }
    } catch (err) {
      console.error('Failed to load UPI details:', err);
      // Fallback to localStorage
      const savedUpi = localStorage.getItem('upiId') || '';
      const savedName = localStorage.getItem('merchantName') || '';
      setUpiId(savedUpi);
      setMerchantName(savedName);
      setTempUpiId(savedUpi);
      setTempName(savedName);
    } finally {
      setLoading(false);
    }
  };

  const generateQrUrl = () => {
    if (!upiId) return null;
    // Using a free QR code API
    const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName || 'Merchant')}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upiId: tempUpiId,
          shopName: tempName
        })
      });
      
      if (res.ok) {
        setUpiId(tempUpiId);
        setMerchantName(tempName);
        setIsEditing(false);
        // Also save to localStorage as backup
        localStorage.setItem('upiId', tempUpiId);
        localStorage.setItem('merchantName', tempName);
      } else {
        alert('Failed to save UPI details. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save UPI details:', err);
      // Fallback: save to localStorage only
      localStorage.setItem('upiId', tempUpiId);
      localStorage.setItem('merchantName', tempName);
      setUpiId(tempUpiId);
      setMerchantName(tempName);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const copyUpiId = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-slate-500 font-medium">Loading UPI settings...</span>
      </div>
    );
  }

  // Show setup prompt if no UPI configured
  if (!upiId && !isEditing) {
    return (
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">UPI QR Code</h3>
            <p className="text-purple-200 text-sm">Accept digital payments</p>
          </div>
        </div>
        <p className="text-purple-100 text-sm mb-4">
          Set up your UPI ID to generate QR codes for payment reminders sent via WhatsApp.
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="w-full py-3 bg-white text-purple-600 font-bold rounded-2xl hover:bg-purple-50 transition-colors"
        >
          Add UPI ID
        </button>
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">UPI Setup</h3>
          <button
            onClick={() => {
              setIsEditing(false);
              setTempUpiId(upiId);
              setTempName(merchantName);
            }}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Your UPI ID
            </label>
            <input
              type="text"
              value={tempUpiId}
              onChange={(e) => setTempUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Your Shop Name"
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 outline-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!tempUpiId.includes('@') || saving}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save UPI Details'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Display QR code
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode className="w-5 h-5" />
            <span className="font-bold">UPI QR Code</span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col items-center">
        <div className="bg-white p-3 rounded-2xl border-2 border-slate-100 mb-4">
          <img
            src={generateQrUrl()}
            alt="UPI QR Code"
            className="w-40 h-40"
          />
        </div>
        
        <p className="font-bold text-slate-900 mb-1">{merchantName || 'Your Shop'}</p>
        
        <button
          onClick={copyUpiId}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <span className="font-medium">{upiId}</span>
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
        
        <p className="text-xs text-slate-400 mt-3 text-center">
          Customers can scan this QR to pay via any UPI app
        </p>
      </div>
    </div>
  );
}
