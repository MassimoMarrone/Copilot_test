const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// In-memory database (replace with a real database in production)
let users = [];
let services = [];
let bookings = [];

// Load data from files if they exist
const loadData = () => {
    try {
        if (fs.existsSync('data/users.json')) {
            users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));
        }
        if (fs.existsSync('data/services.json')) {
            services = JSON.parse(fs.readFileSync('data/services.json', 'utf8'));
        }
        if (fs.existsSync('data/bookings.json')) {
            bookings = JSON.parse(fs.readFileSync('data/bookings.json', 'utf8'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
};

// Save data to files
const saveData = () => {
    try {
        fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
        fs.writeFileSync('data/services.json', JSON.stringify(services, null, 2));
        fs.writeFileSync('data/bookings.json', JSON.stringify(bookings, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
};

loadData();

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, userType, acceptedTerms } = req.body;
        
        if (!acceptedTerms) {
            return res.status(400).json({ error: 'You must accept the Terms & Conditions' });
        }

        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            userType, // 'client' or 'provider'
            acceptedTerms: true,
            createdAt: new Date().toISOString()
        };

        users.push(user);
        saveData();

        const token = jwt.sign({ id: user.id, email: user.email, userType: user.userType }, JWT_SECRET);
        res.cookie('token', token, { httpOnly: true });
        res.json({ success: true, userType: user.userType });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, userType: user.userType }, JWT_SECRET);
        res.cookie('token', token, { httpOnly: true });
        res.json({ success: true, userType: user.userType });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// Get current user
app.get('/api/me', authenticate, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user.id, email: user.email, userType: user.userType });
});

// Services routes

// Get all services (for clients to browse)
app.get('/api/services', authenticate, (req, res) => {
    res.json(services);
});

// Create service (providers only)
app.post('/api/services', authenticate, (req, res) => {
    if (req.user.userType !== 'provider') {
        return res.status(403).json({ error: 'Only providers can create services' });
    }

    const { title, description, price } = req.body;
    const service = {
        id: Date.now().toString(),
        providerId: req.user.id,
        providerEmail: req.user.email,
        title,
        description,
        price: parseFloat(price),
        createdAt: new Date().toISOString()
    };

    services.push(service);
    saveData();
    res.json(service);
});

// Get provider's services
app.get('/api/my-services', authenticate, (req, res) => {
    if (req.user.userType !== 'provider') {
        return res.status(403).json({ error: 'Only providers can access this' });
    }
    const myServices = services.filter(s => s.providerId === req.user.id);
    res.json(myServices);
});

// Booking routes

// Create booking (clients only)
app.post('/api/bookings', authenticate, (req, res) => {
    if (req.user.userType !== 'client') {
        return res.status(403).json({ error: 'Only clients can create bookings' });
    }

    const { serviceId, date } = req.body;
    const service = services.find(s => s.id === serviceId);

    if (!service) {
        return res.status(404).json({ error: 'Service not found' });
    }

    const booking = {
        id: Date.now().toString(),
        serviceId,
        clientId: req.user.id,
        clientEmail: req.user.email,
        providerId: service.providerId,
        providerEmail: service.providerEmail,
        serviceTitle: service.title,
        amount: service.price,
        date,
        status: 'pending', // pending, completed, cancelled
        paymentStatus: 'held_in_escrow', // held_in_escrow, released, cancelled
        photoProof: null,
        createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    saveData();
    res.json(booking);
});

// Get client's bookings
app.get('/api/my-bookings', authenticate, (req, res) => {
    if (req.user.userType !== 'client') {
        return res.status(403).json({ error: 'Only clients can access this' });
    }
    const myBookings = bookings.filter(b => b.clientId === req.user.id);
    res.json(myBookings);
});

// Get provider's bookings
app.get('/api/provider-bookings', authenticate, (req, res) => {
    if (req.user.userType !== 'provider') {
        return res.status(403).json({ error: 'Only providers can access this' });
    }
    const providerBookings = bookings.filter(b => b.providerId === req.user.id);
    res.json(providerBookings);
});

// Complete service and release payment (providers only)
app.post('/api/bookings/:id/complete', authenticate, upload.single('photo'), (req, res) => {
    if (req.user.userType !== 'provider') {
        return res.status(403).json({ error: 'Only providers can complete bookings' });
    }

    const booking = bookings.find(b => b.id === req.params.id && b.providerId === req.user.id);
    
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'completed') {
        return res.status(400).json({ error: 'Booking already completed' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Photo proof is required' });
    }

    booking.status = 'completed';
    booking.paymentStatus = 'released';
    booking.photoProof = '/uploads/' + req.file.filename;
    booking.completedAt = new Date().toISOString();

    saveData();
    res.json(booking);
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/client-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'client-dashboard.html'));
});

app.get('/provider-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'provider-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
