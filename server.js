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
    
    // Sample orders for testing
    const sampleOrders = [
        ['রহিম', '01712345678', 'মোহাম্মদপুর, ঢাকা', 'inside_dhaka', 1, 1059, 'completed', '2024-01-01 10:30:00'],
        ['করিম', '01876543210', 'মিরপুর, ঢাকা', 'inside_dhaka', 2, 2058, 'processing', '2024-01-01 11:45:00'],
        ['সাদিয়া', '01987654321', 'চট্টগ্রাম সিটি', 'outside_dhaka', 1, 1149, 'pending', '2024-01-01 12:15:00'],
        ['জাহিদ', '01612345678', 'সিলেট', 'outside_dhaka', 3, 3297, 'shipped', '2024-01-01 13:30:00']
    ];
    
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
    
    // Insert sample orders
    const orderStmt = db.prepare("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    sampleOrders.forEach(order => orderStmt.run(order));
    orderStmt.finalize();
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
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #4e73df;
            --success-color: #1cc88a;
            --info-color: #36b9cc;
            --warning-color: #f6c23e;
            --danger-color: #e74a3b;
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background-color: #f8f9fc;
        }
        .sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 100;
            padding: 48px 0 0;
            box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
            background-color: #fff;
            width: 250px;
        }
        .sidebar .nav-link {
            font-weight: 500;
            color: #333;
            padding: 0.75rem 1rem;
            border-left: 4px solid transparent;
        }
        .sidebar .nav-link.active {
            color: var(--primary-color);
            background-color: #f8f9fc;
            border-left-color: var(--primary-color);
        }
        .sidebar .nav-link:hover {
            color: var(--primary-color);
            background-color: #f8f9fc;
        }
        .sidebar .nav-link i {
            margin-right: 10px;
            color: #b7b9cc;
        }
        .sidebar .nav-link.active i {
            color: var(--primary-color);
        }
        .main-content {
            margin-left: 250px;
            padding: 20px;
        }
        .navbar {
            background-color: #fff;
            box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, .15);
            padding: 1rem 1.5rem;
        }
        .card {
            border: 1px solid #e3e6f0;
            border-radius: 0.35rem;
            box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, .15);
            margin-bottom: 1.5rem;
        }
        .card-header {
            background-color: #f8f9fc;
            border-bottom: 1px solid #e3e6f0;
            padding: 0.75rem 1.25rem;
        }
        .stat-card {
            border-left: 4px solid;
            padding: 20px;
            border-radius: 8px;
            background: white;
            margin-bottom: 20px;
        }
        .stat-card.total-orders { border-left-color: var(--primary-color); }
        .stat-card.total-revenue { border-left-color: var(--success-color); }
        .stat-card.pending-orders { border-left-color: var(--warning-color); }
        .stat-card.today-orders { border-left-color: var(--info-color); }
        
        .badge-status {
            padding: 0.35em 0.65em;
            border-radius: 0.25rem;
            font-weight: 600;
        }
        .badge-pending { background-color: #f8f9fc; color: #3a3b45; }
        .badge-processing { background-color: #cce5ff; color: #004085; }
        .badge-shipped { background-color: #d1ecf1; color: #0c5460; }
        .badge-completed { background-color: #d4edda; color: #155724; }
        .badge-cancelled { background-color: #f8d7da; color: #721c24; }
        
        .order-table th {
            background-color: #f8f9fc;
            font-weight: 600;
            color: #5a5c69;
            border-top: 1px solid #e3e6f0;
        }
        .order-table td {
            vertical-align: middle;
            border-color: #e3e6f0;
        }
        .order-actions .btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
        }
        .form-control:focus, .form-select:focus {
            border-color: #bac8f3;
            box-shadow: 0 0 0 0.2rem rgba(78, 115, 223, 0.25);
        }
        .whatsapp-btn {
            background-color: #25D366;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            font-size: 14px;
        }
        .export-btn {
            background-color: var(--success-color);
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            font-size: 14px;
        }
        .customer-info {
            background-color: #f8f9fc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .customer-info h6 {
            color: var(--primary-color);
            margin-bottom: 10px;
        }
        .modal-xl {
            max-width: 1200px;
        }
        .order-details {
            padding: 20px;
            background-color: white;
            border-radius: 8px;
        }
        .timeline {
            position: relative;
            padding-left: 30px;
            margin-top: 20px;
        }
        .timeline:before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background-color: #e3e6f0;
        }
        .timeline-item {
            position: relative;
            margin-bottom: 20px;
        }
        .timeline-item:before {
            content: '';
            position: absolute;
            left: -23px;
            top: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: var(--primary-color);
            border: 2px solid white;
        }
        .timeline-item.completed:before { background-color: var(--success-color); }
        .timeline-item.processing:before { background-color: var(--info-color); }
        .timeline-item.shipped:before { background-color: var(--warning-color); }
        .timeline-item.cancelled:before { background-color: var(--danger-color); }
        
        .status-select {
            min-width: 150px;
            padding: 5px 10px;
            border-radius: 4px;
            border: 1px solid #ddd;
            background-color: white;
        }
        .btn-view {
            background-color: var(--info-color);
            color: white;
        }
        .btn-whatsapp {
            background-color: #25D366;
            color: white;
        }
        .search-box {
            max-width: 300px;
        }
        .pagination .page-link {
            color: var(--primary-color);
        }
        .pagination .page-item.active .page-link {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: static;
                height: auto;
                padding: 0;
            }
            .main-content {
                margin-left: 0;
            }
        }
    </style>
</head>
<body>
    ${content}
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script>
        // Toast notification function
        function showToast(message, type = 'success') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });
            
            Toast.fire({
                icon: type,
                title: message
            });
        }
        
        // Format date
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('en-BD', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Format price
        function formatPrice(price) {
            return '৳' + price.toLocaleString('en-IN');
        }
    </script>
</body>
</html>`;
}

// Public website routes
app.get('/', (req, res) => {
    db.get("SELECT * FROM products WHERE id = 1", (err, product) => {
        if (!product) {
            res.send('Product not found');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const discount = Math.round(((product.price - product.offer_price) / product.price) * 100);
        const shippingInsideDhaka = 60;
        const shippingOutsideDhaka = 100;
        const defaultQuantity = 1;
        const defaultTotal = product.offer_price + shippingInsideDhaka;
        
        let content = `
            <div class="container mt-4">
                <nav class="navbar navbar-light bg-light mb-4 rounded">
                    <div class="container-fluid">
                        <a class="navbar-brand" href="/">
                            <i class="fas fa-store"></i> Dhaka Market
                        </a>
                        <div class="d-flex">
                            <a href="/admin-login" class="btn btn-outline-primary btn-sm">
                                <i class="fas fa-user-shield"></i> Admin Login
                            </a>
                        </div>
                    </div>
                </nav>
                
                <div class="row">
                    <div class="col-md-6">
                        <div id="productCarousel" class="carousel slide mb-4" data-bs-ride="carousel">
                            <div class="carousel-inner rounded" style="height: 400px;">`;
        
        images.forEach((img, index) => {
            content += `
                                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                                    <img src="${img}" class="d-block w-100 h-100" style="object-fit: cover;">
                                </div>`;
        });
        
        content += `</div>
                            <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon"></span>
                            </button>
                            <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
                                <span class="carousel-control-next-icon"></span>
                            </button>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="card-title"><i class="fas fa-bolt text-warning"></i> Features</h5>
                                <ul class="list-group list-group-flush">`;
        
        features.forEach(feature => {
            content += `<li class="list-group-item"><i class="fas fa-check text-success me-2"></i> ${feature}</li>`;
        });
        
        content += `</ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <h1 class="mb-3">${product.name}</h1>
                        
                        <div class="bg-light p-4 rounded mb-4">
                            <div class="d-flex align-items-center mb-2">
                                <span class="text-muted text-decoration-line-through me-3">${formatPrice(product.price)}</span>
                                <span class="badge bg-danger fs-6">${discount}% OFF</span>
                            </div>
                            <h2 class="text-primary mb-0">${formatPrice(product.offer_price)}</h2>
                            <small class="text-muted">Inclusive of all taxes</small>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="card-title"><i class="fas fa-info-circle"></i> Description</h5>
                                <p class="card-text">${product.description}</p>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0"><i class="fas fa-shopping-cart"></i> Order Now</h5>
                            </div>
                            <div class="card-body">
                                <form action="/order" method="POST" id="orderForm">
                                    <input type="hidden" name="product_name" value="${product.name}">
                                    <input type="hidden" name="product_price" value="${product.offer_price}">
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Your Name *</label>
                                            <input type="text" name="customer_name" class="form-control" placeholder="আপনার নাম" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Phone Number *</label>
                                            <input type="tel" name="phone" class="form-control" placeholder="০১৭১২-৩৪৫৬৭৮" required>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Address *</label>
                                        <textarea name="address" class="form-control" rows="2" placeholder="বাড়ি নং, রাস্তা, এলাকা, জেলা" required></textarea>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Quantity</label>
                                            <select name="quantity" class="form-control" onchange="calculateTotal()">
                                                <option value="1">1 Piece</option>
                                                <option value="2">2 Pieces</option>
                                                <option value="3">3 Pieces</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Shipping Area</label>
                                            <select name="shipping_area" class="form-control" onchange="calculateTotal()">
                                                <option value="inside_dhaka">Inside Dhaka (৳${shippingInsideDhaka})</option>
                                                <option value="outside_dhaka">Outside Dhaka (৳${shippingOutsideDhaka})</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="alert alert-info mb-3">
                                        <h6><i class="fas fa-money-bill-wave"></i> Payment Method</h6>
                                        <p class="mb-0">Cash on Delivery</p>
                                    </div>
                                    
                                    <div class="bg-light p-3 rounded mb-3">
                                        <div class="d-flex justify-content-between mb-1">
                                            <span>Product Price:</span>
                                            <span>${formatPrice(product.offer_price)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-1">
                                            <span>Shipping:</span>
                                            <span id="shippingCost">৳${shippingInsideDhaka}</span>
                                        </div>
                                        <hr>
                                        <div class="d-flex justify-content-between">
                                            <strong>Total Amount:</strong>
                                            <strong id="totalAmount">${formatPrice(defaultTotal)}</strong>
                                        </div>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-primary btn-lg w-100">
                                        <i class="fas fa-shopping-cart"></i> Confirm Order
                                    </button>
                                </form>
                                
                                <script>
                                    function calculateTotal() {
                                        const productPrice = ${product.offer_price};
                                        const quantity = parseInt(document.querySelector('[name="quantity"]').value);
                                        const shippingArea = document.querySelector('[name="shipping_area"]').value;
                                        
                                        const shippingCost = shippingArea === 'inside_dhaka' ? ${shippingInsideDhaka} : ${shippingOutsideDhaka};
                                        const total = (productPrice * quantity) + shippingCost;
                                        
                                        document.getElementById('shippingCost').textContent = '৳' + shippingCost;
                                        document.getElementById('totalAmount').textContent = '৳' + total.toLocaleString('en-IN');
                                    }
                                </script>
                            </div>
                        </div>
                    </div>
                </div>
                
                <footer class="mt-5 py-4 text-center text-muted border-top">
                    <p>© 2024 Dhaka Market. All rights reserved.</p>
                </footer>
            </div>`;
        
        res.send(generateHTML(product.name, content));
    });
});

app.post('/order', (req, res) => {
    const { customer_name, phone, address, shipping_area, quantity, product_name, product_price } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? 60 : 100;
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
                                <div class="card shadow-lg border-0">
                                    <div class="card-body text-center p-5">
                                        <div class="mb-4">
                                            <i class="fas fa-check-circle text-success fa-5x"></i>
                                        </div>
                                        <h2 class="card-title text-success mb-3">Order Confirmed!</h2>
                                        <p class="card-text mb-4">Thank you ${customer_name}, your order has been received.</p>
                                        
                                        <div class="alert alert-light border mb-4">
                                            <h5>Order Details</h5>
                                            <p><strong>Order ID:</strong> #DM${orderId}</p>
                                            <p><strong>Product:</strong> ${product_name}</p>
                                            <p><strong>Total Amount:</strong> ${formatPrice(total)}</p>
                                        </div>
                                        
                                        <a href="/" class="btn btn-primary btn-lg">Continue Shopping</a>
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

// Admin Login
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
            res.redirect('/admin/dashboard');
        } else {
            res.send('<script>alert("Invalid credentials"); window.location="/admin-login";</script>');
        }
    });
});

// Admin Dashboard
app.get('/admin/dashboard', (req, res) => {
    let content = `
        <!-- Sidebar -->
        <nav class="sidebar">
            <div class="position-sticky pt-3">
                <div class="p-3">
                    <h5 class="text-center mb-4">
                        <i class="fas fa-store"></i> Admin Panel
                    </h5>
                </div>
                <ul class="nav flex-column">
                    <li class="nav-item">
                        <a class="nav-link active" href="/admin/dashboard">
                            <i class="fas fa-tachometer-alt"></i> Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/admin/orders">
                            <i class="fas fa-shopping-cart"></i> Orders
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/admin/products">
                            <i class="fas fa-box"></i> Products
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/admin/customers">
                            <i class="fas fa-users"></i> Customers
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/admin/reports">
                            <i class="fas fa-chart-bar"></i> Reports
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/admin/settings">
                            <i class="fas fa-cog"></i> Settings
                        </a>
                    </li>
                    <li class="nav-item mt-5">
                        <a class="nav-link text-danger" href="/">
                            <i class="fas fa-sign-out-alt"></i> Back to Store
                        </a>
                    </li>
                </ul>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Navbar -->
            <nav class="navbar navbar-expand navbar-light bg-white shadow-sm mb-4">
                <div class="container-fluid">
                    <h4 class="mb-0">Dashboard Overview</h4>
                    <div class="d-flex align-items-center">
                        <span class="me-3">
                            <i class="fas fa-user-circle"></i> Admin
                        </span>
                        <span class="badge bg-primary">
                            <i class="fas fa-clock"></i> ${new Date().toLocaleString()}
                        </span>
                    </div>
                </div>
            </nav>

            <!-- Stats Cards -->
            <div class="row" id="statsCards">
                <!-- Stats will be loaded here by JavaScript -->
            </div>

            <!-- Recent Orders -->
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Recent Orders</h5>
                    <a href="/admin/orders" class="btn btn-sm btn-primary">View All</a>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover order-table">
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
                            <tbody id="recentOrders">
                                <!-- Recent orders will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="row mt-4">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-file-export fa-2x text-success mb-3"></i>
                            <h5>Export Data</h5>
                            <p>Export orders and customer data to CSV</p>
                            <button class="btn btn-success w-100" onclick="exportAllData()">
                                <i class="fas fa-download"></i> Export All Data
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-bell fa-2x text-warning mb-3"></i>
                            <h5>Notifications</h5>
                            <p>Pending orders need attention</p>
                            <a href="/admin/orders?status=pending" class="btn btn-warning w-100">
                                <i class="fas fa-eye"></i> View Pending Orders
                            </a>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-chart-line fa-2x text-info mb-3"></i>
                            <h5>Analytics</h5>
                            <p>View sales reports and analytics</p>
                            <a href="/admin/reports" class="btn btn-info w-100">
                                <i class="fas fa-chart-bar"></i> View Reports
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Load dashboard data
            async function loadDashboardData() {
                try {
                    const response = await fetch('/admin/api/dashboard-stats');
                    const data = await response.json();
                    
                    // Update stats cards
                    document.getElementById('statsCards').innerHTML = \`
                        <div class="col-md-3">
                            <div class="stat-card total-orders">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h6 class="text-muted">Total Orders</h6>
                                        <h3 class="mb-0">\${data.totalOrders}</h3>
                                    </div>
                                    <i class="fas fa-shopping-cart fa-2x text-primary"></i>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card total-revenue">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h6 class="text-muted">Total Revenue</h6>
                                        <h3 class="mb-0">\${data.totalRevenue}</h3>
                                    </div>
                                    <i class="fas fa-money-bill-wave fa-2x text-success"></i>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card pending-orders">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h6 class="text-muted">Pending Orders</h6>
                                        <h3 class="mb-0">\${data.pendingOrders}</h3>
                                    </div>
                                    <i class="fas fa-clock fa-2x text-warning"></i>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card today-orders">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h6 class="text-muted">Today's Orders</h6>
                                        <h3 class="mb-0">\${data.todayOrders}</h3>
                                    </div>
                                    <i class="fas fa-calendar-day fa-2x text-info"></i>
                                </div>
                            </div>
                        </div>
                    \`;
                    
                    // Update recent orders
                    let ordersHtml = '';
                    data.recentOrders.forEach(order => {
                        const statusClass = \`badge-\${order.status}\`;
                        ordersHtml += \`
                            <tr>
                                <td><strong>#DM\${order.id}</strong></td>
                                <td>\${order.customer_name}</td>
                                <td>\${order.phone}</td>
                                <td>\${order.total}</td>
                                <td>
                                    <select class="status-select" data-order-id="\${order.id}" onchange="updateOrderStatus(\${order.id}, this.value)">
                                        <option value="pending" \${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                        <option value="processing" \${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                        <option value="shipped" \${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                        <option value="completed" \${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                                        <option value="cancelled" \${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </td>
                                <td>\${formatDate(order.created_at)}</td>
                                <td class="order-actions">
                                    <button class="btn btn-sm btn-view" onclick="viewOrderDetails(\${order.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <a href="https://wa.me/88\${order.phone.replace(/[^0-9]/g, '')}?text=Hello%20\${encodeURIComponent(order.customer_name)}%2C%20about%20your%20order%20%23DM\${order.id}" 
                                       target="_blank" class="btn btn-sm btn-whatsapp">
                                        <i class="fab fa-whatsapp"></i>
                                    </a>
                                </td>
                            </tr>
                        \`;
                    });
                    
                    document.getElementById('recentOrders').innerHTML = ordersHtml;
                    
                } catch (error) {
                    console.error('Error loading dashboard data:', error);
                }
            }
            
            // Update order status
            async function updateOrderStatus(orderId, status) {
                try {
                    const response = await fetch('/admin/api/update-order-status', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({orderId, status})
                    });
                    
                    if (response.ok) {
                        showToast('Order status updated successfully', 'success');
                        loadDashboardData(); // Refresh data
                    }
                } catch (error) {
                    showToast('Error updating status', 'error');
                }
            }
            
            // View order details
            async function viewOrderDetails(orderId) {
                try {
                    const response = await fetch(\`/admin/api/order-details/\${orderId}\`);
                    const order = await response.json();
                    
                    // Create modal for order details
                    const modalHtml = \`
                        <div class="modal fade" id="orderDetailsModal" tabindex="-1">
                            <div class="modal-dialog modal-xl">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">Order #DM\${order.id} Details</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                    </div>
                                    <div class="modal-body">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="customer-info">
                                                    <h6><i class="fas fa-user"></i> Customer Information</h6>
                                                    <p><strong>Name:</strong> \${order.customer_name}</p>
                                                    <p><strong>Phone:</strong> \${order.phone}</p>
                                                    <p><strong>Address:</strong> \${order.address}</p>
                                                    <p><strong>Shipping Area:</strong> \${order.shipping_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</p>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="customer-info">
                                                    <h6><i class="fas fa-receipt"></i> Order Information</h6>
                                                    <p><strong>Order ID:</strong> #DM\${order.id}</p>
                                                    <p><strong>Quantity:</strong> \${order.quantity} item(s)</p>
                                                    <p><strong>Total Amount:</strong> \${order.total}</p>
                                                    <p><strong>Order Date:</strong> \${formatDate(order.created_at)}</p>
                                                    <p>
                                                        <strong>Status:</strong> 
                                                        <select class="status-select" onchange="updateOrderStatus(\${order.id}, this.value)">
                                                            <option value="pending" \${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                                            <option value="processing" \${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                                            <option value="shipped" \${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                                            <option value="completed" \${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                                                            <option value="cancelled" \${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                                        </select>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="order-details mt-3">
                                            <h6><i class="fas fa-box"></i> Product Details</h6>
                                            <div class="table-responsive">
                                                <table class="table table-bordered">
                                                    <thead>
                                                        <tr>
                                                            <th>Product</th>
                                                            <th>Quantity</th>
                                                            <th>Unit Price</th>
                                                            <th>Shipping</th>
                                                            <th>Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td>Hair Trimmer Pro Max</td>
                                                            <td>\${order.quantity}</td>
                                                            <td>\${formatPrice(999)}</td>
                                                            <td>\${formatPrice(order.shipping_area === 'inside_dhaka' ? 60 : 100)}</td>
                                                            <td>\${order.total}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        
                                        <div class="timeline mt-4">
                                            <h6><i class="fas fa-history"></i> Order Timeline</h6>
                                            <div class="timeline-item completed">
                                                <strong>Order Placed</strong>
                                                <p class="mb-1">Customer placed the order</p>
                                                <small>\${formatDate(order.created_at)}</small>
                                            </div>
                                            \${order.status === 'processing' || order.status === 'shipped' || order.status === 'completed' ? \`
                                            <div class="timeline-item processing">
                                                <strong>Order Confirmed</strong>
                                                <p class="mb-1">Order confirmed and payment verified</p>
                                                <small>\${formatDate(new Date(order.created_at).getTime() + 3600000)}</small>
                                            </div>
                                            \` : ''}
                                            \${order.status === 'shipped' || order.status === 'completed' ? \`
                                            <div class="timeline-item shipped">
                                                <strong>Order Shipped</strong>
                                                <p class="mb-1">Order has been shipped</p>
                                                <small>\${formatDate(new Date(order.created_at).getTime() + 7200000)}</small>
                                            </div>
                                            \` : ''}
                                            \${order.status === 'completed' ? \`
                                            <div class="timeline-item completed">
                                                <strong>Order Delivered</strong>
                                                <p class="mb-1">Order delivered successfully</p>
                                                <small>\${formatDate(new Date(order.created_at).getTime() + 86400000)}</small>
                                            </div>
                                            \` : ''}
                                        </div>
                                    </div>
                                    <div class="modal-footer">
                                        <a href="https://wa.me/88\${order.phone.replace(/[^0-9]/g, '')}?text=Hello%20\${encodeURIComponent(order.customer_name)}%2C%20about%20your%20order%20%23DM\${order.id}" 
                                           target="_blank" class="btn btn-success">
                                            <i class="fab fa-whatsapp"></i> WhatsApp Customer
                                        </a>
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`;
                    
                    // Add modal to body and show it
                    const modalContainer = document.createElement('div');
                    modalContainer.innerHTML = modalHtml;
                    document.body.appendChild(modalContainer);
                    
                    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
                    modal.show();
                    
                    // Remove modal from DOM after it's hidden
                    document.getElementById('orderDetailsModal').addEventListener('hidden.bs.modal', function () {
                        modalContainer.remove();
                    });
                    
                } catch (error) {
                    showToast('Error loading order details', 'error');
                }
            }
            
            // Export all data
            function exportAllData() {
                window.location.href = '/admin/export/all';
            }
            
            // Load data when page loads
            document.addEventListener('DOMContentLoaded', loadDashboardData);
        </script>`;
    
    res.send(generateHTML('Admin Dashboard', content));
});

// Orders Management Page
app.get('/admin/orders', (req, res) => {
    const status = req.query.status || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    let query = "SELECT * FROM orders";
    let countQuery = "SELECT COUNT(*) as total FROM orders";
    let params = [];
    
    if (status !== 'all') {
        query += " WHERE status = ?";
        countQuery += " WHERE status = ?";
        params.push(status);
    }
    
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    
    db.all(query, params, (err, orders) => {
        db.get(countQuery, params.slice(0, -2), (err, countResult) => {
            const totalOrders = countResult.total;
            const totalPages = Math.ceil(totalOrders / limit);
            
            let content = `
                <!-- Sidebar -->
                <nav class="sidebar">
                    <div class="position-sticky pt-3">
                        <div class="p-3">
                            <h5 class="text-center mb-4">
                                <i class="fas fa-store"></i> Admin Panel
                            </h5>
                        </div>
                        <ul class="nav flex-column">
                            <li class="nav-item">
                                <a class="nav-link" href="/admin/dashboard">
                                    <i class="fas fa-tachometer-alt"></i> Dashboard
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link active" href="/admin/orders">
                                    <i class="fas fa-shopping-cart"></i> Orders
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/admin/products">
                                    <i class="fas fa-box"></i> Products
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/admin/customers">
                                    <i class="fas fa-users"></i> Customers
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/admin/reports">
                                    <i class="fas fa-chart-bar"></i> Reports
                                </a>
                            </li>
                            <li class="nav-item mt-5">
                                <a class="nav-link text-danger" href="/">
                                    <i class="fas fa-sign-out-alt"></i> Back to Store
                                </a>
                            </li>
                        </ul>
                    </div>
                </nav>

                <!-- Main Content -->
                <div class="main-content">
                    <!-- Navbar -->
                    <nav class="navbar navbar-expand navbar-light bg-white shadow-sm mb-4">
                        <div class="container-fluid">
                            <h4 class="mb-0">Order Management</h4>
                            <div class="d-flex align-items-center">
                                <span class="me-3">
                                    <i class="fas fa-user-circle"></i> Admin
                                </span>
                            </div>
                        </div>
                    </nav>

                    <!-- Filter and Search -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <label>Filter by Status</label>
                                    <select class="form-select" onchange="window.location.href='/admin/orders?status=' + this.value">
                                        <option value="all" ${status === 'all' ? 'selected' : ''}>All Orders</option>
                                        <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                                        <option value="processing" ${status === 'processing' ? 'selected' : ''}>Processing</option>
                                        <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                        <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                                        <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label>Search Orders</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="searchInput" placeholder="Search by order ID, customer name, or phone...">
                                        <button class="btn btn-primary" onclick="searchOrders()">
                                            <i class="fas fa-search"></i> Search
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-success w-100" onclick="exportOrders()">
                                        <i class="fas fa-file-export"></i> Export Orders
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Orders Table -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Orders (${totalOrders} total)</h5>
                            <div>
                                <button class="btn btn-sm btn-primary me-2" onclick="refreshOrders()">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover order-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                            </th>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th>Phone</th>
                                            <th>Address</th>
                                            <th>Qty</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>`;
            
            orders.forEach(order => {
                const statusClass = `badge-${order.status}`;
                const date = new Date(order.created_at);
                const formattedDate = date.toLocaleDateString('en-BD', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                });
                
                content += `
                    <tr>
                        <td>
                            <input type="checkbox" class="order-checkbox" value="${order.id}">
                        </td>
                        <td><strong>#DM${order.id}</strong></td>
                        <td>${order.customer_name}</td>
                        <td>${order.phone}</td>
                        <td><small>${order.address.substring(0, 30)}...</small></td>
                        <td>${order.quantity}</td>
                        <td>${formatPrice(order.total)}</td>
                        <td>
                            <span class="badge-status ${statusClass}">
                                ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                        </td>
                        <td>${formattedDate}</td>
                        <td class="order-actions">
                            <button class="btn btn-sm btn-view" onclick="viewOrderDetails(${order.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <a href="https://wa.me/88${order.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(order.customer_name)}%2C%20about%20your%20order%20%23DM${order.id}" 
                               target="_blank" class="btn btn-sm btn-whatsapp" title="WhatsApp">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                            <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
            });
            
            content += `</tbody>
                                </table>
                            </div>
                            
                            <!-- Bulk Actions -->
                            <div class="mt-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <select class="form-select d-inline-block w-auto me-2" id="bulkAction">
                                        <option value="">Bulk Actions</option>
                                        <option value="status:pending">Mark as Pending</option>
                                        <option value="status:processing">Mark as Processing</option>
                                        <option value="status:shipped">Mark as Shipped</option>
                                        <option value="status:completed">Mark as Completed</option>
                                        <option value="status:cancelled">Mark as Cancelled</option>
                                        <option value="delete">Delete Selected</option>
                                        <option value="export">Export Selected</option>
                                    </select>
                                    <button class="btn btn-primary" onclick="applyBulkAction()">Apply</button>
                                </div>
                                
                                <!-- Pagination -->
                                <nav>
                                    <ul class="pagination mb-0">`;
            
            for (let i = 1; i <= totalPages; i++) {
                content += `
                    <li class="page-item ${i === page ? 'active' : ''}">
                        <a class="page-link" href="/admin/orders?status=${status}&page=${i}">${i}</a>
                    </li>`;
            }
            
            content += `</ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    // View order details
                    async function viewOrderDetails(orderId) {
                        try {
                            const response = await fetch('/admin/api/order-details/' + orderId);
                            const order = await response.json();
                            
                            // Show order details in a modal
                            const modalHtml = \`
                                <div class="modal fade" id="orderModal" tabindex="-1">
                                    <div class="modal-dialog modal-lg">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <h5 class="modal-title">Order #DM\${order.id}</h5>
                                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body">
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <h6>Customer Details</h6>
                                                        <p><strong>Name:</strong> \${order.customer_name}</p>
                                                        <p><strong>Phone:</strong> \${order.phone}</p>
                                                        <p><strong>Address:</strong> \${order.address}</p>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <h6>Order Details</h6>
                                                        <p><strong>Status:</strong> 
                                                            <select class="form-select d-inline-block w-auto" onchange="updateOrderStatus(\${order.id}, this.value)">
                                                                <option value="pending" \${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                                                <option value="processing" \${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                                                <option value="shipped" \${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                                                <option value="completed" \${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                                                                <option value="cancelled" \${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                                            </select>
                                                        </p>
                                                        <p><strong>Total Amount:</strong> \${order.total}</p>
                                                        <p><strong>Order Date:</strong> \${formatDate(order.created_at)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            \`;
                            
                            const modalContainer = document.createElement('div');
                            modalContainer.innerHTML = modalHtml;
                            document.body.appendChild(modalContainer);
                            
                            const modal = new bootstrap.Modal(document.getElementById('orderModal'));
                            modal.show();
                            
                            document.getElementById('orderModal').addEventListener('hidden.bs.modal', function () {
                                modalContainer.remove();
                            });
                            
                        } catch (error) {
                            showToast('Error loading order details', 'error');
                        }
                    }
                    
                    // Update order status
                    async function updateOrderStatus(orderId, status) {
                        try {
                            const response = await fetch('/admin/api/update-order-status', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({orderId, status})
                            });
                            
                            if (response.ok) {
                                showToast('Order status updated', 'success');
                                setTimeout(() => location.reload(), 1000);
                            }
                        } catch (error) {
                            showToast('Error updating status', 'error');
                        }
                    }
                    
                    // Delete order
                    async function deleteOrder(orderId) {
                        if (confirm('Are you sure you want to delete this order?')) {
                            try {
                                const response = await fetch('/admin/api/delete-order/' + orderId, {
                                    method: 'DELETE'
                                });
                                
                                if (response.ok) {
                                    showToast('Order deleted successfully', 'success');
                                    setTimeout(() => location.reload(), 1000);
                                }
                            } catch (error) {
                                showToast('Error deleting order', 'error');
                            }
                        }
                    }
                    
                    // Bulk actions
                    function toggleSelectAll() {
                        const checkboxes = document.querySelectorAll('.order-checkbox');
                        const selectAll = document.getElementById('selectAll').checked;
                        checkboxes.forEach(cb => cb.checked = selectAll);
                    }
                    
                    function getSelectedOrders() {
                        const checkboxes = document.querySelectorAll('.order-checkbox:checked');
                        return Array.from(checkboxes).map(cb => cb.value);
                    }
                    
                    async function applyBulkAction() {
                        const action = document.getElementById('bulkAction').value;
                        const selectedOrders = getSelectedOrders();
                        
                        if (selectedOrders.length === 0) {
                            showToast('Please select at least one order', 'warning');
                            return;
                        }
                        
                        if (action.startsWith('status:')) {
                            const status = action.split(':')[1];
                            if (confirm(\`Change status of \${selectedOrders.length} order(s) to \${status}?\`)) {
                                try {
                                    const response = await fetch('/admin/api/bulk-update-status', {
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({orderIds: selectedOrders, status})
                                    });
                                    
                                    if (response.ok) {
                                        showToast(\`\${selectedOrders.length} order(s) updated\`, 'success');
                                        setTimeout(() => location.reload(), 1000);
                                    }
                                } catch (error) {
                                    showToast('Error updating orders', 'error');
                                }
                            }
                        } else if (action === 'delete') {
                            if (confirm(\`Delete \${selectedOrders.length} order(s)? This cannot be undone.\`)) {
                                try {
                                    const response = await fetch('/admin/api/bulk-delete', {
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({orderIds: selectedOrders})
                                    });
                                    
                                    if (response.ok) {
                                        showToast(\`\${selectedOrders.length} order(s) deleted\`, 'success');
                                        setTimeout(() => location.reload(), 1000);
                                    }
                                } catch (error) {
                                    showToast('Error deleting orders', 'error');
                                }
                            }
                        } else if (action === 'export') {
                            const ids = selectedOrders.join(',');
                            window.open(\`/admin/export/selected?ids=\${ids}\`, '_blank');
                        }
                    }
                    
                    function searchOrders() {
                        const query = document.getElementById('searchInput').value;
                        if (query.trim()) {
                            window.location.href = '/admin/orders/search?q=' + encodeURIComponent(query);
                        }
                    }
                    
                    function refreshOrders() {
                        location.reload();
                    }
                    
                    function exportOrders() {
                        window.location.href = '/admin/export/orders';
                    }
                </script>`;
            
            res.send(generateHTML('Order Management', content));
        });
    });
});

// API Endpoints for Admin
app.get('/admin/api/dashboard-stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    db.get("SELECT COUNT(*) as totalOrders FROM orders", (err, result1) => {
        db.get("SELECT SUM(total) as totalRevenue FROM orders WHERE status = 'completed'", (err, result2) => {
            db.get("SELECT COUNT(*) as pendingOrders FROM orders WHERE status = 'pending'", (err, result3) => {
                db.get("SELECT COUNT(*) as todayOrders FROM orders WHERE DATE(created_at) = ?", [today], (err, result4) => {
                    db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5", (err, recentOrders) => {
                        res.json({
                            totalOrders: result1.totalOrders || 0,
                            totalRevenue: formatPrice(result2.totalRevenue || 0),
                            pendingOrders: result3.pendingOrders || 0,
                            todayOrders: result4.todayOrders || 0,
                            recentOrders: recentOrders.map(order => ({
                                ...order,
                                total: formatPrice(order.total)
                            }))
                        });
                    });
                });
            });
        });
    });
});

app.get('/admin/api/order-details/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
        if (order) {
            order.total = formatPrice(order.total);
            res.json(order);
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    });
});

app.post('/admin/api/update-order-status', (req, res) => {
    const { orderId, status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.post('/admin/api/bulk-update-status', (req, res) => {
    const { orderIds, status } = req.body;
    const placeholders = orderIds.map(() => '?').join(',');
    
    db.run(`UPDATE orders SET status = ? WHERE id IN (${placeholders})`, [status, ...orderIds], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true, updated: this.changes });
        }
    });
});

app.delete('/admin/api/delete-order/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM orders WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.post('/admin/api/bulk-delete', (req, res) => {
    const { orderIds } = req.body;
    const placeholders = orderIds.map(() => '?').join(',');
    
    db.run(`DELETE FROM orders WHERE id IN (${placeholders})`, orderIds, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true, deleted: this.changes });
        }
    });
});

// Export routes
app.get('/admin/export/orders', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let csv = 'Order ID,Customer Name,Phone,Address,Shipping Area,Quantity,Total,Status,Order Date\n';
        
        orders.forEach(order => {
            csv += `#DM${order.id},"${order.customer_name}","${order.phone}","${order.address}","${order.shipping_area}","${order.quantity}","${formatPrice(order.total)}","${order.status}","${new Date(order.created_at).toLocaleString()}"\n`;
        });
        
        res.header('Content-Type', 'text/csv');
        res.attachment(`orders_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    });
});

app.get('/admin/export/all', (req, res) => {
    db.all(`SELECT 
                o.*,
                p.name as product_name,
                p.description as product_description
            FROM orders o
            CROSS JOIN products p`, (err, rows) => {
        let csv = 'Order ID,Customer Name,Phone,Address,Shipping Area,Quantity,Total,Status,Order Date,Product Name,Product Description\n';
        
        rows.forEach(row => {
            csv += `#DM${row.id},"${row.customer_name}","${row.phone}","${row.address}","${row.shipping_area}","${row.quantity}","${formatPrice(row.total)}","${row.status}","${new Date(row.created_at).toLocaleString()}","${row.product_name}","${row.product_description}"\n`;
        });
        
        res.header('Content-Type', 'text/csv');
        res.attachment(`complete_data_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    });
});

// Other admin pages (simplified)
app.get('/admin/products', (req, res) => {
    db.get("SELECT * FROM products WHERE id = 1", (err, product) => {
        let content = `
            <nav class="sidebar">
                <div class="position-sticky pt-3">
                    <div class="p-3">
                        <h5 class="text-center mb-4">
                            <i class="fas fa-store"></i> Admin Panel
                        </h5>
                    </div>
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link" href="/admin/dashboard">
                                <i class="fas fa-tachometer-alt"></i> Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/admin/orders">
                                <i class="fas fa-shopping-cart"></i> Orders
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link active" href="/admin/products">
                                <i class="fas fa-box"></i> Products
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/admin/customers">
                                <i class="fas fa-users"></i> Customers
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>

            <div class="main-content">
                <nav class="navbar navbar-expand navbar-light bg-white shadow-sm mb-4">
                    <div class="container-fluid">
                        <h4 class="mb-0">Product Management</h4>
                    </div>
                </nav>

                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Current Product</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h3>${product.name}</h3>
                                <p><strong>Regular Price:</strong> ${formatPrice(product.price)}</p>
                                <p><strong>Offer Price:</strong> ${formatPrice(product.offer_price)}</p>
                                <p><strong>Description:</strong> ${product.description}</p>
                                <button class="btn btn-primary" onclick="editProduct()">
                                    <i class="fas fa-edit"></i> Edit Product
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                function editProduct() {
                    alert('Product editing feature would be implemented here');
                }
            </script>`;
        
        res.send(generateHTML('Product Management', content));
    });
});

app.get('/admin/customers', (req, res) => {
    db.all("SELECT DISTINCT customer_name, phone, address, COUNT(*) as order_count, SUM(total) as total_spent FROM orders GROUP BY phone ORDER BY MAX(created_at) DESC", (err, customers) => {
        let content = `
            <nav class="sidebar">
                <div class="position-sticky pt-3">
                    <div class="p-3">
                        <h5 class="text-center mb-4">
                            <i class="fas fa-store"></i> Admin Panel
                        </h5>
                    </div>
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link" href="/admin/dashboard">
                                <i class="fas fa-tachometer-alt"></i> Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/admin/orders">
                                <i class="fas fa-shopping-cart"></i> Orders
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/admin/products">
                                <i class="fas fa-box"></i> Products
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link active" href="/admin/customers">
                                <i class="fas fa-users"></i> Customers
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>

            <div class="main-content">
                <nav class="navbar navbar-expand navbar-light bg-white shadow-sm mb-4">
                    <div class="container-fluid">
                        <h4 class="mb-0">Customer Management (${customers.length} customers)</h4>
                    </div>
                </nav>

                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Customer Name</th>
                                        <th>Phone</th>
                                        <th>Address</th>
                                        <th>Orders</th>
                                        <th>Total Spent</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>`;
        
        customers.forEach(customer => {
            content += `
                <tr>
                    <td>${customer.customer_name}</td>
                    <td>${customer.phone}</td>
                    <td>${customer.address.substring(0, 30)}...</td>
                    <td>${customer.order_count}</td>
                    <td>${formatPrice(customer.total_spent)}</td>
                    <td>
                        <a href="https://wa.me/88${customer.phone.replace(/[^0-9]/g, '')}" 
                           target="_blank" class="btn btn-sm btn-success">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                        <button class="btn btn-sm btn-info" onclick="viewCustomerDetails('${customer.phone}')">
                            <i class="fas fa-eye"></i>
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
                function viewCustomerDetails(phone) {
                    window.location.href = '/admin/orders?search=' + phone;
                }
            </script>`;
        
        res.send(generateHTML('Customer Management', content));
    });
});

app.listen(PORT, () => {
    console.log(`
    ┌─────────────────────────────────────────────────────────┐
    │       Dhaka Market - Complete E-commerce System        │
    │       Server: http://localhost:${PORT}                     │
    │       Admin: http://localhost:${PORT}/admin-login          │
    │       Dashboard: http://localhost:${PORT}/admin/dashboard  │
    │                                                         │
    │       🚀 Features:                                      │
    │       • Complete Admin Dashboard                        │
    │       • Order Management (WooCommerce style)            │
    │       • Customer Management                             │
    │       • Product Management                              │
    │       • Bulk Actions                                    │
    │       • CSV Export                                      │
    │       • WhatsApp Integration                            │
    │       • Real-time Status Updates                        │
    │       • Responsive Design                               │
    │       • SweetAlert2 Notifications                       │
    └─────────────────────────────────────────────────────────┘
    `);
});
