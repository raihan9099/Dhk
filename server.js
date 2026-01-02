const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        offer_price REAL,
        images TEXT,
        description TEXT,
        features TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        phone TEXT,
        address TEXT,
        shipping_area TEXT,
        quantity INTEGER DEFAULT 1,
        total REAL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    
    db.run(`INSERT INTO admin_users (username, password) VALUES ('admin', 'admin123')`);
    
    // শুধু একটি প্রোডাক্ট (Hair Trimmer)
    const product = [
        'Hair Trimmer Pro Max',
        1500,
        999,
        JSON.stringify([
            'https://images.unsplash.com/photo-1598490960012-7f5d5a43d5b8?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&h=600&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=600&fit=crop&auto=format'
        ]),
        'Professional Hair Trimmer for Men. Cordless rechargeable trimmer with 3 adjustable comb guards. Perfect for beard, mustache, and body hair trimming.',
        JSON.stringify([
            'Cordless & Rechargeable',
            '3 Comb Guards (3mm, 6mm, 9mm)',
            '2 Hours Battery Backup',
            'USB Type-C Charging',
            'Waterproof Design',
            '1 Year Warranty'
        ])
    ];
    
    const stmt = db.prepare("INSERT INTO products (name, price, offer_price, images, description, features) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(product);
    stmt.finalize();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function formatPrice(price) {
    return '৳' + price.toLocaleString('en-IN');
}

function generateHTML(title, content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Dhaka Market</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; }
        .product-slider { height: 500px; }
        .product-slider img { width: 100%; height: 100%; object-fit: cover; }
        .order-now-btn { 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            font-weight: bold;
            font-size: 1.2rem;
            padding: 15px 30px;
            border-radius: 50px;
            border: none;
            box-shadow: 0 5px 15px rgba(245, 87, 108, 0.4);
            transition: all 0.3s;
        }
        .order-now-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(245, 87, 108, 0.6);
        }
        .live-order-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border-left: 5px solid #28a745;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideInRight 0.5s ease;
        }
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .feature-list li {
            padding: 10px;
            border-bottom: 1px dashed #ddd;
        }
        .feature-list li:last-child {
            border-bottom: none;
        }
        .price-tag {
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
        }
        .description-box {
            max-height: 300px;
            overflow-y: auto;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border: 1px solid #ddd;
        }
        .admin-table {
            font-size: 0.85rem;
        }
        .navbar {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }
        .footer {
            background: #2c3e50;
            color: white;
            padding: 30px 0;
            margin-top: 50px;
        }
        .whatsapp-btn {
            position: fixed;
            bottom: 80px;
            right: 20px;
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
        .countdown {
            background: #ff5722;
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-store"></i> Dhaka Market
            </a>
            <div class="navbar-nav ms-auto">
                <a href="/admin-login" class="nav-link"><i class="fas fa-user-shield"></i> Admin</a>
            </div>
        </div>
    </nav>

    ${content}

    <div class="whatsapp-btn">
        <a href="https://wa.me/8801234567890" target="_blank" style="color: white;">
            <i class="fab fa-whatsapp"></i>
        </a>
    </div>

    <div id="liveNotification" class="live-order-notification d-none">
        <button type="button" class="btn-close float-end" onclick="hideNotification()"></button>
        <h6><i class="fas fa-bell text-success"></i> New Order!</h6>
        <p id="notificationText" class="mb-1"></p>
        <small class="text-muted">Just now</small>
    </div>

    <footer class="footer">
        <div class="container text-center">
            <p><i class="fas fa-phone"></i> +880 1234-567890 | <i class="fas fa-envelope"></i> info@dhakamarket.com</p>
            <p>Dhaka, Bangladesh | Cash on Delivery Available</p>
            <p>&copy; 2024 Dhaka Market. All rights reserved.</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js"></script>
    <script>
        let notificationCount = 0;
        
        function showNotification(name, product) {
            notificationCount++;
            document.getElementById('notificationText').textContent = name + ' ordered ' + product;
            document.getElementById('liveNotification').classList.remove('d-none');
            
            setTimeout(() => {
                document.getElementById('liveNotification').classList.add('d-none');
            }, 5000);
        }
        
        function hideNotification() {
            document.getElementById('liveNotification').classList.add('d-none');
        }
        
        if (window.location.pathname === '/') {
            setInterval(() => {
                const names = ['রহিম', 'করিম', 'সাদিয়া', 'নাসরিন', 'জাহিদ', 'ফারহানা'];
                const name = names[Math.floor(Math.random() * names.length)];
                const cities = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা'];
                const city = cities[Math.floor(Math.random() * cities.length)];
                
                showNotification(name + ' (' + city + ')', 'Hair Trimmer');
            }, 15000);
        }
        
        if (document.querySelector('.product-swiper')) {
            const swiper = new Swiper('.product-swiper', {
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                autoplay: { delay: 3000, disableOnInteraction: false },
                loop: true,
                effect: 'fade',
                fadeEffect: { crossFade: true }
            });
        }
        
        function updateOrderCount() {
            const count = Math.floor(Math.random() * 50) + 100;
            document.getElementById('orderCount').textContent = count;
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            updateOrderCount();
            setInterval(updateOrderCount, 60000);
        });
    </script>
</body>
</html>`;
}

app.get('/', (req, res) => {
    db.get("SELECT * FROM products WHERE id = 1", (err, product) => {
        if (!product) {
            res.send('Product not found');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const discount = Math.round(((product.price - product.offer_price) / product.price) * 100);
        const shippingInsideDhaka = 80;
        const shippingOutsideDhaka = 150;
        const defaultQuantity = 1;
        const defaultTotal = product.offer_price + shippingInsideDhaka;
        
        let content = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-md-7">
                        <div class="swiper product-swiper">
                            <div class="swiper-wrapper">`;
        
        images.forEach(img => {
            content += `
                <div class="swiper-slide">
                    <img src="${img}" class="img-fluid rounded shadow" style="height: 500px; object-fit: contain; background: #f8f9fa;">
                </div>`;
        });
        
        content += `</div>
                            <div class="swiper-pagination"></div>
                            <div class="swiper-button-next"></div>
                            <div class="swiper-button-prev"></div>
                        </div>
                        
                        <div class="mt-4">
                            <div class="countdown mb-3">
                                <i class="fas fa-clock"></i> Special Offer Ends in: 
                                <span id="countdown">23:59:59</span>
                            </div>
                            
                            <div class="card">
                                <div class="card-header bg-primary text-white">
                                    <i class="fas fa-bolt"></i> Why Buy From Us?
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><i class="fas fa-shipping-fast text-success"></i> Free Delivery in Dhaka</p>
                                            <p><i class="fas fa-undo text-info"></i> 7 Days Return</p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><i class="fas fa-shield-alt text-warning"></i> 1 Year Warranty</p>
                                            <p><i class="fas fa-headset text-danger"></i> 24/7 Support</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-5">
                        <h1 class="mb-3">${product.name}</h1>
                        
                        <div class="price-tag mb-4">
                            <h4 class="mb-2">
                                <span class="text-decoration-line-through text-light opacity-75">${formatPrice(product.price)}</span>
                                <br>
                                <span class="display-5">${formatPrice(product.offer_price)}</span>
                            </h4>
                            <h5 class="mb-0">
                                <span class="badge bg-warning text-dark">${discount}% OFF</span>
                                <span class="badge bg-light text-dark ms-2">Limited Time Offer</span>
                            </h5>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="card-title"><i class="fas fa-star text-warning"></i> Product Features</h5>
                                <ul class="feature-list list-unstyled">`;
        
        features.forEach(feature => {
            content += `<li><i class="fas fa-check text-success me-2"></i> ${feature}</li>`;
        });
        
        content += `</ul>
                            </div>
                        </div>
                        
                        <div class="description-box mb-4">
                            <h5><i class="fas fa-info-circle text-primary"></i> Product Description</h5>
                            <p class="mb-0">${product.description}</p>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="card-title"><i class="fas fa-shopping-cart text-success"></i> 
                                    <span id="orderCount">128</span> people ordered today
                                </h5>
                                <div class="progress mb-2" style="height: 20px;">
                                    <div class="progress-bar bg-success" style="width: 85%">85% Sold</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-5">
                    <div class="col-12">
                        <div class="card border-primary">
                            <div class="card-header bg-primary text-white">
                                <h4 class="mb-0"><i class="fas fa-truck"></i> Order Now - Delivery in 24 Hours</h4>
                            </div>
                            <div class="card-body">
                                <form action="/order" method="POST" id="orderForm">
                                    <input type="hidden" name="product_name" value="${product.name}">
                                    <input type="hidden" name="product_price" value="${product.offer_price}">
                                    
                                    <div class="row">
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Your Full Name *</label>
                                            <input type="text" name="customer_name" class="form-control" placeholder="আপনার নাম" required>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Phone Number *</label>
                                            <input type="tel" name="phone" class="form-control" placeholder="০১৭১২-৩৪৫৬৭৮" required>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Quantity *</label>
                                            <select name="quantity" class="form-control" onchange="calculateTotal()">
                                                <option value="1">1 Piece</option>
                                                <option value="2">2 Pieces</option>
                                                <option value="3">3 Pieces</option>
                                                <option value="4">4 Pieces</option>
                                                <option value="5">5 Pieces</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-8 mb-3">
                                            <label class="form-label">Full Address *</label>
                                            <textarea name="address" class="form-control" rows="2" placeholder="বাড়ি নং, রাস্তা, এলাকা, জেলা" required></textarea>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Shipping Area *</label>
                                            <select name="shipping_area" class="form-control" onchange="calculateTotal()">
                                                <option value="inside_dhaka">Inside Dhaka (৳${shippingInsideDhaka})</option>
                                                <option value="outside_dhaka">Outside Dhaka (৳${shippingOutsideDhaka})</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="alert alert-info">
                                                <h6><i class="fas fa-money-bill-wave"></i> Payment Method</h6>
                                                <p class="mb-0">Cash on Delivery Only</p>
                                                <small>পণ্য হাতে পেয়ে টাকা দিন</small>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="alert alert-success">
                                                <h6><i class="fas fa-calculator"></i> Total Amount</h6>
                                                <h4 id="totalAmount" class="mb-0">${formatPrice(defaultTotal)}</h4>
                                                <small id="breakdown">Product: ${formatPrice(product.offer_price)} + Delivery: ${formatPrice(shippingInsideDhaka)}</small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="text-center mt-3">
                                        <button type="submit" class="order-now-btn btn-lg">
                                            <i class="fas fa-bolt"></i> ORDER NOW
                                        </button>
                                        <p class="mt-2 text-muted">
                                            <i class="fas fa-lock"></i> আপনার তথ্য নিরাপদে সংরক্ষিত হবে
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-5">
                    <div class="col-md-4">
                        <div class="card text-center h-100">
                            <div class="card-body">
                                <i class="fas fa-award fa-3x text-warning mb-3"></i>
                                <h5>Original Product</h5>
                                <p class="text-muted">100% genuine product with warranty</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-center h-100">
                            <div class="card-body">
                                <i class="fas fa-headset fa-3x text-info mb-3"></i>
                                <h5>24/7 Support</h5>
                                <p class="text-muted">Call us anytime: +880 1234-567890</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-center h-100">
                            <div class="card-body">
                                <i class="fas fa-undo fa-3x text-success mb-3"></i>
                                <h5>Easy Return</h5>
                                <p class="text-muted">7 days return policy</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                function calculateTotal() {
                    const productPrice = ${product.offer_price};
                    const quantity = parseInt(document.querySelector('[name="quantity"]').value);
                    const shippingArea = document.querySelector('[name="shipping_area"]').value;
                    
                    const shippingCost = shippingArea === 'inside_dhaka' ? ${shippingInsideDhaka} : ${shippingOutsideDhaka};
                    const total = (productPrice * quantity) + shippingCost;
                    
                    document.getElementById('totalAmount').textContent = '৳' + total.toLocaleString('en-IN');
                    document.getElementById('breakdown').innerHTML = 
                        'Product: ${formatPrice(product.offer_price)} × ' + quantity + 
                        ' + Delivery: ৳' + shippingCost;
                }
                
                const countdownElement = document.getElementById('countdown');
                let timeLeft = 23 * 3600 + 59 * 60 + 59;
                
                function updateCountdown() {
                    const hours = Math.floor(timeLeft / 3600);
                    const minutes = Math.floor((timeLeft % 3600) / 60);
                    const seconds = timeLeft % 60;
                    
                    countdownElement.textContent = 
                        hours.toString().padStart(2, '0') + ':' +
                        minutes.toString().padStart(2, '0') + ':' +
                        seconds.toString().padStart(2, '0');
                    
                    if (timeLeft > 0) {
                        timeLeft--;
                    }
                }
                
                setInterval(updateCountdown, 1000);
                updateCountdown();
            </script>`;
        
        res.send(generateHTML(product.name, content));
    });
});

app.post('/order', (req, res) => {
    const { customer_name, phone, address, shipping_area, quantity, product_name, product_price } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? 80 : 150;
    const total = (parseFloat(product_price) * parseInt(quantity || 1)) + shippingCost;
    
    db.run("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total) VALUES (?, ?, ?, ?, ?, ?)",
        [customer_name, phone, address, shipping_area, quantity, total], 
        function(err) {
            if (err) {
                res.send('<div class="alert alert-danger">Error placing order</div>');
            } else {
                const orderId = this.lastID;
                let content = `
                    <div class="container mt-5">
                        <div class="row justify-content-center">
                            <div class="col-md-6">
                                <div class="card border-success shadow-lg">
                                    <div class="card-body text-center p-5">
                                        <div class="mb-4">
                                            <i class="fas fa-check-circle text-success fa-5x"></i>
                                        </div>
                                        <h2 class="card-title text-success mb-3">অর্ডার সফল!</h2>
                                        <p class="card-text mb-4">ধন্যবাদ ${customer_name}, আপনার অর্ডারটি গ্রহণ করা হয়েছে।</p>
                                        
                                        <div class="alert alert-light border">
                                            <h5>অর্ডার বিবরণ</h5>
                                            <p><strong>অর্ডার নং:</strong> #DM${orderId}</p>
                                            <p><strong>পণ্য:</strong> ${product_name}</p>
                                            <p><strong>পরিমাণ:</strong> ${quantity} টি</p>
                                            <p><strong>ডেলিভারি:</strong> ${shipping_area === 'inside_dhaka' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে'}</p>
                                            <p><strong>মোট মূল্য:</strong> ${formatPrice(total)}</p>
                                            <p><strong>স্ট্যাটাস:</strong> <span class="badge bg-warning text-dark">প্রক্রিয়াধীন</span></p>
                                        </div>
                                        
                                        <div class="alert alert-info">
                                            <h6><i class="fas fa-info-circle"></i> পরবর্তী ধাপ</h6>
                                            <p class="mb-0">আমাদের প্রতিনিধি ৩০ মিনিটের মধ্যে আপনার সাথে যোগাযোগ করবে।</p>
                                        </div>
                                        
                                        <div class="d-grid gap-2">
                                            <a href="/" class="btn btn-primary btn-lg">আরও অর্ডার করুন</a>
                                            <a href="https://wa.me/8801234567890?text=Hello%20I%20have%20ordered%20Hair%20Trimmer%20Order%20ID:%20DM${orderId}" 
                                               target="_blank" class="btn btn-success btn-lg">
                                                <i class="fab fa-whatsapp"></i> WhatsApp এ কনফার্ম করুন
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
                res.send(generateHTML('Order Confirmed', content));
            }
        }
    );
});

app.get('/admin-login', (req, res) => {
    let content = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-4">
                    <div class="card shadow">
                        <div class="card-body p-5">
                            <h3 class="card-title text-center mb-4">
                                <i class="fas fa-user-shield"></i> Admin Login
                            </h3>
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
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    res.send(generateHTML('Admin Login', content));
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM admin_users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (user) {
            res.redirect('/admin-panel');
        } else {
            res.send('<script>alert("Invalid credentials"); window.location="/admin-login";</script>');
        }
    });
});

app.get('/admin-panel', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        db.get("SELECT COUNT(*) as total_orders FROM orders", (err, countResult) => {
            db.get("SELECT SUM(total) as total_revenue FROM orders WHERE status = 'completed'", (err, revenueResult) => {
                const totalOrders = countResult.total_orders || 0;
                const totalRevenue = revenueResult.total_revenue || 0;
                
                let content = `
                    <div class="container-fluid mt-3">
                        <h2 class="mb-4"><i class="fas fa-chart-line"></i> Admin Dashboard</h2>
                        
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card bg-primary text-white">
                                    <div class="card-body">
                                        <h5>Total Orders</h5>
                                        <h2>${totalOrders}</h2>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-success text-white">
                                    <div class="card-body">
                                        <h5>Total Revenue</h5>
                                        <h2>${formatPrice(totalRevenue)}</h2>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-info text-white">
                                    <div class="card-body">
                                        <h5>Pending Orders</h5>
                                        <h2>${orders.filter(o => o.status === 'pending').length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-warning text-dark">
                                    <div class="card-body">
                                        <h5>Today's Orders</h5>
                                        <h2>${orders.length}</h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">All Orders</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive admin-table">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Order ID</th>
                                                <th>Customer</th>
                                                <th>Phone</th>
                                                <th>Address</th>
                                                <th>Quantity</th>
                                                <th>Total</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>`;
                
                orders.forEach(order => {
                    const date = new Date(order.created_at).toLocaleString();
                    content += `
                        <tr>
                            <td>#DM${order.id}</td>
                            <td>${order.customer_name}</td>
                            <td>${order.phone}</td>
                            <td><small>${order.address}</small></td>
                            <td>${order.quantity}</td>
                            <td>${formatPrice(order.total)}</td>
                            <td>
                                <select class="form-select form-select-sm" onchange="updateStatus(${order.id}, this.value)">
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </td>
                            <td><small>${date}</small></td>
                            <td>
                                <button class="btn btn-danger btn-sm" onclick="deleteOrder(${order.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>`;
                });
                
                content += `</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        function updateStatus(orderId, status) {
                            fetch('/admin/update-status', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({orderId, status})
                            });
                        }
                        
                        function deleteOrder(orderId) {
                            if(confirm('Delete this order?')) {
                                fetch('/admin/delete-order/' + orderId, {method: 'DELETE'})
                                    .then(() => location.reload());
                            }
                        }
                    </script>`;
                
                res.send(generateHTML('Admin Panel', content));
            });
        });
    });
});

app.post('/admin/update-status', (req, res) => {
    const { orderId, status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
    res.json({ success: true });
});

app.delete('/admin/delete-order/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM orders WHERE id = ?", [id]);
    res.json({ success: true });
});

app.get('/orders', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let content = `
            <div class="container mt-4">
                <h2 class="mb-4">All Orders</h2>`;
        
        if (orders.length === 0) {
            content += `<div class="alert alert-info">No orders found.</div>`;
        } else {
            content += `<div class="table-responsive">
                            <table class="table table-bordered">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Phone</th>
                                        <th>Address</th>
                                        <th>Qty</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>`;
            
            orders.forEach(order => {
                const date = new Date(order.created_at).toLocaleDateString();
                const statusClass = order.status === 'completed' ? 'bg-success' : 
                                   order.status === 'pending' ? 'bg-warning' : 'bg-secondary';
                
                content += `
                    <tr>
                        <td>#DM${order.id}</td>
                        <td>${order.customer_name}</td>
                        <td>${order.phone}</td>
                        <td><small>${order.address}</small></td>
                        <td>${order.quantity}</td>
                        <td>${formatPrice(order.total)}</td>
                        <td><span class="badge ${statusClass}">${order.status}</span></td>
                        <td>${date}</td>
                    </tr>`;
            });
            
            content += `</tbody></table></div>`;
        }
        
        content += `<div class="mt-3">
                        <a href="/" class="btn btn-primary">Back to Home</a>
                    </div></div>`;
        
        res.send(generateHTML('Orders', content));
    });
});

app.listen(PORT, () => {
    console.log(`
    ┌─────────────────────────────────────────────┐
    │    Dhaka Market - Single Product System     │
    │    Server: http://localhost:${PORT}           │
    │    Admin: http://localhost:${PORT}/admin-login  │
    │                                             │
    │    Features:                                │
    │    • Single Product Page                    │
    │    • 4+ Image Slider (Auto)                 │
    │    • Direct ORDER NOW Button                │
    │    • Live Order Notification                │
    │    • Admin Panel                            │
    │    • Real-time Updates                      │
    │    • WhatsApp Integration                   │
    │    • Countdown Timer                        │
    │    • Dynamic Pricing                        │
    │    • Order Management                       │
    └─────────────────────────────────────────────┘
    `);
});
