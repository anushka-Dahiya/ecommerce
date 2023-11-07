const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
// const JwtStrategy = require('passport-jwt').Strategy;
// const ExtractJwt = require('passport-jwt').ExtractJwt;
// const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');
const Product = require('./models/Products');
const User = require('./models/Users');
const Cart = require('./models/Cart');
const Order = require('./models/Orders');

const app = express();
// app.use(cookieParser());

require('dotenv').config()

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ecom', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });


// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const JWT_SECRET = process.env.JWT_KEY;
// const jwtOptions = {
//   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//   secretOrKey: JWT_SECRET,
// };

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Configure session middleware
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true,
}));

// Configure Passport with Local Strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        return done(null, false, { message: 'Invalid username' });
      }

      const passwordMatch = bcrypt.compareSync(password, user.password);
      if (!passwordMatch) {
        return done(null, false, { message: 'Invalid password' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

//Configure JWT strategy 
// passport.use('jwt', new JwtStrategy(jwtOptions, (payload, done) => {
//   User.findById(payload.sub)
//     .then(user => {
//       if (user) {
//         done(null, user);
//       } else {
//         done(null, false);
//       }
//     })
//     .catch(err => {
//       done(err, false);
//     });
// }));


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
app.use(passport.initialize());
app.use(passport.session());

async function createUser(username, email , password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create a new user document
    const newUser = new User({
      username: username,
      password: hashedPassword,
      email : email
    });

    // Save the user to the database
    await newUser.save();

    console.log('User created successfully.');
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

app.post('/signin', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
}));
// app.post('/signin', async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     const user = await User.findOne({ username });
//     if (!user) {
//       return res.status(401).send('Invalid username or password');
//     }
//     console.log(user);
//     // Compare the provided password with the hashed password in the database
//     const passwordMatch = await bcrypt.compare(password, user.password);

//     if (passwordMatch) {
//       // Passwords match, user is authenticated
//       res.send('Login successful'); // You can set up a session or JWT for authenticated user
//     } else {
//       res.status(401).send('Invalid username or password');
//     }
//   } catch (error) {
//     console.error('Error during sign-in:', error);
//     res.status(500).send('An error occurred during sign-in');
//   }
// });

// app.post('/signin', (req, res) => {
//   passport.authenticate('local', { session: false }, (err, user, info) => {
//     if (err || !user) {
//       return res.status(401).json({ message: 'Authentication failed' });
//     }

//     // If authentication is successful, create a JWT token
//     const token = jwt.sign({ sub: user._id }, JWT_SECRET, { expiresIn: '1h' });

//     // Store the token in an HTTP cookie
//     res.cookie('jwt', token, { httpOnly: true, secure: true });

//     // Redirect to a success route or send a response
//     res.redirect('/login'); 
//   })(req, res);
// });



app.post('/signup', (req, res) => {
  const { username, email , password } = req.body;
  createUser(username, email , password);
  console.log('User registration successful. You can now log in.');
  res.redirect('/login');
});

app.get('/profile' , async(req, res)=>{
  try {
    const username = req.user.username;
    const user = await User.find({username :username});
    console.log(user);

    const userOrders = user[0].orders;
    console.log(userOrders);
    const ordersDetails = await Promise.all(
      userOrders.map(async (_id) => {
        const order = await Order.findById(_id);
        console.log(order);
        if (!order) {
          return null; // Handle missing orders as needed
        }

        // Calculate total order items
        const totalOrderItems = order.orderItems.reduce(
          (acc, item) => acc + item.quantity,
          0
        );

        return {
          totalItems : totalOrderItems,
          paid: order.paid,
          orderDate: order.orderDate,
          orderId : order._id,
          totalPrice : order.totalPrice
          // Add other order details as needed
        };
      })
    );




    res.render('profile', {
      category: res.locals.category,
      isAuthenticated: req.isAuthenticated(),
      user: user,
      ordersDetails: ordersDetails
    });
  } catch (err) {
    // Handle any errors that occur during the database query
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
  //res.render('profile',  {category : res.locals.category , isAuthenticated:req.isAuthenticated()});
});

app.get('/login' , (req, res)=>{
  if(req.isAuthenticated()){
    console.log(req.user);
    res.redirect("/profile");
  }else 
  res.render('login');
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/');
  });
});

app.get('/register', (req , res)=>{
  res.render('register');
})


app.post('/create-order', async (req, res) => {
  const userId = req.user._id; // Assuming you have user authentication in place
  const orders = req.body.orders; // This should contain an object with product IDs as keys and their respective quantities as values
  console.log("create order called!");
  try {
    const orderItems = [];
    let totalPrice = 0;
    let totalQuantity =0;
    for (const productId in orders) {
      if (orders.hasOwnProperty(productId)) {
        const quantity = parseInt(orders[productId]);

        if (quantity > 0) {
          const product = await Product.findById(productId);

          if (!product) {
            return res.status(400).send('Product not found');
          }

          totalPrice += product.price * quantity;
          totalQuantity +=quantity;
          orderItems.push({
            productId: productId,
            quantity: quantity,
          });
        }
      }
    }

    const currentDate = new Date();

    const newOrder = new Order({
      userId: userId,
      orderItems: orderItems,
      totalPrice: totalPrice,
      paid: false,
      orderDate: currentDate,
    });

    const createdOrder = await newOrder.save();

    const user = await User.findByIdAndUpdate(userId, { $push: { orders: createdOrder } });

    res.status(200).send('Order  placed successfully');
  } catch (error) {
    console.error('Error placing the order:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/order-summary' , (req , res)=>{
    console.log(req.body);
    res.render('order-summary');  
});

// Define a route for placing an order
// app.post('/create-order', async (req, res) => {
//   const userId = req.user._id;
//   const orders = req.body.orders; // An array of order objects with productId and quantity
//   console.log(orders);
//   try {
//     // Create a new order document for each product in the order
//     const orderPromises = orders.map(async (order) => {
//       const product = await Product.findById(order.productId);
//       if (!product) {
//         throw new Error('Product not found');
//       }

//       const totalPrice = product.price * order.quantity;

//       // Create the order document
//       const newOrder = new Order({
//         product: order.productId,
//         quantity: order.quantity,
//         totalPrice,
//         orderDate: new Date(),
//         // Add other order details as needed
//       });

//       await newOrder.save();
//       return newOrder;
//     });

//     // Wait for all orders to be created
//     const createdOrders = await Promise.all(orderPromises);

//     // Add the order IDs to the user's orders array
//     const user = await User.findByIdAndUpdate(userId, { $push: { orders: { $each: createdOrders } } });

//     res.status(200).send('Order placed successfully');
//   } catch (error) {
//     console.error('Error placing the order:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });


app.get('/cart' , async(req, res)=>{
  if (!req.isAuthenticated()) {
    res.status(401).redirect('/login');
    return ;
 }
 const userId = req.user._id;
 try {
  // Find the user's cart
  let cart = await Cart.findOne({ user: userId }).populate({
    path: 'products',
    model: 'Product', 
    select: 'title price ', 
  });
  console.log("cart called!");
  if (!cart) {
    cart = new Cart({
      user: userId,
      products: [],
    });
    
  }
  if(cart.products.length == 0)return res.render("error");
  console.log(cart);
  res.status(200).render('cart' , {userIsLoggedIn:true , category:res.locals.category , products: cart.products});
} catch (error) {
  console.error('Error viewing the  cart', error);
  res.status(500).send('Internal Server Error');
}
});


app.post('/remove-from-cart/:productId', async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).redirect('/login');
    return;
  }

  const userId = req.user._id;
  const productId = req.params.productId;
  console.log("remove from cart called!");
  try {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // Handle the case where the user has no cart
      res.status(400).send('Cart not found');
      return;
    }

    // Remove the product from the cart
    const index = cart.products.findIndex(product => product.toString() === productId);
    if (index !== -1) {
      cart.products.splice(index, 1);
    }

    // Save the updated cart
    await cart.save();
    const cartSize = cart.products.length;

    if(cartSize == 0){
      return res.render('error');
    }
    res.status(200).redirect('/cart');
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.post('/add-to-cart/:productId', async (req, res) => {
  const productId = req.params.productId; 
  console.log("add to cart called!");
  if (!req.isAuthenticated()) {
     res.status(401).redirect('/login');
     return ;
  }

  const userId = req.user._id; 

  try {
    // Find the user's cart or create a new one if it doesn't exist
    let cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      cart = new Cart({
        user: userId,
        products: [],
      });
    }

    // Add the product to the cart if it's not already there
    if (!cart.products.includes(productId)) {
      cart.products.push(productId);
    }

    // Save the updated cart
    await cart.save();
    res.status(200).send('Product added to cart successfully');
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.get('/product-details/:productId', async (req, res) => {
  const productId = req.params.productId;
 

  try {
    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).send('Product not found');
    } else {
      res.render('product-details', { product, userIsLoggedIn:req.isAuthenticated() , category:res.locals.category });
    }
  } catch (err) {
    // Handle any errors that occur during the database query
    console.error('Error finding product:', err);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/products', async (req, res) => {
  let category = req.query.category || '';
   console.log(category);
   if(category == ''){
    res.redirect('/');
   }
  try {
    // Retrieve products that match the specified category
    res.locals.category=category;
    const products = await Product.find({ category: category });
    res.locals.category='';
    const userIsLoggedIn = req.isAuthenticated();
    if(products.length == 0){
      res.render("error");
    }else res.render("home" , {products , userIsLoggedIn , category:res.locals.category});
  } catch (error) {
    console.error(`Error fetching products in the "${category}" category:`, error);
    res.status(500).json({ error: 'An error occurred while fetching products' });
  }
});

app.get('/', async (req, res) => {
  try {
    // Retrieve data from the MongoDB "products" collection
    res.locals.category = ''; 
    const products = await Product.find();
    const userIsLoggedIn = req.isAuthenticated();
    console.log("hello" , userIsLoggedIn);
    res.render('home', { products, userIsLoggedIn , category:res.locals.category }); 
  } catch (error) {
    console.error('Error fetching products from MongoDB:', error);
    res.status(500).send('An error occurred while fetching products');
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
