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
        category TEXT,
        stock INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE,
        customer_name TEXT,
        phone TEXT,
        address TEXT,
        shipping_area TEXT,
        quantity INTEGER DEFAULT 1,
        total REAL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'cod',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'admin'
    )`);
    
    db.run(`CREATE TABLE analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE,
        orders INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        visitors INTEGER DEFAULT 0
    )`);
    
    db.run(`INSERT INTO admin_users (username, password, role) VALUES ('admin', 'admin123', 'superadmin')`);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function formatPrice(price) {
    return '৳' + parseFloat(price).toLocaleString('en-IN');
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    let cleaned = phone.toString().replace(/\D/g, '');
    
    if (cleaned.startsWith('880')) {
        cleaned = cleaned.substring(3);
    }
    
    if (cleaned.startsWith('+880')) {
        cleaned = cleaned.substring(4);
    }
    
    if (cleaned.startsWith('88')) {
        cleaned = cleaned.substring(2);
    }
    
    if (cleaned.length === 11) {
        return cleaned;
    }
    
    if (cleaned.length === 10) {
        return '0' + cleaned;
    }
    
    return cleaned;
}

function generateAdminHTML(title, content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css" rel="stylesheet">
    <link href="https://cdn.datatables.net/1.13.4/css/dataTables.bootstrap5.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary: #4361ee;
            --secondary: #3a0ca3;
            --success: #4cc9f0;
            --danger: #f72585;
            --warning: #f8961e;
            --dark: #1a1a2e;
            --light: #f8f9fa;
        }
        body { 
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
            background: #f5f7fb;
            color: #333;
        }
        .sidebar {
            background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%);
            color: white;
            height: 100vh;
            position: fixed;
            width: 250px;
            padding: 20px 0;
            box-shadow: 3px 0 20px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        .sidebar .logo {
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 20px;
        }
        .sidebar .nav-link {
            color: rgba(255,255,255,0.8);
            padding: 12px 20px;
            margin: 5px 15px;
            border-radius: 10px;
            transition: all 0.3s;
        }
        .sidebar .nav-link:hover, .sidebar .nav-link.active {
            background: rgba(255,255,255,0.1);
            color: white;
            transform: translateX(5px);
        }
        .main-content {
            margin-left: 250px;
            padding: 20px;
            min-height: 100vh;
        }
        .header {
            background: white;
            padding: 15px 25px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            transition: transform 0.3s;
            border-left: 5px solid var(--primary);
            height: 100%;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .stat-card.orders { border-left-color: var(--primary); }
        .stat-card.revenue { border-left-color: var(--success); }
        .stat-card.pending { border-left-color: var(--warning); }
        .stat-card.customers { border-left-color: var(--danger); }
        .stat-icon {
            width: 60px;
            height: 60px;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 15px;
        }
        .orders .stat-icon { background: rgba(67, 97, 238, 0.1); color: var(--primary); }
        .revenue .stat-icon { background: rgba(76, 201, 240, 0.1); color: var(--success); }
        .pending .stat-icon { background: rgba(248, 150, 30, 0.1); color: var(--warning); }
        .customers .stat-icon { background: rgba(247, 37, 133, 0.1); color: var(--danger); }
        .table-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
        .table thead th {
            background: #f8f9fa;
            border: none;
            font-weight: 600;
            color: #495057;
            padding: 15px;
        }
        .table tbody tr {
            border-bottom: 1px solid #f0f0f0;
        }
        .table tbody tr:hover {
            background: #f8f9fa;
        }
        .badge-status {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-pending { background: #fff3cd; color: #856404; }
        .badge-processing { background: #cce5ff; color: #004085; }
        .badge-shipped { background: #d1ecf1; color: #0c5460; }
        .badge-delivered { background: #d4edda; color: #155724; }
        .badge-cancelled { background: #f8d7da; color: #721c24; }
        .action-btn {
            width: 35px;
            height: 35px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 2px;
            transition: all 0.3s;
            border: none;
        }
        .btn-call {
            background: #28a745;
            color: white;
        }
        .btn-call:hover {
            background: #218838;
            transform: scale(1.1);
        }
        .btn-whatsapp {
            background: #25D366;
            color: white;
        }
        .btn-whatsapp:hover {
            background: #1da851;
            transform: scale(1.1);
        }
        .btn-edit {
            background: #ffc107;
            color: white;
        }
        .btn-edit:hover {
            background: #e0a800;
            transform: scale(1.1);
        }
        .btn-delete {
            background: #dc3545;
            color: white;
        }
        .btn-delete:hover {
            background: #c82333;
            transform: scale(1.1);
        }
        .filter-bar {
            background: white;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .pagination .page-link {
            border-radius: 8px;
            margin: 0 3px;
            border: none;
            color: var(--primary);
        }
        .pagination .page-item.active .page-link {
            background: var(--primary);
            border-color: var(--primary);
        }
        .search-box {
            position: relative;
        }
        .search-box input {
            padding-left: 40px;
            border-radius: 10px;
            border: 1px solid #e0e0e0;
        }
        .search-box i {
            position: absolute;
            left: 15px;
            top: 12px;
            color: #999;
        }
        .phone-link {
            color: #28a745;
            font-weight: 600;
            text-decoration: none;
        }
        .phone-link:hover {
            color: #218838;
            text-decoration: underline;
        }
        .chart-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            height: 100%;
        }
        .export-btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 8px;
            transition: all 0.3s;
        }
        .export-btn:hover {
            background: var(--secondary);
            transform: translateY(-2px);
        }
        .quick-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .quick-action-btn {
            flex: 1;
            background: white;
            border: none;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.05);
            transition: all 0.3s;
            color: #333;
        }
        .quick-action-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            color: var(--primary);
        }
        @media (max-width: 768px) {
            .sidebar {
                width: 70px;
            }
            .sidebar .logo span,
            .sidebar .nav-link span:not(.icon) {
                display: none;
            }
            .main-content {
                margin-left: 70px;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="logo">
            <h4><i class="fas fa-store"></i> <span>Dhaka Market</span></h4>
            <small class="text-white-50">Admin Panel</small>
        </div>
        <nav class="nav flex-column">
            <a class="nav-link active" href="/admin/dashboard">
                <i class="fas fa-chart-line me-2"></i> <span>Dashboard</span>
            </a>
            <a class="nav-link" href="/admin/orders">
                <i class="fas fa-shopping-cart me-2"></i> <span>Orders</span>
                <span class="badge bg-danger float-end" id="orderCount">0</span>
            </a>
            <a class="nav-link" href="/admin/products">
                <i class="fas fa-box me-2"></i> <span>Products</span>
            </a>
            <a class="nav-link" href="/admin/customers">
                <i class="fas fa-users me-2"></i> <span>Customers</span>
            </a>
            <a class="nav-link" href="/admin/analytics">
                <i class="fas fa-chart-bar me-2"></i> <span>Analytics</span>
            </a>
            <a class="nav-link" href="/admin/settings">
                <i class="fas fa-cog me-2"></i> <span>Settings</span>
            </a>
            <div class="mt-auto">
                <a class="nav-link" href="/">
                    <i class="fas fa-store me-2"></i> <span>View Store</span>
                </a>
                <a class="nav-link" href="/logout">
                    <i class="fas fa-sign-out-alt me-2"></i> <span>Logout</span>
                </a>
            </div>
        </nav>
    </div>

    <div class="main-content">
        ${content}
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        $(document).ready(function() {
            // Initialize DataTable
            if ($('#ordersTable').length) {
                $('#ordersTable').DataTable({
                    pageLength: 25,
                    order: [[0, 'desc']],
                    language: {
                        search: "Search orders...",
                        lengthMenu: "Show _MENU_ orders"
                    }
                });
            }
            
            // Update order count
            $.get('/admin/api/order-count', function(data) {
                $('#orderCount').text(data.count);
            });
            
            // Phone number formatting
            $('.phone-number').each(function() {
                let phone = $(this).text().trim();
                phone = phone.replace(/\D/g, '');
                
                if (phone.startsWith('880')) {
                    phone = phone.substring(3);
                }
                
                if (phone.startsWith('+880')) {
                    phone = phone.substring(4);
                }
                
                if (phone.startsWith('88')) {
                    phone = phone.substring(2);
                }
                
                if (phone.length === 10) {
                    phone = '0' + phone;
                }
                
                if (phone.length === 11) {
                    $(this).html('<a href="tel:+88' + phone + '" class="phone-link">' + phone + '</a>');
                }
            });
            
            // Status color coding
            $('.status-badge').each(function() {
                const status = $(this).text().toLowerCase();
                let colorClass = 'badge-secondary';
                
                if (status.includes('pending')) colorClass = 'badge-pending';
                else if (status.includes('processing')) colorClass = 'badge-processing';
                else if (status.includes('shipped')) colorClass = 'badge-shipped';
                else if (status.includes('delivered')) colorClass = 'badge-delivered';
                else if (status.includes('cancelled')) colorClass = 'badge-cancelled';
                
                $(this).addClass(colorClass);
            });
        });
        
        function formatPhoneForCall(phone) {
            let cleaned = phone.replace(/\D/g, '');
            
            if (cleaned.startsWith('880')) {
                cleaned = cleaned.substring(3);
            }
            
            if (cleaned.startsWith('+880')) {
                cleaned = cleaned.substring(4);
            }
            
            if (cleaned.startsWith('88')) {
                cleaned = cleaned.substring(2);
            }
            
            if (cleaned.length === 10) {
                cleaned = '0' + cleaned;
            }
            
            if (cleaned.length === 11 && cleaned.startsWith('0')) {
                return cleaned;
            }
            
            if (cleaned.length === 11 && !cleaned.startsWith('0')) {
                return '0' + cleaned;
            }
            
            if (cleaned.length === 10) {
                return '0' + cleaned;
            }
            
            return cleaned;
        }
        
        function makeCall(phone) {
            const formatted = formatPhoneForCall(phone);
            if (formatted.length === 11) {
                window.open('tel:+88' + formatted, '_blank');
            } else {
                alert('Invalid phone number');
            }
        }
        
        function sendWhatsApp(phone) {
            const formatted = formatPhoneForCall(phone);
            if (formatted.length === 11) {
                window.open('https://wa.me/88' + formatted + '?text=Hello%20from%20Dhaka%20Market', '_blank');
            } else {
                alert('Invalid phone number');
            }
        }
        
        function updateOrderStatus(orderId, status) {
            $.post('/admin/api/update-status', {
                orderId: orderId,
                status: status
            }, function(data) {
                if (data.success) {
                    location.reload();
                }
            });
        }
        
        function deleteOrder(orderId) {
            if (confirm('Are you sure you want to delete this order?')) {
                $.ajax({
                    url: '/admin/api/delete-order/' + orderId,
                    type: 'DELETE',
                    success: function(data) {
                        if (data.success) {
                            location.reload();
                        }
                    }
                });
            }
        }
        
        function exportOrders(format) {
            window.open('/admin/export/orders/' + format, '_blank');
        }
        
        // Real-time updates
        setInterval(() => {
            $.get('/admin/api/order-count', function(data) {
                $('#orderCount').text(data.count);
            });
        }, 30000);
    </script>
</body>
</html>`;
}

// Middleware for admin authentication
function requireAuth(req, res, next) {
    // Simple authentication - in production, use sessions or JWT
    const auth = req.headers.authorization;
    if (auth === 'admin:admin123') {
        next();
    } else {
        res.redirect('/admin-login');
    }
}

// Admin Login Page
app.get('/admin-login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100vh; }
                .login-box { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
            </style>
        </head>
        <body class="d-flex align-items-center">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-4">
                        <div class="login-box">
                            <h2 class="text-center mb-4"><i class="fas fa-user-shield"></i> Admin Login</h2>
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
                </div>
            </div>
        </body>
        </html>
    `);
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
app.get('/admin/dashboard', requireAuth, (req, res) => {
    db.all(`SELECT 
        COUNT(*) as total_orders,
        SUM(total) as total_revenue,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
        COUNT(DISTINCT phone) as unique_customers
        FROM orders`, (err, stats) => {
        
        const stat = stats[0] || {};
        
        db.all(`SELECT 
            DATE(created_at) as date,
            COUNT(*) as order_count,
            SUM(total) as daily_revenue
            FROM orders 
            WHERE created_at >= date('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date`, (err, chartData) => {
            
            db.all(`SELECT 
                status,
                COUNT(*) as count
                FROM orders 
                GROUP BY status`, (err, statusData) => {
                
                db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`, (err, recentOrders) => {
                    
                    let content = `
                        <div class="header">
                            <h2><i class="fas fa-tachometer-alt"></i> Dashboard</h2>
                            <div class="d-flex align-items-center">
                                <span class="me-3"><i class="fas fa-calendar"></i> ${new Date().toLocaleDateString()}</span>
                                <button class="btn btn-primary" onclick="location.reload()">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
                            </div>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-3 mb-3">
                                <div class="stat-card orders">
                                    <div class="stat-icon">
                                        <i class="fas fa-shopping-cart"></i>
                                    </div>
                                    <h3>${stat.total_orders || 0}</h3>
                                    <p class="text-muted mb-0">Total Orders</p>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="stat-card revenue">
                                    <div class="stat-icon">
                                        <i class="fas fa-money-bill-wave"></i>
                                    </div>
                                    <h3>${formatPrice(stat.total_revenue || 0)}</h3>
                                    <p class="text-muted mb-0">Total Revenue</p>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="stat-card pending">
                                    <div class="stat-icon">
                                        <i class="fas fa-clock"></i>
                                    </div>
                                    <h3>${stat.pending_orders || 0}</h3>
                                    <p class="text-muted mb-0">Pending Orders</p>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="stat-card customers">
                                    <div class="stat-icon">
                                        <i class="fas fa-users"></i>
                                    </div>
                                    <h3>${stat.unique_customers || 0}</h3>
                                    <p class="text-muted mb-0">Customers</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-8">
                                <div class="chart-container">
                                    <h5><i class="fas fa-chart-line"></i> Sales Overview (Last 7 Days)</h5>
                                    <canvas id="salesChart" height="250"></canvas>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="chart-container">
                                    <h5><i class="fas fa-chart-pie"></i> Order Status</h5>
                                    <canvas id="statusChart" height="250"></canvas>
                                </div>
                            </div>
                        </div>
                        
                        <div class="table-container">
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
                        const phone = formatPhoneNumber(order.phone);
                        const date = new Date(order.created_at).toLocaleString();
                        
                        content += `
                            <tr>
                                <td><strong>${order.order_id}</strong></td>
                                <td>${order.customer_name}</td>
                                <td class="phone-number">${order.phone}</td>
                                <td>${formatPrice(order.total)}</td>
                                <td><span class="badge-status status-badge">${order.status}</span></td>
                                <td><small>${date}</small></td>
                                <td>
                                    <button class="action-btn btn-call" onclick="makeCall('${order.phone}')" title="Call">
                                        <i class="fas fa-phone"></i>
                                    </button>
                                    <button class="action-btn btn-whatsapp" onclick="sendWhatsApp('${order.phone}')" title="WhatsApp">
                                        <i class="fab fa-whatsapp"></i>
                                    </button>
                                </td>
                            </tr>`;
                    });
                    
                    content += `</tbody>
                                </table>
                            </div>
                        </div>
                        
                        <script>
                            // Sales Chart
                            const salesCtx = document.getElementById('salesChart').getContext('2d');
                            const salesChart = new Chart(salesCtx, {
                                type: 'line',
                                data: {
                                    labels: ${JSON.stringify(chartData.map(d => d.date))},
                                    datasets: [{
                                        label: 'Orders',
                                        data: ${JSON.stringify(chartData.map(d => d.order_count))},
                                        borderColor: '#4361ee',
                                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                                        tension: 0.4
                                    }, {
                                        label: 'Revenue',
                                        data: ${JSON.stringify(chartData.map(d => d.daily_revenue))},
                                        borderColor: '#4cc9f0',
                                        backgroundColor: 'rgba(76, 201, 240, 0.1)',
                                        tension: 0.4
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            position: 'top',
                                        }
                                    }
                                }
                            });
                            
                            // Status Chart
                            const statusCtx = document.getElementById('statusChart').getContext('2d');
                            const statusChart = new Chart(statusCtx, {
                                type: 'doughnut',
                                data: {
                                    labels: ${JSON.stringify(statusData.map(d => d.status))},
                                    datasets: [{
                                        data: ${JSON.stringify(statusData.map(d => d.count))},
                                        backgroundColor: [
                                            '#ffc107',
                                            '#0dcaf0',
                                            '#198754',
                                            '#6c757d',
                                            '#dc3545'
                                        ]
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                        }
                                    }
                                }
                            });
                        </script>`;
                    
                    res.send(generateAdminHTML('Dashboard', content));
                });
            });
        });
    });
});

// Orders Page
app.get('/admin/orders', requireAuth, (req, res) => {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT * FROM orders WHERE 1=1`;
    let params = [];
    
    if (status && status !== 'all') {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    if (search) {
        query += ` AND (order_id LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR address LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, orders) => {
        db.get(`SELECT COUNT(*) as total FROM orders WHERE 1=1`, (err, countResult) => {
            const totalOrders = countResult.total;
            const totalPages = Math.ceil(totalOrders / limit);
            
            let content = `
                <div class="header">
                    <h2><i class="fas fa-shopping-cart"></i> Orders Management</h2>
                    <div>
                        <button class="export-btn me-2" onclick="exportOrders('csv')">
                            <i class="fas fa-file-csv"></i> Export CSV
                        </button>
                        <button class="export-btn" onclick="exportOrders('excel')">
                            <i class="fas fa-file-excel"></i> Export Excel
                        </button>
                    </div>
                </div>
                
                <div class="filter-bar">
                    <div class="row">
                        <div class="col-md-3">
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
                            <div class="search-box">
                                <i class="fas fa-search"></i>
                                <input type="text" class="form-control" placeholder="Search by order ID, name, phone..." 
                                       value="${search || ''}" 
                                       onkeyup="if(event.keyCode===13) window.location='/admin/orders?search='+this.value">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" onchange="window.location='/admin/orders?limit='+this.value">
                                <option value="50">50 per page</option>
                                <option value="100">100 per page</option>
                                <option value="200">200 per page</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <button class="quick-action-btn" onclick="window.location='/admin/orders?status=pending'">
                        <i class="fas fa-clock text-warning"></i> Pending
                    </button>
                    <button class="quick-action-btn" onclick="window.location='/admin/orders?status=processing'">
                        <i class="fas fa-cog text-info"></i> Processing
                    </button>
                    <button class="quick-action-btn" onclick="window.location='/admin/orders?status=shipped'">
                        <i class="fas fa-truck text-primary"></i> Shipped
                    </button>
                    <button class="quick-action-btn" onclick="window.location='/admin/orders?status=delivered'">
                        <i class="fas fa-check-circle text-success"></i> Delivered
                    </button>
                </div>
                
                <div class="table-container">
                    <div class="table-responsive">
                        <table id="ordersTable" class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Phone</th>
                                    <th>Address</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            orders.forEach(order => {
                const phone = formatPhoneNumber(order.phone);
                const date = new Date(order.created_at).toLocaleDateString();
                const time = new Date(order.created_at).toLocaleTimeString();
                
                content += `
                    <tr>
                        <td>
                            <strong>${order.order_id}</strong><br>
                            <small class="text-muted">Qty: ${order.quantity}</small>
                        </td>
                        <td>${order.customer_name}</td>
                        <td class="phone-number">${order.phone}</td>
                        <td>
                            <small>${order.address}</small><br>
                            <span class="badge bg-secondary">${order.shipping_area}</span>
                        </td>
                        <td>
                            <strong>${formatPrice(order.total)}</strong><br>
                            <small class="text-muted">${order.payment_method}</small>
                        </td>
                        <td>
                            <select class="form-select form-select-sm" onchange="updateOrderStatus('${order.id}', this.value)">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                        <td>
                            <small>${date}</small><br>
                            <small class="text-muted">${time}</small>
                        </td>
                        <td>
                            <button class="action-btn btn-call" onclick="makeCall('${order.phone}')" title="Call">
                                <i class="fas fa-phone"></i>
                            </button>
                            <button class="action-btn btn-whatsapp" onclick="sendWhatsApp('${order.phone}')" title="WhatsApp">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                            <button class="action-btn btn-edit" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn btn-delete" onclick="deleteOrder('${order.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
            });
            
            content += `</tbody>
                        </table>
                    </div>
                    
                    <nav class="mt-3">
                        <ul class="pagination justify-content-center">
                            ${page > 1 ? `<li class="page-item"><a class="page-link" href="/admin/orders?page=${parseInt(page)-1}&status=${status || ''}&search=${search || ''}">Previous</a></li>` : ''}
                            
                            ${(() => {
                                let pages = '';
                                const startPage = Math.max(1, parseInt(page) - 2);
                                const endPage = Math.min(totalPages, parseInt(page) + 2);
                                
                                for (let i = startPage; i <= endPage; i++) {
                                    pages += `<li class="page-item ${i == page ? 'active' : ''}">
                                        <a class="page-link" href="/admin/orders?page=${i}&status=${status || ''}&search=${search || ''}">${i}</a>
                                    </li>`;
                                }
                                return pages;
                            })()}
                            
                            ${page < totalPages ? `<li class="page-item"><a class="page-link" href="/admin/orders?page=${parseInt(page)+1}&status=${status || ''}&search=${search || ''}">Next</a></li>` : ''}
                        </ul>
                    </nav>
                </div>`;
            
            res.send(generateAdminHTML('Orders', content));
        });
    });
});

// API endpoints
app.get('/admin/api/order-count', (req, res) => {
    db.get("SELECT COUNT(*) as count FROM orders", (err, result) => {
        res.json({ count: result.count });
    });
});

app.post('/admin/api/update-status', (req, res) => {
    const { orderId, status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId], function(err) {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.delete('/admin/api/delete-order/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM orders WHERE id = ?", [id], function(err) {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.get('/admin/export/orders/:format', requireAuth, (req, res) => {
    const format = req.params.format;
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        if (format === 'csv') {
            let csv = 'Order ID,Customer,Phone,Address,Amount,Status,Date\n';
            orders.forEach(order => {
                csv += `"${order.order_id}","${order.customer_name}","${order.phone}","${order.address}",${order.total},${order.status},${order.created_at}\n`;
            });
            res.header('Content-Type', 'text/csv');
            res.attachment('orders.csv');
            res.send(csv);
        } else {
            res.json(orders);
        }
    });
});

// Products Page
app.get('/admin/products', requireAuth, (req, res) => {
    db.all("SELECT * FROM products", (err, products) => {
        let content = `
            <div class="header">
                <h2><i class="fas fa-box"></i> Products Management</h2>
                <button class="btn btn-primary" onclick="window.location='/admin/add-product'">
                    <i class="fas fa-plus"></i> Add Product
                </button>
            </div>
            
            <div class="table-container">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Offer Price</th>
                                <th>Stock</th>
                                <th>Category</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        products.forEach(product => {
            content += `
                <tr>
                    <td>${product.id}</td>
                    <td>
                        <strong>${product.name}</strong><br>
                        <small class="text-muted">${product.description.substring(0, 50)}...</small>
                    </td>
                    <td>${formatPrice(product.price)}</td>
                    <td>${formatPrice(product.offer_price)}</td>
                    <td>
                        <span class="badge ${product.stock > 10 ? 'bg-success' : 'bg-danger'}">
                            ${product.stock} in stock
                        </span>
                    </td>
                    <td>${product.category}</td>
                    <td>
                        <button class="action-btn btn-edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
        
        content += `</tbody>
                    </table>
                </div>
            </div>`;
        
        res.send(generateAdminHTML('Products', content));
    });
});

// Customers Page
app.get('/admin/customers', requireAuth, (req, res) => {
    db.all(`SELECT 
        phone,
        customer_name,
        COUNT(*) as order_count,
        SUM(total) as total_spent,
        MAX(created_at) as last_order
        FROM orders 
        GROUP BY phone, customer_name
        ORDER BY total_spent DESC`, (err, customers) => {
        
        let content = `
            <div class="header">
                <h2><i class="fas fa-users"></i> Customers</h2>
                <div class="search-box" style="width: 300px;">
                    <i class="fas fa-search"></i>
                    <input type="text" class="form-control" placeholder="Search customers...">
                </div>
            </div>
            
            <div class="table-container">
                <div class="table-responsive">
                    <table class="table table-hover">
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
            const phone = formatPhoneNumber(customer.phone);
            const lastOrder = new Date(customer.last_order).toLocaleDateString();
            
            content += `
                <tr>
                    <td>${customer.customer_name}</td>
                    <td class="phone-number">${customer.phone}</td>
                    <td><span class="badge bg-primary">${customer.order_count}</span></td>
                    <td>${formatPrice(customer.total_spent)}</td>
                    <td>${lastOrder}</td>
                    <td>
                        <button class="action-btn btn-call" onclick="makeCall('${customer.phone}')">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="action-btn btn-whatsapp" onclick="sendWhatsApp('${customer.phone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </td>
                </tr>`;
        });
        
        content += `</tbody>
                    </table>
                </div>
            </div>`;
        
        res.send(generateAdminHTML('Customers', content));
    });
});

app.listen(PORT, () => {
    console.log(`
    ┌──────────────────────────────────────────────┐
    │    Dhaka Market - Premium Admin Panel        │
    │    Server: http://localhost:${PORT}            │
    │    Admin Login: http://localhost:${PORT}/admin-login │
    │                                              │
    │    Username: admin                           │
    │    Password: admin123                        │
    │                                              │
    │    Features:                                 │
    │    • Premium Dashboard with Charts           │
    │    • 100+ Orders Management                  │
    │    • Auto Phone Number Formatting            │
    │    • Direct Call & WhatsApp Integration      │
    │    • Export Orders (CSV/Excel)               │
    │    • Advanced Filters & Search               │
    │    • Real-time Updates                       │
    │    • Customer Management                     │
    │    • Product Management                      │
    │    • Responsive Design                       │
    └──────────────────────────────────────────────┘
    `);
});
