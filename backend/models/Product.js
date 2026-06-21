const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true }, // எ.கா: T-Shirt, Shirt
    imageUrl: { type: String, required: true },
    countInStock: { type: Number, required: true, default: 0 },
    // துணிகளுக்காகப் புதிதாகச் சேர்த்தவை:
    sizes: { type: [String], required: true }, // எ.கா: ['S', 'M', 'L', 'XL']
    colors: { type: [String], required: true } // எ.கா: ['Black', 'White']
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);