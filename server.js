const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new sqlite3.Database(':memory:');

// Website configuration
const website_data = {
    name: 'Dhaka Market',
    phone: '+880 1234-567890',
    email: 'info@dhakamarket.com',
    address: '123 Market Street, Dhaka',
    'currency-symbol': '৳',
    facebook: '#',
    youtube: '#',
    instagram: '#'
};

// Initialize database tables
function initDatabase() {
    db.serialize(() => {
        // Products table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT,
            price DECIMAL(10,2),
            p_price DECIMAL(10,2),
            thumb TEXT,
            images TEXT,
            description TEXT,
            status TEXT DEFAULT 'stock',
            category_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Categories table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT,
            parent_id INTEGER DEFAULT 0,
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Orders table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            customer_phone TEXT,
            customer_address TEXT,
            products TEXT,
            total_amount DECIMAL(10,2),
            status TEXT DEFAULT 'pending',
            tracking TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Insert sample data
        db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
            if (row.count === 0) {
                const categories = [
                    ['Electronics', 'electronics', 0],
                    ['Mobile Phones', 'mobile-phones', 1],
                    ['Clothing', 'clothing', 0],
                    ['Home Appliances', 'home-appliances', 0]
                ];
                
                const insertCategory = db.prepare("INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)");
                categories.forEach(cat => insertCategory.run(cat));
                insertCategory.finalize();

                const products = [
                    ['Smartphone X', 'smartphone-x', 25000, 22000, 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop', 2],
                    ['LED TV 32"', 'led-tv-32', 18000, 16000, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop', 4],
                    ['Men\'s T-Shirt', 'mens-t-shirt', 800, 600, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', 3],
                    ['Laptop Pro', 'laptop-pro', 65000, 60000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w-400&h=400&fit=crop', 1]
                ];

                const insertProduct = db.prepare("INSERT INTO products (name, slug, price, p_price, thumb, category_id) VALUES (?, ?, ?, ?, ?, ?)");
                products.forEach(prod => insertProduct.run(prod));
                insertProduct.finalize();
            }
        });
    });
}

// Helper function to format price
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// HTML Template Engine
function renderHTML(title, content) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - ${website_data.name}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        <style>
            body { font-family: 'Segoe UI', sans-serif; }
            .product-card { transition: transform 0.3s; }
            .product-card:hover { transform: translateY(-5px); }
            .old-price { text-decoration: line-through; color: #999; }
            .save-badge { background: #dc3545; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
            .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .footer { background: #2c3e50; color: white; padding: 40px 0; margin-top: 50px; }
        </style>
    </head>
    <body>
        <!-- Header -->
        <nav class="navbar navbar-expand-lg navbar-dark">
            <div class="container">
                <a class="navbar-brand" href="/">
                    <i class="fas fa-store"></i> ${website_data.name}
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                        <li class="nav-item"><a class="nav-link" href="/categories">Categories</a></li>
                        <li class="nav-item"><a class="nav-link" href="/products">Products</a></li>
                        <li class="nav-item"><a class="nav-link" href="/checkout">Checkout</a></li>
                    </ul>
                    <form class="d-flex" action="/search" method="GET">
                        <input class="form-control me-2" type="search" name="q" placeholder="Search products...">
                        <button class="btn btn-light" type="submit">Search</button>
                    </form>
                    <a href="/cart" class="btn btn-outline-light ms-3">
                        <i class="fas fa-shopping-cart"></i> Cart
                    </a>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="container mt-4">
            ${content}
        </div>

        <!-- Footer -->
        <footer class="footer">
            <div class="container">
                <div class="row">
                    <div class="col-md-4">
                        <h5>${website_data.name}</h5>
                        <p>${website_data.address}</p>
                        <p>Phone: ${website_data.phone}</p>
                        <p>Email: ${website_data.email}</p>
                    </div>
                    <div class="col-md-4">
                        <h5>Quick Links</h5>
                        <ul class="list-unstyled">
                            <li><a href="/" class="text-light">Home</a></li>
                            <li><a href="/products" class="text-light">Products</a></li>
                            <li><a href="/about" class="text-light">About Us</a></li>
                            <li><a href="/contact" class="text-light">Contact</a></li>
                        </ul>
                    </div>
                    <div class="col-md-4">
                        <h5>Connect With Us</h5>
                        <a href="${website_data.facebook}" class="text-light me-3"><i class="fab fa-facebook fa-2x"></i></a>
                        <a href="${website_data.youtube}" class="text-light me-3"><i class="fab fa-youtube fa-2x"></i></a>
                        <a href="${website_data.instagram}" class="text-light"><i class="fab fa-instagram fa-2x"></i></a>
                    </div>
                </div>
                <hr class="bg-light">
                <div class="text-center">
                    <p>&copy; 2024 ${website_data.name}. All rights reserved.</p>
                </div>
            </div>
        </footer>

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
        <script>
            // Add to cart functionality
            function addToCart(productId, productName, price) {
                let cart = JSON.parse(localStorage.getItem('cart')) || [];
                const existing = cart.find(item => item.id === productId);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    cart.push({ id: productId, name: productName, price: price, quantity: 1 });
                }
                localStorage.setItem('cart', JSON.stringify(cart));
                alert(productName + ' added to cart!');
                updateCartCount();
            }

            function updateCartCount() {
                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                const count = cart.reduce((total, item) => total + item.quantity, 0);
                document.querySelector('.cart-count').textContent = count;
            }

            // Initialize on page load
            document.addEventListener('DOMContentLoaded', updateCartCount);
        </script>
    </body>
    </html>`;
}

// Routes
app.get('/', (req, res) => {
    db.all("SELECT * FROM products LIMIT 12", (err, products) => {
        let content = `
            <div class="row">
                <div class="col-12 text-center mb-4">
                    <h1 class="display-4">Welcome to ${website_data.name}</h1>
                    <p class="lead">Best online shopping platform in Bangladesh</p>
                </div>
        `;

        products.forEach(product => {
            const discount = product.p_price ? Math.round(((product.price - product.p_price) / product.price) * 100) : 0;
            content += `
                <div class="col-md-3 mb-4">
                    <div class="card product-card h-100">
                        <img src="${product.thumb || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'}" 
                             class="card-img-top" alt="${product.name}" style="height: 200px; object-fit: cover;">
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            ${product.p_price ? `
                                <p class="card-text">
                                    <span class="old-price">${website_data['currency-symbol']} ${formatNumber(product.price)}</span>
                                    <span class="fs-4 text-danger ms-2">${website_data['currency-symbol']} ${formatNumber(product.p_price)}</span>
                                    <span class="save-badge ms-2">Save ${discount}%</span>
                                </p>
                            ` : `
                                <p class="card-text fs-4">${website_data['currency-symbol']} ${formatNumber(product.price)}</p>
                            `}
                            <button onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.p_price || product.price})" 
                                    class="btn btn-primary w-100">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                            <a href="/product/${product.slug}" class="btn btn-outline-secondary w-100 mt-2">View Details</a>
                        </div>
                    </div>
                </div>
            `;
        });

        content += `
            </div>
            <div class="row mt-5">
                <div class="col-md-4">
                    <div class="card text-center p-4">
                        <i class="fas fa-shipping-fast fa-3x text-primary mb-3"></i>
                        <h5>Free Shipping</h5>
                        <p>On orders over ${website_data['currency-symbol']} 5,000</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center p-4">
                        <i class="fas fa-shield-alt fa-3x text-success mb-3"></i>
                        <h5>Secure Payment</h5>
                        <p>100% secure payment</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center p-4">
                        <i class="fas fa-headset fa-3x text-warning mb-3"></i>
                        <h5>24/7 Support</h5>
                        <p>Dedicated customer support</p>
                    </div>
                </div>
            </div>
        `;

        res.send(renderHTML('Home', content));
    });
});

app.get('/product/:slug', (req, res) => {
    const { slug } = req.params;
    db.get("SELECT * FROM products WHERE slug = ?", [slug], (err, product) => {
        if (!product) {
            res.status(404).send('Product not found');
            return;
        }

        const images = product.images ? JSON.parse(product.images) : [product.thumb];
        let content = `
            <div class="row">
                <div class="col-md-6">
                    <div id="productCarousel" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner">
        `;

        images.forEach((img, index) => {
            content += `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${img}" class="d-block w-100 rounded" alt="Product Image ${index + 1}" style="height: 400px; object-fit: contain;">
                </div>
            `;
        });

        content += `
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon"></span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon"></span>
                        </button>
                    </div>
                </div>
                <div class="col-md-6">
                    <h1 class="mb-3">${product.name}</h1>
        `;

        if (product.p_price) {
            const discount = Math.round(((product.price - product.p_price) / product.price) * 100);
            content += `
                <h3 class="text-danger">${website_data['currency-symbol']} ${formatNumber(product.p_price)}</h3>
                <p class="text-muted">
                    <span class="old-price">${website_data['currency-symbol']} ${formatNumber(product.price)}</span>
                    <span class="badge bg-danger ms-2">Save ${discount}%</span>
                </p>
            `;
        } else {
            content += `<h3>${website_data['currency-symbol']} ${formatNumber(product.price)}</h3>`;
        }

        content += `
                    <p class="mt-4">${product.description || 'No description available.'}</p>
                    <div class="d-flex align-items-center mb-4">
                        <div class="me-4">
                            <label class="form-label">Quantity:</label>
                            <input type="number" id="quantity" class="form-control" value="1" min="1" style="width: 100px;">
                        </div>
                        <button onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.p_price || product.price})" 
                                class="btn btn-primary btn-lg">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                    <div class="card">
                        <div class="card-body">
                            <h5><i class="fas fa-shipping-fast text-primary"></i> Free Shipping</h5>
                            <p>Delivery in 3-5 business days</p>
                            <h5><i class="fas fa-undo text-success"></i> Easy Returns</h5>
                            <p>30-day return policy</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        res.send(renderHTML(product.name, content));
    });
});

app.get('/categories', (req, res) => {
    db.all("SELECT * FROM categories", (err, categories) => {
        let content = '<h1 class="mb-4">Categories</h1><div class="row">';
        
        categories.forEach(category => {
            content += `
                <div class="col-md-3 mb-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">${category.name}</h5>
                            <a href="/category/${category.slug}" class="btn btn-outline-primary">View Products</a>
                        </div>
                    </div>
                </div>
            `;
        });

        content += '</div>';
        res.send(renderHTML('Categories', content));
    });
});

app.get('/category/:slug', (req, res) => {
    const { slug } = req.params;
    db.get("SELECT * FROM categories WHERE slug = ?", [slug], (err, category) => {
        if (!category) {
            res.status(404).send('Category not found');
            return;
        }

        db.all("SELECT * FROM products WHERE category_id = ?", [category.id], (err, products) => {
            let content = `<h1 class="mb-4">${category.name}</h1><div class="row">`;
            
            products.forEach(product => {
                const discount = product.p_price ? Math.round(((product.price - product.p_price) / product.price) * 100) : 0;
                content += `
                    <div class="col-md-3 mb-4">
                        <div class="card product-card h-100">
                            <img src="${product.thumb}" class="card-img-top" alt="${product.name}" style="height: 200px; object-fit: cover;">
                            <div class="card-body">
                                <h5 class="card-title">${product.name}</h5>
                                ${product.p_price ? `
                                    <p class="card-text">
                                        <span class="old-price">${website_data['currency-symbol']} ${formatNumber(product.price)}</span>
                                        <span class="fs-5 text-danger">${website_data['currency-symbol']} ${formatNumber(product.p_price)}</span>
                                        <span class="badge bg-danger">${discount}% off</span>
                                    </p>
                                ` : `
                                    <p class="card-text fs-5">${website_data['currency-symbol']} ${formatNumber(product.price)}</p>
                                `}
                                <a href="/product/${product.slug}" class="btn btn-primary w-100">View Product</a>
                            </div>
                        </div>
                    </div>
                `;
            });

            content += '</div>';
            res.send(renderHTML(category.name, content));
        });
    });
});

app.get('/checkout', (req, res) => {
    const content = `
        <h1 class="mb-4">Checkout</h1>
        <div class="row">
            <div class="col-md-6">
                <div class="card p-4">
                    <h3 class="mb-4">Billing Details</h3>
                    <form action="/place-order" method="POST">
                        <div class="mb-3">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-control" name="name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Phone Number</label>
                            <input type="tel" class="form-control" name="phone" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Shipping Address</label>
                            <textarea class="form-control" name="address" rows="3" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Payment Method</label>
                            <select class="form-select" name="payment_method">
                                <option value="cod">Cash on Delivery</option>
                                <option value="card">Credit Card</option>
                                <option value="bkash">bKash</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg w-100">Place Order</button>
                    </form>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card p-4">
                    <h3 class="mb-4">Order Summary</h3>
                    <div id="cart-summary">
                        <p class="text-center">Your cart is empty</p>
                    </div>
                </div>
            </div>
        </div>
        <script>
            // Load cart items
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const summary = document.getElementById('cart-summary');
            if (cart.length > 0) {
                let html = '<table class="table"><thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead><tbody>';
                let total = 0;
                cart.forEach(item => {
                    const subtotal = item.price * item.quantity;
                    total += subtotal;
                    html += \`<tr>
                        <td>\${item.name}</td>
                        <td>\${item.quantity}</td>
                        <td>\${formatNumber(subtotal)}</td>
                    </tr>\`;
                });
                html += \`</tbody>
                    <tfoot>
                        <tr>
                            <th colspan="2">Total</th>
                            <th>\${formatNumber(total)}</th>
                        </tr>
                    </tfoot>
                </table>\`;
                summary.innerHTML = html;
            }

            function formatNumber(num) {
                return '${website_data['currency-symbol']} ' + num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
            }
        </script>
    `;

    res.send(renderHTML('Checkout', content));
});

app.post('/place-order', (req, res) => {
    const { name, phone, address, payment_method } = req.body;
    const cart = JSON.parse(req.body.cart || '[]');
    
    if (cart.length === 0) {
        res.redirect('/checkout?error=empty_cart');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tracking = 'DM' + Date.now().toString().slice(-8);

    db.run(
        "INSERT INTO orders (customer_name, customer_phone, customer_address, products, total_amount, tracking) VALUES (?, ?, ?, ?, ?, ?)",
        [name, phone, address, JSON.stringify(cart), total, tracking],
        function(err) {
            if (err) {
                res.redirect('/checkout?error=database');
            } else {
                localStorage.removeItem('cart');
                res.redirect(`/order-confirmation/${tracking}`);
            }
        }
    );
});

app.get('/order-confirmation/:tracking', (req, res) => {
    const { tracking } = req.params;
    
    db.get("SELECT * FROM orders WHERE tracking = ?", [tracking], (err, order) => {
        if (!order) {
            res.status(404).send('Order not found');
            return;
        }

        const content = `
            <div class="text-center">
                <i class="fas fa-check-circle fa-5x text-success mb-4"></i>
                <h1 class="mb-3">Order Confirmed!</h1>
                <p class="lead">Thank you for your order.</p>
                <div class="card p-4 mx-auto" style="max-width: 500px;">
                    <h4>Order Details</h4>
                    <p><strong>Order ID:</strong> ${order.tracking}</p>
                    <p><strong>Customer:</strong> ${order.customer_name}</p>
                    <p><strong>Phone:</strong> ${order.customer_phone}</p>
                    <p><strong>Total:</strong> ${website_data['currency-symbol']} ${formatNumber(order.total_amount)}</p>
                    <p><strong>Status:</strong> <span class="badge bg-warning">${order.status}</span></p>
                </div>
                <div class="mt-4">
                    <a href="/" class="btn btn-primary">Continue Shopping</a>
                    <a href="/track-order/${order.tracking}" class="btn btn-outline-secondary ms-2">Track Order</a>
                </div>
            </div>
        `;

        res.send(renderHTML('Order Confirmation', content));
    });
});

app.get('/search', (req, res) => {
    const query = req.query.q || '';
    
    db.all("SELECT * FROM products WHERE name LIKE ? OR description LIKE ?", 
        [`%${query}%`, `%${query}%`], 
        (err, products) => {
            
        let content = `<h1 class="mb-4">Search Results for "${query}"</h1>`;
        
        if (products.length === 0) {
            content += '<p class="text-center">No products found.</p>';
        } else {
            content += '<div class="row">';
            products.forEach(product => {
                const discount = product.p_price ? Math.round(((product.price - product.p_price) / product.price) * 100) : 0;
                content += `
                    <div class="col-md-3 mb-4">
                        <div class="card h-100">
                            <img src="${product.thumb}" class="card-img-top" alt="${product.name}" style="height: 200px; object-fit: cover;">
                            <div class="card-body">
                                <h5 class="card-title">${product.name}</h5>
                                ${product.p_price ? `
                                    <p class="card-text">
                                        <span class="old-price">${website_data['currency-symbol']} ${formatNumber(product.price)}</span>
                                        <span class="text-danger">${website_data['currency-symbol']} ${formatNumber(product.p_price)}</span>
                                    </p>
                                ` : `
                                    <p>${website_data['currency-symbol']} ${formatNumber(product.price)}</p>
                                `}
                                <a href="/product/${product.slug}" class="btn btn-primary">View Product</a>
                            </div>
                        </div>
                    </div>
                `;
            });
            content += '</div>';
        }

        res.send(renderHTML('Search', content));
    });
});

app.get('/cart', (req, res) => {
    const content = `
        <h1 class="mb-4">Shopping Cart</h1>
        <div id="cart-items">
            <p class="text-center">Loading cart...</p>
        </div>
        <div class="text-center mt-4">
            <a href="/checkout" class="btn btn-primary btn-lg">Proceed to Checkout</a>
            <a href="/" class="btn btn-outline-secondary btn-lg ms-2">Continue Shopping</a>
        </div>
        <script>
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const container = document.getElementById('cart-items');
            
            if (cart.length === 0) {
                container.innerHTML = '<p class="text-center">Your cart is empty.</p>';
            } else {
                let html = '<table class="table"><thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th>Action</th></tr></thead><tbody>';
                let grandTotal = 0;
                
                cart.forEach((item, index) => {
                    const total = item.price * item.quantity;
                    grandTotal += total;
                    html += \`
                        <tr>
                            <td>\${item.name}</td>
                            <td>\${formatNumber(item.price)}</td>
                            <td>
                                <input type="number" value="\${item.quantity}" min="1" 
                                       onchange="updateQuantity(\${index}, this.value)" 
                                       class="form-control" style="width: 80px;">
                            </td>
                            <td>\${formatNumber(total)}</td>
                            <td>
                                <button onclick="removeItem(\${index})" class="btn btn-danger btn-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    \`;
                });
                
                html += \`
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="3">Grand Total</th>
                            <th colspan="2">\${formatNumber(grandTotal)}</th>
                        </tr>
                    </tfoot>
                </table>\`;
                container.innerHTML = html;
            }
            
            function updateQuantity(index, quantity) {
                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                if (cart[index]) {
                    cart[index].quantity = parseInt(quantity);
                    localStorage.setItem('cart', JSON.stringify(cart));
                    location.reload();
                }
            }
            
            function removeItem(index) {
                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                cart.splice(index, 1);
                localStorage.setItem('cart', JSON.stringify(cart));
                location.reload();
            }
            
            function formatNumber(num) {
                return '${website_data['currency-symbol']} ' + num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
            }
        </script>
    `;

    res.send(renderHTML('Shopping Cart', content));
});

// Admin panel
app.get('/admin', (req, res) => {
    const content = `
        <h1 class="mb-4">Admin Dashboard</h1>
        <div class="row">
            <div class="col-md-3">
                <div class="card text-center p-3">
                    <h5>Total Products</h5>
                    <h2 id="productCount">0</h2>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center p-3">
                    <h5>Total Orders</h5>
                    <h2 id="orderCount">0</h2>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center p-3">
                    <h5>Total Revenue</h5>
                    <h2 id="revenue">0</h2>
                </div>
            </div>
        </div>
        
        <div class="mt-4">
            <h3>Quick Actions</h3>
            <a href="/admin/products" class="btn btn-primary">Manage Products</a>
            <a href="/admin/orders" class="btn btn-secondary ms-2">Manage Orders</a>
            <a href="/admin/add-product" class="btn btn-success ms-2">Add New Product</a>
        </div>
        
        <script>
            // Fetch dashboard stats
            fetch('/api/stats')
                .then(res => res.json())
                .then(data => {
                    document.getElementById('productCount').textContent = data.products;
                    document.getElementById('orderCount').textContent = data.orders;
                    document.getElementById('revenue').textContent = '${website_data['currency-symbol']} ' + data.revenue;
                });
        </script>
    `;
    
    res.send(renderHTML('Admin Dashboard', content));
});

// API endpoints
app.get('/api/stats', (req, res) => {
    db.get("SELECT COUNT(*) as products FROM products", (err, prodResult) => {
        db.get("SELECT COUNT(*) as orders FROM orders", (err, orderResult) => {
            db.get("SELECT SUM(total_amount) as revenue FROM orders", (err, revenueResult) => {
                res.json({
                    products: prodResult.products,
                    orders: orderResult.orders,
                    revenue: revenueResult.revenue || 0
                });
            });
        });
    });
});

// API: Get all products
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", (err, products) => {
        res.json(products);
    });
});

// API: Add new product
app.post('/api/products', (req, res) => {
    const { name, price, category_id, description } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    
    db.run(
        "INSERT INTO products (name, slug, price, category_id, description) VALUES (?, ?, ?, ?, ?)",
        [name, slug, price, category_id, description],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID, message: 'Product added successfully' });
            }
        }
    );
});

// API: Update product
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, price, description } = req.body;
    
    db.run(
        "UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?",
        [name, price, description, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ message: 'Product updated successfully' });
            }
        }
    );
});

// API: Delete product
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    
    db.run("DELETE FROM products WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ message: 'Product deleted successfully' });
        }
    });
});

// Start server
app.listen(PORT, () => {
    initDatabase();
    console.log(`
    ┌──────────────────────────────────────────────┐
    │    Dhaka Market E-Commerce System           │
    │    Server running at: http://localhost:${PORT}  │
    │                                              │
    │    Features:                                 │
    │    • Complete E-Commerce System             │
    │    • Product Catalog                        │
    │    • Shopping Cart                          │
    │    • Checkout System                        │
    │    • Order Management                       │
    │    • Admin Dashboard                        │
    │    • SQLite Database                        │
    │    • Responsive Design                      │
    └──────────────────────────────────────────────┘
    `);
});
