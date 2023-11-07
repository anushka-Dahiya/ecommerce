const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email : {type:String , required:true},
  name: { type: String },
  address: { type: String },
  contact :{type : Number},
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
});

const User = mongoose.model('User', userSchema);

module.exports = User;
