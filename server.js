const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

const config = {
  "site": {
    "title": "Social Buy - Facebook Style Store",
    "logo": "<i class='fab fa-facebook-square me-2'></i>SocialBuy",
    "admin_logo": "<i class='fas fa-chart-line me-2'></i>Admin Panel",
    "phone": "+৮৮০ ১৩৩০-৫১৩৭২৬",
    "whatsapp": "8801330513726",
    "currency": "BDT",
    "currency_symbol": "৳"
  },
  
  "product": {
    "name": "Hair Removal Trimmer - Cordless & Waterproof",
    "regular_price": 1500,
    "offer_price": 999,
    "shipping": {
      "inside_dhaka": 60,
      "outside_dhaka": 100
    },
    "images": [
      "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&h=800&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=800&h=800&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w-800&h=800&fit=crop&auto=format"
    ],
    "features": [
      "কর্ডলেস ও রিচার্জেবল - কোথাও নিয়ে যেতে সুবিধা",
      "৩টি কম্ব গার্ড (৩মিমি, ৬মিমি, ৯মিমি)",
      "২ ঘন্টা ব্যাকআপ - একবার চার্জে অনেকক্ষণ",
      "ইউএসবি টাইপ-সি চার্জিং - দ্রুত চার্জ",
      "ওয়াটারপ্রুফ ডিজাইন - ভেজা অবস্থায়ও ব্যবহার করা যায়",
      "১ বছর ওয়ারেন্টি - নিশ্চিন্তে ব্যবহার করুন"
    ]
  },
  
  "description": `🎯 <strong>ফেসবুক স্পেশাল অফার!</strong><br><br>
এই ট্রিমারটি ব্যবহার করে আপনি খুব সহজে, ব্যথাহীনভাবে ও নিরাপদে অবাঞ্ছিত লোম কাটতে পারবেন।<br><br>
✅ <strong>ফেসবুক ক্রেতাদের জন্য এক্সক্লুসিভ সুযোগ:</strong><br>
🔹 রেগুলার মূল্য: <del>৳১,৫০০</del><br>
🔹 ফেসবুক মূল্য: <strong>৳৯৯৯ মাত্র!</strong><br>
🔹 ডেলিভারি চার্জ: ঢাকার ভিতরে ৳৬০, বাইরে ৳১০০<br><br>
✅ <strong>কেন কিনবেন?</strong><br>
• ১০০% অরিজিনাল পণ্য<br>
• পণ্য হাতে পেয়ে টাকা দিবেন<br>
• পুরুষ-মহিলা উভয়ের জন্য<br>
• বাংলাদেশের সব অঞ্চলে ডেলিভারি<br><br>
✅ <strong>বিশেষ সুবিধা:</strong><br>
✓ ৭ দিনের রিটার্ন পলিসি<br>
✓ ১ বছর ওয়ারেন্টি<br>
✓ ২৪/৭ হেল্পলাইন<br>
✓ ২৪-৪৮ ঘন্টায় ডেলিভারি`,

  "reviews": [
    {
      "name": "আহমেদ রহমান",
      "profilePic": "https://randomuser.me/api/portraits/men/32.jpg",
      "time": "২ ঘন্টা আগে",
      "rating": 5,
      "text": "অসাধারণ পণ্য! ২ দিনের মধ্যে পেয়ে গেছি। ব্যাটারি ব্যাকআপ অনেক ভালো। ভেজা অবস্থায়ও ব্যবহার করেছি পারফেক্ট কাজ করে!",
      "likes": 23,
      "comments": 5,
      "shares": 2
    },
    {
      "name": "ফারহানা আক্তার",
      "profilePic": "https://randomuser.me/api/portraits/women/44.jpg",
      "time": "৫ ঘন্টা আগে",
      "rating": 5,
      "text": "খুবই ভালো লেগেছে! হালকা ও বহনযোগ্য, ভ্রমণের জন্য পারফেক্ট। আমার চেহারার লোম খুব সাবলীলভাবে কাটতে পারছি।",
      "likes": 18,
      "comments": 3,
      "shares": 1
    },
    {
      "name": "করিম উদ্দিন",
      "profilePic": "https://randomuser.me/api/portraits/men/67.jpg",
      "time": "১ দিন আগে",
      "rating": 5,
      "text": "Type-C চার্জিং সিস্টেমের জন্য অনেক ধন্যবাদ। দ্রুত চার্জ হয় এবং ব্যাকআপ অনেক ভালো। ৩টি কম্ব গার্ড দিয়ে আসায় ভিন্ন ভিন্ন লেংথে কাটতে পারছি।",
      "likes": 31,
      "comments": 8,
      "shares": 4
    }
  ],

  "comments": [
    {
      "name": "সাজিদ হাসান",
      "profilePic": "https://randomuser.me/api/portraits/men/22.jpg",
      "time": "৩০ মিনিট আগে",
      "text": "ওয়্যারেন্টি পলিসি কেমন? পুরো ১ বছর থাকবে?",
      "likes": 2
    },
    {
      "name": "নুসরাত জাহান",
      "profilePic": "https://randomuser.me/api/portraits/women/33.jpg",
      "time": "১ ঘন্টা আগে",
      "text": "পেমেন্ট অপশনগুলো কি কি? বিকাশে টাকা দিলে হবে?",
      "likes": 5
    },
    {
      "name": "Admin",
      "profilePic": "https://randomuser.me/api/portraits/men/1.jpg",
      "time": "২৫ মিনিট আগে",
      "text": "হ্যাঁ, ১ বছর ফুল ওয়্যারেন্টি। যেকোনো সমস্যায় ফ্রি সার্ভিস বা রিপ্লেসমেন্ট।",
      "likes": 8,
      "isAdmin": true
    }
  ],

  "admin": {
    "username": "admin",
    "password": "admin123"
  },
  
  "server": {
    "port": 3000,
    "order_prefix": "FB"
  }
};

const PORT = config.server.port || 3000;
const db = new sqlite3.Database(':memory:');

// Database setup
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
    
    db.run(`INSERT INTO admin_users (username, password) VALUES ('${config.admin.username}', '${config.admin.password}')`);
    
    // Insert sample data
    const productStmt = db.prepare("INSERT INTO products (name, price, offer_price, images, description, features) VALUES (?, ?, ?, ?, ?, ?)");
    productStmt.run(
        config.product.name,
        config.product.regular_price,
        config.product.offer_price,
        JSON.stringify(config.product.images),
        config.description,
        JSON.stringify(config.product.features)
    );
    productStmt.finalize();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper function
function formatPrice(price) {
    return config.site.currency_symbol + price.toLocaleString('en-IN');
}

// Facebook-style HTML Generator
function generateHTML(title, content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${config.site.title}</title>
    
    <!-- Facebook Pixel -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', 'YOUR_PIXEL_ID');
    fbq('track', 'PageView');
    </script>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --fb-blue: #1877F2;
            --fb-green: #42B72A;
            --fb-gray: #F0F2F5;
            --fb-dark: #1C1E21;
            --fb-text: #050505;
            --fb-text-secondary: #65676B;
            --fb-border: #CED0D4;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--fb-gray);
            color: var(--fb-text);
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        /* Facebook Header */
        .fb-header {
            background: white;
            border-bottom: 1px solid var(--fb-border);
            position: fixed;
            top: 0;
            width: 100%;
            z-index: 1000;
            height: 60px;
            padding: 0 20px;
        }
        
        .fb-header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 100%;
        }
        
        .fb-logo {
            font-size: 28px;
            font-weight: 700;
            color: var(--fb-blue);
            text-decoration: none;
        }
        
        .fb-search {
            flex: 1;
            max-width: 400px;
            margin: 0 20px;
        }
        
        .fb-search input {
            width: 100%;
            padding: 8px 12px;
            border-radius: 20px;
            border: 1px solid var(--fb-border);
            background: var(--fb-gray);
            font-size: 15px;
        }
        
        .fb-nav {
            display: flex;
            gap: 10px;
        }
        
        .fb-nav-btn {
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s;
        }
        
        .fb-nav-btn.primary {
            background: var(--fb-blue);
            color: white;
        }
        
        .fb-nav-btn.secondary {
            background: var(--fb-gray);
            color: var(--fb-text);
        }
        
        /* Facebook Main Layout */
        .fb-container {
            max-width: 1200px;
            margin: 80px auto 20px;
            padding: 0 20px;
            display: grid;
            grid-template-columns: 360px 1fr 360px;
            gap: 20px;
        }
        
        /* Left Sidebar */
        .fb-sidebar-left {
            position: sticky;
            top: 80px;
            height: calc(100vh - 100px);
            overflow-y: auto;
        }
        
        .fb-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            border: 1px solid var(--fb-border);
        }
        
        .fb-card-title {
            font-size: 17px;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--fb-text);
        }
        
        /* Main Content - Facebook Post Style */
        .fb-main-content {
            min-height: 100vh;
        }
        
        .fb-post {
            background: white;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 1px solid var(--fb-border);
            overflow: hidden;
        }
        
        .fb-post-header {
            padding: 16px 20px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid var(--fb-border);
        }
        
        .fb-post-user {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .fb-user-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--fb-blue);
        }
        
        .fb-user-info h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 2px;
        }
        
        .fb-user-info span {
            font-size: 13px;
            color: var(--fb-text-secondary);
        }
        
        .fb-post-body {
            padding: 0;
        }
        
        .fb-post-image {
            width: 100%;
            max-height: 600px;
            object-fit: cover;
            border-bottom: 1px solid var(--fb-border);
        }
        
        .fb-post-content {
            padding: 20px;
            font-size: 17px;
            line-height: 1.6;
        }
        
        .fb-post-content h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 15px;
            color: var(--fb-dark);
        }
        
        .fb-post-content h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 15px 0;
            color: var(--fb-dark);
        }
        
        .fb-post-content p {
            margin-bottom: 15px;
            font-size: 17px;
        }
        
        .fb-post-content ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        
        .fb-post-content li {
            margin-bottom: 8px;
            font-size: 16px;
        }
        
        /* Price Section in Post */
        .fb-price-section {
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
            padding: 25px;
            margin: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .fb-old-price {
            font-size: 24px;
            text-decoration: line-through;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        
        .fb-new-price {
            font-size: 48px;
            font-weight: 800;
            margin-bottom: 10px;
        }
        
        .fb-discount {
            background: white;
            color: #25D366;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 700;
            display: inline-block;
            font-size: 18px;
        }
        
        /* Facebook Post Actions */
        .fb-post-actions {
            padding: 12px 20px;
            border-top: 1px solid var(--fb-border);
            display: flex;
            gap: 10px;
        }
        
        .fb-action-btn {
            flex: 1;
            padding: 10px;
            border: none;
            background: none;
            border-radius: 6px;
            font-weight: 600;
            color: var(--fb-text-secondary);
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 15px;
        }
        
        .fb-action-btn:hover {
            background: var(--fb-gray);
        }
        
        .fb-action-btn.active {
            color: var(--fb-blue);
        }
        
        /* Order Form - Facebook Style */
        .fb-order-form {
            background: white;
            border-radius: 10px;
            padding: 25px;
            margin-top: 20px;
            border: 1px solid var(--fb-border);
        }
        
        .fb-form-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 20px;
            color: var(--fb-dark);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .fb-form-group {
            margin-bottom: 20px;
        }
        
        .fb-form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--fb-text);
            font-size: 15px;
        }
        
        .fb-form-input {
            width: 100%;
            padding: 14px 16px;
            border: 1px solid var(--fb-border);
            border-radius: 8px;
            font-size: 16px;
            background: var(--fb-gray);
            transition: all 0.2s;
        }
        
        .fb-form-input:focus {
            outline: none;
            border-color: var(--fb-blue);
            background: white;
            box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.2);
        }
        
        .fb-shipping-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .fb-shipping-option {
            border: 2px solid var(--fb-border);
            border-radius: 8px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }
        
        .fb-shipping-option.active {
            border-color: var(--fb-blue);
            background: rgba(24, 119, 242, 0.05);
        }
        
        .fb-order-summary {
            background: var(--fb-gray);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .fb-summary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid var(--fb-border);
            font-size: 16px;
        }
        
        .fb-summary-total {
            font-size: 20px;
            font-weight: 700;
            padding: 15px 0;
            color: var(--fb-dark);
        }
        
        .fb-order-btn {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, var(--fb-green), #2E8B57);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .fb-order-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(66, 183, 42, 0.3);
        }
        
        /* Comments Section - Smaller */
        .fb-comments-section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            border: 1px solid var(--fb-border);
        }
        
        .fb-comments-header {
            font-size: 17px;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--fb-text);
        }
        
        .fb-comment {
            padding: 12px 0;
            border-bottom: 1px solid var(--fb-border);
        }
        
        .fb-comment:last-child {
            border-bottom: none;
        }
        
        .fb-comment-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        
        .fb-comment-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
        }
        
        .fb-comment-author {
            font-weight: 600;
            font-size: 14px;
        }
        
        .fb-comment-time {
            font-size: 12px;
            color: var(--fb-text-secondary);
        }
        
        .fb-comment-text {
            font-size: 14px;
            line-height: 1.5;
            color: var(--fb-text);
            margin-bottom: 8px;
        }
        
        .fb-comment-actions {
            display: flex;
            gap: 15px;
            font-size: 12px;
            color: var(--fb-text-secondary);
        }
        
        .fb-comment-like {
            cursor: pointer;
        }
        
        .fb-comment-reply {
            cursor: pointer;
        }
        
        .fb-comment-input {
            margin-top: 15px;
            display: flex;
            gap: 10px;
        }
        
        .fb-comment-input input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid var(--fb-border);
            border-radius: 20px;
            font-size: 14px;
            background: var(--fb-gray);
        }
        
        .fb-comment-input button {
            padding: 12px 20px;
            background: var(--fb-blue);
            color: white;
            border: none;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
        }
        
        /* Right Sidebar */
        .fb-sidebar-right {
            position: sticky;
            top: 80px;
            height: calc(100vh - 100px);
            overflow-y: auto;
        }
        
        .fb-ad {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid var(--fb-border);
            text-align: center;
        }
        
        .fb-ad h4 {
            color: var(--fb-blue);
            margin-bottom: 10px;
        }
        
        /* Live Orders Widget */
        .fb-live-orders {
            background: white;
            border-radius: 10px;
            padding: 20px;
            border: 1px solid var(--fb-border);
        }
        
        .fb-live-order {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 0;
            border-bottom: 1px solid var(--fb-border);
        }
        
        .fb-live-order:last-child {
            border-bottom: none;
        }
        
        .fb-live-order-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--fb-gray);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: var(--fb-blue);
        }
        
        /* WhatsApp Float */
        .whatsapp-float {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, #25D366, #128C7E);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 36px;
            box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
            z-index: 1000;
            text-decoration: none;
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        /* Mobile Responsive */
        @media (max-width: 1100px) {
            .fb-container {
                grid-template-columns: 280px 1fr;
            }
            .fb-sidebar-right {
                display: none;
            }
        }
        
        @media (max-width: 768px) {
            .fb-container {
                grid-template-columns: 1fr;
                padding: 0 15px;
            }
            .fb-sidebar-left {
                display: none;
            }
            .fb-header {
                padding: 0 15px;
            }
            .fb-search {
                display: none;
            }
        }
        
        /* Animation */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .fb-post {
            animation: fadeIn 0.5s ease-out;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: var(--fb-gray);
        }
        
        ::-webkit-scrollbar-thumb {
            background: var(--fb-border);
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: var(--fb-text-secondary);
        }
    </style>
</head>
<body>
    <!-- Facebook Header -->
    <header class="fb-header">
        <div class="fb-header-content">
            <a href="/" class="fb-logo">
                <i class="fab fa-facebook-square"></i> SocialBuy
            </a>
            
            <div class="fb-search">
                <input type="text" placeholder="Search products...">
            </div>
            
            <div class="fb-nav">
                <a href="/" class="fb-nav-btn primary">
                    <i class="fas fa-home"></i> Home
                </a>
                <a href="/admin-login" class="fb-nav-btn secondary">
                    <i class="fas fa-user-shield"></i> Admin
                </a>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="fb-container">
        <!-- Left Sidebar -->
        <aside class="fb-sidebar-left">
            <div class="fb-card">
                <h3 class="fb-card-title">
                    <i class="fas fa-fire text-danger"></i> Trending Now
                </h3>
                <div class="mb-3">
                    <div style="font-weight: 600; color: var(--fb-blue);">#HairRemoval</div>
                    <div style="font-size: 13px; color: var(--fb-text-secondary);">1.2K people buying</div>
                </div>
                <div class="mb-3">
                    <div style="font-weight: 600; color: var(--fb-blue);">#CordlessTrimmer</div>
                    <div style="font-size: 13px; color: var(--fb-text-secondary);">850 people interested</div>
                </div>
            </div>
            
            <div class="fb-card">
                <h3 class="fb-card-title">
                    <i class="fas fa-truck"></i> Delivery Info
                </h3>
                <div style="font-size: 14px;">
                    <div class="mb-2">
                        <i class="fas fa-check-circle text-success"></i> Cash on Delivery
                    </div>
                    <div class="mb-2">
                        <i class="fas fa-check-circle text-success"></i> 24-48 Hours Delivery
                    </div>
                    <div class="mb-2">
                        <i class="fas fa-check-circle text-success"></i> Free Replacement
                    </div>
                </div>
            </div>
            
            <div class="fb-card">
                <h3 class="fb-card-title">
                    <i class="fas fa-clock"></i> Order Timeline
                </h3>
                <div style="font-size: 14px;">
                    <div class="mb-2">
                        1. Order Now
                    </div>
                    <div class="mb-2">
                        2. Get Call in 30 mins
                    </div>
                    <div class="mb-2">
                        3. Delivery in 24-48 hours
                    </div>
                    <div>
                        4. Pay on Delivery
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content Area -->
        <section class="fb-main-content">
            ${content}
        </section>

        <!-- Right Sidebar -->
        <aside class="fb-sidebar-right">
            <div class="fb-ad">
                <h4>
                    <i class="fas fa-bolt text-warning"></i> Flash Sale
                </h4>
                <p style="font-size: 14px; color: var(--fb-text-secondary);">
                    Limited time offer! Stock ending soon.
                </p>
                <div id="countdown" style="font-size: 24px; font-weight: 800; color: var(--fb-blue);">
                    23:59:59
                </div>
            </div>
            
            <div class="fb-live-orders">
                <h3 class="fb-card-title">
                    <i class="fas fa-bell text-success"></i> Live Orders
                </h3>
                <div id="liveOrders">
                    <!-- Live orders will be inserted by JavaScript -->
                </div>
            </div>
            
            <div class="fb-card">
                <h3 class="fb-card-title">
                    <i class="fas fa-headset"></i> Need Help?
                </h3>
                <div style="font-size: 14px;">
                    <div class="mb-2">
                        <strong>Call:</strong> ${config.site.phone}
                    </div>
                    <div class="mb-2">
                        <strong>WhatsApp:</strong> ${config.site.whatsapp}
                    </div>
                    <div>
                        <strong>Hours:</strong> 9 AM - 11 PM
                    </div>
                </div>
            </div>
        </aside>
    </main>

    <!-- WhatsApp Float -->
    <a href="https://wa.me/${config.site.whatsapp}" target="_blank" class="whatsapp-float">
        <i class="fab fa-whatsapp"></i>
    </a>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Global variables
        let quantity = 1;
        let shippingInside = ${config.product.shipping.inside_dhaka};
        let shippingOutside = ${config.product.shipping.outside_dhaka};
        let selectedShipping = 'outside_dhaka';
        let productPrice = ${config.product.offer_price};
        let totalLikes = ${config.reviews.reduce((sum, r) => sum + r.likes, 0)};
        let totalComments = ${config.reviews.reduce((sum, r) => sum + r.comments, 0)};
        let totalShares = ${config.reviews.reduce((sum, r) => sum + r.shares, 0)};
        
        // Format price function
        function formatPrice(price) {
            return '${config.site.currency_symbol}' + price.toLocaleString('en-IN');
        }
        
        // Update quantity
        function updateQuantity(change) {
            quantity += change;
            if (quantity < 1) quantity = 1;
            if (quantity > 5) quantity = 5;
            
            document.getElementById('quantityDisplay').textContent = quantity;
            document.getElementById('quantityInput').value = quantity;
            calculateTotal();
        }
        
        // Select shipping
        function selectShipping(area) {
            selectedShipping = area;
            document.querySelectorAll('.fb-shipping-option').forEach(option => {
                option.classList.remove('active');
            });
            document.querySelector(`[data-shipping="${area}"]`).classList.add('active');
            calculateTotal();
        }
        
        // Calculate total
        function calculateTotal() {
            const shippingCost = selectedShipping === 'inside_dhaka' ? shippingInside : shippingOutside;
            const subtotal = productPrice * quantity;
            const total = subtotal + shippingCost;
            
            document.getElementById('productSubtotal').textContent = formatPrice(subtotal);
            document.getElementById('subtotalDisplay').textContent = formatPrice(subtotal);
            document.getElementById('shippingDisplay').textContent = formatPrice(shippingCost);
            document.getElementById('finalTotalDisplay').textContent = formatPrice(total);
            document.getElementById('finalPriceDisplay').textContent = formatPrice(total);
        }
        
        // Like post
        function likePost() {
            totalLikes++;
            const likeBtn = document.querySelector('.fb-action-btn.like');
            const likeCount = document.getElementById('likeCount');
            
            likeBtn.classList.add('active');
            likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Liked';
            likeCount.textContent = totalLikes;
            
            setTimeout(() => {
                likeBtn.innerHTML = '<i class="far fa-thumbs-up"></i> Like';
                likeBtn.classList.remove('active');
            }, 1000);
        }
        
        // Comment on post
        function commentPost() {
            const commentInput = document.querySelector('.fb-comment-input input');
            const commentsSection = document.querySelector('.fb-comments-section .fb-comments-list');
            
            if (commentInput.value.trim()) {
                const comment = {
                    name: 'You',
                    profilePic: 'https://randomuser.me/api/portraits/men/1.jpg',
                    time: 'Just now',
                    text: commentInput.value
                };
                
                const commentHTML = `
                    <div class="fb-comment">
                        <div class="fb-comment-header">
                            <img src="${comment.profilePic}" class="fb-comment-avatar" alt="${comment.name}">
                            <div>
                                <div class="fb-comment-author">${comment.name}</div>
                                <div class="fb-comment-time">${comment.time}</div>
                            </div>
                        </div>
                        <div class="fb-comment-text">${comment.text}</div>
                        <div class="fb-comment-actions">
                            <span class="fb-comment-like">Like</span>
                            <span class="fb-comment-reply">Reply</span>
                        </div>
                    </div>
                `;
                
                commentsSection.insertAdjacentHTML('afterbegin', commentHTML);
                commentInput.value = '';
                totalComments++;
                document.getElementById('commentCount').textContent = totalComments;
            }
        }
        
        // Share post
        function sharePost() {
            totalShares++;
            document.getElementById('shareCount').textContent = totalShares;
            alert('Post shared successfully!');
        }
        
        // Countdown timer
        function startCountdown() {
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
        }
        
        // Simulate live orders
        function simulateLiveOrders() {
            const ordersContainer = document.getElementById('liveOrders');
            const names = ['রহিম', 'করিম', 'সাদিয়া', 'নাসরিন', 'জাহিদ', 'ফারহানা'];
            const cities = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী'];
            
            function addLiveOrder() {
                const name = names[Math.floor(Math.random() * names.length)];
                const city = cities[Math.floor(Math.random() * cities.length)];
                
                const orderHTML = `
                    <div class="fb-live-order">
                        <div class="fb-live-order-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600;">${name}</div>
                            <div style="font-size: 12px; color: var(--fb-text-secondary);">
                                Ordered from ${city}
                            </div>
                        </div>
                    </div>
                `;
                
                ordersContainer.insertAdjacentHTML('afterbegin', orderHTML);
                
                // Keep only 5 orders visible
                if (ordersContainer.children.length > 5) {
                    ordersContainer.removeChild(ordersContainer.lastChild);
                }
            }
            
            // Add initial orders
            for (let i = 0; i < 3; i++) {
                addLiveOrder();
            }
            
            // Add new order every 10-20 seconds
            setInterval(addLiveOrder, Math.random() * 10000 + 10000);
        }
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', function() {
            startCountdown();
            simulateLiveOrders();
            calculateTotal();
            
            // Initialize shipping selection
            document.querySelectorAll('.fb-shipping-option').forEach(option => {
                option.addEventListener('click', function() {
                    selectShipping(this.dataset.shipping);
                });
            });
            
            // Initialize action buttons
            document.querySelector('.fb-action-btn.like').addEventListener('click', likePost);
            document.querySelector('.fb-action-btn.comment').addEventListener('click', function() {
                document.querySelector('.fb-comment-input input').focus();
            });
            document.querySelector('.fb-action-btn.share').addEventListener('click', sharePost);
            document.querySelector('.fb-comment-input button').addEventListener('click', commentPost);
            document.querySelector('.fb-comment-input input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') commentPost();
            });
            
            // Initialize order button
            document.querySelector('.fb-order-btn').addEventListener('click', function() {
                const orderForm = document.getElementById('orderForm');
                if (orderForm.checkValidity()) {
                    orderForm.submit();
                } else {
                    orderForm.reportValidity();
                }
            });
        });
    </script>
</body>
</html>`;
}

// Main Route
app.get('/', (req, res) => {
    db.get("SELECT * FROM products WHERE id = 1", (err, product) => {
        if (!product) {
            res.send('Product not found');
            return;
        }
        
        const images = JSON.parse(product.images || '[]');
        const features = JSON.parse(product.features || '[]');
        const discount = Math.round(((product.price - product.offer_price) / product.price) * 100);
        const shippingInsideDhaka = config.product.shipping.inside_dhaka;
        const shippingOutsideDhaka = config.product.shipping.outside_dhaka;
        
        let content = `
            <!-- Main Facebook Post -->
            <article class="fb-post">
                <!-- Post Header -->
                <div class="fb-post-header">
                    <div class="fb-post-user">
                        <img src="https://randomuser.me/api/portraits/men/1.jpg" class="fb-user-avatar" alt="Admin">
                        <div class="fb-user-info">
                            <h3>Official Store</h3>
                            <span>
                                <i class="far fa-clock"></i> Posted • 
                                <i class="fas fa-globe-asia"></i> Public • 
                                <i class="fas fa-badge-check text-primary"></i> Verified
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Post Body -->
                <div class="fb-post-body">
                    <!-- Main Product Image -->
                    <img src="${images[0]}" class="fb-post-image" alt="${product.name}">
                    
                    <!-- Post Content -->
                    <div class="fb-post-content">
                        <h1>${product.name}</h1>
                        
                        ${product.description}
                        
                        <!-- Product Features -->
                        <h2><i class="fas fa-star text-warning"></i> Key Features:</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                            ${features.map(feature => `
                                <div style="background: var(--fb-gray); padding: 12px; border-radius: 8px; font-size: 15px;">
                                    <i class="fas fa-check-circle text-success me-2"></i>${feature}
                                </div>
                            `).join('')}
                        </div>
                        
                        <!-- Price Section -->
                        <div class="fb-price-section">
                            <div class="fb-old-price">Regular: ${formatPrice(product.price)}</div>
                            <div class="fb-new-price">Facebook Price: ${formatPrice(product.offer_price)}</div>
                            <div class="fb-discount">
                                <i class="fas fa-tag"></i> Save ${discount}%
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Post Stats -->
                <div style="padding: 15px 20px; border-top: 1px solid var(--fb-border); font-size: 14px; color: var(--fb-text-secondary);">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <span id="likeCount">${config.reviews.reduce((sum, r) => sum + r.likes, 0)}</span> likes • 
                            <span id="commentCount">${config.reviews.reduce((sum, r) => sum + r.comments, 0)}</span> comments • 
                            <span id="shareCount">${config.reviews.reduce((sum, r) => sum + r.shares, 0)}</span> shares
                        </div>
                        <div>
                            <span>${Math.floor(Math.random() * 100) + 150} people viewing</span>
                        </div>
                    </div>
                </div>
                
                <!-- Post Actions -->
                <div class="fb-post-actions">
                    <button class="fb-action-btn like">
                        <i class="far fa-thumbs-up"></i> Like
                    </button>
                    <button class="fb-action-btn comment">
                        <i class="far fa-comment"></i> Comment
                    </button>
                    <button class="fb-action-btn share">
                        <i class="far fa-share-square"></i> Share
                    </button>
                </div>
            </article>
            
            <!-- Customer Reviews -->
            <div class="fb-post" style="margin-top: 20px;">
                <div class="fb-post-header">
                    <div class="fb-post-user">
                        <i class="fas fa-users fa-2x text-primary"></i>
                        <div class="fb-user-info">
                            <h3>Customer Reviews</h3>
                            <span>Verified purchases • Real feedback</span>
                        </div>
                    </div>
                </div>
                
                <div class="fb-post-content">
                    ${config.reviews.map(review => `
                        <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid var(--fb-border);">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <img src="${review.profilePic}" style="width: 40px; height: 40px; border-radius: 50%;">
                                <div>
                                    <div style="font-weight: 600;">${review.name}</div>
                                    <div style="font-size: 13px; color: var(--fb-text-secondary);">
                                        ${review.time} • 
                                        ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                                    </div>
                                </div>
                            </div>
                            <div style="font-size: 15px; line-height: 1.6;">
                                ${review.text}
                            </div>
                            <div style="display: flex; gap: 20px; margin-top: 10px; font-size: 13px; color: var(--fb-text-secondary);">
                                <span><i class="far fa-thumbs-up"></i> ${review.likes}</span>
                                <span><i class="far fa-comment"></i> ${review.comments}</span>
                                <span><i class="far fa-share-square"></i> ${review.shares}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Order Form -->
            <div class="fb-order-form">
                <h2 class="fb-form-title">
                    <i class="fas fa-shopping-cart"></i>
                    Order Now - Limited Time Offer
                </h2>
                
                <form action="/order" method="POST" id="orderForm">
                    <input type="hidden" name="product_name" value="${product.name}">
                    <input type="hidden" name="product_price" value="${product.offer_price}">
                    <input type="hidden" name="quantity" id="quantityInput" value="1">
                    
                    <!-- Quantity Selector -->
                    <div class="fb-form-group">
                        <label class="fb-form-label">Quantity:</label>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <button type="button" onclick="updateQuantity(-1)" 
                                    style="width: 40px; height: 40px; border: 2px solid var(--fb-border); background: white; border-radius: 8px; font-size: 20px; cursor: pointer;">
                                -
                            </button>
                            <span id="quantityDisplay" style="font-size: 20px; font-weight: 600;">1</span>
                            <button type="button" onclick="updateQuantity(1)" 
                                    style="width: 40px; height: 40px; border: 2px solid var(--fb-border); background: white; border-radius: 8px; font-size: 20px; cursor: pointer;">
                                +
                            </button>
                        </div>
                    </div>
                    
                    <!-- Customer Information -->
                    <div class="fb-form-group">
                        <label class="fb-form-label">
                            <i class="fas fa-user"></i> Your Full Name *
                        </label>
                        <input type="text" name="customer_name" class="fb-form-input" 
                               placeholder="Enter your full name" required>
                    </div>
                    
                    <div class="fb-form-group">
                        <label class="fb-form-label">
                            <i class="fas fa-phone"></i> Mobile Number *
                        </label>
                        <input type="tel" name="phone" class="fb-form-input" 
                               placeholder="01XXXXXXXXX" pattern="[0-9]{11}" required>
                    </div>
                    
                    <div class="fb-form-group">
                        <label class="fb-form-label">
                            <i class="fas fa-map-marker-alt"></i> Complete Address *
                        </label>
                        <textarea name="address" class="fb-form-input" rows="3" 
                                  placeholder="House No, Road, Area, District" required></textarea>
                    </div>
                    
                    <!-- Shipping Options -->
                    <div class="fb-form-group">
                        <label class="fb-form-label">
                            <i class="fas fa-truck"></i> Delivery Area
                        </label>
                        <div class="fb-shipping-options">
                            <div class="fb-shipping-option active" data-shipping="outside_dhaka">
                                <div style="font-weight: 600;">Outside Dhaka</div>
                                <div style="font-size: 14px; color: var(--fb-text-secondary);">2-4 days</div>
                                <div style="font-size: 18px; font-weight: 700; color: var(--fb-blue);">
                                    ${formatPrice(shippingOutsideDhaka)}
                                </div>
                            </div>
                            <div class="fb-shipping-option" data-shipping="inside_dhaka">
                                <div style="font-weight: 600;">Inside Dhaka</div>
                                <div style="font-size: 14px; color: var(--fb-text-secondary);">1-2 days</div>
                                <div style="font-size: 18px; font-weight: 700; color: var(--fb-blue);">
                                    ${formatPrice(shippingInsideDhaka)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Order Summary -->
                    <div class="fb-order-summary">
                        <h3 style="margin-bottom: 15px; font-size: 17px; font-weight: 600;">Order Summary</h3>
                        <div class="fb-summary-item">
                            <span>Product (x<span id="orderQuantity">1</span>):</span>
                            <span id="productSubtotal">${formatPrice(product.offer_price)}</span>
                        </div>
                        <div class="fb-summary-item">
                            <span>Subtotal:</span>
                            <span id="subtotalDisplay">${formatPrice(product.offer_price)}</span>
                        </div>
                        <div class="fb-summary-item">
                            <span>Delivery Charge:</span>
                            <span id="shippingDisplay">${formatPrice(shippingOutsideDhaka)}</span>
                        </div>
                        <div class="fb-summary-total">
                            <span>Total Payable:</span>
                            <span id="finalTotalDisplay">${formatPrice(product.offer_price + shippingOutsideDhaka)}</span>
                        </div>
                    </div>
                    
                    <!-- Payment Method -->
                    <div style="background: var(--fb-gray); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <i class="fas fa-money-bill-wave text-success fa-2x"></i>
                            <div>
                                <div style="font-weight: 600;">Cash on Delivery</div>
                                <div style="font-size: 14px; color: var(--fb-text-secondary);">
                                    Pay when you receive the product
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Submit Button -->
                    <button type="button" class="fb-order-btn" onclick="document.getElementById('orderForm').submit()">
                        <i class="fas fa-lock"></i>
                        Confirm Order - 
                        <span id="finalPriceDisplay">${formatPrice(product.offer_price + shippingOutsideDhaka)}</span>
                    </button>
                </form>
            </div>
            
            <!-- Comments Section - Smaller -->
            <div class="fb-comments-section">
                <h3 class="fb-comments-header">
                    <i class="far fa-comments"></i> 
                    Questions & Answers (${config.comments.length})
                </h3>
                
                <div class="fb-comments-list">
                    ${config.comments.map(comment => `
                        <div class="fb-comment">
                            <div class="fb-comment-header">
                                <img src="${comment.profilePic}" class="fb-comment-avatar" alt="${comment.name}">
                                <div>
                                    <div class="fb-comment-author" style="${comment.isAdmin ? 'color: var(--fb-blue);' : ''}">
                                        ${comment.name} ${comment.isAdmin ? '<i class="fas fa-check-circle text-primary"></i>' : ''}
                                    </div>
                                    <div class="fb-comment-time">${comment.time}</div>
                                </div>
                            </div>
                            <div class="fb-comment-text">${comment.text}</div>
                            <div class="fb-comment-actions">
                                <span class="fb-comment-like">
                                    <i class="far fa-thumbs-up"></i> ${comment.likes || 0}
                                </span>
                                <span class="fb-comment-reply">Reply</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Comment Input -->
                <div class="fb-comment-input">
                    <input type="text" placeholder="Write a question...">
                    <button type="button">Post</button>
                </div>
            </div>`;
        
        res.send(generateHTML(product.name, content));
    });
});

// Order submission route (same as before)
app.post('/order', (req, res) => {
    const { customer_name, phone, address, shipping_area, quantity, product_name, product_price } = req.body;
    
    const shippingCost = shipping_area === 'inside_dhaka' ? config.product.shipping.inside_dhaka : config.product.shipping.outside_dhaka;
    const total = (parseFloat(product_price) * parseInt(quantity || 1)) + shippingCost;
    
    db.run("INSERT INTO orders (customer_name, phone, address, shipping_area, quantity, total) VALUES (?, ?, ?, ?, ?, ?)",
        [customer_name, phone, address, shipping_area, quantity, total], 
        function(err) {
            if (err) {
                res.send('<div class="alert alert-danger">Error placing order</div>');
            } else {
                const orderId = this.lastID;
                
                let content = `
                    <div class="fb-post">
                        <div class="fb-post-header">
                            <div class="fb-post-user">
                                <i class="fas fa-check-circle fa-2x text-success"></i>
                                <div class="fb-user-info">
                                    <h3>Order Confirmed!</h3>
                                    <span>Thank you for your purchase</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="fb-post-content" style="text-align: center;">
                            <div style="font-size: 48px; color: var(--fb-green); margin: 20px 0;">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <h1 style="color: var(--fb-green);">Order #${config.server.order_prefix}${orderId}</h1>
                            <p style="font-size: 18px; margin: 20px 0;">
                                Thank you <strong>${customer_name}</strong>! Your order has been received.
                            </p>
                            
                            <div style="background: var(--fb-gray); border-radius: 10px; padding: 20px; margin: 20px 0;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left;">
                                    <div>
                                        <div style="font-weight: 600; color: var(--fb-text-secondary);">Order ID</div>
                                        <div style="font-size: 18px; font-weight: 700;">#${config.server.order_prefix}${orderId}</div>
                                    </div>
                                    <div>
                                        <div style="font-weight: 600; color: var(--fb-text-secondary);">Product</div>
                                        <div style="font-size: 16px;">${product_name}</div>
                                    </div>
                                    <div>
                                        <div style="font-weight: 600; color: var(--fb-text-secondary);">Quantity</div>
                                        <div style="font-size: 16px;">${quantity}</div>
                                    </div>
                                    <div>
                                        <div style="font-weight: 600; color: var(--fb-text-secondary);">Total</div>
                                        <div style="font-size: 18px; font-weight: 700; color: var(--fb-green);">
                                            ${formatPrice(total)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="background: rgba(24, 119, 242, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <h3 style="color: var(--fb-blue);">
                                    <i class="fas fa-info-circle"></i> What's Next?
                                </h3>
                                <p style="margin: 10px 0;">
                                    Our representative will call you within 30 minutes to confirm your order.
                                </p>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px;">
                                <a href="/" class="fb-order-btn" style="background: var(--fb-blue);">
                                    <i class="fas fa-shopping-bag"></i> Continue Shopping
                                </a>
                                <a href="https://wa.me/${config.site.whatsapp}?text=Order%20${config.server.order_prefix}${orderId}" 
                                   target="_blank" class="fb-order-btn" style="background: #25D366;">
                                    <i class="fab fa-whatsapp"></i> WhatsApp Support
                                </a>
                            </div>
                        </div>
                    </div>`;
                
                res.send(generateHTML('Order Confirmed', content));
            }
        }
    );
});

// Admin routes (keeping same structure but with Facebook styling)
app.get('/admin-login', (req, res) => {
    let content = `
        <div class="fb-post">
            <div class="fb-post-header">
                <div class="fb-post-user">
                    <i class="fas fa-user-shield fa-2x text-primary"></i>
                    <div class="fb-user-info">
                        <h3>Admin Login</h3>
                        <span>Store Management Panel</span>
                    </div>
                </div>
            </div>
            
            <div class="fb-post-content">
                <form action="/admin-login" method="POST">
                    <div class="fb-form-group">
                        <label class="fb-form-label">Username</label>
                        <input type="text" name="username" class="fb-form-input" required>
                    </div>
                    
                    <div class="fb-form-group">
                        <label class="fb-form-label">Password</label>
                        <input type="password" name="password" class="fb-form-input" required>
                    </div>
                    
                    <button type="submit" class="fb-order-btn" style="background: var(--fb-blue);">
                        <i class="fas fa-sign-in-alt"></i> Login to Admin Panel
                    </button>
                </form>
            </div>
        </div>`;
    res.send(generateHTML('Admin Login', content));
});

// ... [Rest of the admin routes remain the same as before] ...

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

app.get('/admin/dashboard', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        let content = `
            <div class="fb-post">
                <div class="fb-post-header">
                    <div class="fb-post-user">
                        <i class="fas fa-chart-line fa-2x text-primary"></i>
                        <div class="fb-user-info">
                            <h3>Admin Dashboard</h3>
                            <span>Store Management</span>
                        </div>
                    </div>
                </div>
                
                <div class="fb-post-content">
                    <!-- Stats Cards -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
                        <div style="background: var(--fb-blue); color: white; padding: 20px; border-radius: 10px;">
                            <div style="font-size: 14px;">Total Orders</div>
                            <div style="font-size: 32px; font-weight: 700;">${orders.length}</div>
                        </div>
                        <div style="background: var(--fb-green); color: white; padding: 20px; border-radius: 10px;">
                            <div style="font-size: 14px;">Total Revenue</div>
                            <div style="font-size: 32px; font-weight: 700;">${formatPrice(orders.reduce((sum, order) => sum + order.total, 0))}</div>
                        </div>
                        <div style="background: orange; color: white; padding: 20px; border-radius: 10px;">
                            <div style="font-size: 14px;">Pending Orders</div>
                            <div style="font-size: 32px; font-weight: 700;">${orders.filter(o => o.status === 'pending').length}</div>
                        </div>
                        <div style="background: purple; color: white; padding: 20px; border-radius: 10px;">
                            <div style="font-size: 14px;">Today's Orders</div>
                            <div style="font-size: 32px; font-weight: 700;">${orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</div>
                        </div>
                    </div>
                    
                    <!-- Orders Table -->
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--fb-gray);">
                                    <th style="padding: 12px; text-align: left;">Order ID</th>
                                    <th style="padding: 12px; text-align: left;">Customer</th>
                                    <th style="padding: 12px; text-align: left;">Amount</th>
                                    <th style="padding: 12px; text-align: left;">Status</th>
                                    <th style="padding: 12px; text-align: left;">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orders.map(order => {
                                    const statusColors = {
                                        'pending': 'orange',
                                        'processing': 'blue',
                                        'shipped': 'purple',
                                        'completed': 'green'
                                    };
                                    return `
                                        <tr style="border-bottom: 1px solid var(--fb-border);">
                                            <td style="padding: 12px;">#${config.server.order_prefix}${order.id}</td>
                                            <td style="padding: 12px;">${order.customer_name}</td>
                                            <td style="padding: 12px; font-weight: 600;">${formatPrice(order.total)}</td>
                                            <td style="padding: 12px;">
                                                <span style="background: ${statusColors[order.status] || 'gray'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                                                    ${order.status}
                                                </span>
                                            </td>
                                            <td style="padding: 12px;">${new Date(order.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        
        res.send(generateHTML('Admin Dashboard', content));
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Facebook-style store running at: http://localhost:${PORT}`);
    console.log(`📱 Mobile responsive design`);
    console.log(`📊 Admin: http://localhost:${PORT}/admin-login`);
    console.log(`🔑 Admin credentials: admin / admin123`);
});
