'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Printer,
  QrCode,
  DollarSign,
  CheckCircle,
  XCircle,
  Edit,
  Send
} from 'lucide-react';
import { getApiToken } from '@/utils/auth';

export default function BillDetailPage() {
  const router = useRouter();
  const params = useParams();
  const billId = params.id;
  
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    if (billId) {
      fetchBill();
    }
  }, [billId]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const token = await getApiToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bills/${billId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBill(data);
      } else {
        alert('Bill not found');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      const token = await getApiToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bills/${billId}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: parseFloat(paymentAmount),
            mode: 'cash',
            notes: 'Payment recorded'
          })
        }
      );

      if (response.ok) {
        setShowPaymentModal(false);
        setPaymentAmount('');
        fetchBill();
        alert('Payment recorded successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create a simple bill image
      canvas.width = 800;
      canvas.height = 1000;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add bill content
      ctx.fillStyle = '#000000';
      ctx.font = '20px Arial';
      ctx.fillText(`Bill: ${bill.billNumber}`, 40, 60);
      ctx.fillText(`Customer: ${bill.customerName}`, 40, 100);
      ctx.fillText(`Total: ₹${bill.grandTotal.toFixed(2)}`, 40, 140);
      
      // Download
      const link = document.createElement('a');
      link.download = `bill-${bill.billNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading bill:', error);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/bill/${bill.verificationCode}`;
    const shareText = `Invoice ${bill.billNumber} - ₹${bill.grandTotal.toFixed(2)}\nView: ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${bill.billNumber}`,
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Link copied to clipboard!');
    }
  };

  const showQRCode = () => {
    setShowQR(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Bill not found</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      viewed: 'bg-purple-100 text-purple-700',
      paid: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 print:hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{bill.billNumber}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(bill.status)}`}>
                {bill.status}
              </span>
            </div>
          </div>

          <button
            onClick={showQRCode}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <QrCode className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Bill Content */}
      <div ref={printRef} className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          {/* Bill Header */}
          <div className="border-b pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">TAX INVOICE</h2>
                <p className="text-sm text-gray-600 mt-1">Bill No: {bill.billNumber}</p>
                <p className="text-sm text-gray-600">
                  Date: {new Date(bill.billDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>

              <div className={`px-4 py-2 rounded-lg ${
                bill.paymentStatus === 'paid' ? 'bg-green-100' :
                bill.paymentStatus === 'partial' ? 'bg-amber-100' :
                'bg-red-100'
              }`}>
                <p className="text-xs text-gray-600">Payment Status</p>
                <p className={`text-lg font-bold ${
                  bill.paymentStatus === 'paid' ? 'text-green-700' :
                  bill.paymentStatus === 'partial' ? 'text-amber-700' :
                  'text-red-700'
                }`}>
                  {bill.paymentStatus.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">BILLED TO:</h3>
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

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-2 text-sm font-semibold text-gray-600">#</th>
                  <th className="text-left py-2 text-sm font-semibold text-gray-600">Item</th>
                  <th className="text-center py-2 text-sm font-semibold text-gray-600">Qty</th>
                  <th className="text-right py-2 text-sm font-semibold text-gray-600">Rate</th>
                  <th className="text-right py-2 text-sm font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="py-3 text-sm text-gray-900">{item.name}</td>
                    <td className="py-3 text-sm text-gray-600 text-center">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 text-sm text-gray-600 text-right">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="py-3 text-sm text-gray-900 text-right font-medium">
                      ₹{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{bill.subtotal.toFixed(2)}</span>
                </div>

                {bill.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount:</span>
                    <span>- ₹{bill.totalDiscount.toFixed(2)}</span>
                  </div>
                )}

                {bill.totalTax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">₹{bill.totalTax.toFixed(2)}</span>
                  </div>
                )}

                {bill.shippingCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">₹{bill.shippingCharges.toFixed(2)}</span>
                  </div>
                )}

                {bill.roundOff !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Round Off:</span>
                    <span className="font-medium">₹{bill.roundOff.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t pt-2 flex justify-between text-lg">
                  <span className="font-bold text-gray-900">TOTAL:</span>
                  <span className="font-bold text-blue-600">₹{bill.grandTotal.toFixed(2)}</span>
                </div>

                {bill.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid:</span>
                      <span>₹{bill.amountPaid.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Balance Due:</span>
                      <span className={`font-bold ${bill.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{bill.amountDue.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Notes:</h3>
              <p className="text-sm text-gray-700">{bill.notes}</p>
            </div>
          )}

          {/* Terms */}
          {bill.termsAndConditions && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Terms & Conditions:</h3>
              <p className="text-sm text-gray-700">{bill.termsAndConditions}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="print:hidden grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            <Download className="w-5 h-5" />
            Download
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium col-span-2"
          >
            <Share2 className="w-5 h-5" />
            Share Digital Bill
          </button>

          {bill.amountDue > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium col-span-2"
            >
              <DollarSign className="w-5 h-5" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
              Digital Bill QR Code
            </h3>
            
            <div className="bg-white p-4 rounded-xl border-2 border-gray-200 mb-4">
              <div className="flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    `${window.location.origin}/bill/${bill.verificationCode}`
                  )}`}
                  alt="Bill QR Code"
                  className="w-64 h-64"
                />
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center mb-4">
              Scan this QR code to view the digital bill
            </p>

            <button
              onClick={() => setShowQR(false)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Record Payment
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                Amount Due: ₹{bill.amountDue.toFixed(2)}
              </label>
              <input
                type="number"
                placeholder="Enter payment amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                max={bill.amountDue}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
