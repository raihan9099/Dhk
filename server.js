const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    fs.mkdirSync('uploads/products');
}

const db = new sqlite3.Database('dhaka_market.db');

// Initialize Database
db.serialize(() => {
    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        price REAL NOT NULL,
        offer_price REAL,
        images TEXT,
        thumb TEXT,
        description TEXT,
        features TEXT,
        category TEXT DEFAULT 'general',
        stock INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active',
        views INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        image TEXT,
        parent_id INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        shipping_area TEXT DEFAULT 'inside_dhaka',
        quantity INTEGER DEFAULT 1,
        product_id INTEGER,
        product_name TEXT,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'cod',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Admin users
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        role TEXT DEFAULT 'admin'
    )`);

    // Insert default admin
    db.run(`INSERT OR IGNORE INTO admin_users (username, password, email, role) 
            VALUES ('admin', 'admin123', 'admin@dhakamarket.com', 'superadmin')`);

    // Insert sample categories
    const categories = [
        ['Electronics', 'electronics'],
        ['Fashion', 'fashion'],
        ['Home & Living', 'home-living'],
        ['Beauty', 'beauty'],
        ['Sports', 'sports']
    ];
    
    categories.forEach(cat => {
        db.run(`INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)`, cat);
    });

    // Insert sample product
    const sampleProduct = {
        name: 'Professional Hair Trimmer Pro Max',
        slug: 'professional-hair-trimmer-pro-max',
        price: 1999,
        offer_price: 899,
        images: JSON.stringify([
            'https://images.unsplash.com/photo-1598490960012-7f5d5a43d5b8?w=800&h=800&fit=crop',
            'https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=800&h=800&fit=crop',
            'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&h=800&fit=crop'
        ]),
        thumb: 'https://images.unsplash.com/photo-1598490960012-7f5d5a43d5b8?w=400&h=400&fit=crop',
        description: 'Professional cordless hair trimmer with 3 adjustable comb guards. Perfect for beard, mustache, and body hair trimming. USB Type-C charging, waterproof design, 1 year warranty.',
        features: JSON.stringify([
            'Cordless & Rechargeable',
            '3 Comb Guards (3mm, 6mm, 9mm)',
            '2 Hours Battery Backup',
            'USB Type-C Charging',
            'Waterproof Design',
            '1 Year Warranty'
        ]),
        category: 'beauty',
        stock: 50
    };

    db.run(`INSERT OR IGNORE INTO products 
            (name, slug, price, offer_price, images, thumb, description, features, category, stock) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(sampleProduct));
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Helper functions
function formatPrice(price) {
    return '৳' + parseFloat(price).toLocaleString('en-IN');
}

function generateOrderId() {
    return 'DM' + Date.now().toString().slice(-8);
}

function formatPhone(phone) {
    let num = phone.toString().replace(/\D/g, '');
    
    if (num.startsWith('880')) num = num.substring(3);
    if (num.startsWith('+880')) num = num.substring(4);
    if (num.startsWith('88')) num = num.substring(2);
    
    if (num.length === 10) num = '0' + num;
    if (num.length === 11 && num.startsWith('0')) return num;
    if (num.length === 11 && !num.startsWith('0')) return '0' + num.substring(1);
    
    return num;
}

// Website Configuration
const website = {
    name: 'Dhaka Market',
    phone: '+880 1234-567890',
    email: 'info@dhakamarket.com',
    address: '123 Market Street, Dhaka, Bangladesh',
    currency: '৳',
    facebook: '#',
    instagram: '#',
    youtube: '#',
    whatsapp: '+8801234567890'
};

// ==================== FRONTEND PAGES ====================

// Home Page
app.get('/', (req, res) => {
    db.all("SELECT * FROM products WHERE status = 'active' LIMIT 12", (err, products) => {
        let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${website.name} - Best Online Shopping in Bangladesh</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                :root {
                    --primary: #ff6b6b;
                    --secondary: #4ecdc4;
                    --dark: #292f36;
                    --light: #f7fff7;
                }
                body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
                .navbar { background: white; box-shadow: 0 2px 15px rgba(0,0,0,0.1); }
                .hero {
                    background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), 
                                url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop');
                    background-size: cover;
                    color: white;
                    padding: 100px 0;
                    text-align: center;
                    margin-bottom: 50px;
                }
                .product-card {
                    border: none;
                    border-radius: 15px;
                    overflow: hidden;
                    transition: all 0.3s;
                    background: white;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                }
                .product-card:hover {
                    transform: translateY(-10px);
                    box-shadow: 0 15px 30px rgba(0,0,0,0.1);
                }
                .product-img {
                    height: 200px;
                    object-fit: cover;
                    width: 100%;
                }
                .old-price {
                    text-decoration: line-through;
                    color: #999;
                    font-size: 0.9em;
                }
                .offer-price {
                    color: var(--primary);
                    font-weight: bold;
                    font-size: 1.2em;
                }
                .btn-order {
                    background: linear-gradient(135deg, var(--primary) 0%, #ff8e8e 100%);
                    color: white;
                    border: none;
                    padding: 10px 25px;
                    border-radius: 25px;
                    font-weight: bold;
                    transition: all 0.3s;
                }
                .btn-order:hover {
                    transform: scale(1.05);
                    box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
                }
                .feature-box {
                    text-align: center;
                    padding: 30px 15px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    margin: 10px;
                    transition: all 0.3s;
                }
                .feature-box:hover {
                    transform: translateY(-5px);
                }
                .feature-icon {
                    font-size: 40px;
                    margin-bottom: 15px;
                    color: var(--primary);
                }
                footer {
                    background: var(--dark);
                    color: white;
                    padding: 50px 0 20px;
                    margin-top: 50px;
                }
                .whatsapp-float {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: #25D366;
                    color: white;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    z-index: 1000;
                    box-shadow: 0 4px 10px rgba(37, 211, 102, 0.4);
                }
                .live-order {
                    position: fixed;
                    bottom: 100px;
                    right: 30px;
                    background: white;
                    border-radius: 10px;
                    padding: 15px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                    z-index: 1000;
                    animation: slideIn 0.5s;
                    max-width: 250px;
                    border-left: 4px solid var(--primary);
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        </head>
        <body>
            <!-- Navigation -->
            <nav class="navbar navbar-expand-lg navbar-light sticky-top">
                <div class="container">
                    <a class="navbar-brand" href="/">
                        <h3 class="mb-0" style="color: var(--primary);">
                            <i class="fas fa-store"></i> ${website.name}
                        </h3>
                    </a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav ms-auto">
                            <li class="nav-item"><a class="nav-link active" href="/">Home</a></li>
                            <li class="nav-item"><a class="nav-link" href="/products">Products</a></li>
                            <li class="nav-item"><a class="nav-link" href="/categories">Categories</a></li>
                            <li class="nav-item"><a class="nav-link" href="/contact">Contact</a></li>
                            <li class="nav-item"><a class="nav-link" href="/admin-login">Admin</a></li>
                        </ul>
                    </div>
                </div>
            </nav>

            <!-- Hero Section -->
            <div class="hero">
                <div class="container">
                    <h1 class="display-4 mb-3">Welcome to ${website.name}</h1>
                    <p class="lead mb-4">Best Online Shopping Platform in Bangladesh</p>
                    <a href="/products" class="btn btn-light btn-lg px-5">Shop Now</a>
                </div>
            </div>

            <!-- Featured Products -->
            <div class="container">
                <h2 class="text-center mb-5">Featured Products</h2>
                <div class="row">`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            const features = JSON.parse(product.features || '[]');
            const discount = product.offer_price ? 
                Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
            
            html += `
                <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                    <div class="product-card h-100">
                        <img src="${images[0] || product.thumb}" class="product-img" alt="${product.name}">
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            ${product.offer_price ? `
                                <p class="card-text">
                                    <span class="old-price">${formatPrice(product.price)}</span>
                                    <span class="offer-price ms-2">${formatPrice(product.offer_price)}</span>
                                    <span class="badge bg-danger ms-2">${discount}% OFF</span>
                                </p>
                            ` : `
                                <p class="card-text offer-price">${formatPrice(product.price)}</p>
                            `}
                            <a href="/product/${product.slug}" class="btn btn-order w-100">
                                <i class="fas fa-shopping-cart"></i> Order Now
                            </a>
                        </div>
                    </div>
                </div>`;
        });
        
        html += `
                </div>
            </div>

            <!-- Features Section -->
            <div class="container my-5">
                <div class="row">
                    <div class="col-md-3">
                        <div class="feature-box">
                            <div class="feature-icon">
                                <i class="fas fa-shipping-fast"></i>
                            </div>
                            <h5>Free Shipping</h5>
                            <p>On orders over ${website.currency} 2000</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="feature-box">
                            <div class="feature-icon">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <h5>Secure Payment</h5>
                            <p>100% secure payment</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="feature-box">
                            <div class="feature-icon">
                                <i class="fas fa-headset"></i>
                            </div>
                            <h5>24/7 Support</h5>
                            <p>Call ${website.phone}</p>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="feature-box">
                            <div class="feature-icon">
                                <i class="fas fa-undo"></i>
                            </div>
                            <h5>Easy Return</h5>
                            <p>7 days return policy</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <footer>
                <div class="container">
                    <div class="row">
                        <div class="col-md-4">
                            <h5>${website.name}</h5>
                            <p>${website.address}</p>
                            <p>Phone: ${website.phone}</p>
                            <p>Email: ${website.email}</p>
                        </div>
                        <div class="col-md-4">
                            <h5>Quick Links</h5>
                            <ul class="list-unstyled">
                                <li><a href="/" class="text-light">Home</a></li>
                                <li><a href="/products" class="text-light">Products</a></li>
                                <li><a href="/categories" class="text-light">Categories</a></li>
                                <li><a href="/contact" class="text-light">Contact Us</a></li>
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <h5>Connect With Us</h5>
                            <a href="${website.facebook}" class="text-light me-3"><i class="fab fa-facebook fa-2x"></i></a>
                            <a href="${website.instagram}" class="text-light me-3"><i class="fab fa-instagram fa-2x"></i></a>
                            <a href="${website.youtube}" class="text-light"><i class="fab fa-youtube fa-2x"></i></a>
                        </div>
                    </div>
                    <hr class="bg-light">
                    <div class="text-center">
                        <p>&copy; ${new Date().getFullYear()} ${website.name}. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            <!-- WhatsApp Float -->
            <div class="whatsapp-float">
                <a href="https://wa.me/${website.whatsapp}" target="_blank" style="color: white;">
                    <i class="fab fa-whatsapp"></i>
                </a>
            </div>

            <!-- Live Order Notification -->
            <div id="liveOrder" class="live-order d-none">
                <h6><i class="fas fa-bell text-success"></i> New Order!</h6>
                <p id="liveOrderText" class="mb-1"></p>
                <small class="text-muted">Just now</small>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
            <script>
                // Live order simulation
                const names = ['রহিম (ঢাকা)', 'করিম (চট্টগ্রাম)', 'সাদিয়া (সিলেট)', 'নাসরিন (রাজশাহী)'];
                const products = ['Hair Trimmer', 'Wireless Earbuds', 'Smart Watch', 'T-Shirt'];
                
                function showLiveOrder() {
                    const name = names[Math.floor(Math.random() * names.length)];
                    const product = products[Math.floor(Math.random() * products.length)];
                    
                    document.getElementById('liveOrderText').textContent = name + ' ordered ' + product;
                    document.getElementById('liveOrder').classList.remove('d-none');
                    
                    setTimeout(() => {
                        document.getElementById('liveOrder').classList.add('d-none');
                    }, 5000);
                }
                
                // Show first notification after 3 seconds
                setTimeout(showLiveOrder, 3000);
                // Repeat every 15 seconds
                setInterval(showLiveOrder, 15000);
            </script>
        </body>
        </html>`;
        
        res.send(html);
    });
});

// Product List Page
app.get('/products', (req, res) => {
    db.all("SELECT * FROM products WHERE status = 'active'", (err, products) => {
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>All Products - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding-top: 20px; background: #f8f9fa; }
                .product-card { margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="mb-4">All Products</h1>
                <div class="row">`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            const discount = product.offer_price ? 
                Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
            
            html += `
                <div class="col-md-3">
                    <div class="card product-card">
                        <img src="${images[0] || product.thumb}" class="card-img-top" alt="${product.name}">
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            ${product.offer_price ? `
                                <p class="card-text">
                                    <span class="text-decoration-line-through text-muted">${formatPrice(product.price)}</span>
                                    <span class="text-danger fw-bold ms-2">${formatPrice(product.offer_price)}</span>
                                    <span class="badge bg-danger">${discount}% OFF</span>
                                </p>
                            ` : `
                                <p class="card-text fw-bold">${formatPrice(product.price)}</p>
                            `}
                            <a href="/product/${product.slug}" class="btn btn-primary w-100">View Details</a>
                        </div>
                    </div>
                </div>`;
        });
        
        html += `
                </div>
                <a href="/" class="btn btn-secondary mt-3">Back to Home</a>
            </div>
        </body>
        </html>`;
        
        res.send(html);
    });
});

// Single Product Page
app.get('/product/:slug', (req, res) => {
    const slug = req.params.slug;
    
    db.get("SELECT * FROM products WHERE slug = ?", [slug], (err, product) => {
        if (!product) {
            res.status(404).send('Product not found');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const discount = product.offer_price ? 
            Math.round(((product.price - product.offer_price) / product.price) * 100) : 0;
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${product.name} - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                body { background: #f8f9fa; padding-top: 20px; }
                .product-image { max-height: 500px; object-fit: contain; }
                .feature-list li { margin-bottom: 10px; }
                .order-form { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
            </style>
        </head>
        <body>
            <div class="container">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item"><a href="/">Home</a></li>
                        <li class="breadcrumb-item"><a href="/products">Products</a></li>
                        <li class="breadcrumb-item active">${product.name}</li>
                    </ol>
                </nav>
                
                <div class="row">
                    <div class="col-md-6">
                        <img src="${images[0] || product.thumb}" class="img-fluid product-image rounded shadow" alt="${product.name}">
                        <div class="row mt-3">
                            ${images.slice(1, 4).map(img => `
                                <div class="col-4">
                                    <img src="${img}" class="img-fluid rounded" style="height: 100px; object-fit: cover; cursor: pointer;" 
                                         onclick="document.querySelector('.product-image').src='${img}'">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <h1>${product.name}</h1>
                        
                        ${product.offer_price ? `
                            <div class="mb-3">
                                <span class="text-muted text-decoration-line-through fs-4">${formatPrice(product.price)}</span>
                                <span class="text-danger fw-bold fs-2 ms-3">${formatPrice(product.offer_price)}</span>
                                <span class="badge bg-danger fs-6 ms-2">${discount}% OFF</span>
                            </div>
                        ` : `
                            <h2 class="text-primary">${formatPrice(product.price)}</h2>
                        `}
                        
                        <div class="mb-4">
                            <h5>Features:</h5>
                            <ul class="feature-list">
                                ${features.map(f => `<li><i class="fas fa-check text-success me-2"></i> ${f}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="order-form">
                            <h3 class="mb-4">Order Now</h3>
                            <form action="/checkout" method="POST">
                                <input type="hidden" name="product_id" value="${product.id}">
                                <input type="hidden" name="product_name" value="${product.name}">
                                <input type="hidden" name="product_price" value="${product.offer_price || product.price}">
                                
                                <div class="mb-3">
                                    <label class="form-label">Your Name *</label>
                                    <input type="text" name="customer_name" class="form-control" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Phone Number *</label>
                                    <input type="tel" name="phone" class="form-control" required 
                                           pattern="[0-9]{11}" title="11 digit phone number">
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Shipping Address *</label>
                                    <textarea name="address" class="form-control" rows="3" required></textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Quantity</label>
                                    <select name="quantity" class="form-control">
                                        <option value="1">1 Piece</option>
                                        <option value="2">2 Pieces</option>
                                        <option value="3">3 Pieces</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Shipping Area</label>
                                    <select name="shipping_area" class="form-control">
                                        <option value="inside_dhaka">Inside Dhaka (৳80)</option>
                                        <option value="outside_dhaka">Outside Dhaka (৳150)</option>
                                    </select>
                                </div>
                                
                                <div class="alert alert-success">
                                    <h5>Total Amount: <span id="totalAmount">${formatPrice((product.offer_price || product.price) + 80)}</span></h5>
                                </div>
                                
                                <button type="submit" class="btn btn-danger btn-lg w-100">
                                    <i class="fas fa-bolt"></i> CONFIRM ORDER
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-5">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h4>Product Description</h4>
                                <p>${product.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <a href="/products" class="btn btn-secondary">Back to Products</a>
                    <a href="/" class="btn btn-outline-primary ms-2">Continue Shopping</a>
                </div>
            </div>
            
            <script>
                function calculateTotal() {
                    const price = ${product.offer_price || product.price};
                    const quantity = document.querySelector('[name="quantity"]').value;
                    const shipping = document.querySelector('[name="shipping_area"]').value;
                    const shippingCost = shipping === 'inside_dhaka' ? 80 : 150;
                    const total = (price * quantity) + shippingCost;
                    
                    document.getElementById('totalAmount').textContent = '৳' + total.toLocaleString('en-IN');
                }
                
                document.querySelector('[name="quantity"]').addEventListener('change', calculateTotal);
                document.querySelector('[name="shipping_area"]').addEventListener('change', calculateTotal);
            </script>
        </body>
        </html>`;
        
        res.send(html);
    });
});

// Checkout Process
app.post('/checkout', (req, res) => {
    const { 
        product_id, product_name, product_price, 
        customer_name, phone, address, quantity, shipping_area 
    } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? 80 : 150;
    const total = (parseFloat(product_price) * parseInt(quantity)) + shippingCost;
    const orderId = generateOrderId();
    const formattedPhone = formatPhone(phone);
    
    db.run(`INSERT INTO orders 
            (order_id, customer_name, phone, address, shipping_area, quantity, 
             product_id, product_name, total_amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, customer_name, formattedPhone, address, shipping_area, quantity, 
         product_id, product_name, total], function(err) {
        
        if (err) {
            res.send(`
                <div class="alert alert-danger">
                    <h2>Error!</h2>
                    <p>Order could not be placed. Please try again.</p>
                    <a href="/product/${product_id}" class="btn btn-primary">Go Back</a>
                </div>
            `);
            return;
        }
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Order Confirmed - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { background: #f8f9fa; padding: 50px 0; }
                .success-box { 
                    background: white; 
                    padding: 50px; 
                    border-radius: 20px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    max-width: 600px;
                    margin: auto;
                    text-align: center;
                }
                .check-icon { 
                    color: #28a745; 
                    font-size: 80px; 
                    margin-bottom: 20px; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-box">
                    <div class="check-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2 class="mb-3">Order Confirmed!</h2>
                    <p class="lead mb-4">Thank you ${customer_name}, your order has been received.</p>
                    
                    <div class="alert alert-light border">
                        <h5>Order Details</h5>
                        <p><strong>Order ID:</strong> ${orderId}</p>
                        <p><strong>Product:</strong> ${product_name}</p>
                        <p><strong>Quantity:</strong> ${quantity}</p>
                        <p><strong>Total Amount:</strong> ${formatPrice(total)}</p>
                        <p><strong>Payment Method:</strong> Cash on Delivery</p>
                        <p><strong>Delivery Address:</strong> ${address}</p>
                    </div>
                    
                    <div class="alert alert-info">
                        <h6><i class="fas fa-info-circle"></i> What's Next?</h6>
                        <p class="mb-0">Our representative will call you at ${formattedPhone} within 30 minutes to confirm the order.</p>
                    </div>
                    
                    <div class="d-grid gap-2">
                        <a href="/" class="btn btn-primary btn-lg">Continue Shopping</a>
                        <a href="https://wa.me/${website.whatsapp}?text=Hello%20I%20have%20ordered%20${product_name}%20Order%20ID:%20${orderId}" 
                           target="_blank" class="btn btn-success btn-lg">
                            <i class="fab fa-whatsapp"></i> Confirm on WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </body>
        </html>`;
        
        res.send(html);
    });
});

// ==================== ADMIN PANEL ====================

// Admin Login Page
app.get('/admin-login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    height: 100vh;
                    display: flex;
                    align-items: center;
                }
                .login-card {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 400px;
                    margin: auto;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="login-card">
                    <div class="text-center mb-4">
                        <h2><i class="fas fa-user-shield"></i> Admin Login</h2>
                        <p class="text-muted">${website.name} Admin Panel</p>
                    </div>
                    <form action="/admin-login" method="POST">
                        <div class="mb-3">
                            <label class="form-label">Username</label>
                            <input type="text" name="username" class="form-control" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <input type="password" name="password" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Login</button>
                    </form>
                    <p class="text-center mt-3">
                        <small>Default: admin / admin123</small>
                    </p>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM admin_users WHERE username = ? AND password = ?", 
        [username, password], (err, user) => {
        
        if (user) {
            // Create simple session
            res.cookie('admin', 'true', { httpOnly: true });
            res.redirect('/admin/dashboard');
        } else {
            res.send(`
                <script>
                    alert('Invalid username or password');
                    window.location = '/admin-login';
                </script>
            `);
        }
    });
});

// Middleware to check admin authentication
function checkAdmin(req, res, next) {
    if (req.cookies?.admin === 'true') {
        next();
    } else {
        res.redirect('/admin-login');
    }
}

// Admin Dashboard
app.get('/admin/dashboard', checkAdmin, (req, res) => {
    db.all(`SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders
        FROM orders`, (err, stats) => {
        
        const stat = stats[0] || {};
        
        db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`, (err, recentOrders) => {
            db.all(`SELECT * FROM products ORDER BY created_at DESC LIMIT 5`, (err, recentProducts) => {
                
                let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Admin Dashboard - ${website.name}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                    <style>
                        :root {
                            --primary: #4361ee;
                            --secondary: #3a0ca3;
                            --success: #4cc9f0;
                            --danger: #f72585;
                        }
                        body { background: #f5f7fb; font-family: 'Segoe UI', sans-serif; }
                        .sidebar {
                            background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%);
                            color: white;
                            min-height: 100vh;
                            padding: 20px 0;
                        }
                        .sidebar .nav-link {
                            color: rgba(255,255,255,0.8);
                            padding: 12px 20px;
                            margin: 5px 10px;
                            border-radius: 10px;
                            transition: all 0.3s;
                        }
                        .sidebar .nav-link:hover, .sidebar .nav-link.active {
                            background: rgba(255,255,255,0.1);
                            color: white;
                        }
                        .stat-card {
                            background: white;
                            border-radius: 15px;
                            padding: 20px;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                            border-left: 5px solid var(--primary);
                        }
                        .table-container {
                            background: white;
                            border-radius: 15px;
                            padding: 25px;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                        }
                        .btn-call {
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 5px 10px;
                            border-radius: 5px;
                            margin: 2px;
                        }
                        .btn-whatsapp {
                            background: #25D366;
                            color: white;
                            border: none;
                            padding: 5px 10px;
                            border-radius: 5px;
                            margin: 2px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container-fluid">
                        <div class="row">
                            <!-- Sidebar -->
                            <div class="col-md-2 sidebar">
                                <div class="text-center mb-4">
                                    <h4><i class="fas fa-store"></i> ${website.name}</h4>
                                    <small class="text-white-50">Admin Panel</small>
                                </div>
                                <nav class="nav flex-column">
                                    <a class="nav-link active" href="/admin/dashboard">
                                        <i class="fas fa-tachometer-alt me-2"></i> Dashboard
                                    </a>
                                    <a class="nav-link" href="/admin/orders">
                                        <i class="fas fa-shopping-cart me-2"></i> Orders
                                        <span class="badge bg-danger float-end">${stat.total_orders || 0}</span>
                                    </a>
                                    <a class="nav-link" href="/admin/products">
                                        <i class="fas fa-box me-2"></i> Products
                                    </a>
                                    <a class="nav-link" href="/admin/customers">
                                        <i class="fas fa-users me-2"></i> Customers
                                    </a>
                                    <a class="nav-link" href="/admin/settings">
                                        <i class="fas fa-cog me-2"></i> Settings
                                    </a>
                                    <a class="nav-link" href="/">
                                        <i class="fas fa-store me-2"></i> View Store
                                    </a>
                                    <a class="nav-link" href="/logout">
                                        <i class="fas fa-sign-out-alt me-2"></i> Logout
                                    </a>
                                </nav>
                            </div>
                            
                            <!-- Main Content -->
                            <div class="col-md-10 p-4">
                                <div class="d-flex justify-content-between align-items-center mb-4">
                                    <h2><i class="fas fa-tachometer-alt"></i> Dashboard</h2>
                                    <span>${new Date().toLocaleDateString()}</span>
                                </div>
                                
                                <!-- Stats Cards -->
                                <div class="row mb-4">
                                    <div class="col-md-3">
                                        <div class="stat-card" style="border-left-color: var(--primary);">
                                            <h3>${stat.total_orders || 0}</h3>
                                            <p class="text-muted mb-0">Total Orders</p>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-card" style="border-left-color: var(--success);">
                                            <h3>${formatPrice(stat.total_revenue || 0)}</h3>
                                            <p class="text-muted mb-0">Total Revenue</p>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-card" style="border-left-color: #ffc107;">
                                            <h3>${stat.pending_orders || 0}</h3>
                                            <p class="text-muted mb-0">Pending Orders</p>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-card" style="border-left-color: var(--danger);">
                                            <h3>${stat.delivered_orders || 0}</h3>
                                            <p class="text-muted mb-0">Delivered Orders</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Recent Orders -->
                                <div class="table-container mb-4">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h5><i class="fas fa-history"></i> Recent Orders</h5>
                                        <a href="/admin/orders" class="btn btn-sm btn-primary">View All</a>
                                    </div>
                                    <div class="table-responsive">
                                        <table class="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Order ID</th>
                                                    <th>Customer</th>
                                                    <th>Phone</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                    <th>Date</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>`;
                
                recentOrders.forEach(order => {
                    const phone = formatPhone(order.phone);
                    const date = new Date(order.created_at).toLocaleDateString();
                    
                    html += `
                        <tr>
                            <td><strong>${order.order_id}</strong></td>
                            <td>${order.customer_name}</td>
                            <td>${phone}</td>
                            <td>${formatPrice(order.total_amount)}</td>
                            <td>
                                <span class="badge ${order.status === 'pending' ? 'bg-warning' : 
                                                    order.status === 'delivered' ? 'bg-success' : 
                                                    'bg-secondary'}">
                                    ${order.status}
                                </span>
                            </td>
                            <td>${date}</td>
                            <td>
                                <button class="btn-call btn-sm" onclick="window.open('tel:${phone}')">
                                    <i class="fas fa-phone"></i>
                                </button>
                                <button class="btn-whatsapp btn-sm" onclick="window.open('https://wa.me/88${phone}')">
                                    <i class="fab fa-whatsapp"></i>
                                </button>
                            </td>
                        </tr>`;
                });
                
                html += `</tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <!-- Recent Products -->
                                <div class="table-container">
                                    <h5 class="mb-3"><i class="fas fa-box"></i> Recent Products</h5>
                                    <div class="row">
                                        ${recentProducts.map(product => {
                                            const images = JSON.parse(product.images || '[]');
                                            return `
                                                <div class="col-md-2 mb-3">
                                                    <div class="card">
                                                        <img src="${images[0] || product.thumb}" class="card-img-top" style="height: 100px; object-fit: cover;">
                                                        <div class="card-body p-2">
                                                            <small class="card-title">${product.name.substring(0, 20)}...</small>
                                                            <p class="card-text mb-0">
                                                                <small class="text-danger">${formatPrice(product.offer_price || product.price)}</small>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>`;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
                    <script>
                        function updateStatus(orderId, status) {
                            fetch('/admin/update-status', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({orderId: orderId, status: status})
                            }).then(() => location.reload());
                        }
                        
                        function deleteOrder(orderId) {
                            if(confirm('Delete this order?')) {
                                fetch('/admin/delete-order/' + orderId, {method: 'DELETE'})
                                    .then(() => location.reload());
                            }
                        }
                    </script>
                </body>
                </html>`;
                
                res.send(html);
            });
        });
    });
});

// Admin Orders Page
app.get('/admin/orders', checkAdmin, (req, res) => {
    const { status, search } = req.query;
    let query = "SELECT * FROM orders WHERE 1=1";
    let params = [];
    
    if (status && status !== 'all') {
        query += " AND status = ?";
        params.push(status);
    }
    
    if (search) {
        query += " AND (order_id LIKE ? OR customer_name LIKE ? OR phone LIKE ?)";
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += " ORDER BY created_at DESC";
    
    db.all(query, params, (err, orders) => {
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Orders Management - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { background: #f5f7fb; padding: 20px; }
                .filter-bar { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2><i class="fas fa-shopping-cart"></i> Orders Management</h2>
                    <a href="/admin/dashboard" class="btn btn-secondary">Back to Dashboard</a>
                </div>
                
                <div class="filter-bar">
                    <div class="row">
                        <div class="col-md-4">
                            <select class="form-select" onchange="window.location='/admin/orders?status='+this.value">
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <input type="text" class="form-control" placeholder="Search by Order ID, Name, Phone..."
                                   value="${search || ''}" 
                                   onkeyup="if(event.keyCode===13) window.location='/admin/orders?search='+this.value">
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-primary w-100" onclick="exportOrders()">Export</button>
                        </div>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-bordered table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        orders.forEach(order => {
            const phone = formatPhone(order.phone);
            const date = new Date(order.created_at).toLocaleDateString();
            
            html += `
                <tr>
                    <td><strong>${order.order_id}</strong></td>
                    <td>${order.customer_name}</td>
                    <td>${phone}</td>
                    <td><small>${order.address}</small></td>
                    <td>${order.product_name}</td>
                    <td>${order.quantity}</td>
                    <td>${formatPrice(order.total_amount)}</td>
                    <td>
                        <select class="form-select form-select-sm" onchange="updateStatus('${order.order_id}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="window.open('tel:${phone}')">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="btn btn-sm btn-whatsapp" onclick="window.open('https://wa.me/88${phone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.order_id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
        
        html += `</tbody>
                    </table>
                </div>
            </div>
            
            <script>
                function updateStatus(orderId, status) {
                    fetch('/admin/update-status', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({orderId: orderId, status: status})
                    }).then(() => location.reload());
                }
                
                function deleteOrder(orderId) {
                    if(confirm('Delete order ' + orderId + '?')) {
                        fetch('/admin/delete-order/' + orderId, {method: 'DELETE'})
                            .then(() => location.reload());
                    }
                }
                
                function exportOrders() {
                    window.open('/admin/export/orders', '_blank');
                }
            </script>
        </body>
        </html>`;
        
        res.send(html);
    });
});

// API to update order status
app.post('/admin/update-status', checkAdmin, (req, res) => {
    const { orderId, status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE order_id = ?", [status, orderId]);
    res.json({ success: true });
});

// API to delete order
app.delete('/admin/delete-order/:id', checkAdmin, (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM orders WHERE order_id = ?", [id]);
    res.json({ success: true });
});

// Export orders
app.get('/admin/export/orders', checkAdmin, (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let csv = 'Order ID,Customer Name,Phone,Address,Product,Quantity,Total Amount,Status,Date\n';
        
        orders.forEach(order => {
            csv += `"${order.order_id}","${order.customer_name}","${order.phone}","${order.address}",`;
            csv += `"${order.product_name}",${order.quantity},${order.total_amount},"${order.status}","${order.created_at}"\n`;
        });
        
        res.header('Content-Type', 'text/csv');
        res.attachment('orders.csv');
        res.send(csv);
    });
});

// Products Management
app.get('/admin/products', checkAdmin, (req, res) => {
    db.all("SELECT * FROM products ORDER BY created_at DESC", (err, products) => {
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Products Management - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h2 class="mb-4"><i class="fas fa-box"></i> Products Management</h2>
                <a href="/admin/add-product" class="btn btn-success mb-3">
                    <i class="fas fa-plus"></i> Add New Product
                </a>
                
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Price</th>
                                <th>Offer Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            
            html += `
                <tr>
                    <td>${product.id}</td>
                    <td>
                        <img src="${images[0] || product.thumb}" style="width: 50px; height: 50px; object-fit: cover;">
                    </td>
                    <td>${product.name}</td>
                    <td>${formatPrice(product.price)}</td>
                    <td>${product.offer_price ? formatPrice(product.offer_price) : '-'}</td>
                    <td>${product.stock}</td>
                    <td>
                        <span class="badge ${product.status === 'active' ? 'bg-success' : 'bg-danger'}">
                            ${product.status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-warning">Edit</button>
                        <button class="btn btn-sm btn-danger">Delete</button>
                    </td>
                </tr>`;
        });
        
        html += `</tbody>
                    </table>
                </div>
                
                <a href="/admin/dashboard" class="btn btn-secondary mt-3">Back to Dashboard</a>
            </div>
        </body>
        </html>`;
        
        res.send(html);
    });
});

// Add Product Page
app.get('/admin/add-product', checkAdmin, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Add Product - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h2 class="mb-4"><i class="fas fa-plus"></i> Add New Product</h2>
                
                <form action="/admin/add-product" method="POST" enctype="multipart/form-data">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Product Name *</label>
                                <input type="text" name="name" class="form-control" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Slug (URL) *</label>
                                <input type="text" name="slug" class="form-control" required>
                                <small class="text-muted">e.g., professional-hair-trimmer</small>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Price (৳) *</label>
                                        <input type="number" name="price" class="form-control" step="0.01" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Offer Price (৳)</label>
                                        <input type="number" name="offer_price" class="form-control" step="0.01">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Stock Quantity *</label>
                                <input type="number" name="stock" class="form-control" value="100" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Category</label>
                                <select name="category" class="form-control">
                                    <option value="electronics">Electronics</option>
                                    <option value="fashion">Fashion</option>
                                    <option value="beauty">Beauty</option>
                                    <option value="home-living">Home & Living</option>
                                    <option value="sports">Sports</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Description *</label>
                                <textarea name="description" class="form-control" rows="5" required></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Features (One per line)</label>
                                <textarea name="features" class="form-control" rows="5" 
                                          placeholder="Feature 1\nFeature 2\nFeature 3"></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Image URLs (One per line)</label>
                                <textarea name="images" class="form-control" rows="5" 
                                          placeholder="https://example.com/image1.jpg\nhttps://example.com/image2.jpg"></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Thumbnail Image URL</label>
                        <input type="text" name="thumb" class="form-control" 
                               placeholder="https://example.com/thumbnail.jpg">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-check-label">
                            <input type="checkbox" name="status" value="active" checked> Active
                        </label>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Add Product</button>
                    <a href="/admin/products" class="btn btn-secondary">Cancel</a>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/admin/add-product', checkAdmin, (req, res) => {
    const { 
        name, slug, price, offer_price, description, features, 
        category, stock, thumb, images, status 
    } = req.body;
    
    const featuresArray = features.split('\n').filter(f => f.trim());
    const imagesArray = images.split('\n').filter(img => img.trim());
    
    db.run(`INSERT INTO products 
            (name, slug, price, offer_price, description, features, 
             category, stock, thumb, images, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, price, offer_price || null, description, 
         JSON.stringify(featuresArray), category, stock, thumb || '', 
         JSON.stringify(imagesArray), status || 'active'], 
        function(err) {
            if (err) {
                res.send(`
                    <script>
                        alert('Error adding product: ${err.message}');
                        window.location = '/admin/add-product';
                    </script>
                `);
            } else {
                res.redirect('/admin/products');
            }
        }
    );
});

// Customers Page
app.get('/admin/customers', checkAdmin, (req, res) => {
    db.all(`SELECT 
        customer_name, 
        phone,
        COUNT(*) as order_count,
        SUM(total_amount) as total_spent,
        MAX(created_at) as last_order
        FROM orders 
        GROUP BY phone, customer_name
        ORDER BY total_spent DESC`, (err, customers) => {
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Customers - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h2 class="mb-4"><i class="fas fa-users"></i> Customers</h2>
                
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Orders</th>
                                <th>Total Spent</th>
                                <th>Last Order</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        customers.forEach(customer => {
            const phone = formatPhone(customer.phone);
            const lastOrder = new Date(customer.last_order).toLocaleDateString();
            
            html += `
                <tr>
                    <td>${customer.customer_name}</td>
                    <td>${phone}</td>
                    <td><span class="badge bg-primary">${customer.order_count}</span></td>
                    <td>${formatPrice(customer.total_spent)}</td>
                    <td>${lastOrder}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="window.open('tel:${phone}')">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="btn btn-sm btn-whatsapp" onclick="window.open('https://wa.me/88${phone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </td>
                </tr>`;
        });
        
        html += `</tbody>
                    </table>
                </div>
                
                <a href="/admin/dashboard" class="btn btn-secondary">Back to Dashboard</a>
            </div>
        </body>
        </html>`;
        
        res.send(html);
    });
});

// Settings Page
app.get('/admin/settings', checkAdmin, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Settings - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h2 class="mb-4"><i class="fas fa-cog"></i> Settings</h2>
                
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Website Settings</h5>
                        
                        <form action="/admin/settings" method="POST">
                            <div class="mb-3">
                                <label class="form-label">Website Name</label>
                                <input type="text" name="name" class="form-control" value="${website.name}">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Phone Number</label>
                                <input type="text" name="phone" class="form-control" value="${website.phone}">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-control" value="${website.email}">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Address</label>
                                <textarea name="address" class="form-control">${website.address}</textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">WhatsApp Number</label>
                                <input type="text" name="whatsapp" class="form-control" value="${website.whatsapp}">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Facebook URL</label>
                                <input type="url" name="facebook" class="form-control" value="${website.facebook}">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Instagram URL</label>
                                <input type="url" name="instagram" class="form-control" value="${website.instagram}">
                            </div>
                            
                            <button type="submit" class="btn btn-primary">Save Settings</button>
                            <a href="/admin/dashboard" class="btn btn-secondary">Cancel</a>
                        </form>
                    </div>
                </div>
                
                <div class="card mt-4">
                    <div class="card-body">
                        <h5 class="card-title">Change Admin Password</h5>
                        
                        <form action="/admin/change-password" method="POST">
                            <div class="mb-3">
                                <label class="form-label">Current Password</label>
                                <input type="password" name="current_password" class="form-control">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">New Password</label>
                                <input type="password" name="new_password" class="form-control">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Confirm New Password</label>
                                <input type="password" name="confirm_password" class="form-control">
                            </div>
                            
                            <button type="submit" class="btn btn-warning">Change Password</button>
                        </form>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('admin');
    res.redirect('/');
});

// ==================== ADDITIONAL PAGES ====================

// Contact Page
app.get('/contact', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Contact Us - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h1>Contact Us</h1>
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5>${website.name}</h5>
                                <p><strong>Address:</strong> ${website.address}</p>
                                <p><strong>Phone:</strong> ${website.phone}</p>
                                <p><strong>Email:</strong> ${website.email}</p>
                                <p><strong>Business Hours:</strong> 9AM - 10PM (Everyday)</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5>Quick Contact</h5>
                                <a href="tel:${website.phone}" class="btn btn-primary w-100 mb-2">
                                    <i class="fas fa-phone"></i> Call Now
                                </a>
                                <a href="https://wa.me/${website.whatsapp}" target="_blank" class="btn btn-success w-100">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <a href="/" class="btn btn-secondary mt-3">Back to Home</a>
            </div>
        </body>
        </html>
    `);
});

// Categories Page
app.get('/categories', (req, res) => {
    db.all("SELECT * FROM categories", (err, categories) => {
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Categories - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-4">
                <h1>Product Categories</h1>
                <div class="row">`;
        
        categories.forEach(category => {
            html += `
                <div class="col-md-3 mb-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <h5>${category.name}</h5>
                            <a href="/products?category=${category.slug}" class="btn btn-primary">
                                View Products
                            </a>
                        </div>
                    </div>
                </div>`;
        });
        
        html += `
                </div>
                <a href="/" class="btn btn-secondary">Back to Home</a>
            </div>
        </body>
        </html>`;
        
        res.send(html);
    });
});

// 404 Page
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Page Not Found - ${website.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container text-center mt-5">
                <h1>404</h1>
                <p class="lead">Page not found</p>
                <a href="/" class="btn btn-primary">Go to Homepage</a>
            </div>
        </body>
        </html>
    `);
});

// Start Server
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║              DHAKA MARKET - COMPLETE WEBSITE             ║
    ║                  Server Started Successfully!            ║
    ╠══════════════════════════════════════════════════════════╣
    ║  🌐 Website:      http://localhost:${PORT}                  ║
    ║  🔧 Admin Panel:  http://localhost:${PORT}/admin-login       ║
    ║  👤 Admin Login:  admin / admin123                        ║
    ║  📞 WhatsApp:     ${website.whatsapp}                      ║
    ╠══════════════════════════════════════════════════════════╣
    ║  📁 Features Included:                                   ║
    ║  • Complete E-commerce Website                           ║
    ║  • Product Catalog with Images                           ║
    ║  • Order Management System                               ║
    ║  • Premium Admin Panel                                   ║
    ║  • Phone Number Auto-Formatting                          ║
    ║  • Direct Call & WhatsApp Integration                    ║
    ║  • Live Order Notifications                              ║
    ║  • Export Orders (CSV)                                   ║
    ║  • Responsive Design                                     ║
    ║  • SQLite Database                                       ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});
