const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // நாம் முதலில் உருவாக்கிய ப்ராடக்ட் மாடல்

// 1. எல்லா பொருட்களையும் எடுக்க (GET All Products)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "சர்வர் பிழை (Server Error)" });
    }
});

// 2. புதிய பொருளைச் சேர்க்க (POST New Product)
router.post('/', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(400).json({ message: "பொருளைச் சேர்ப்பதில் பிழை ஏற்பட்டது" });
    }
});
// 🎯 DELETE ROUTE FOR PRODUCTS
router.delete('/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Product deleted permanently" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
