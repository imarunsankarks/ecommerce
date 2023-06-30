const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
var bodyParser = require('body-parser')
const Dress = require('./models/dress');
// const data = require('./data/cart.json');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
require('dotenv').config();

// const { addProductToCart } = require('./models/Cart')

const app = express();

var urlencodedParser = bodyParser.urlencoded({ extended: false })

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then((result) => app.listen(3000))
    console.log('Connected to the database');
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
};

// Call the async function to connect to the database
connectToDatabase();

// Create a new instance of the MongoDBStore
const store = new MongoDBStore({
  uri: process.env.dbURI, 
  collection: 'sessions' 
});

// Catch errors in the session store
store.on('error', function(error) {
  console.error('Session store error:', error);
});


app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(session({
  secret: "secret", 
  resave: false, 
  saveUninitialized: false,  
  store: store, // Use the MongoDB session store created in the previous step
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 
  } }));
app.use(express.static('CSS'));
app.use(express.static('image'));
app.use(express.static('image/Products'));


const isLoggedIn = (req, res, next) => {
  if (req.session.userId) {
    // User is logged in
    // res.redirect('/cart');
    next();
  } else {
    console.log('nt logged in');
    console.log(req.session.userId);
    // req.flash("error","Please login first");
    // User is not logged in
    res.redirect('/login'); // Redirect to the login page or handle as needed
  }
}


//TO CONVERT IMAGE INTO BASE64
var base64str1 = base64_encode('./image/Products/16.1.jpg');
var base64str2 = base64_encode('./image/Products/16.2.jpg');
var base64str3 = base64_encode('./image/Products/16.3.jpg');
  
function base64_encode(file) {
    return "data:image/gif;base64,"+fs.readFileSync(file, 'base64');
}


app.get('/add', (req, res) => {
    const dress = new Dress({
        name:'Jumpsuit stripes',
        color:'red',
        price:749,
        image1:base64str1,
        image2:base64str2,
        image3:base64str3,
        material:'Cotton',
        size:['s','m','l']
    });

    dress.save()
        .then((result) =>{
            res.send(result);
        })
        .catch((err) =>{
            console.log(err);
        });
})


const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    quantity: {
      type: Number,
      default: 1,
    },
    size: {
      type: String,
      // default: 'none',
    },
  }],
});

const Cart = mongoose.model('Cart', cartSchema);



const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    }
  }],
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);





app.get('/', (req, res) => {
    res.render('index', { title:'Home'});
});

app.get('/new', (req, res) => {
    const currentUser = req.session.userId;
    Dress.find()
    .sort({ createdAt: -1})
    .then((result) => {
        res.render('women', { title:'New arrivals', dress: result, user: currentUser});
    })
    .catch((err) =>{
        console.log(err)
    });
    })

app.get('/jeans', (req, res) => {
  Dress.find()
  .sort({ createdAt: -1})
  .then((result) => {
      res.render('jeans', { title:'Jeans', dress: result});
  })
  .catch((err) =>{
      console.log(err)
  });
  })

  app.get('/search', (req, res) => {
    const searchText = req.query.search;
  
    Dress.find({ name: { $regex: searchText, $options: 'i' } })
      .sort({ createdAt: -1 })
      .then((result) => {
        res.render('search', { title: searchText, dress: result });
      })
      .catch((err) => {
        console.log(err);
      });
  });


  app.get('/filter', (req, res) => {
    const queryParams = req.query;
    const { material, size, price, color } = queryParams;
  
    const filters = {};

    if (material) {
      filters.material = material;
    }
    if (size) {
      filters.size = { $in: size };
    }
    if (price) {
      const maxPrice = Array.isArray(price) ? Math.max(...price.map(Number)) : Number(price);
      filters.price = { $lt: maxPrice };
    }
    
    
    if (color) {
      filters.color = color;
    }
    // console.log(filters)
  
    Dress.find(filters)
      .sort({ createdAt: -1 })
      .then((results) => {
        const dress = results;
        res.render('filter', { title: 'Filter', dress, filters });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send('An error occurred');
      });
  });
  



app.get('/home', (req, res) => {
    res.redirect('/');
});

app.get('/product/:id', (req, res) => {
    const productId = req.params.id;
    const currentUser = req.session.userId;
    Dress.findById(productId)
    .then((result) => {
        res.render('product', { title:'Product', item: result, user: currentUser});
    })
    .catch((err) => {
        console.log(err);
    })
});


app.post('/product/:id', urlencodedParser, async (req, res) => {
  const productId = req.body.id;
  const quantity = 1;
  const size = req.body.size;

  try {
    const userId = req.session.userId;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      const newCart = new Cart({
        user: userId,
        products: [{ product: productId, quantity, size }],
      });
      await newCart.save();
    } else {
      const existingProductIndex = cart.products.findIndex(
        (product) => product.product.toString() === productId && product.size === size
      );

      if (existingProductIndex !== -1) {
        cart.products[existingProductIndex].quantity += quantity;
      } else {
        cart.products.push({ product: productId, quantity, size });
      }
      await cart.save();
    }
    res.status(204).send();
  } catch (error) {
    console.log('Please login to shop');
    res.status(500).json({ success: false, error: 'Failed to update cart' });
    // res.redirect('/login');
  }
  
});



app.post('/wishlist/:id', urlencodedParser, async (req, res) => {
  const productId = req.body.id;

  try {
    const userId = req.session.userId;
    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      const newWishlist = new Wishlist({
        user: userId,
        products: [{ product: productId }],
      });
      await newWishlist.save();
    } else {
      const existingProductIndex = wishlist.products.findIndex(
        (product) => product.product.toString() === productId
      );

      if (existingProductIndex !== -1) {
        // wishlist.products[existingProductIndex].quantity += quantity;
        wishlist.products.splice(existingProductIndex, 1);
      } else {
        wishlist.products.push({ product: productId });
      }
      await wishlist.save();
    }
    res.status(204).send();
  } catch (error) {
    console.log(error);
    // res.status(500).json({ success: false, error: 'Failed to update wishlist' });
    // res.redirect('/login');
  }
});





app.post('/reduce', urlencodedParser, async (req, res) => {
  const productId = req.body.id;
  const size = req.body.size;

  try {
    const userId = req.session.userId;
    const cart = await Cart.findOne({ user: userId });

    const existingProductIndex = cart.products.findIndex(
      (product) => product.product.toString() === productId && product.size === size
    );
    cart.products[existingProductIndex].quantity -= 1;
    await cart.save();
    // location.reload()
    res.status(204).send();
  } catch (error) {
    // console.log('Please login to shop');
    res.status(500).json({ success: false, error: 'Failed to update cart' });
  }
});


  // Server-side code
  app.get('/cartquantity', async (req, res) => {
    try {
      var totalQuantity = 0;
      const userId = req.session.userId;
      const cart = await Cart.findOne({ user: userId }).populate('user');
  
      if (!cart) {
        totalQuantity = 0;
      } else {
        for (const product of cart.products) {
          totalQuantity += product.quantity;
        }
      }
  
      res.status(200).json({ itemCount: totalQuantity });
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred');
    }
  });
  

  
  app.delete("/cart/:id", async (req, res) => {
    try {
      const itemId = req.params.id;
      const itemSize = req.body.size;
      // console.log(itemSize)
      const userId = req.session.userId;
      const cart = await Cart.findOne({ user: userId }).populate('user');
  
      const itemIndex = cart.products.findIndex(item => item.product.toString() === itemId && item.size === itemSize );
    
      if (itemIndex === -1) {
        return res.status(404).json({ success: false, error: "Item not found in cart" });
      }
  
      cart.products.splice(itemIndex, 1);
  
      await cart.save();
  
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to delete item from cart" });
    }
  });


//   USER LOGIN

// Create a user schema
const userSchema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  });
  
  // Hash the password before saving
  userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(user.password, salt);
      user.password = hash;
    }
    next();
  });
  
  // Create a user model
  const User = mongoose.model('User', userSchema);

  // Parse incoming requests with JSON payloads
app.use(bodyParser.json());

// Parse incoming requests with URL-encoded payloads
app.use(bodyParser.urlencoded({ extended: true }));
  
// Register a user

app.get('/register', (req,res) => {
  res.render('register');
});

  app.post('/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = new User({ email, password });
      await user.save();
      const cart = new Cart({ user: user._id });
      await cart.save()
      res.status(200).redirect('login');
    } catch (error) {
      console.log(error)
      res.status(500).send('Error registering user');
    }
  });
  
  
  app.get('/cart', async (req, res) => {
    try {
      var name = req.query.name;
      var address = req.query.address;
      var pincode = req.query.pincode;
      // if (!name){
      //   name = 'Type name here...';
      // }
      // if (!address) {
      //   address = 'Type address here...';
      // }
      
      // console.log(name)
      const cartitem = [];
      const itemqty = [];
      const itemSize = [];
      var totalPrice = 0;
      const userId = req.session.userId;
      const cart = await Cart.findOne({ user: userId }).populate({
        path: 'products.product',
        model: 'Dress',
      });
  
      if (!cart) {
        totalQuantity = 0;
      } else {
        for (const product of cart.products) {
          try {
            const result = await Dress.findById(product.product);
            if (result) {
              const itemPrice = result.price;
              cartitem.push(product.product);
              itemqty.push(product.quantity);
              itemSize.push(product.size);
              // console.log(itemSize);
              totalPrice += itemPrice * product.quantity;
            }
          } catch (error) {
            console.error(error);
            res.status(500).send('An error occurred');
          }
        }
      }
  
      res.render('cart', {
        cartitem: cartitem,
        itemqty: itemqty,
        itemSize:itemSize,
        totalPrice: totalPrice,
        name: name,
        address: address,
        pincode: pincode,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred');
    }
  });

  app.post('/cart', (req, res) => {
    const name = req.body.name;
    const address = req.body.address;
    const pincode = req.body.pincode;
    res.redirect(`/cart?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}&pincode=${encodeURIComponent(pincode)}`);
  });
  


    // Authenticate a user
    app.get('/login', (req,res) => {
      res.render('login');
    });
  
    app.post('/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).send('User not found');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).send('Invalid password');
        }
        req.session.userId = user._id;
        res.status(200).send({email});
      } catch (error) {
        res.status(500).send('Error authenticating user');
      }
    });

    app.post('/logout', (req, res) => {
      // Destroy the session to remove the session ID from the server
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          res.status(500).send('An error occurred');
        } else {
          res.sendStatus(200);
        }
      });
    });



    app.get('/wishlist', async (req, res) => {
      try {
        var name = req.query.name;
        const currentUser = req.session.userId;
        const wishitem = [];
        const userId = req.session.userId;
        const wishlist = await Wishlist.findOne({ user: userId }).populate({
          path: 'products.product',
          model: 'Dress',
        });
    
        if (!wishlist) {
          var totalQuantity = 0;
        } else {
          for (const product of wishlist.products) {
            try {
              const result = await Dress.findById(product.product);
              if (result) {
                wishitem.push(product.product);
              }
            } catch (error) {
              console.error(error);
              res.status(500).send('An error occurred');
            }
          }
        }
    
        res.render('wishlist', {
          wishitem: wishitem,
          name: name,
          user: currentUser
        });
      } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
      }
    });
    