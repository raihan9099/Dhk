const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
const { WebSocketServer } = require('ws');
const http = require('http');
const moment = require('moment');
require('dotenv').config();

// Create HTTP server for WebSocket
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Facebook-like theme configuration
const config = {
    "site": {
        "title": "SocialConnect Pro",
        "logo": "SocialConnect",
        "tagline": "Stay connected with what matters most",
        "domain": "socialconnectpro.com",
        "contact_email": "support@socialconnectpro.com",
        "phone": "+880 1330-513726",
        "theme_color": "#1877f2", // Facebook blue
        "secondary_color": "#42b72a", // Facebook green
        "accent_color": "#f02849", // Facebook red
        "bg_color": "#f0f2f5", // Facebook background
        "text_color": "#1c1e21", // Facebook text
        "sidebar_color": "#ffffff",
        "header_color": "#ffffff"
    },
    
    "features": {
        "real_time_monitoring": true,
        "analytics_dashboard": true,
        "user_activity_tracking": true,
        "live_notifications": true,
        "messaging_system": true,
        "friend_system": true,
        "post_sharing": true,
        "photo_albums": true,
        "events_management": true,
        "groups_communities": true,
        "marketplace": false,
        "stories_feature": true,
        "video_calls": false
    },
    
    "admin": {
        "username": process.env.ADMIN_USERNAME || "admin",
        "password": process.env.ADMIN_PASSWORD || "admin123",
        "email": process.env.ADMIN_EMAIL || "admin@socialconnectpro.com",
        "session_secret": process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
    },
    
    "server": {
        "port": process.env.PORT || 3000,
        "environment": process.env.NODE_ENV || "development",
        "cache_time": 3600,
        "upload_limit": "50mb",
        "rate_limit_window": 15 * 60 * 1000, // 15 minutes
        "rate_limit_max": 1000
    },
    
    "database": {
        "path": "./database.sqlite",
        "wal_mode": true,
        "cache_size": 10000,
        "busy_timeout": 5000
    },
    
    "email": {
        "service": "gmail",
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "auth": {
            "user": process.env.EMAIL_USER,
            "pass": process.env.EMAIL_PASS
        }
    },
    
    "monitoring": {
        "log_retention_days": 30,
        "real_time_update_interval": 5000, // 5 seconds
        "performance_metrics": true,
        "error_tracking": true,
        "user_behavior_tracking": true,
        "security_logging": true
    },
    
    "analytics": {
        "track_page_views": true,
        "track_user_engagement": true,
        "track_conversions": true,
        "heatmaps": false,
        "session_recordings": false
    }
};

const PORT = config.server.port;
const db = new sqlite3.Database(config.database.path, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create tables if they don't exist
const initializeDatabase = async () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Enable performance optimizations
            db.run(`PRAGMA journal_mode = ${config.database.wal_mode ? 'WAL' : 'DELETE'}`);
            db.run(`PRAGMA synchronous = NORMAL`);
            db.run(`PRAGMA cache_size = ${config.database.cache_size}`);
            db.run(`PRAGMA foreign_keys = ON`);
            db.run(`PRAGMA busy_timeout = ${config.database.busy_timeout}`);
            
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                profile_picture TEXT DEFAULT '/images/default-avatar.png',
                cover_photo TEXT,
                bio TEXT,
                location TEXT,
                website TEXT,
                birth_date DATE,
                gender TEXT,
                relationship_status TEXT,
                work_place TEXT,
                education TEXT,
                phone TEXT,
                verified INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Posts table
            db.run(`CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                media_urls TEXT,
                privacy TEXT DEFAULT 'public',
                location TEXT,
                feeling TEXT,
                tags TEXT,
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                shares_count INTEGER DEFAULT 0,
                views_count INTEGER DEFAULT 0,
                is_pinned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            
            // Friends table
            db.run(`CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                accepted_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, friend_id)
            )`);
            
            // Messages table
            db.run(`CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                attachment_url TEXT,
                is_read INTEGER DEFAULT 0,
                read_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            
            // Comments table
            db.run(`CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                likes_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            
            // Likes table
            db.run(`CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER,
                comment_id INTEGER,
                user_id INTEGER NOT NULL,
                type TEXT DEFAULT 'like',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, post_id, comment_id)
            )`);
            
            // Notifications table
            db.run(`CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                from_user_id INTEGER,
                reference_id INTEGER,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            
            // Groups table
            db.run(`CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                cover_photo TEXT,
                privacy TEXT DEFAULT 'public',
                admin_id INTEGER NOT NULL,
                member_count INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            
            // Group members table
            db.run(`CREATE TABLE IF NOT EXISTS group_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(group_id, user_id)
            )`);
            
            // Events table
            db.run(`CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                cover_photo TEXT,
                location TEXT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                host_id INTEGER NOT NULL,
                privacy TEXT DEFAULT 'public',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            
            // Event attendees table
            db.run(`CREATE TABLE IF NOT EXISTS event_attendees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                status TEXT DEFAULT 'going',
                rsvp_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(event_id, user_id)
            )`);
            
            // Monitoring and analytics tables
            db.run(`CREATE TABLE IF NOT EXISTS page_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                page_url TEXT NOT NULL,
                referrer TEXT,
                ip_address TEXT,
                user_agent TEXT,
                session_id TEXT,
                load_time INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_id TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                logout_time TIMESTAMP,
                duration INTEGER,
                active INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                module TEXT,
                user_id INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                response_time INTEGER,
                status_code INTEGER,
                user_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Admin users table
            db.run(`CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                permissions TEXT DEFAULT '{}',
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Create indexes
            db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_users_active ON users(active)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_posts_privacy ON posts(privacy)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(user_id, status)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_friends_friend_status ON friends(friend_id, status)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_page_views_url ON page_views(page_url)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC)`);
            
            // Hash password function
            const hashPassword = (password) => {
                return bcrypt.hashSync(password, 10);
            };
            
            // Check if admin user exists
            db.get("SELECT COUNT(*) as count FROM admin_users", (err, row) => {
                if (err) {
                    console.error('Error checking admin users:', err);
                    reject(err);
                    return;
                }
                
                if (row.count === 0) {
                    const hashedPassword = hashPassword(config.admin.password);
                    db.run(`INSERT INTO admin_users (username, email, password, role, permissions) 
                            VALUES (?, ?, ?, ?, ?)`,
                        [config.admin.username, config.admin.email, hashedPassword, 'super_admin', 
                         JSON.stringify({
                            users: ['read', 'write', 'delete'],
                            posts: ['read', 'write', 'delete'],
                            analytics: ['read'],
                            settings: ['read', 'write'],
                            monitoring: ['read']
                         })], (err) => {
                            if (err) {
                                console.error('Error creating admin user:', err);
                                reject(err);
                            } else {
                                console.log('Default admin user created');
                            }
                        });
                }
                
                // Check if demo users exist
                db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                    if (err) {
                        console.error('Error checking users:', err);
                        reject(err);
                        return;
                    }
                    
                    if (row.count === 0) {
                        const demoUsers = [
                            ['john_doe', 'john@example.com', hashPassword('password123'), 'John', 'Doe'],
                            ['jane_smith', 'jane@example.com', hashPassword('password123'), 'Jane', 'Smith'],
                            ['mike_wilson', 'mike@example.com', hashPassword('password123'), 'Mike', 'Wilson'],
                            ['sarah_jones', 'sarah@example.com', hashPassword('password123'), 'Sarah', 'Jones']
                        ];
                        
                        let usersCreated = 0;
                        demoUsers.forEach(user => {
                            db.run(`INSERT INTO users (username, email, password, first_name, last_name, verified, bio) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [...user, 1, 'Welcome to my profile!'], (err) => {
                                    if (err) {
                                        console.error('Error creating demo user:', err);
                                    } else {
                                        usersCreated++;
                                        if (usersCreated === demoUsers.length) {
                                            // Create friendships
                                            db.run(`INSERT INTO friends (user_id, friend_id, status, accepted_at) 
                                                    VALUES (1, 2, 'accepted', CURRENT_TIMESTAMP)`);
                                            db.run(`INSERT INTO friends (user_id, friend_id, status, accepted_at) 
                                                    VALUES (1, 3, 'accepted', CURRENT_TIMESTAMP)`);
                                            
                                            // Create demo posts
                                            const demoPosts = [
                                                [1, 'Hello everyone! Just joined SocialConnect. Excited to connect with you all!', null, 'public'],
                                                [2, 'Beautiful day today! ☀️ Hope everyone is having a great day!', null, 'public'],
                                                [3, 'Just finished an amazing project! Feeling accomplished! 💪', null, 'public'],
                                                [1, 'Sharing some thoughts on technology and social connections...', null, 'public']
                                            ];
                                            
                                            let postsCreated = 0;
                                            demoPosts.forEach(post => {
                                                db.run(`INSERT INTO posts (user_id, content, media_urls, privacy) VALUES (?, ?, ?, ?)`, 
                                                    post, (err) => {
                                                        if (err) {
                                                            console.error('Error creating demo post:', err);
                                                        }
                                                        postsCreated++;
                                                        if (postsCreated === demoPosts.length) {
                                                            console.log('Demo data created successfully');
                                                            resolve();
                                                        }
                                                    });
                                            });
                                        }
                                    }
                                });
                        });
                    } else {
                        console.log('Database already has users');
                        resolve();
                    }
                });
            });
        });
    });
};

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression({
    level: 6,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Session configuration
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.sqlite',
        dir: './',
        table: 'sessions'
    }),
    secret: config.admin.session_secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.server.environment === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: config.server.rate_limit_window,
    max: config.server.rate_limit_max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: 'Too many login attempts, please try again later.'
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);

// Body parsing middleware
app.use(express.urlencoded({ extended: true, limit: config.server.upload_limit }));
app.use(express.json({ limit: config.server.upload_limit }));

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
    fs.mkdirSync('public/images');
    console.log('Created public directories');
}

// Static files with caching
app.use(express.static('public', {
    maxAge: config.server.cache_time * 1000,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0');
        }
        if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            res.setHeader('Cache-Control', `public, max-age=${config.server.cache_time}`);
        }
    }
}));

// File upload configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Error: File type not allowed!'));
        }
    }
});

// Utility functions
const utilities = {
    formatDate: (date) => {
        const now = new Date();
        const postDate = new Date(date);
        const diff = Math.floor((now - postDate) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return postDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: now.getFullYear() !== postDate.getFullYear() ? 'numeric' : undefined
        });
    },
    
    generateUsername: (firstName, lastName) => {
        const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        return base + Math.floor(Math.random() * 1000);
    },
    
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    validatePassword: (password) => {
        return password.length >= 8;
    },
    
    sanitizeInput: (input) => {
        return input.trim().replace(/[<>]/g, '');
    },
    
    logActivity: (userId, action, details = {}) => {
        db.run(`INSERT INTO system_logs (level, message, module, user_id, ip_address, created_at) 
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            ['info', action, 'user_activity', userId, details.ip || null],
            (err) => {
                if (err) console.error('Error logging activity:', err);
            });
    },
    
    trackPageView: (req, userId = null) => {
        if (config.analytics.track_page_views) {
            db.run(`INSERT INTO page_views (user_id, page_url, referrer, ip_address, user_agent, session_id) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, req.originalUrl, req.get('referer'), req.ip, req.get('user-agent'), req.sessionID],
                (err) => {
                    if (err) console.error('Error tracking page view:', err);
                });
        }
    },
    
    sendNotification: async (userId, type, fromUserId = null, referenceId = null, message) => {
        db.run(`INSERT INTO notifications (user_id, type, from_user_id, reference_id, message) 
                VALUES (?, ?, ?, ?, ?)`,
            [userId, type, fromUserId, referenceId, message],
            (err) => {
                if (err) {
                    console.error('Error sending notification:', err);
                    return;
                }
                
                // WebSocket notification
                wss.clients.forEach(client => {
                    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'notification',
                            data: { type, message, fromUserId, referenceId }
                        }));
                    }
                });
            });
    },
    
    getOnlineFriends: (userId, callback) => {
        db.all(`
            SELECT u.id, u.username, u.first_name, u.last_name, u.profile_picture
            FROM friends f
            JOIN users u ON f.friend_id = u.id
            WHERE f.user_id = ? AND f.status = 'accepted'
            AND u.active = 1
            LIMIT 10
        `, [userId], (err, friends) => {
            if (err) {
                console.error('Error getting online friends:', err);
                callback([]);
            } else {
                callback(friends);
            }
        });
    }
};

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'authenticate':
                    ws.userId = message.userId;
                    ws.userType = message.userType;
                    break;
                    
                case 'typing':
                    // Broadcast typing indicator to conversation participants
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN && 
                            (client.userId === message.receiverId || client.userId === message.senderId)) {
                            client.send(JSON.stringify({
                                type: 'typing_indicator',
                                data: {
                                    senderId: message.senderId,
                                    receiverId: message.receiverId,
                                    isTyping: message.isTyping
                                }
                            }));
                        }
                    });
                    break;
                    
                case 'message':
                    // Handle real-time messaging
                    const { senderId, receiverId, content, attachment } = message.data;
                    db.run(`INSERT INTO messages (sender_id, receiver_id, content, attachment_url) 
                            VALUES (?, ?, ?, ?)`,
                        [senderId, receiverId, content, attachment || null],
                        function(err) {
                            if (err) {
                                console.error('Error saving message:', err);
                                return;
                            }
                            
                            const messageId = this.lastID;
                            
                            // Send to receiver
                            wss.clients.forEach(client => {
                                if (client.userId === receiverId && client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        type: 'new_message',
                                        data: {
                                            id: messageId,
                                            senderId,
                                            receiverId,
                                            content,
                                            attachment,
                                            createdAt: new Date().toISOString()
                                        }
                                    }));
                                }
                            });
                            
                            // Send notification
                            utilities.sendNotification(
                                receiverId, 
                                'message', 
                                senderId, 
                                messageId, 
                                'You have a new message'
                            );
                        });
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Keep WebSocket connections alive
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log('Terminating dead WebSocket connection');
            return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// HTML Template Generator (Facebook-like)
function generateHTML(title, content, options = {}) {
    const { user = null, activeTab = 'home', showSidebar = true, isAdmin = false } = options;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${config.site.title}</title>
    
    <!-- Facebook-like Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@300;400;500;600;700&family=Segoe+UI:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- CSS Libraries -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/noty/3.1.4/noty.min.css">
    
    <!-- Custom CSS -->
    <style>
        :root {
            --primary-color: ${config.site.theme_color};
            --secondary-color: ${config.site.secondary_color};
            --accent-color: ${config.site.accent_color};
            --bg-color: ${config.site.bg_color};
            --text-color: ${config.site.text_color};
            --sidebar-color: ${config.site.sidebar_color};
            --header-color: ${config.site.header_color};
            --border-color: #ddd;
            --hover-color: #f5f5f5;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            line-height: 1.6;
            font-size: 14px;
        }
        
        /* Facebook-like Header */
        .facebook-header {
            background-color: var(--header-color);
            border-bottom: 1px solid var(--border-color);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            height: 56px;
            padding: 0 16px;
        }
        
        .header-container {
            max-width: 1300px;
            margin: 0 auto;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .search-bar {
            flex: 1;
            max-width: 680px;
            margin: 0 12px;
        }
        
        .search-bar input {
            width: 100%;
            padding: 8px 16px;
            border-radius: 50px;
            border: 1px solid var(--border-color);
            background-color: #f0f2f5;
            font-size: 15px;
        }
        
        .header-nav {
            display: flex;
            gap: 8px;
        }
        
        .nav-item {
            padding: 8px 32px;
            border-radius: 8px;
            text-decoration: none;
            color: var(--text-color);
            transition: background-color 0.2s;
        }
        
        .nav-item:hover {
            background-color: var(--hover-color);
        }
        
        .nav-item.active {
            color: var(--primary-color);
            position: relative;
        }
        
        .nav-item.active::after {
            content: '';
            position: absolute;
            bottom: -17px;
            left: 0;
            right: 0;
            height: 3px;
            background-color: var(--primary-color);
        }
        
        .user-menu {
            position: relative;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
        }
        
        .dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border-radius: 8px;
            box-shadow: 0 12px 28px rgba(0,0,0,0.1);
            min-width: 200px;
            display: none;
        }
        
        .dropdown-menu.show {
            display: block;
        }
        
        /* Main Layout */
        .main-container {
            max-width: 1300px;
            margin: 76px auto 20px;
            display: grid;
            grid-template-columns: 280px 1fr 320px;
            gap: 20px;
            padding: 0 16px;
        }
        
        /* Left Sidebar */
        .left-sidebar {
            position: sticky;
            top: 76px;
            height: calc(100vh - 96px);
            overflow-y: auto;
        }
        
        .sidebar-section {
            background: var(--sidebar-color);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
        }
        
        .sidebar-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-radius: 8px;
            text-decoration: none;
            color: var(--text-color);
            transition: background-color 0.2s;
        }
        
        .sidebar-item:hover {
            background-color: var(--hover-color);
        }
        
        .sidebar-item i {
            width: 24px;
            margin-right: 12px;
            font-size: 20px;
        }
        
        /* Main Content */
        .main-content {
            min-height: 100vh;
        }
        
        .post-creator {
            background: var(--sidebar-color);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
        }
        
        .post-input {
            width: 100%;
            padding: 12px;
            border-radius: 20px;
            border: 1px solid var(--border-color);
            background-color: #f0f2f5;
            font-size: 15px;
            margin-bottom: 12px;
            cursor: pointer;
        }
        
        .post-actions {
            display: flex;
            gap: 8px;
            padding-top: 12px;
            border-top: 1px solid var(--border-color);
        }
        
        .post-action {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px;
            border-radius: 8px;
            background: none;
            border: none;
            color: var(--text-color);
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .post-action:hover {
            background-color: var(--hover-color);
        }
        
        /* Posts */
        .post-card {
            background: var(--sidebar-color);
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
            overflow: hidden;
        }
        
        .post-header {
            padding: 12px 16px;
            display: flex;
            align-items: center;
        }
        
        .post-author-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 12px;
        }
        
        .post-info h6 {
            margin: 0;
            font-weight: 600;
        }
        
        .post-time {
            font-size: 12px;
            color: #65676b;
        }
        
        .post-content {
            padding: 0 16px 12px;
        }
        
        .post-media {
            margin: 12px -16px;
        }
        
        .post-media img {
            width: 100%;
            max-height: 500px;
            object-fit: cover;
        }
        
        .post-stats {
            padding: 8px 16px;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: #65676b;
        }
        
        .post-actions-bar {
            display: flex;
            padding: 4px 16px;
        }
        
        .post-action-button {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px;
            background: none;
            border: none;
            color: #65676b;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .post-action-button:hover {
            background-color: var(--hover-color);
        }
        
        /* Right Sidebar */
        .right-sidebar {
            position: sticky;
            top: 76px;
            height: calc(100vh - 96px);
            overflow-y: auto;
        }
        
        /* Stories */
        .stories-container {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding: 16px 0;
            margin-bottom: 16px;
        }
        
        .story-item {
            min-width: 120px;
            height: 200px;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            cursor: pointer;
        }
        
        .story-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .create-story {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        /* Online Friends */
        .online-friends h6 {
            padding: 16px;
            margin: 0;
            font-weight: 600;
        }
        
        .friend-item {
            display: flex;
            align-items: center;
            padding: 8px 16px;
            border-radius: 8px;
            text-decoration: none;
            color: var(--text-color);
            transition: background-color 0.2s;
        }
        
        .friend-item:hover {
            background-color: var(--hover-color);
        }
        
        .friend-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            margin-right: 12px;
            position: relative;
        }
        
        .online-indicator {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 10px;
            height: 10px;
            background-color: var(--secondary-color);
            border-radius: 50%;
            border: 2px solid white;
        }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
            .main-container {
                grid-template-columns: 250px 1fr 280px;
            }
        }
        
        @media (max-width: 992px) {
            .main-container {
                grid-template-columns: 200px 1fr;
            }
            .right-sidebar {
                display: none;
            }
        }
        
        @media (max-width: 768px) {
            .main-container {
                grid-template-columns: 1fr;
                margin-top: 60px;
            }
            .left-sidebar {
                display: none;
            }
            .header-nav .nav-item span {
                display: none;
            }
            .header-nav .nav-item {
                padding: 8px 16px;
            }
        }
        
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
            animation: fadeIn 0.3s ease-out;
        }
        
        /* Notifications */
        .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: var(--accent-color);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 18px;
            text-align: center;
        }
        
        /* Admin Dashboard */
        .dashboard-card {
            border-radius: 10px;
            transition: transform 0.2s;
        }
        
        .dashboard-card:hover {
            transform: translateY(-2px);
        }
        
        .border-left-primary {
            border-left: 4px solid var(--primary-color) !important;
        }
        
        .border-left-success {
            border-left: 4px solid var(--secondary-color) !important;
        }
        
        .border-left-info {
            border-left: 4px solid #17a2b8 !important;
        }
        
        .border-left-warning {
            border-left: 4px solid #f7b928 !important;
        }
    </style>
</head>
<body>
    <!-- Facebook-like Header -->
    <header class="facebook-header">
        <div class="header-container">
            <!-- Logo -->
            <a href="/" class="logo">
                ${config.site.logo}
            </a>
            
            <!-- Search Bar -->
            <div class="search-bar">
                <input type="text" placeholder="Search SocialConnect...">
            </div>
            
            <!-- Navigation -->
            <nav class="header-nav">
                <a href="/" class="nav-item ${activeTab === 'home' ? 'active' : ''}">
                    <i class="fas fa-home"></i>
                    ${showSidebar ? '<span>Home</span>' : ''}
                </a>
                <a href="/friends" class="nav-item ${activeTab === 'friends' ? 'active' : ''}">
                    <i class="fas fa-user-friends"></i>
                    ${showSidebar ? '<span>Friends</span>' : ''}
                </a>
                <a href="/groups" class="nav-item ${activeTab === 'groups' ? 'active' : ''}">
                    <i class="fas fa-users"></i>
                    ${showSidebar ? '<span>Groups</span>' : ''}
                </a>
                <a href="/marketplace" class="nav-item ${activeTab === 'marketplace' ? 'active' : ''}">
                    <i class="fas fa-store"></i>
                    ${showSidebar ? '<span>Marketplace</span>' : ''}
                </a>
                <a href="/notifications" class="nav-item ${activeTab === 'notifications' ? 'active' : ''}">
                    <i class="fas fa-bell"></i>
                    ${showSidebar ? '<span>Notifications</span>' : ''}
                    <span class="notification-badge" id="notificationCount">0</span>
                </a>
                <a href="/messages" class="nav-item ${activeTab === 'messages' ? 'active' : ''}">
                    <i class="fas fa-comment-dots"></i>
                    ${showSidebar ? '<span>Messages</span>' : ''}
                    <span class="notification-badge" id="messageCount">0</span>
                </a>
            </nav>
            
            <!-- User Menu -->
            <div class="user-menu">
                <img src="${user ? user.profile_picture : '/images/default-avatar.png'}" 
                     alt="Profile" 
                     class="user-avatar"
                     onclick="toggleUserMenu()">
                <div class="dropdown-menu" id="userDropdown">
                    <a href="/profile/${user ? user.username : ''}" class="dropdown-item">
                        <i class="fas fa-user"></i> Profile
                    </a>
                    <a href="/settings" class="dropdown-item">
                        <i class="fas fa-cog"></i> Settings
                    </a>
                    ${isAdmin ? '<a href="/admin/dashboard" class="dropdown-item"><i class="fas fa-chart-line"></i> Admin Dashboard</a>' : ''}
                    <div class="dropdown-divider"></div>
                    <a href="/logout" class="dropdown-item">
                        <i class="fas fa-sign-out-alt"></i> Log Out
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <div class="main-container">
        <!-- Left Sidebar -->
        ${showSidebar ? `
        <aside class="left-sidebar">
            <!-- User Profile -->
            <div class="sidebar-section">
                <a href="/profile/${user ? user.username : ''}" class="sidebar-item">
                    <img src="${user ? user.profile_picture : '/images/default-avatar.png'}" 
                         alt="Profile" 
                         style="width: 24px; height: 24px; border-radius: 50%; margin-right: 12px;">
                    <span>${user ? user.first_name + ' ' + user.last_name : 'Guest'}</span>
                </a>
            </div>
            
            <!-- Quick Links -->
            <div class="sidebar-section">
                <a href="/friends" class="sidebar-item">
                    <i class="fas fa-user-friends" style="color: #1877f2;"></i>
                    <span>Friends</span>
                </a>
                <a href="/groups" class="sidebar-item">
                    <i class="fas fa-users" style="color: #42b72a;"></i>
                    <span>Groups</span>
                </a>
                <a href="/events" class="sidebar-item">
                    <i class="fas fa-calendar-alt" style="color: #f02849;"></i>
                    <span>Events</span>
                </a>
                <a href="/memories" class="sidebar-item">
                    <i class="fas fa-history" style="color: #f7b928;"></i>
                    <span>Memories</span>
                </a>
                <a href="/saved" class="sidebar-item">
                    <i class="fas fa-bookmark" style="color: #8a3ab9;"></i>
                    <span>Saved</span>
                </a>
            </div>
            
            <!-- Shortcuts -->
            <div class="sidebar-section">
                <h6 style="margin-bottom: 12px; color: #65676b;">Your Shortcuts</h6>
                <a href="/developers" class="sidebar-item">
                    <i class="fas fa-code"></i>
                    <span>Developer Community</span>
                </a>
                <a href="/gaming" class="sidebar-item">
                    <i class="fas fa-gamepad"></i>
                    <span>Gaming</span>
                </a>
                <a href="/watch" class="sidebar-item">
                    <i class="fas fa-play-circle"></i>
                    <span>Watch</span>
                </a>
            </div>
            
            <!-- Footer Links -->
            <div class="sidebar-section" style="font-size: 12px; color: #65676b;">
                <div style="margin-bottom: 8px;">
                    <a href="/privacy" style="color: inherit; text-decoration: none; margin-right: 8px;">Privacy</a>
                    <a href="/terms" style="color: inherit; text-decoration: none; margin-right: 8px;">Terms</a>
                    <a href="/cookies" style="color: inherit; text-decoration: none;">Cookies</a>
                </div>
                <div>SocialConnect © ${new Date().getFullYear()}</div>
            </div>
        </aside>
        ` : ''}
        
        <!-- Main Content Area -->
        <main class="main-content">
            ${content}
        </main>
        
        <!-- Right Sidebar (Only show when left sidebar is shown) -->
        ${showSidebar ? `
        <aside class="right-sidebar">
            <!-- Stories -->
            <div class="sidebar-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h6 style="margin: 0; font-weight: 600;">Stories</h6>
                    <a href="#" style="color: var(--primary-color); text-decoration: none; font-size: 13px;">See all</a>
                </div>
                <div class="stories-container">
                    <div class="story-item create-story">
                        <i class="fas fa-plus" style="font-size: 24px; margin-bottom: 8px;"></i>
                        <span>Create Story</span>
                    </div>
                    <!-- Story items will be loaded dynamically -->
                </div>
            </div>
            
            <!-- Online Friends -->
            <div class="sidebar-section online-friends">
                <h6>Online Friends</h6>
                <div id="onlineFriendsList">
                    <!-- Online friends will be loaded dynamically -->
                </div>
            </div>
            
            <!-- Birthdays -->
            <div class="sidebar-section">
                <h6 style="margin-bottom: 12px; font-weight: 600;">Birthdays</h6>
                <div id="birthdaysList">
                    <!-- Birthdays will be loaded dynamically -->
                </div>
            </div>
            
            <!-- Sponsored -->
            <div class="sidebar-section">
                <h6 style="margin-bottom: 12px; font-weight: 600;">Sponsored</h6>
                <!-- Ad content will be loaded dynamically -->
            </div>
        </aside>
        ` : ''}
    </div>

    <!-- Modals -->
    <div class="modal fade" id="createPostModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Create Post</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="createPostForm">
                        <div class="mb-3">
                            <textarea class="form-control" rows="4" placeholder="What's on your mind?" name="content"></textarea>
                        </div>
                        <div class="mb-3">
                            <select class="form-select" name="privacy">
                                <option value="public">Public</option>
                                <option value="friends">Friends</option>
                                <option value="only_me">Only Me</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <input type="file" class="form-control" id="postMedia" accept="image/*,video/*" multiple>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Post</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/noty/3.1.4/noty.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>
    
    <!-- Global Script -->
    <script>
        // Global variables
        let currentUser = ${user ? JSON.stringify(user) : 'null'};
        let ws = null;
        let notificationCount = 0;
        let messageCount = 0;
        
        // Initialize when DOM loads
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize WebSocket
            initWebSocket();
            
            // Load notifications count
            loadNotificationCount();
            
            // Load online friends
            loadOnlineFriends();
            
            // Initialize tooltips
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
            
            // Initialize post creation
            const postInput = document.querySelector('.post-input');
            if (postInput) {
                postInput.addEventListener('click', function() {
                    const modal = new bootstrap.Modal(document.getElementById('createPostModal'));
                    modal.show();
                });
            }
        });
        
        // WebSocket initialization
        function initWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = protocol + '//' + window.location.host;
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = function() {
                console.log('WebSocket connected');
                if (currentUser) {
                    ws.send(JSON.stringify({
                        type: 'authenticate',
                        userId: currentUser.id,
                        userType: 'user'
                    }));
                }
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
            
            ws.onclose = function() {
                console.log('WebSocket disconnected');
                // Try to reconnect after 5 seconds
                setTimeout(initWebSocket, 5000);
            };
            
            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
        }
        
        // Handle WebSocket messages
        function handleWebSocketMessage(data) {
            switch (data.type) {
                case 'notification':
                    showNotification(data.data);
                    notificationCount++;
                    updateNotificationBadge();
                    break;
                    
                case 'new_message':
                    showMessageNotification(data.data);
                    messageCount++;
                    updateMessageBadge();
                    break;
                    
                case 'friend_online':
                    updateOnlineFriend(data.data.userId, true);
                    break;
                    
                case 'friend_offline':
                    updateOnlineFriend(data.data.userId, false);
                    break;
                    
                case 'new_post':
                    addNewPost(data.data);
                    break;
                    
                case 'typing_indicator':
                    showTypingIndicator(data.data);
                    break;
            }
        }
        
        // Show notification
        function showNotification(data) {
            new Noty({
                type: 'info',
                text: data.message,
                timeout: 5000,
                progressBar: true,
                theme: 'sunset'
            }).show();
        }
        
        // Show message notification
        function showMessageNotification(data) {
            new Noty({
                type: 'success',
                text: 'New message from ' + data.sender,
                timeout: 3000,
                progressBar: true,
                theme: 'sunset'
            }).show();
        }
        
        // Show typing indicator
        function showTypingIndicator(data) {
            // Implement typing indicator UI
            console.log('User is typing:', data);
        }
        
        // Load notification count
        function loadNotificationCount() {
            if (!currentUser) return;
            
            fetch('/api/notifications/unread-count')
                .then(response => response.json())
                .then(data => {
                    notificationCount = data.count || 0;
                    updateNotificationBadge();
                })
                .catch(error => console.error('Error loading notifications:', error));
        }
        
        // Update notification badge
        function updateNotificationBadge() {
            const badge = document.getElementById('notificationCount');
            if (badge) {
                badge.textContent = notificationCount > 99 ? '99+' : notificationCount;
                badge.style.display = notificationCount > 0 ? 'block' : 'none';
            }
        }
        
        // Update message badge
        function updateMessageBadge() {
            const badge = document.getElementById('messageCount');
            if (badge) {
                badge.textContent = messageCount > 99 ? '99+' : messageCount;
                badge.style.display = messageCount > 0 ? 'block' : 'none';
            }
        }
        
        // Load online friends
        function loadOnlineFriends() {
            if (!currentUser) return;
            
            fetch('/api/friends/online')
                .then(response => response.json())
                .then(data => {
                    const container = document.getElementById('onlineFriendsList');
                    if (container && data.friends) {
                        container.innerHTML = data.friends.map(friend => \`
                            <a href="/profile/\${friend.username}" class="friend-item">
                                <div class="friend-avatar">
                                    <img src="\${friend.profile_picture || '/images/default-avatar.png'}" 
                                         alt="\${friend.first_name}" 
                                         style="width: 100%; height: 100%; border-radius: 50%;">
                                    <div class="online-indicator"></div>
                                </div>
                                <span>\${friend.first_name} \${friend.last_name}</span>
                            </a>
                        \`).join('');
                    }
                })
                .catch(error => console.error('Error loading online friends:', error));
        }
        
        // Update online friend status
        function updateOnlineFriend(userId, isOnline) {
            const friendItem = document.querySelector(\`.friend-item[data-user-id="\${userId}"]\`);
            if (friendItem) {
                const indicator = friendItem.querySelector('.online-indicator');
                if (indicator) {
                    indicator.style.display = isOnline ? 'block' : 'none';
                }
            }
        }
        
        // Add new post to feed
        function addNewPost(post) {
            const feed = document.getElementById('postsFeed');
            if (feed) {
                const postElement = createPostElement(post);
                feed.insertBefore(postElement, feed.firstChild);
            }
        }
        
        // Create post element
        function createPostElement(post) {
            return \`
                <div class="post-card fade-in">
                    <div class="post-header">
                        <img src="\${post.author.profile_picture || '/images/default-avatar.png'}" 
                             alt="\${post.author.first_name}" 
                             class="post-author-avatar">
                        <div class="post-info">
                            <h6>\${post.author.first_name} \${post.author.last_name}</h6>
                            <div class="post-time">\${formatTime(post.created_at)}</div>
                        </div>
                    </div>
                    <div class="post-content">
                        \${post.content}
                    </div>
                    <div class="post-stats">
                        <span>\${post.likes_count} likes</span>
                        <span>\${post.comments_count} comments</span>
                        <span>\${post.shares_count} shares</span>
                    </div>
                    <div class="post-actions-bar">
                        <button class="post-action-button" onclick="likePost(\${post.id})">
                            <i class="fas fa-thumbs-up"></i> Like
                        </button>
                        <button class="post-action-button" onclick="commentOnPost(\${post.id})">
                            <i class="fas fa-comment"></i> Comment
                        </button>
                        <button class="post-action-button" onclick="sharePost(\${post.id})">
                            <i class="fas fa-share"></i> Share
                        </button>
                    </div>
                </div>
            \`;
        }
        
        // Format time
        function formatTime(timestamp) {
            return moment(timestamp).fromNow();
        }
        
        // Toggle user menu
        function toggleUserMenu() {
            const dropdown = document.getElementById('userDropdown');
            dropdown.classList.toggle('show');
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('userDropdown');
            const avatar = document.querySelector('.user-avatar');
            
            if (dropdown && avatar && !dropdown.contains(event.target) && !avatar.contains(event.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        // Create post
        document.getElementById('createPostForm')?.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const content = this.querySelector('[name="content"]').value;
            const privacy = this.querySelector('[name="privacy"]').value;
            const files = document.getElementById('postMedia').files;
            
            formData.append('content', content);
            formData.append('privacy', privacy);
            
            // Add files to FormData
            for (let i = 0; i < files.length; i++) {
                formData.append('media', files[i]);
            }
            
            fetch('/api/posts/create', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('createPostModal'));
                    modal.hide();
                    this.reset();
                    
                    new Noty({
                        type: 'success',
                        text: 'Post created successfully!',
                        timeout: 3000
                    }).show();
                } else {
                    new Noty({
                        type: 'error',
                        text: data.message || 'Failed to create post',
                        timeout: 3000
                    }).show();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                new Noty({
                    type: 'error',
                    text: 'An error occurred',
                    timeout: 3000
                }).show();
            });
        });
        
        // Like post
        function likePost(postId) {
            fetch(\`/api/posts/\${postId}/like\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    new Noty({
                        type: 'success',
                        text: 'Post liked!',
                        timeout: 2000
                    }).show();
                }
            })
            .catch(error => console.error('Error liking post:', error));
        }
        
        // Comment on post
        function commentOnPost(postId) {
            const comment = prompt('Enter your comment:');
            if (comment) {
                fetch(\`/api/posts/\${postId}/comment\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: comment })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        new Noty({
                            type: 'success',
                            text: 'Comment posted!',
                            timeout: 2000
                        }).show();
                    }
                })
                .catch(error => console.error('Error commenting on post:', error));
            }
        }
        
        // Share post
        function sharePost(postId) {
            fetch(\`/api/posts/\${postId}/share\`, {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    new Noty({
                        type: 'success',
                        text: 'Post shared successfully!',
                        timeout: 3000
                    }).show();
                }
            })
            .catch(error => console.error('Error sharing post:', error));
        }
        
        // Real-time monitoring functions
        function updateRealTimeStats() {
            if (!currentUser) return;
            
            fetch('/api/stats/realtime')
                .then(response => response.json())
                .then(data => {
                    // Update real-time stats display
                    console.log('Real-time stats:', data);
                })
                .catch(error => console.error('Error updating real-time stats:', error));
        }
        
        // Update stats every 10 seconds
        setInterval(updateRealTimeStats, 10000);
        
        // Initialize real-time updates
        updateRealTimeStats();
    </script>
</body>
</html>`;
}

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        return res.redirect('/login');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.adminId) {
        return res.redirect('/admin/login');
    }
    next();
};

// Routes
app.get('/', async (req, res) => {
    try {
        utilities.trackPageView(req, req.session.userId);
        
        if (req.session.userId) {
            // User is logged in, show dashboard
            db.get("SELECT * FROM users WHERE id = ?", [req.session.userId], (err, user) => {
                if (err) {
                    console.error('Error fetching user:', err);
                    return res.status(500).send('Internal server error');
                }
                
                if (user) {
                    // Get user's feed posts
                    db.all(`
                        SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture 
                        FROM posts p 
                        JOIN users u ON p.user_id = u.id 
                        WHERE p.privacy = 'public' 
                           OR (p.privacy = 'friends' AND EXISTS (
                               SELECT 1 FROM friends f 
                               WHERE f.user_id = ? AND f.friend_id = p.user_id AND f.status = 'accepted'
                           ))
                           OR p.user_id = ?
                        ORDER BY p.created_at DESC 
                        LIMIT 20
                    `, [req.session.userId, req.session.userId], (err, posts) => {
                        if (err) {
                            console.error('Error fetching posts:', err);
                            return res.status(500).send('Internal server error');
                        }
                        
                        const content = generateDashboardContent(posts);
                        res.send(generateHTML('Home', content, { 
                            user: user, 
                            activeTab: 'home',
                            showSidebar: true 
                        }));
                    });
                } else {
                    res.redirect('/login');
                }
            });
        } else {
            // User is not logged in, show landing page
            const content = generateLandingPage();
            res.send(generateHTML('Welcome', content, { showSidebar: false }));
        }
    } catch (error) {
        console.error('Home route error:', error);
        res.status(500).send('Internal server error');
    }
});

function generateDashboardContent(posts) {
    return `
    <!-- Post Creator -->
    <div class="post-creator">
        <div class="post-input" data-bs-toggle="modal" data-bs-target="#createPostModal">
            What's on your mind?
        </div>
        <div class="post-actions">
            <button class="post-action" onclick="document.getElementById('postMedia').click()">
                <i class="fas fa-image" style="color: #45bd62;"></i>
                <span>Photo/Video</span>
            </button>
            <button class="post-action" onclick="showFeelingModal()">
                <i class="fas fa-smile" style="color: #f7b928;"></i>
                <span>Feeling/Activity</span>
            </button>
            <button class="post-action" onclick="showLiveVideoModal()">
                <i class="fas fa-video" style="color: #f02849;"></i>
                <span>Live Video</span>
            </button>
        </div>
    </div>
    
    <!-- Posts Feed -->
    <div id="postsFeed">
        ${posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <img src="${post.profile_picture || '/images/default-avatar.png'}" 
                     alt="${post.first_name}" 
                     class="post-author-avatar">
                <div class="post-info">
                    <h6>${post.first_name} ${post.last_name}</h6>
                    <div class="post-time">${utilities.formatDate(post.created_at)} • <i class="fas fa-globe-americas"></i></div>
                </div>
                <div class="dropdown ms-auto">
                    <button class="btn btn-sm" type="button" data-bs-toggle="dropdown">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#">Save post</a></li>
                        <li><a class="dropdown-item" href="#">Hide post</a></li>
                        <li><a class="dropdown-item" href="#">Report post</a></li>
                    </ul>
                </div>
            </div>
            <div class="post-content">
                <p>${post.content}</p>
            </div>
            ${post.media_urls ? `
            <div class="post-media">
                <img src="${JSON.parse(post.media_urls)[0]}" alt="Post media">
            </div>
            ` : ''}
            <div class="post-stats">
                <span>${post.likes_count} likes</span>
                <span>${post.comments_count} comments</span>
                <span>${post.shares_count} shares</span>
            </div>
            <div class="post-actions-bar">
                <button class="post-action-button" onclick="likePost(${post.id})">
                    <i class="fas fa-thumbs-up"></i> Like
                </button>
                <button class="post-action-button" onclick="commentOnPost(${post.id})">
                    <i class="fas fa-comment"></i> Comment
                </button>
                <button class="post-action-button" onclick="sharePost(${post.id})">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
            
            <!-- Comments Section -->
            <div class="comments-section" id="comments-${post.id}" style="display: none;">
                <div class="comment-input-container p-3">
                    <div class="input-group">
                        <input type="text" class="form-control" placeholder="Write a comment..." id="commentInput-${post.id}">
                        <button class="btn btn-primary" onclick="submitComment(${post.id})">Post</button>
                    </div>
                </div>
            </div>
        </div>
        `).join('')}
        
        ${posts.length === 0 ? `
        <div class="post-card text-center p-5">
            <i class="fas fa-newspaper fa-3x text-muted mb-3"></i>
            <h5>No posts to show</h5>
            <p>Start by following people or creating your first post!</p>
        </div>
        ` : ''}
    </div>
    
    <!-- Loading Spinner -->
    <div id="loadingPosts" class="text-center my-4" style="display: none;">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>
    
    <!-- End of Feed Message -->
    <div class="text-center text-muted my-4">
        <p>You're all caught up! 🎉</p>
    </div>
    `;
}

function generateLandingPage() {
    return `
    <div class="container-fluid">
        <div class="row align-items-center min-vh-100">
            <!-- Left Column - Branding -->
            <div class="col-lg-6 bg-primary text-white min-vh-100 d-flex align-items-center">
                <div class="p-5">
                    <h1 class="display-3 fw-bold mb-4">${config.site.title}</h1>
                    <p class="lead mb-4">${config.site.tagline}</p>
                    
                    <div class="features-list mb-5">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-user-friends fa-2x me-3"></i>
                            <div>
                                <h5>Connect with Friends</h5>
                                <p class="mb-0">Stay in touch with friends and family</p>
                            </div>
                        </div>
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-newspaper fa-2x me-3"></i>
                            <div>
                                <h5>Share What Matters</h5>
                                <p class="mb-0">Share updates, photos, and videos</p>
                            </div>
                        </div>
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-users fa-2x me-3"></i>
                            <div>
                                <h5>Join Communities</h5>
                                <p class="mb-0">Connect with people who share your interests</p>
                            </div>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-chart-line fa-2x me-3"></i>
                            <div>
                                <h5>Real-time Analytics</h5>
                                <p class="mb-0">Monitor your social presence in real-time</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats mt-5">
                        <div class="row text-center">
                            <div class="col-4">
                                <h3 class="fw-bold">10K+</h3>
                                <p>Active Users</p>
                            </div>
                            <div class="col-4">
                                <h3 class="fw-bold">50K+</h3>
                                <p>Posts Shared</p>
                            </div>
                            <div class="col-4">
                                <h3 class="fw-bold">100K+</h3>
                                <p>Connections</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Right Column - Login/Signup -->
            <div class="col-lg-6">
                <div class="p-5">
                    <div class="card shadow-lg border-0">
                        <div class="card-body p-5">
                            <h2 class="text-center mb-4">Create an account</h2>
                            
                            <form id="signupForm" action="/auth/register" method="POST">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <input type="text" class="form-control form-control-lg" 
                                               name="first_name" placeholder="First name" required>
                                    </div>
                                    <div class="col-md-6">
                                        <input type="text" class="form-control form-control-lg" 
                                               name="last_name" placeholder="Last name" required>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <input type="email" class="form-control form-control-lg" 
                                           name="email" placeholder="Email address" required>
                                </div>
                                
                                <div class="mb-3">
                                    <input type="password" class="form-control form-control-lg" 
                                           name="password" placeholder="Password" required>
                                </div>
                                
                                <div class="mb-3">
                                    <input type="date" class="form-control form-control-lg" 
                                           name="birth_date" required>
                                    <small class="text-muted">You must be at least 13 years old</small>
                                </div>
                                
                                <div class="mb-3">
                                    <select class="form-select form-select-lg" name="gender" required>
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                        <option value="private">Prefer not to say</option>
                                    </select>
                                </div>
                                
                                <div class="mb-4">
                                    <button type="submit" class="btn btn-primary btn-lg w-100">
                                        Sign Up
                                    </button>
                                </div>
                                
                                <div class="text-center mb-3">
                                    <a href="/login" class="text-decoration-none">Already have an account?</a>
                                </div>
                            </form>
                            
                            <div class="text-center mt-4">
                                <p class="text-muted">
                                    By clicking Sign Up, you agree to our 
                                    <a href="/terms" class="text-decoration-none">Terms</a>, 
                                    <a href="/privacy" class="text-decoration-none">Privacy Policy</a> and 
                                    <a href="/cookies" class="text-decoration-none">Cookies Policy</a>.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quick Stats -->
                    <div class="mt-4 text-center">
                        <p class="text-muted">
                            <i class="fas fa-shield-alt me-2"></i>
                            Secure platform with real-time monitoring
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('signupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/auth/register', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || '/';
                } else {
                    alert(data.message || 'Registration failed');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred during registration');
            });
        });
    </script>
    `;
}

// Login Page
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    
    const content = `
    <div class="container">
        <div class="row justify-content-center mt-5">
            <div class="col-md-6">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-5">
                        <h2 class="text-center mb-4">Log in to ${config.site.title}</h2>
                        
                        <form id="loginForm">
                            <div class="mb-3">
                                <input type="email" class="form-control form-control-lg" 
                                       name="email" placeholder="Email address" required>
                            </div>
                            
                            <div class="mb-3">
                                <input type="password" class="form-control form-control-lg" 
                                       name="password" placeholder="Password" required>
                            </div>
                            
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" name="remember" id="remember">
                                <label class="form-check-label" for="remember">Remember me</label>
                            </div>
                            
                            <div class="mb-4">
                                <button type="submit" class="btn btn-primary btn-lg w-100">
                                    Log In
                                </button>
                            </div>
                            
                            <div class="text-center mb-3">
                                <a href="/forgot-password" class="text-decoration-none">Forgotten password?</a>
                            </div>
                            
                            <div class="text-center">
                                <a href="/" class="btn btn-outline-primary btn-lg w-100">
                                    Create New Account
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Admin Login Link -->
                <div class="text-center mt-3">
                    <a href="/admin/login" class="text-decoration-none">
                        <i class="fas fa-user-shield me-2"></i>
                        Admin Login
                    </a>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/auth/login', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || '/';
                } else {
                    alert(data.message || 'Login failed');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred during login');
            });
        });
    </script>
    `;
    
    res.send(generateHTML('Login', content, { showSidebar: false }));
});

// Authentication routes
app.post('/auth/register', (req, res) => {
    const { first_name, last_name, email, password, birth_date, gender } = req.body;
    
    // Validate input
    if (!utilities.validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    
    if (!utilities.validatePassword(password)) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    
    // Check age requirement
    const birthDate = new Date(birth_date);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    if (age < 13) {
        return res.status(400).json({ success: false, message: 'You must be at least 13 years old' });
    }
    
    // Check if user exists
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        
        if (user) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);
        const username = utilities.generateUsername(first_name, last_name);
        
        // Create user
        db.run(`INSERT INTO users (username, email, password, first_name, last_name, birth_date, gender) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, first_name, last_name, birth_date, gender],
            function(err) {
                if (err) {
                    console.error('Registration error:', err);
                    return res.status(500).json({ success: false, message: 'Registration failed' });
                }
                
                const userId = this.lastID;
                
                // Create session
                req.session.userId = userId;
                
                // Log activity
                utilities.logActivity(userId, 'user_registered', { ip: req.ip });
                
                res.json({ 
                    success: true, 
                    message: 'Registration successful',
                    redirect: '/'
                });
            }
        );
    });
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        if (!user.active) {
            return res.status(403).json({ success: false, message: 'Account is deactivated' });
        }
        
        // Update last login
        db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
        
        // Create session
        req.session.userId = user.id;
        
        // Create user session record
        db.run(`INSERT INTO user_sessions (user_id, session_id, ip_address, user_agent) 
                VALUES (?, ?, ?, ?)`,
            [user.id, req.sessionID, req.ip, req.get('user-agent')],
            (err) => {
                if (err) console.error('Error creating session record:', err);
            });
        
        // Log activity
        utilities.logActivity(user.id, 'user_login', { ip: req.ip });
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            redirect: '/'
        });
    });
});

app.get('/logout', (req, res) => {
    if (req.session.userId) {
        // Update session record
        db.run("UPDATE user_sessions SET logout_time = CURRENT_TIMESTAMP, active = 0 WHERE session_id = ?", 
            [req.sessionID],
            (err) => {
                if (err) console.error('Error updating session:', err);
            });
        
        utilities.logActivity(req.session.userId, 'user_logout', { ip: req.ip });
    }
    
    req.session.destroy();
    res.redirect('/login');
});

// Admin routes
app.get('/admin/login', (req, res) => {
    if (req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }
    
    const content = `
    <div class="container">
        <div class="row justify-content-center align-items-center min-vh-100">
            <div class="col-md-5">
                <div class="card border-0 shadow-lg">
                    <div class="card-body p-5">
                        <div class="text-center mb-4">
                            <i class="fas fa-chart-line fa-3x text-primary mb-3"></i>
                            <h2>Admin Dashboard</h2>
                            <p class="text-muted">Real-time Monitoring System</p>
                        </div>
                        
                        <form id="adminLoginForm">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control form-control-lg" 
                                       name="username" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control form-control-lg" 
                                       name="password" required>
                            </div>
                            
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" name="remember" id="adminRemember">
                                <label class="form-check-label" for="adminRemember">Remember me</label>
                            </div>
                            
                            <button type="submit" class="btn btn-primary btn-lg w-100">
                                <i class="fas fa-sign-in-alt me-2"></i>Login
                            </button>
                        </form>
                        
                        <div class="text-center mt-4">
                            <a href="/" class="text-decoration-none">
                                <i class="fas fa-arrow-left me-2"></i>
                                Back to Main Site
                            </a>
                        </div>
                    </div>
                </div>
                
                <!-- Security Notice -->
                <div class="alert alert-info mt-3">
                    <i class="fas fa-shield-alt me-2"></i>
                    Access is restricted to authorized personnel only
                </div>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/admin/auth/login', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/admin/dashboard';
                } else {
                    alert(data.message || 'Login failed');
                }
            });
        });
    </script>
    `;
    
    res.send(generateHTML('Admin Login', content, { showSidebar: false }));
});

app.post('/admin/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM admin_users WHERE username = ?", [username], (err, admin) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        
        if (!admin || !bcrypt.compareSync(password, admin.password)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        req.session.adminId = admin.id;
        req.session.adminRole = admin.role;
        
        // Update last login
        db.run("UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [admin.id]);
        
        res.json({ success: true });
    });
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

app.get('/admin/dashboard', requireAdmin, (req, res) => {
    // Get dashboard statistics
    Promise.all([
        new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                if (err) {
                    console.error('Error getting user count:', err);
                    resolve(0);
                } else {
                    resolve(row.count);
                }
            });
        }),
        new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM posts WHERE DATE(created_at) = DATE('now')", (err, row) => {
                if (err) {
                    console.error('Error getting today posts:', err);
                    resolve(0);
                } else {
                    resolve(row.count);
                }
            });
        }),
        new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM user_sessions WHERE active = 1", (err, row) => {
                if (err) {
                    console.error('Error getting active sessions:', err);
                    resolve(0);
                } else {
                    resolve(row.count);
                }
            });
        }),
        new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM messages WHERE DATE(created_at) = DATE('now')", (err, row) => {
                if (err) {
                    console.error('Error getting today messages:', err);
                    resolve(0);
                } else {
                    resolve(row.count);
                }
            });
        }),
        new Promise((resolve) => {
            db.get(`SELECT 
                (SELECT COUNT(*) FROM posts WHERE DATE(created_at) = DATE('now')) as posts_today,
                (SELECT COUNT(*) FROM posts WHERE DATE(created_at) = DATE('now', '-1 day')) as posts_yesterday,
                (SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE('now')) as users_today,
                (SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE('now', '-1 day')) as users_yesterday
            `, (err, row) => {
                if (err) {
                    console.error('Error getting growth data:', err);
                    resolve({ posts_today: 0, posts_yesterday: 0, users_today: 0, users_yesterday: 0 });
                } else {
                    resolve(row);
                }
            });
        })
    ]).then(([totalUsers, todayPosts, activeSessions, todayMessages, growth]) => {
        
        const content = generateAdminDashboard({
            totalUsers,
            todayPosts,
            activeSessions,
            todayMessages,
            growth
        });
        
        res.send(generateHTML('Admin Dashboard', content, { 
            isAdmin: true,
            showSidebar: false 
        }));
    });
});

function generateAdminDashboard(stats) {
    return `
    <div class="container-fluid">
        <!-- Dashboard Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="h3 mb-2">Dashboard Overview</h1>
                <p class="text-muted">Real-time monitoring and analytics</p>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-outline-primary" onclick="refreshStats()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <button class="btn btn-primary" onclick="exportReport()">
                    <i class="fas fa-download"></i> Export Report
                </button>
            </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="row mb-4">
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card border-left-primary shadow h-100 py-2 dashboard-card">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                    Total Users
                                </div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.totalUsers}</div>
                                <div class="mt-2 mb-0 text-muted text-xs">
                                    <span class="${stats.growth.users_today > stats.growth.users_yesterday ? 'text-success' : 'text-danger'} mr-2">
                                        <i class="fas ${stats.growth.users_today > stats.growth.users_yesterday ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                                        ${Math.abs(stats.growth.users_today - stats.growth.users_yesterday)}
                                    </span>
                                    <span>Since yesterday</span>
                                </div>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-users fa-2x text-gray-300"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card border-left-success shadow h-100 py-2 dashboard-card">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                    Active Sessions
                                </div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.activeSessions}</div>
                                <div class="mt-2 mb-0 text-muted text-xs">
                                    <span class="text-success mr-2">
                                        <i class="fas fa-computer"></i>
                                    </span>
                                    <span>Currently online</span>
                                </div>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-signal fa-2x text-gray-300"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card border-left-info shadow h-100 py-2 dashboard-card">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                    Posts Today
                                </div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.todayPosts}</div>
                                <div class="mt-2 mb-0 text-muted text-xs">
                                    <span class="${stats.growth.posts_today > stats.growth.posts_yesterday ? 'text-success' : 'text-danger'} mr-2">
                                        <i class="fas ${stats.growth.posts_today > stats.growth.posts_yesterday ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                                        ${Math.abs(stats.growth.posts_today - stats.growth.posts_yesterday)}
                                    </span>
                                    <span>Since yesterday</span>
                                </div>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-newspaper fa-2x text-gray-300"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card border-left-warning shadow h-100 py-2 dashboard-card">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                    Messages Today
                                </div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.todayMessages}</div>
                                <div class="mt-2 mb-0 text-muted text-xs">
                                    <span class="text-success mr-2">
                                        <i class="fas fa-comments"></i>
                                    </span>
                                    <span>Real-time</span>
                                </div>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-comment-dots fa-2x text-gray-300"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Charts and Monitoring -->
        <div class="row">
            <!-- Real-time Activity -->
            <div class="col-xl-8 col-lg-7">
                <div class="card shadow mb-4">
                    <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                        <h6 class="m-0 font-weight-bold text-primary">Real-time Activity Monitor</h6>
                        <div class="dropdown no-arrow">
                            <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" 
                                    data-bs-toggle="dropdown">
                                <i class="fas fa-filter"></i> Filter
                            </button>
                            <div class="dropdown-menu">
                                <a class="dropdown-item" href="#" onclick="filterActivity('all')">All Activities</a>
                                <a class="dropdown-item" href="#" onclick="filterActivity('posts')">Posts</a>
                                <a class="dropdown-item" href="#" onclick="filterActivity('messages')">Messages</a>
                                <a class="dropdown-item" href="#" onclick="filterActivity('logins')">Logins</a>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-area">
                            <canvas id="activityChart"></canvas>
                        </div>
                        <div class="mt-3">
                            <div id="realtimeActivity" style="height: 300px; overflow-y: auto;">
                                <!-- Activity will be loaded dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Performance Metrics -->
                <div class="card shadow mb-4">
                    <div class="card-header py-3">
                        <h6 class="m-0 font-weight-bold text-primary">System Performance</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card mb-3 border-0 bg-light">
                                    <div class="card-body">
                                        <h6 class="card-title">Response Time</h6>
                                        <h2 class="text-success">142ms</h2>
                                        <small class="text-muted">Average API response time</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-3 border-0 bg-light">
                                    <div class="card-body">
                                        <h6 class="card-title">Uptime</h6>
                                        <h2 class="text-success">99.98%</h2>
                                        <small class="text-muted">Last 30 days</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- System Status -->
            <div class="col-xl-4 col-lg-5">
                <div class="card shadow mb-4">
                    <div class="card-header py-3">
                        <h6 class="m-0 font-weight-bold text-primary">System Status</h6>
                    </div>
                    <div class="card-body">
                        <div class="system-status">
                            <div class="status-item mb-3">
                                <div class="d-flex justify-content-between">
                                    <span>Web Server</span>
                                    <span class="badge bg-success">Running</span>
                                </div>
                                <div class="progress mt-1" style="height: 5px;">
                                    <div class="progress-bar bg-success" style="width: 100%"></div>
                                </div>
                            </div>
                            
                            <div class="status-item mb-3">
                                <div class="d-flex justify-content-between">
                                    <span>Database</span>
                                    <span class="badge bg-success">Connected</span>
                                </div>
                                <div class="progress mt-1" style="height: 5px;">
                                    <div class="progress-bar bg-success" style="width: 100%"></div>
                                </div>
                            </div>
                            
                            <div class="status-item mb-3">
                                <div class="d-flex justify-content-between">
                                    <span>WebSocket</span>
                                    <span class="badge bg-success">Active</span>
                                </div>
                                <div class="progress mt-1" style="height: 5px;">
                                    <div class="progress-bar bg-success" style="width: 100%"></div>
                                </div>
                            </div>
                            
                            <div class="status-item mb-3">
                                <div class="d-flex justify-content-between">
                                    <span>CPU Usage</span>
                                    <span class="badge bg-warning">42%</span>
                                </div>
                                <div class="progress mt-1" style="height: 5px;">
                                    <div class="progress-bar bg-warning" style="width: 42%"></div>
                                </div>
                            </div>
                            
                            <div class="status-item">
                                <div class="d-flex justify-content-between">
                                    <span>Memory Usage</span>
                                    <span class="badge bg-info">68%</span>
                                </div>
                                <div class="progress mt-1" style="height: 5px;">
                                    <div class="progress-bar bg-info" style="width: 68%"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <h6 class="font-weight-bold">Recent Alerts</h6>
                            <div id="recentAlerts" class="mt-2">
                                <!-- Alerts will be loaded dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- User Activity Heatmap -->
                <div class="card shadow">
                    <div class="card-header py-3">
                        <h6 class="m-0 font-weight-bold text-primary">User Activity Heatmap</h6>
                    </div>
                    <div class="card-body">
                        <div class="text-center">
                            <canvas id="heatmapChart" width="300" height="200"></canvas>
                        </div>
                        <div class="text-center mt-3">
                            <small class="text-muted">Peak activity: 6:00 PM - 9:00 PM</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Recent Users Table -->
        <div class="card shadow mb-4">
            <div class="card-header py-3">
                <h6 class="m-0 font-weight-bold text-primary">Recent User Activity</h6>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered" id="userActivityTable" width="100%" cellspacing="0">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Activity</th>
                                <th>IP Address</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="userActivityBody">
                            <!-- Data will be loaded dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Charts JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <script>
        // Initialize charts
        let activityChart = null;
        let heatmapChart = null;
        
        function initCharts() {
            // Activity Chart
            const ctx1 = document.getElementById('activityChart').getContext('2d');
            activityChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM'],
                    datasets: [{
                        label: 'User Activity',
                        data: [65, 79, 90, 81, 156, 155, 140],
                        borderColor: '#1877f2',
                        backgroundColor: 'rgba(24, 119, 242, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // Heatmap Chart
            const ctx2 = document.getElementById('heatmapChart').getContext('2d');
            heatmapChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Activity',
                        data: [65, 59, 80, 81, 56, 55, 40],
                        backgroundColor: '#1877f2'
                    }]
                },
                options: {
                    responsive: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
        
        // Load real-time data
        function loadRealtimeData() {
            fetch('/admin/api/realtime-data')
                .then(response => response.json())
                .then(data => {
                    // Update activity feed
                    updateActivityFeed(data.activities);
                    
                    // Update user activity table
                    updateUserActivityTable(data.userActivities);
                    
                    // Update recent alerts
                    updateRecentAlerts(data.alerts);
                    
                    // Update charts
                    updateCharts(data.chartData);
                })
                .catch(error => console.error('Error loading real-time data:', error));
        }
        
        function updateActivityFeed(activities) {
            const container = document.getElementById('realtimeActivity');
            if (activities && activities.length > 0) {
                container.innerHTML = activities.map(activity => \`
                    <div class="activity-item p-2 border-bottom">
                        <div class="d-flex">
                            <div class="flex-shrink-0">
                                <i class="fas \${getActivityIcon(activity.type)} text-primary"></i>
                            </div>
                            <div class="flex-grow-1 ms-3">
                                <small class="text-muted">\${formatTime(activity.time)}</small>
                                <div>\${activity.message}</div>
                            </div>
                        </div>
                    </div>
                \`).join('');
            } else {
                container.innerHTML = '<p class="text-center text-muted">No recent activities</p>';
            }
        }
        
        function getActivityIcon(type) {
            switch(type) {
                case 'post': return 'fa-newspaper';
                case 'message': return 'fa-comment';
                case 'login': return 'fa-sign-in-alt';
                case 'register': return 'fa-user-plus';
                default: return 'fa-circle';
            }
        }
        
        function formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString();
        }
        
        function updateUserActivityTable(activities) {
            const tbody = document.getElementById('userActivityBody');
            if (activities && activities.length > 0) {
                tbody.innerHTML = activities.map(activity => \`
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="\${activity.avatar}" 
                                     class="rounded-circle me-2" 
                                     width="30" height="30">
                                <div>
                                    <div>\${activity.name}</div>
                                    <small class="text-muted">@\${activity.username}</small>
                                </div>
                            </div>
                        </td>
                        <td>\${activity.action}</td>
                        <td><code>\${activity.ip}</code></td>
                        <td>\${new Date(activity.time).toLocaleString()}</td>
                        <td>
                            <span class="badge bg-\${activity.status === 'success' ? 'success' : 'warning'}">
                                \${activity.status}
                            </span>
                        </td>
                    </tr>
                \`).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No user activities</td></tr>';
            }
        }
        
        function updateRecentAlerts(alerts) {
            const container = document.getElementById('recentAlerts');
            if (alerts && alerts.length > 0) {
                container.innerHTML = alerts.map(alert => \`
                    <div class="alert alert-\${alert.level} alert-dismissible fade show py-2" role="alert">
                        <small>
                            <i class="fas \${getAlertIcon(alert.level)} me-2"></i>
                            \${alert.message}
                        </small>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                \`).join('');
            } else {
                container.innerHTML = '<p class="text-muted">No recent alerts</p>';
            }
        }
        
        function getAlertIcon(level) {
            switch(level) {
                case 'error': return 'fa-exclamation-triangle';
                case 'warning': return 'fa-exclamation-circle';
                case 'info': return 'fa-info-circle';
                default: return 'fa-bell';
            }
        }
        
        function updateCharts(chartData) {
            if (chartData && activityChart) {
                activityChart.data.datasets[0].data = chartData.activity;
                activityChart.update();
            }
        }
        
        function filterActivity(type) {
            // Implement filtering logic
            console.log('Filter by:', type);
        }
        
        function refreshStats() {
            loadRealtimeData();
            showNotification('Stats refreshed successfully', 'success');
        }
        
        function exportReport() {
            // Implement export functionality
            showNotification('Report export started', 'info');
        }
        
        function showNotification(message, type) {
            const alert = document.createElement('div');
            alert.className = \`alert alert-\${type} alert-dismissible fade show position-fixed\`;
            alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
            alert.innerHTML = \`
                \${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            \`;
            document.body.appendChild(alert);
            
            setTimeout(() => {
                alert.remove();
            }, 3000);
        }
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', function() {
            initCharts();
            loadRealtimeData();
            
            // Refresh data every 10 seconds
            setInterval(loadRealtimeData, 10000);
        });
    </script>
    `;
}

// API Routes
app.get('/api/notifications/unread-count', requireAuth, (req, res) => {
    db.get("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0", 
        [req.session.userId], (err, row) => {
            if (err) {
                console.error('Error getting notification count:', err);
                return res.status(500).json({ count: 0 });
            }
            res.json({ count: row.count });
        });
});

app.get('/api/friends/online', requireAuth, (req, res) => {
    utilities.getOnlineFriends(req.session.userId, (friends) => {
        res.json({ friends });
    });
});

app.post('/api/posts/create', requireAuth, upload.array('media', 10), (req, res) => {
    const { content, privacy } = req.body;
    const userId = req.session.userId;
    
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Content is required' });
    }
    
    // Handle file uploads
    let mediaUrls = null;
    if (req.files && req.files.length > 0) {
        // In production, you would upload to cloud storage
        // For demo, we'll just store the file names
        mediaUrls = JSON.stringify(req.files.map(file => `/uploads/${file.originalname}`));
    }
    
    db.run(`INSERT INTO posts (user_id, content, media_urls, privacy) VALUES (?, ?, ?, ?)`,
        [userId, content, mediaUrls, privacy || 'public'],
        function(err) {
            if (err) {
                console.error('Error creating post:', err);
                return res.status(500).json({ success: false, message: 'Failed to create post' });
            }
            
            // Log activity
            utilities.logActivity(userId, 'post_created', { ip: req.ip });
            
            res.json({ 
                success: true, 
                message: 'Post created successfully',
                postId: this.lastID
            });
        });
});

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    
    // Check if already liked
    db.get("SELECT id FROM likes WHERE post_id = ? AND user_id = ?", [postId, userId], (err, existing) => {
        if (err) {
            console.error('Error checking like:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        
        if (existing) {
            // Unlike
            db.run("DELETE FROM likes WHERE id = ?", [existing.id], (err) => {
                if (err) {
                    console.error('Error removing like:', err);
                    return res.status(500).json({ success: false, message: 'Failed to remove like' });
                }
                
                db.run("UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?", [postId]);
                res.json({ success: true, message: 'Post unliked', liked: false });
            });
        } else {
            // Like
            db.run("INSERT INTO likes (post_id, user_id) VALUES (?, ?)", [postId, userId], (err) => {
                if (err) {
                    console.error('Error adding like:', err);
                    return res.status(500).json({ success: false, message: 'Failed to like post' });
                }
                
                db.run("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", [postId]);
                
                // Send notification to post owner
                db.get("SELECT user_id FROM posts WHERE id = ?", [postId], (err, post) => {
                    if (post && post.user_id !== userId) {
                        utilities.sendNotification(
                            post.user_id,
                            'like',
                            userId,
                            postId,
                            'liked your post'
                        );
                    }
                });
                
                res.json({ success: true, message: 'Post liked', liked: true });
            });
        }
    });
});

app.post('/api/posts/:id/comment', requireAuth, (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.session.userId;
    
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Comment content is required' });
    }
    
    db.run("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
        [postId, userId, content],
        function(err) {
            if (err) {
                console.error('Error adding comment:', err);
                return res.status(500).json({ success: false, message: 'Failed to add comment' });
            }
            
            // Update comment count
            db.run("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?", [postId]);
            
            // Send notification to post owner
            db.get("SELECT user_id FROM posts WHERE id = ?", [postId], (err, post) => {
                if (post && post.user_id !== userId) {
                    utilities.sendNotification(
                        post.user_id,
                        'comment',
                        userId,
                        postId,
                        'commented on your post'
                    );
                }
            });
            
            res.json({ 
                success: true, 
                message: 'Comment added',
                commentId: this.lastID
            });
        });
});

app.post('/api/posts/:id/share', requireAuth, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    
    // Create a new post that shares the original
    db.get("SELECT * FROM posts WHERE id = ?", [postId], (err, originalPost) => {
        if (err || !originalPost) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        const sharedContent = `Shared: ${originalPost.content}`;
        
        db.run("INSERT INTO posts (user_id, content, privacy) VALUES (?, ?, ?)",
            [userId, sharedContent, 'public'],
            function(err) {
                if (err) {
                    console.error('Error sharing post:', err);
                    return res.status(500).json({ success: false, message: 'Failed to share post' });
                }
                
                // Update share count
                db.run("UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?", [postId]);
                
                res.json({ 
                    success: true, 
                    message: 'Post shared successfully',
                    postId: this.lastID
                });
            });
    });
});

app.get('/admin/api/realtime-data', requireAdmin, (req, res) => {
    // Get real-time data for admin dashboard
    Promise.all([
        new Promise((resolve) => {
            db.all(`
                SELECT * FROM system_logs 
                ORDER BY created_at DESC 
                LIMIT 10
            `, (err, logs) => {
                if (err) {
                    console.error('Error getting system logs:', err);
                    resolve([]);
                } else {
                    resolve(logs);
                }
            });
        }),
        new Promise((resolve) => {
            db.all(`
                SELECT u.username, u.first_name, u.last_name, u.profile_picture as avatar,
                       sl.message as action, sl.ip_address as ip, 
                       sl.created_at as time, 'success' as status
                FROM system_logs sl
                JOIN users u ON sl.user_id = u.id
                WHERE sl.level IN ('info', 'warning')
                ORDER BY sl.created_at DESC
                LIMIT 10
            `, (err, activities) => {
                if (err) {
                    console.error('Error getting user activities:', err);
                    resolve([]);
                } else {
                    resolve(activities);
                }
            });
        }),
        new Promise((resolve) => {
            db.all(`
                SELECT * FROM system_logs 
                WHERE level IN ('error', 'warning')
                ORDER BY created_at DESC 
                LIMIT 5
            `, (err, alerts) => {
                if (err) {
                    console.error('Error getting alerts:', err);
                    resolve([]);
                } else {
                    resolve(alerts);
                }
            });
        })
    ]).then(([logs, activities, alerts]) => {
        res.json({
            activities: logs.map(log => ({
                type: log.module,
                message: log.message,
                time: log.created_at
            })),
            userActivities: activities,
            alerts: alerts.map(alert => ({
                level: alert.level,
                message: alert.message
            })),
            chartData: {
                activity: [65, 79, 90, 81, 156, 155, 140]
            }
        });
    });
});

// 404 Error handler
app.use((req, res) => {
    res.status(404).send(generateHTML('Page Not Found', `
        <div class="container text-center py-5">
            <h1 class="display-1 text-muted">404</h1>
            <h2>Page Not Found</h2>
            <p class="lead">The page you're looking for doesn't exist.</p>
            <a href="/" class="btn btn-primary btn-lg mt-3">
                <i class="fas fa-home me-2"></i>Go Home
            </a>
        </div>
    `, { showSidebar: false }));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Log the error
    db.run(`INSERT INTO system_logs (level, message, module, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)`,
        ['error', err.message, 'server', req.ip, req.get('user-agent')],
        () => {
            res.status(500).send(generateHTML('Server Error', `
                <div class="container text-center py-5">
                    <h1 class="display-1 text-danger">500</h1>
                    <h2>Internal Server Error</h2>
                    <p class="lead">Something went wrong on our end. Please try again later.</p>
                    <a href="/" class="btn btn-primary btn-lg mt-3">
                        <i class="fas fa-home me-2"></i>Go Home
                    </a>
                </div>
            `, { showSidebar: false }));
        });
});

// Cleanup old logs (run daily)
setInterval(() => {
    db.run(`DELETE FROM system_logs WHERE created_at < DATE('now', '-${config.monitoring.log_retention_days} days')`, (err) => {
        if (err) {
            console.error('Error cleaning up old logs:', err);
        } else {
            console.log('Cleaned up old logs');
        }
    });
}, 24 * 60 * 60 * 1000); // Daily

// Start server
const startServer = async () => {
    try {
        // Initialize database
        await initializeDatabase();
        
        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`
    🚀 SocialConnect Pro Server Running
    🔗 Local: http://localhost:${PORT}
    🔗 Admin: http://localhost:${PORT}/admin/login
    
    📊 Features:
    ✅ Facebook-like Desktop Interface
    ✅ Real-time Monitoring Dashboard
    ✅ User Activity Tracking
    ✅ Live Notifications
    ✅ Posts, Comments, Likes
    ✅ Friends System
    ✅ Groups & Events
    ✅ WebSocket Support
    
    🔒 Security:
    ✅ Session Management
    ✅ Password Hashing
    ✅ Rate Limiting
    ✅ CORS Protection
    ✅ Input Sanitization
    
    📈 Monitoring:
    ✅ System Logging
    ✅ Performance Metrics
    ✅ User Behavior Analytics
    ✅ Real-time Updates
    
    💻 Platform: Desktop-focused with responsive design
    🎨 Theme: Facebook-inspired design with custom branding
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        db.close();
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    server.close(() => {
        db.close();
        console.log('Server closed');
        process.exit(0);
    });
});

// Start the server
startServer();
