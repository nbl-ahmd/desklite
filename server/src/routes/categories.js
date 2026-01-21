const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');

// Get categories for user
router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category
router.post('/', auth, async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and type required' });

    // Avoid duplicates for same user+type
    const existing = await Category.findOne({ userId: req.user.id, name: name.trim(), type });
    if (existing) return res.status(200).json(existing);

    const cat = new Category({ userId: req.user.id, name: name.trim(), type });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete category
router.delete('/:id', auth, async (req, res) => {
  try {
    const cat = await Category.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!cat) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
