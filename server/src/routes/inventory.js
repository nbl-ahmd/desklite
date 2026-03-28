const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// List products with optional search/low-stock filter
router.get('/products', auth, async (req, res) => {
  try {
    const { search, lowStock } = req.query;
    const filter = { userId: req.user.id, isActive: true };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { sku: regex }, { barcode: regex }];
    }

    let products = await Product.find(filter)
      .sort({ updatedAt: -1 })
      .limit(200);

    if (lowStock === '1' || lowStock === 'true') {
      products = products.filter((p) => p.lowStockThreshold > 0 && p.stock <= p.lowStockThreshold);
    }

    const summary = products.reduce(
      (acc, p) => {
        const isLow = p.lowStockThreshold > 0 && p.stock <= p.lowStockThreshold;
        if (isLow) acc.lowStockCount += 1;
        acc.totalSkus += 1;
        acc.totalStockValue += (p.purchasePrice || 0) * (p.stock || 0);
        return acc;
      },
      { lowStockCount: 0, totalStockValue: 0, totalSkus: 0 }
    );

    res.json({ products, summary });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product
router.post('/products', auth, async (req, res) => {
  try {
    const {
      name,
      sku,
      unit,
      category,
      barcode,
      purchasePrice,
      sellingPrice,
      taxPercent,
      openingStock,
      lowStockThreshold,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existingName = await Product.findOne({ userId: req.user.id, name: name.trim() });
    if (existingName) {
      return res.status(200).json({ product: existingName, message: 'Product already exists' });
    }

    if (sku && sku.trim()) {
      const existingSku = await Product.findOne({ userId: req.user.id, sku: sku.trim() });
      if (existingSku) {
        return res.status(409).json({ error: 'SKU already exists' });
      }
    }

    const opening = Number(openingStock) || 0;
    const now = new Date();

    const product = new Product({
      userId: req.user.id,
      shopId: req.user.shopId,
      name: name.trim(),
      sku: sku?.trim() || undefined,
      unit: unit?.trim() || 'pcs',
      category: category?.trim(),
      barcode: barcode?.trim(),
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      taxPercent: Number(taxPercent) || 0,
      openingStock: opening,
      stock: opening,
      lowStockThreshold: Number(lowStockThreshold) || 0,
      notes: notes?.trim()
    });

    if (opening > 0) {
      product.lastRestockedAt = now;
    }

    await product.save();

    if (opening > 0) {
      await StockMovement.create({
        productId: product._id,
        userId: req.user.id,
        shopId: req.user.shopId,
        type: 'purchase',
        direction: 'in',
        quantity: opening,
        unitCost: Number(purchasePrice) || 0,
        note: 'Opening stock',
        referenceType: 'manual',
        occurredAt: now,
        closingStock: opening
      });
    }

    res.status(201).json({ product });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product metadata (not stock)
router.patch('/products/:id', auth, async (req, res) => {
  try {
    const allowed = [
      'name',
      'sku',
      'unit',
      'category',
      'barcode',
      'purchasePrice',
      'sellingPrice',
      'taxPercent',
      'lowStockThreshold',
      'notes',
      'isActive'
    ];

    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (updates.name && updates.name.trim() !== product.name) {
      const existingName = await Product.findOne({ userId: req.user.id, name: updates.name.trim() });
      if (existingName && existingName._id.toString() !== product._id.toString()) {
        return res.status(409).json({ error: 'Name already exists' });
      }
    }

    if (updates.sku && updates.sku.trim() !== product.sku) {
      const existingSku = await Product.findOne({ userId: req.user.id, sku: updates.sku.trim() });
      if (existingSku && existingSku._id.toString() !== product._id.toString()) {
        return res.status(409).json({ error: 'SKU already exists' });
      }
    }

    Object.keys(updates).forEach((key) => {
      if (typeof updates[key] === 'string') {
        product[key] = updates[key].trim();
      } else {
        product[key] = updates[key];
      }
    });

    await product.save();
    res.json({ product });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Adjust stock with a movement entry
router.post('/products/:id/adjust', auth, async (req, res) => {
  try {
    const { quantity, direction, type = 'adjustment', note, unitCost, occurredAt, referenceType, referenceId } = req.body;
    const qty = Number(quantity);

    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    if (!['in', 'out'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be in or out' });
    }

    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const delta = direction === 'in' ? qty : -qty;
    const newStock = (product.stock || 0) + delta;

    if (newStock < 0) {
      return res.status(400).json({ error: 'Stock cannot go negative' });
    }

    const eventDate = occurredAt ? new Date(occurredAt) : new Date();

    product.stock = newStock;
    if (direction === 'in') product.lastRestockedAt = eventDate;
    if (direction === 'out') product.lastSoldAt = eventDate;

    await product.save();

    const movement = await StockMovement.create({
      productId: product._id,
      userId: req.user.id,
      shopId: req.user.shopId,
      type,
      direction,
      quantity: qty,
      unitCost: Number(unitCost) || 0,
      note: note?.trim(),
      referenceType: referenceType || 'manual',
      referenceId,
      occurredAt: eventDate,
      closingStock: newStock
    });

    res.json({ product, movement });
  } catch (err) {
    console.error('Error adjusting stock:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List stock movements for a product
router.get('/products/:id/movements', auth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const movements = await StockMovement.find({ productId: req.params.id, userId: req.user.id })
      .sort({ occurredAt: -1 })
      .limit(limit);

    res.json({ movements });
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
