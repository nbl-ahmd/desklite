'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  Download, 
  Share2, 
  CheckCircle, 
  XCircle,
  Building2,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';

export default function PublicBillPage() {
  const params = useParams();
  const verificationCode = params.code;
  
  const [bill, setBill] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const billRef = useRef();

  useEffect(() => {
    if (verificationCode) {
      fetchBill();
    }
  }, [verificationCode]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bills/public/${verificationCode}`
      );

      if (response.ok) {
        const data = await response.json();
        setBill(data.bill);
        setShop(data.shop);
      } else {
        setError('Bill not found or invalid verification code');
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      setError('Failed to load bill');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Use html2canvas if available, otherwise fallback to screenshot
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(billRef.current);
      
      const link = document.createElement('a');
      link.download = `bill-${bill.billNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading bill:', error);
      alert('Please take a screenshot to save the bill');
    }
  };

  const handleShare = async () => {
    const shareText = `Invoice ${bill.billNumber} - ₹${bill.grandTotal.toFixed(2)}\nFrom: ${shop?.name || 'Shop'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${bill.billNumber}`,
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Bill Not Found</h1>
          <p className="text-gray-600">{error || 'Invalid verification code'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Digital Invoice</h1>
              <p className="text-blue-100 text-sm">
                Verified Bill • View {bill.viewCount || 1}
              </p>
            </div>
            
            <div className={`px-4 py-2 rounded-lg ${
              bill.paymentStatus === 'paid' ? 'bg-green-500' :
              bill.paymentStatus === 'partial' ? 'bg-amber-500' :
              'bg-red-500'
            }`}>
              <p className="text-xs opacity-90">Status</p>
              <p className="text-sm font-bold">
                {bill.paymentStatus.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Content */}
      <div className="max-w-4xl mx-auto -mt-4">
        <div ref={billRef} className="bg-white rounded-t-3xl shadow-xl p-6">
          {/* Shop Info */}
          {shop && (
            <div className="border-b pb-4 mb-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{shop.name}</h2>
                  {shop.address && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {shop.address}
                    </p>
                  )}
                  {shop.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {shop.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bill Details */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-600">Invoice Number</p>
              <p className="font-semibold text-gray-900">{bill.billNumber}</p>
            </div>
            <div>
              <p className="text-gray-600">Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(bill.billDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">BILLED TO:</h3>
            <p className="text-lg font-semibold text-gray-900">{bill.customerName}</p>
            {bill.customerPhone && (
              <p className="text-sm text-gray-600">{bill.customerPhone}</p>
            )}
            {bill.customerEmail && (
              <p className="text-sm text-gray-600">{bill.customerEmail}</p>
            )}
            {bill.customerAddress && (
              <p className="text-sm text-gray-600 mt-1">{bill.customerAddress}</p>
            )}
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">ITEMS:</h3>
            
            <div className="space-y-3">
              {bill.items.map((item, index) => (
                <div key={index} className="border-b border-gray-200 pb-3 last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        {item.quantity} {item.unit} × ₹{item.price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      ₹{item.total.toFixed(2)}
                    </p>
                  </div>
                  
                  {(item.discount > 0 || item.taxPercent > 0) && (
                    <div className="flex gap-3 text-xs text-gray-500">
                      {item.discount > 0 && (
                        <span>Discount: ₹{item.discount.toFixed(2)}</span>
                      )}
                      {item.taxPercent > 0 && (
                        <span>Tax: {item.taxPercent}%</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-4 mb-6">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{bill.subtotal.toFixed(2)}</span>
              </div>

              {bill.totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount</span>
                  <span>- ₹{bill.totalDiscount.toFixed(2)}</span>
                </div>
              )}

              {bill.totalTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">₹{bill.totalTax.toFixed(2)}</span>
                </div>
              )}

              {bill.shippingCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">₹{bill.shippingCharges.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-600 text-white rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-2xl font-bold">₹{bill.grandTotal.toFixed(2)}</span>
              </div>
              
              {bill.amountPaid > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-500">
                  <div className="flex justify-between text-sm">
                    <span>Paid</span>
                    <span>₹{bill.amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Balance</span>
                    <span className="font-bold">₹{bill.amountDue.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {bill.paymentStatus === 'paid' ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Fully Paid</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">
                  {bill.paymentStatus === 'partial' ? 'Partially Paid' : 'Unpaid'}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes:</h3>
              <p className="text-sm text-gray-700">{bill.notes}</p>
            </div>
          )}

          {/* Terms */}
          {bill.termsAndConditions && (
            <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t">
              {bill.termsAndConditions}
            </div>
          )}

          {/* Verification Footer */}
          <div className="text-center text-xs text-gray-400 mt-4">
            <p>Digitally Verified Invoice</p>
            <p className="mt-1">Powered by Desklite</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white border-t p-4 grid grid-cols-2 gap-3 rounded-b-3xl shadow-xl">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
          >
            <Download className="w-5 h-5" />
            Download
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="max-w-4xl mx-auto mt-6 px-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Tip:</strong> You can screenshot, download, or share this bill. 
            This is a verified digital invoice that can be accessed anytime using the QR code.
          </p>
        </div>
      </div>
    </div>
  );
}
