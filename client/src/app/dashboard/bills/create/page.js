'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  User,
  Phone,
  IndianRupee
} from 'lucide-react';
import { getApiToken } from '@/utils/auth';

export default function CreateBillPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [products, setProducts] = useState([]);
  
  const [billData, setBillData] = useState({
    customerName: '',
    customerPhone: '',
    items: [{ name: '', quantity: 1, price: 0, unit: 'pcs', productId: null }],
    paymentMode: 'cash',
    amountPaid: 0,
    notes: ''
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    grandTotal: 0,
    balance: 0
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [billData.items, billData.amountPaid]);

  const fetchCustomers = async () => {
    try {
      const token = await getApiToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = await getApiToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/inventory/products`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const calculateTotals = () => {
    const subtotal = billData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.price || 0) * parseFloat(item.quantity || 0));
    }, 0);

    const balance = subtotal - parseFloat(billData.amountPaid || 0);

    setTotals({
      subtotal,
      grandTotal: subtotal,
      balance: balance > 0 ? balance : 0
    });
  };

  const addItem = () => {
    setBillData({
      ...billData,
      items: [...billData.items, { name: '', quantity: 1, price: 0, unit: 'pcs', productId: null }]
    });
  };

  const removeItem = (index) => {
    if (billData.items.length > 1) {
      const newItems = billData.items.filter((_, i) => i !== index);
      setBillData({ ...billData, items: newItems });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...billData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    // If name is changed manually, clear product linkage to avoid stale stock info
    if (field === 'name') {
      newItems[index].productId = null;
      newItems[index].stockOnHand = undefined;
      newItems[index].lowStockThreshold = undefined;
    }
    setBillData({ ...billData, items: newItems });
  };

  const selectProductForItem = (index, product) => {
    const newItems = [...billData.items];
    newItems[index] = {
      ...newItems[index],
      name: product.name,
      productId: product._id,
      price: product.sellingPrice || product.purchasePrice || 0,
      unit: product.unit || 'pcs',
      stockOnHand: product.stock,
      lowStockThreshold: product.lowStockThreshold
    };
    setBillData({ ...billData, items: newItems });
  };

  const productMatches = useMemo(() => {
    return (term) => {
      if (!term || term.length < 1) return products.slice(0, 8);
      const lower = term.toLowerCase();
      return products
        .filter(p => p.name.toLowerCase().includes(lower) || (p.sku || '').toLowerCase().includes(lower))
        .slice(0, 8);
    };
  }, [products]);

  const selectCustomer = (customer) => {
    setBillData({
      ...billData,
      customerName: customer.name,
      customerPhone: customer.phone || ''
    });
    setShowCustomerList(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!billData.customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    const validItems = billData.items.filter(item => item.name.trim() && item.price > 0);
    if (validItems.length === 0) {
      alert('Please add at least one item with price');
      return;
    }

    try {
      setLoading(true);
      const token = await getApiToken();

      const payload = {
        customerName: billData.customerName,
        customerPhone: billData.customerPhone,
        items: validItems.map(item => ({
          name: item.name,
          quantity: parseFloat(item.quantity),
          unit: item.unit || 'pcs',
          price: parseFloat(item.price),
          discount: 0,
          taxPercent: 0,
          productId: item.productId || undefined
        })),
        paymentMode: billData.paymentMode,
        amountPaid: parseFloat(billData.amountPaid || 0),
        notes: billData.notes,
        termsAndConditions: 'Thank you for your business!',
        shippingCharges: 0,
        otherCharges: 0,
        roundOff: 0,
        createTransaction: true
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bills`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/bills/${data.bill._id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create bill');
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      alert('Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">New Bill</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Customer */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">CUSTOMER</h2>
          
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Customer Name *"
                value={billData.customerName}
                onChange={(e) => {
                  setBillData({ ...billData, customerName: e.target.value });
                  setShowCustomerList(e.target.value.length > 0);
                }}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {/* Customer Suggestions */}
              {showCustomerList && customers.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {customers
                    .filter(c => c.name.toLowerCase().includes(billData.customerName.toLowerCase()))
                    .slice(0, 5)
                    .map((customer) => (
                      <button
                        key={customer.name}
                        onClick={() => selectCustomer(customer)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0"
                      >
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        {customer.phone && (
                          <p className="text-sm text-gray-500">{customer.phone}</p>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={billData.customerPhone}
                onChange={(e) => setBillData({ ...billData, customerPhone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">ITEMS</h2>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-blue-600 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-3">
            {billData.items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {item.name && productMatches(item.name).length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                        {productMatches(item.name).map((product) => (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => selectProductForItem(index, product)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0 border-gray-100"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">SKU: {product.sku || '—'}</p>
                              </div>
                              <div className="text-right text-xs text-gray-600">
                                <p>Stock: {product.stock ?? 0}</p>
                                <p>₹{product.sellingPrice || product.purchasePrice || 0}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={item.unit || 'pcs'}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    />
                    <div className="col-span-2 relative">
                      <IndianRupee className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex gap-2 items-center">
                      {item.stockOnHand !== undefined && (
                        <span className={item.stockOnHand <= (item.lowStockThreshold || 0) ? 'text-amber-700 font-semibold' : ''}>
                          Stock: {item.stockOnHand}
                        </span>
                      )}
                      {item.stockOnHand !== undefined && Number(item.quantity) > Number(item.stockOnHand) && (
                        <span className="text-red-600 font-semibold">Quantity exceeds stock</span>
                      )}
                    </div>
                    <div className="font-bold text-gray-900">
                      ₹{(item.price * item.quantity).toFixed(0)}
                    </div>
                  </div>
                </div>

                {billData.items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg h-fit"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-4 text-white">
          <div className="flex justify-between items-center text-lg mb-3">
            <span>Total</span>
            <span className="text-2xl font-bold">₹{totals.grandTotal.toFixed(0)}</span>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={billData.paymentMode}
                onChange={(e) => setBillData({ ...billData, paymentMode: e.target.value })}
                className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70"
              >
                <option value="cash" className="text-gray-900">Cash</option>
                <option value="upi" className="text-gray-900">UPI</option>
                <option value="card" className="text-gray-900">Card</option>
                <option value="credit" className="text-gray-900">Credit</option>
              </select>

              <div className="flex-1 relative">
                <IndianRupee className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white w-4 h-4" />
                <input
                  type="number"
                  placeholder="Paid"
                  value={billData.amountPaid}
                  onChange={(e) => setBillData({ ...billData, amountPaid: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70"
                />
              </div>
            </div>

            {totals.balance > 0 && (
              <div className="flex justify-between text-sm bg-white/10 rounded-lg px-3 py-2">
                <span>Balance Due</span>
                <span className="font-bold">₹{totals.balance.toFixed(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <textarea
            placeholder="Notes (optional)"
            value={billData.notes}
            onChange={(e) => setBillData({ ...billData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Create Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-green-600 text-white rounded-lg text-lg font-bold hover:bg-green-700 disabled:opacity-50 shadow-lg"
        >
          {loading ? 'Creating...' : 'Create Bill'}
        </button>

        <div className="h-8"></div>
      </div>
    </div>
  );
}
