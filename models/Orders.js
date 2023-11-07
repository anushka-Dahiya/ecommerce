// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
//   quantity: { type: Number, min: 1, required: true },
//   totalPrice: { type: Number, required: true },
//   orderDate: { type: Date, default: Date.now }, // Include order date with a default value of the current date
//   paid: { type: String, default: 'no' }, // Include a 'paid' field with a default value of 'no'
// });

// const Order = mongoose.model('Order', orderSchema);

// module.exports = Order;


const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderItems: [orderItemSchema], // Array of product IDs and quantities
  totalPrice: { type: Number, required: true }, // Total price of the order
  paid: { type: Boolean, default: false }, // Boolean flag indicating if the order is paid
  orderDate: { type: Date, default: Date.now }, // Include order date with a default value of the current date
  // Add other order details as needed
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;





