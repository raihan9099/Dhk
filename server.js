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
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        phone TEXT,
        address TEXT,
        product_id INTEGER,
        quantity INTEGER,
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
    
    const products = [
        ['Wireless Earbuds', 2500, 1999, '["https://images.unsplash.com/photo-1590658165737-15a047b8b5e8?w=600&h=600","https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=600","https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&h=600"]', 'Premium wireless earbuds with noise cancellation', 'Electronics'],
        ['Smart Watch', 4500, 3499, '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600","https://images.unsplash.com/photo-1434493650001-5d43a6fea0a7?w=600&h=600"]', 'Smart watch with fitness tracking', 'Electronics'],
        ['T-Shirt', 800, 599, '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600","https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&h=600"]', 'Cotton t-shirt', 'Fashion'],
        ['Sneakers', 3500, 2799, '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600","https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&h=600"]', 'Comfortable sneakers', 'Fashion']
    ];
    
    const stmt = db.prepare("INSERT INTO products (name, price, offer_price, images, description, category) VALUES (?, ?, ?, ?, ?, ?)");
    products.forEach(p => stmt.run(p));
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
        body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
        .product-card { transition: all 0.3s; border-radius: 15px; overflow: hidden; }
        .product-card:hover { transform: translateY(-10px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .old-price { text-decoration: line-through; color: #888; font-size: 0.9em; }
        .offer-price { color: #dc3545; font-weight: bold; font-size: 1.2em; }
        .discount-badge { background: #dc3545; color: white; padding: 3px 10px; border-radius: 20px; font-size: 0.8em; }
        .swiper-slide img { width: 100%; height: 400px; object-fit: cover; }
        .description-box { max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 10px; }
        .live-order { position: fixed; bottom: 20px; right: 20px; z-index: 1000; animation: slideIn 0.5s; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .admin-table { font-size: 0.9em; }
        .admin-table th { background: #2c3e50; color: white; }
        .status-pending { background: #ffc107; color: #000; padding: 3px 10px; border-radius: 5px; }
        .status-completed { background: #28a745; color: white; padding: 3px 10px; border-radius: 5px; }
        .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .footer { background: #2c3e50; color: white; }
        .order-now-btn { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border: none; }
        .order-now-btn:hover { transform: scale(1.05); }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark sticky-top">
        <div class="container">
            <a class="navbar-brand" href="/"><i class="fas fa-store"></i> Dhaka Market</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item"><a class="nav-link" href="/"><i class="fas fa-home"></i> Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="/products"><i class="fas fa-box"></i> Products</a></li>
                    <li class="nav-item"><a class="nav-link" href="/orders"><i class="fas fa-shopping-cart"></i> My Orders</a></li>
                    <li class="nav-item"><a class="nav-link" href="/admin-login"><i class="fas fa-user-shield"></i> Admin</a></li>
                </ul>
                <div class="d-flex">
                    <span id="cartCount" class="badge bg-danger rounded-pill">0</span>
                </div>
            </div>
        </div>
    </nav>
    ${content}
    <footer class="footer mt-5 py-4">
        <div class="container text-center">
            <p>&copy; 2024 Dhaka Market. All rights reserved.</p>
            <p>Phone: +880 1234-567890 | Email: info@dhakamarket.com</p>
        </div>
    </footer>
    <div id="liveOrderNotification" class="live-order alert alert-success alert-dismissible fade show d-none" style="max-width: 300px;">
        <button type="button" class="btn-close" onclick="hideLiveOrder()"></button>
        <h6><i class="fas fa-bell"></i> New Order!</h6>
        <p id="liveOrderText" class="mb-0"></p>
        <small class="text-muted">Just now</small>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js"></script>
    <script>
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        function updateCartCount() {
            document.getElementById('cartCount').textContent = cart.length;
        }
        function addToCart(productId, name, price) {
            cart.push({id: productId, name: name, price: price, quantity: 1});
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            alert(name + ' added to cart!');
        }
        function showLiveOrder(name, product) {
            document.getElementById('liveOrderText').textContent = name + ' ordered ' + product;
            document.getElementById('liveOrderNotification').classList.remove('d-none');
            setTimeout(() => {
                document.getElementById('liveOrderNotification').classList.add('d-none');
            }, 5000);
        }
        function hideLiveOrder() {
            document.getElementById('liveOrderNotification').classList.add('d-none');
        }
        document.addEventListener('DOMContentLoaded', updateCartCount);
        
        if (window.location.pathname === '/') {
            setTimeout(() => {
                const names = ['Rahim', 'Karim', 'Sadia', 'Nusrat'];
                const products = ['Wireless Earbuds', 'Smart Watch', 'T-Shirt', 'Sneakers'];
                const name = names[Math.floor(Math.random() * names.length)];
                const product = products[Math.floor(Math.random() * products.length)];
                showLiveOrder(name, product);
            }, 3000);
        }
        
        if (document.querySelector('.mySwiper')) {
            new Swiper('.mySwiper', {
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                autoplay: { delay: 3000 },
                loop: true
            });
        }
    </script>
</body>
</html>`;
}

app.get('/', (req, res) => {
    db.all("SELECT * FROM products", (err, products) => {
        let content = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-12 mb-4">
                        <div class="swiper mySwiper">
                            <div class="swiper-wrapper">`;
        
        const images = [
            'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop',
            'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
            'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop'
        ];
        
        images.forEach(img => {
            content += `<div class="swiper-slide"><img src="${img}" class="img-fluid rounded" style="height: 400px; width: 100%; object-fit: cover;"></div>`;
        });
        
        content += `</div>
                            <div class="swiper-pagination"></div>
                            <div class="swiper-button-next"></div>
                            <div class="swiper-button-prev"></div>
                        </div>
                    </div>
                    
                    <div class="col-12">
                        <h2 class="mb-4 text-center">Featured Products</h2>
                        <div class="row">`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            const discount = Math.round(((product.price - product.offer_price) / product.price) * 100);
            
            content += `
                <div class="col-md-3 mb-4">
                    <div class="card product-card h-100">
                        <div class="swiper productSwiper">
                            <div class="swiper-wrapper">`;
            
            images.forEach(img => {
                content += `<div class="swiper-slide"><img src="${img}" class="card-img-top" style="height: 200px; object-fit: cover;"></div>`;
            });
            
            content += `</div>
                            <div class="swiper-pagination"></div>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">
                                <span class="old-price me-2">${formatPrice(product.price)}</span>
                                <span class="offer-price">${formatPrice(product.offer_price)}</span>
                                <span class="discount-badge ms-2">${discount}% OFF</span>
                            </p>
                            <div class="description-box mb-3">
                                <small>${product.description}</small>
                            </div>
                            <div class="d-grid gap-2">
                                <button onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.offer_price})" 
                                        class="btn btn-primary">
                                    <i class="fas fa-cart-plus"></i> Add to Cart
                                </button>
                                <a href="/product/${product.id}" class="btn btn-outline-primary">View Details</a>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        
        content += `</div></div></div></div>`;
        res.send(generateHTML('Home', content));
    });
});

app.get('/product/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, product) => {
        if (!product) {
            res.status(404).send('Product not found');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const discount = Math.round(((product.price - product.offer_price) / product.price) * 100);
        
        let content = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-md-6">
                        <div class="swiper productSwiper">
                            <div class="swiper-wrapper">`;
        
        images.forEach(img => {
            content += `<div class="swiper-slide"><img src="${img}" class="img-fluid rounded" style="height: 400px; object-fit: contain;"></div>`;
        });
        
        content += `</div>
                            <div class="swiper-pagination"></div>
                            <div class="swiper-button-next"></div>
                            <div class="swiper-button-prev"></div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h1 class="mb-3">${product.name}</h1>
                        <div class="mb-3">
                            <span class="old-price fs-5">${formatPrice(product.price)}</span>
                            <span class="offer-price fs-3 ms-3">${formatPrice(product.offer_price)}</span>
                            <span class="discount-badge fs-6 ms-3">${discount}% OFF</span>
                        </div>
                        <div class="description-box mb-4">
                            <p>${product.description}</p>
                            <ul>
                                <li>✅ High Quality Material</li>
                                <li>✅ 1 Year Warranty</li>
                                <li>✅ Cash on Delivery Available</li>
                                <li>✅ Free Shipping over ৳2000</li>
                            </ul>
                        </div>
                        
                        <form action="/checkout/${product.id}" method="POST" class="border p-4 rounded bg-light">
                            <h4 class="mb-3">Order Now</h4>
                            <div class="mb-3">
                                <label class="form-label">Quantity</label>
                                <input type="number" name="quantity" class="form-control" value="1" min="1" max="10">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Your Name</label>
                                <input type="text" name="customer_name" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Phone Number</label>
                                <input type="tel" name="phone" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Shipping Address</label>
                                <textarea name="address" class="form-control" rows="3" required></textarea>
                            </div>
                            <button type="submit" class="btn order-now-btn btn-lg w-100 text-white">
                                <i class="fas fa-bolt"></i> ORDER NOW - ${formatPrice(product.offer_price)}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            <script>
                new Swiper('.productSwiper', {
                    pagination: { el: '.swiper-pagination', clickable: true },
                    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                    autoplay: { delay: 3000 },
                    loop: true
                });
            </script>`;
        
        res.send(generateHTML(product.name, content));
    });
});

app.post('/checkout/:id', (req, res) => {
    const productId = req.params.id;
    const { customer_name, phone, address, quantity } = req.body;
    
    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
        if (!product) {
            res.status(404).send('Product not found');
            return;
        }
        
        const total = product.offer_price * parseInt(quantity || 1);
        
        db.run("INSERT INTO orders (customer_name, phone, address, product_id, quantity, total) VALUES (?, ?, ?, ?, ?, ?)",
            [customer_name, phone, address, productId, quantity, total], 
            function(err) {
                if (err) {
                    res.send('Error placing order');
                } else {
                    const orderId = this.lastID;
                    let content = `
                        <div class="container text-center mt-5">
                            <div class="card shadow mx-auto" style="max-width: 500px;">
                                <div class="card-body p-5">
                                    <i class="fas fa-check-circle text-success fa-5x mb-4"></i>
                                    <h2 class="card-title mb-3">Order Confirmed!</h2>
                                    <p class="card-text mb-4">Thank you ${customer_name} for your order.</p>
                                    <div class="bg-light p-4 rounded mb-4">
                                        <p><strong>Order ID:</strong> #DM${orderId}</p>
                                        <p><strong>Product:</strong> ${product.name}</p>
                                        <p><strong>Quantity:</strong> ${quantity}</p>
                                        <p><strong>Total Amount:</strong> ${formatPrice(total)}</p>
                                        <p><strong>Status:</strong> <span class="status-pending">Pending</span></p>
                                    </div>
                                    <a href="/" class="btn btn-primary">Continue Shopping</a>
                                </div>
                            </div>
                        </div>`;
                    res.send(generateHTML('Order Confirmation', content));
                }
            }
        );
    });
});

app.get('/orders', (req, res) => {
    db.all("SELECT orders.*, products.name as product_name FROM orders JOIN products ON orders.product_id = products.id ORDER BY created_at DESC", 
        (err, orders) => {
            let content = `
                <div class="container mt-4">
                    <h2 class="mb-4">My Orders</h2>`;
            
            if (orders.length === 0) {
                content += `<div class="alert alert-info">No orders found.</div>`;
            } else {
                content += `<div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Product</th>
                                            <th>Customer</th>
                                            <th>Phone</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>`;
                
                orders.forEach(order => {
                    const date = new Date(order.created_at).toLocaleDateString();
                    content += `
                        <tr>
                            <td>#DM${order.id}</td>
                            <td>${order.product_name}</td>
                            <td>${order.customer_name}</td>
                            <td>${order.phone}</td>
                            <td>${formatPrice(order.total)}</td>
                            <td><span class="${order.status === 'completed' ? 'status-completed' : 'status-pending'}">${order.status}</span></td>
                            <td>${date}</td>
                        </tr>`;
                });
                
                content += `</tbody></table></div>`;
            }
            
            content += `</div>`;
            res.send(generateHTML('My Orders', content));
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
                            <h3 class="card-title text-center mb-4"><i class="fas fa-user-shield"></i> Admin Login</h3>
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
    db.all("SELECT orders.*, products.name as product_name FROM orders JOIN products ON orders.product_id = products.id ORDER BY created_at DESC", 
        (err, orders) => {
            db.all("SELECT * FROM products", (err, products) => {
                let content = `
                    <div class="container-fluid mt-3">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="card mb-3">
                                    <div class="card-body text-center">
                                        <h5>Total Orders</h5>
                                        <h2>${orders.length}</h2>
                                    </div>
                                </div>
                                <div class="card mb-3">
                                    <div class="card-body text-center">
                                        <h5>Total Products</h5>
                                        <h2>${products.length}</h2>
                                    </div>
                                </div>
                                <div class="card">
                                    <div class="card-body">
                                        <h5>Quick Actions</h5>
                                        <a href="/admin/add-product" class="btn btn-success btn-sm w-100 mb-2">Add Product</a>
                                        <a href="/admin/products" class="btn btn-info btn-sm w-100 mb-2">Manage Products</a>
                                        <a href="/" class="btn btn-warning btn-sm w-100">View Store</a>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-9">
                                <h3>Recent Orders</h3>
                                <div class="table-responsive admin-table">
                                    <table class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Order ID</th>
                                                <th>Customer</th>
                                                <th>Product</th>
                                                <th>Qty</th>
                                                <th>Amount</th>
                                                <th>Phone</th>
                                                <th>Address</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>`;
                
                orders.forEach(order => {
                    const date = new Date(order.created_at).toLocaleString();
                    content += `
                        <tr>
                            <td>#DM${order.id}</td>
                            <td>${order.customer_name}</td>
                            <td>${order.product_name}</td>
                            <td>${order.quantity}</td>
                            <td>${formatPrice(order.total)}</td>
                            <td>${order.phone}</td>
                            <td><small>${order.address}</small></td>
                            <td>
                                <select class="form-select form-select-sm" onchange="updateOrderStatus(${order.id}, this.value)">
                                    <option ${order.status === 'pending' ? 'selected' : ''}>pending</option>
                                    <option ${order.status === 'processing' ? 'selected' : ''}>processing</option>
                                    <option ${order.status === 'shipped' ? 'selected' : ''}>shipped</option>
                                    <option ${order.status === 'completed' ? 'selected' : ''}>completed</option>
                                    <option ${order.status === 'cancelled' ? 'selected' : ''}>cancelled</option>
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
                        function updateOrderStatus(orderId, status) {
                            fetch('/admin/update-order-status', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({orderId: orderId, status: status})
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
        }
    );
});

app.get('/admin/products', (req, res) => {
    db.all("SELECT * FROM products", (err, products) => {
        let content = `
            <div class="container mt-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2>Manage Products</h2>
                    <a href="/admin/add-product" class="btn btn-success">+ Add New Product</a>
                </div>
                <div class="row">`;
        
        products.forEach(product => {
            const images = JSON.parse(product.images || '[]');
            content += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <img src="${images[0] || 'https://via.placeholder.com/300x200'}" class="card-img-top" style="height: 200px; object-fit: cover;">
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">
                                <span class="badge bg-primary">${product.category}</span>
                                <br>
                                <span class="text-danger">${formatPrice(product.offer_price)}</span>
                                <span class="text-muted"><del>${formatPrice(product.price)}</del></span>
                            </p>
                            <div class="d-grid gap-2">
                                <a href="/admin/edit-product/${product.id}" class="btn btn-warning btn-sm">Edit</a>
                                <button onclick="deleteProduct(${product.id})" class="btn btn-danger btn-sm">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        
        content += `
                </div>
            </div>
            <script>
                function deleteProduct(id) {
                    if(confirm('Delete this product?')) {
                        fetch('/admin/delete-product/' + id, {method: 'DELETE'})
                            .then(() => location.reload());
                    }
                }
            </script>`;
        
        res.send(generateHTML('Manage Products', content));
    });
});

app.get('/admin/add-product', (req, res) => {
    let content = `
        <div class="container mt-4">
            <h2 class="mb-4">Add New Product</h2>
            <div class="card">
                <div class="card-body">
                    <form action="/admin/add-product" method="POST">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Product Name</label>
                                <input type="text" name="name" class="form-control" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Category</label>
                                <input type="text" name="category" class="form-control" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Original Price (৳)</label>
                                <input type="number" name="price" class="form-control" step="0.01" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Offer Price (৳)</label>
                                <input type="number" name="offer_price" class="form-control" step="0.01" required>
                            </div>
                            <div class="col-12 mb-3">
                                <label class="form-label">Image URLs (JSON array)</label>
                                <textarea name="images" class="form-control" rows="3" required>["https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&h=600"]</textarea>
                                <small class="text-muted">Enter as JSON array: ["url1", "url2", "url3"]</small>
                            </div>
                            <div class="col-12 mb-3">
                                <label class="form-label">Description</label>
                                <textarea name="description" class="form-control" rows="5" required></textarea>
                            </div>
                            <div class="col-12">
                                <button type="submit" class="btn btn-primary">Add Product</button>
                                <a href="/admin/products" class="btn btn-secondary">Cancel</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
    res.send(generateHTML('Add Product', content));
});

app.post('/admin/add-product', (req, res) => {
    const { name, price, offer_price, images, description, category } = req.body;
    
    db.run("INSERT INTO products (name, price, offer_price, images, description, category) VALUES (?, ?, ?, ?, ?, ?)",
        [name, parseFloat(price), parseFloat(offer_price), images, description, category],
        function(err) {
            if (err) {
                res.send('Error adding product');
            } else {
                res.redirect('/admin/products');
            }
        }
    );
});

app.post('/admin/update-order-status', (req, res) => {
    const { orderId, status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
    res.json({ success: true });
});

app.delete('/admin/delete-order/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM orders WHERE id = ?", [id]);
    res.json({ success: true });
});

app.delete('/admin/delete-product/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM products WHERE id = ?", [id]);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`
    ┌────────────────────────────────────────────┐
    │    Dhaka Market E-Commerce System          │
    │    Server: http://localhost:${PORT}          │
    │    Admin: http://localhost:${PORT}/admin-login │
    │    Features:                               │
    │    • Product Catalog                       │
    │    • Image Slider (3+ images)              │
    │    • Order Now Button                      │
    │    • Live Order Notification               │
    │    • Full Checkout System                  │
    │    • Admin Panel                           │
    │    • Order Management                      │
    │    • Product Management                    │
    │    • Real-time Updates                     │
    └────────────────────────────────────────────┘
    `);
});
