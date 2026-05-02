require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');

const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'bluestock-dev-secret-change-in-prod';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-dev-secret';

const PLAN_LIMITS = {
    Free: 5000,
    Premium: 50000,
    Pro: 300000,
    Unlimited: 1000000,
};

// ─── IN-MEMORY CACHE ────────────────────────────────────────────────────────
const cache = {};
const setCache = (key, value, ttlMs = 10 * 60 * 1000) => {
    cache[key] = { value, expiresAt: Date.now() + ttlMs };
};
const getCache = (key) => {
    const entry = cache[key];
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.value;
};

app.use(cors());
app.use(express.json());

// ─── RATE LIMITING (IP-based, 5000/day) ─────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 5000,
    message: { success: false, error: 'RATE_LIMITED', message: 'Too many requests, please try again tomorrow.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/v1/', apiLimiter);

// ─── STANDARD RESPONSE WRAPPER ───────────────────────────────────────────────
const formatResponse = (req, data) => ({
    success: true,
    meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
    },
    data,
});

// ─── MIDDLEWARE: API Key Authentication ──────────────────────────────────────
const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'INVALID_API_KEY',
            message: 'Missing X-API-Key header.',
        });
    }
    try {
        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: apiKey },
            include: { user: true },
        });
        if (!keyRecord || !keyRecord.isActive) {
            return res.status(401).json({
                success: false,
                error: 'INVALID_API_KEY',
                message: 'Invalid or inactive API key.',
            });
        }
        prisma.apiKey.update({ where: { id: keyRecord.id }, data: { lastUsed: new Date() } }).catch(() => {});
        req.apiKeyRecord = keyRecord;
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Authentication failed.' });
    }
};

// ─── MIDDLEWARE: Log API request (fire-and-forget) ───────────────────────────
const logRequest = (req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (req.apiKeyRecord) {
            const responseTime = Date.now() - start;
            prisma.apiLog.create({
                data: {
                    apiKeyId: req.apiKeyRecord.id,
                    endpoint: req.path,
                    method: req.method,
                    statusCode: res.statusCode || 200,
                    responseTime,
                    ipAddress: (req.ip || '').substring(0, 45),
                },
            }).catch(() => {});
        }
        return originalJson(body);
    };
    next();
};

// ─── MIDDLEWARE: B2B Portal JWT ──────────────────────────────────────────────
const verifyPortalToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Missing or invalid token.' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    } catch {
        res.status(401).json({ success: false, error: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' });
    }
};

// ─── MIDDLEWARE: Admin JWT ────────────────────────────────────────────────────
const verifyAdminToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Admin token required.' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Admin access required.' });
        }
        next();
    } catch {
        res.status(401).json({ success: false, error: 'TOKEN_EXPIRED', message: 'Session expired.' });
    }
};

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: '🚀 Village Directory API v1 is running.' });
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// POST /admin/login
app.post('/admin/login', (req, res) => {
    const { secret } = req.body;
    if (!secret || secret !== ADMIN_SECRET) {
        return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid admin secret.' });
    }
    const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json(formatResponse(req, { token }));
});

// GET /admin/users
app.get('/admin/users', verifyAdminToken, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { apiKeys: { where: { isActive: true } } } } },
        });
        const data = users.map(u => ({
            id: u.id,
            companyName: u.companyName,
            email: u.email,
            planType: u.planType,
            status: u.status,
            createdAt: u.createdAt,
            apiKeyCount: u._count.apiKeys,
        }));
        res.json(formatResponse(req, data));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/stats
app.get('/admin/stats', verifyAdminToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalUsers, pendingUsers, todayLogs, totalLogs] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { status: 'PENDING' } }),
            prisma.apiLog.count({ where: { createdAt: { gte: today } } }),
            prisma.apiLog.count(),
        ]);
        res.json(formatResponse(req, { totalUsers, pendingUsers, todayLogs, totalLogs }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/logs
app.get('/admin/logs', verifyAdminToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await prisma.apiLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                apiKey: { include: { user: { select: { companyName: true } } } },
            },
        });
        const data = logs.map(l => ({
            id: l.id,
            createdAt: l.createdAt,
            endpoint: l.endpoint,
            method: l.method,
            statusCode: l.statusCode,
            responseTime: l.responseTime,
            ipAddress: l.ipAddress ? l.ipAddress.replace(/\.\d+$/, '.***') : null,
            keyName: l.apiKey?.name || 'Unknown',
            company: l.apiKey?.user?.companyName || 'Admin',
        }));
        res.json(formatResponse(req, { data, total: data.length }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /admin/users/:id/status
app.patch('/admin/users/:id/status', verifyAdminToken, async (req, res) => {
    const { status } = req.body;
    if (!['ACTIVE', 'PENDING', 'SUSPENDED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status value.' });
    }
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { status },
        });
        res.json(formatResponse(req, { id: user.id, status: user.status }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /admin/users/:id/plan
app.patch('/admin/users/:id/plan', verifyAdminToken, async (req, res) => {
    const { planType } = req.body;
    if (!['Free', 'Premium', 'Pro', 'Unlimited'].includes(planType)) {
        return res.status(400).json({ success: false, error: 'Invalid plan type.' });
    }
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { planType },
        });
        res.json(formatResponse(req, { id: user.id, planType: user.planType }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /admin/api-keys (generate a system API key, no userId)
app.post('/admin/api-keys', async (req, res) => {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== ADMIN_SECRET) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: '"name" is required.' });
    const newKey = `ak_${crypto.randomBytes(24).toString('hex')}`;
    try {
        const created = await prisma.apiKey.create({ data: { key: newKey, name } });
        res.status(201).json(formatResponse(req, { id: created.id, name: created.name, key: newKey }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// B2B PORTAL ROUTES  (defined BEFORE app.use('/v1', authenticate))
// ══════════════════════════════════════════════════════════════════════════════

// POST /v1/portal/register
app.post('/v1/portal/register', async (req, res) => {
    const { companyName, email, password } = req.body;
    if (!companyName || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { companyName, email, passwordHash },
        });
        res.status(201).json(formatResponse(req, {
            id: user.id,
            companyName: user.companyName,
            email: user.email,
            status: user.status,
        }));
    } catch (err) {
        if (err.code === 'P2002') return res.status(400).json({ success: false, error: 'Email already registered.' });
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /v1/portal/login  — returns JWT token
app.post('/v1/portal/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials.' });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials.' });

        if (user.status === 'PENDING') {
            return res.status(403).json({
                success: false,
                error: 'Your account is pending admin approval. You will be notified once approved.',
            });
        }
        if (user.status === 'SUSPENDED') {
            return res.status(403).json({
                success: false,
                error: 'Your account has been suspended. Please contact support.',
            });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json(formatResponse(req, {
            token,
            id: user.id,
            companyName: user.companyName,
            email: user.email,
            planType: user.planType,
            status: user.status,
        }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /v1/portal/usage  — returns plan info + keys list (JWT protected)
app.get('/v1/portal/usage', verifyPortalToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { apiKeys: { orderBy: { createdAt: 'desc' } } },
        });
        if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

        const activeKeys = user.apiKeys.filter(k => k.isActive).length;
        const dailyLimit = PLAN_LIMITS[user.planType] || 5000;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const apiKeyIds = user.apiKeys.map(k => k.id);
        const requestsToday = await prisma.apiLog.count({
            where: {
                apiKeyId: { in: apiKeyIds },
                createdAt: { gte: today }
            }
        });

        res.json(formatResponse(req, {
            plan: user.planType,
            dailyLimit,
            requestsToday,
            activeKeys,
            keys: user.apiKeys.map(k => ({
                id: k.id,
                name: k.name,
                key: k.key,
                isActive: k.isActive,
                createdAt: k.createdAt,
                lastUsed: k.lastUsed,
            })),
        }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /v1/portal/keys  — create a new API key, returns secret once
app.post('/v1/portal/keys', async (req, res) => {
    const { email, keyName } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { _count: { select: { apiKeys: { where: { isActive: true } } } } },
        });
        if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
        if (user._count.apiKeys >= 5) {
            return res.status(400).json({ success: false, error: 'Maximum 5 active API keys allowed per account.' });
        }

        const newKey = `ak_${crypto.randomBytes(24).toString('hex')}`;
        const plainSecret = `as_${crypto.randomBytes(24).toString('hex')}`;
        const secretHash = await bcrypt.hash(plainSecret, 10);

        const created = await prisma.apiKey.create({
            data: { key: newKey, name: keyName || 'Production Key', userId: user.id, secretHash },
        });

        res.status(201).json(formatResponse(req, {
            id: created.id,
            name: created.name,
            key: newKey,
            secret: plainSecret, // shown only ONCE, never stored in plaintext
            isActive: created.isActive,
            createdAt: created.createdAt,
        }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /v1/portal/keys/:id  — revoke a key
app.delete('/v1/portal/keys/:id', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

        const keyRecord = await prisma.apiKey.findFirst({
            where: { id: parseInt(req.params.id), userId: user.id },
        });
        if (!keyRecord) return res.status(404).json({ success: false, error: 'Key not found or not owned by this account.' });

        await prisma.apiKey.update({ where: { id: keyRecord.id }, data: { isActive: false } });
        res.json(formatResponse(req, { message: 'Key revoked successfully.' }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /v1/portal/keys (legacy — list keys by email query param)
app.get('/v1/portal/keys', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ success: false, error: 'Email required.' });
    try {
        const user = await prisma.user.findUnique({ where: { email }, include: { apiKeys: true } });
        if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
        res.json(formatResponse(req, user.apiKeys));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ALL ROUTES BELOW REQUIRE A VALID API KEY
// ══════════════════════════════════════════════════════════════════════════════
app.use('/v1', authenticate);
app.use('/v1', logRequest);

// ─── STATES ───────────────────────────────────────────────────────────────────
app.get('/v1/states', async (req, res) => {
    try {
        const cacheKey = 'states_all';
        const cached = getCache(cacheKey);
        if (cached) return res.json(formatResponse(req, cached));

        const states = await prisma.state.findMany({ orderBy: { name: 'asc' } });
        setCache(cacheKey, states);
        res.json(formatResponse(req, states));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/v1/states/:id/districts', async (req, res) => {
    try {
        const districts = await prisma.district.findMany({
            where: { stateId: parseInt(req.params.id) },
            orderBy: { name: 'asc' },
        });
        res.json(formatResponse(req, districts));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── DISTRICTS ────────────────────────────────────────────────────────────────
app.get('/v1/districts/:id/subdistricts', async (req, res) => {
    try {
        const subDistricts = await prisma.subDistrict.findMany({
            where: { districtId: parseInt(req.params.id) },
            orderBy: { name: 'asc' },
        });
        res.json(formatResponse(req, subDistricts));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── SUB-DISTRICTS ────────────────────────────────────────────────────────────
app.get('/v1/subdistricts/:id/villages', async (req, res) => {
    try {
        const villages = await prisma.village.findMany({
            where: { subDistrictId: parseInt(req.params.id) },
            orderBy: { name: 'asc' },
        });
        res.json(formatResponse(req, villages));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── VILLAGES (paginated) ─────────────────────────────────────────────────────
app.get('/v1/villages', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const skip = (page - 1) * limit;

        const [villages, total] = await prisma.$transaction([
            prisma.village.findMany({
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    subDistrict: { include: { district: { include: { state: true } } } },
                },
            }),
            prisma.village.count(),
        ]);

        const data = villages.map(v => ({
            id: v.id,
            code: v.code,
            village_name: v.name,
            sub_district_name: v.subDistrict.name,
            district_name: v.subDistrict.district.name,
            state_name: v.subDistrict.district.state.name,
        }));

        res.json(formatResponse(req, {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── SEARCH ───────────────────────────────────────────────────────────────────
app.get('/v1/search', async (req, res) => {
    const q = req.query.q?.trim();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    if (!q || q.length < 1) {
        return res.status(400).json({ success: false, error: 'INVALID_QUERY', message: 'Query parameter "q" is required.' });
    }

    try {
        const whereClause = {
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { subDistrict: { name: { contains: q, mode: 'insensitive' } } },
                { subDistrict: { district: { name: { contains: q, mode: 'insensitive' } } } },
                { subDistrict: { district: { state: { name: { contains: q, mode: 'insensitive' } } } } },
            ],
        };

        const [results, total] = await prisma.$transaction([
            prisma.village.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    subDistrict: { include: { district: { include: { state: true } } } },
                },
            }),
            prisma.village.count({ where: whereClause }),
        ]);

        res.json(formatResponse(req, {
            data: results.map(v => ({
                id: v.id,
                code: v.code,
                village_name: v.name,
                sub_district_name: v.subDistrict?.name || 'N/A',
                district_name: v.subDistrict?.district?.name || 'N/A',
                state_name: v.subDistrict?.district?.state?.name || 'N/A',
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        }));
    } catch (err) {
        console.error('Search Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── AUTOCOMPLETE ─────────────────────────────────────────────────────────────
app.get('/v1/autocomplete', async (req, res) => {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) {
        return res.status(400).json({ success: false, error: 'INVALID_QUERY', message: 'Query must be at least 2 characters.' });
    }
    try {
        const results = await prisma.village.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            take: 10,
            orderBy: { name: 'asc' },
            include: {
                subDistrict: { include: { district: { include: { state: true } } } },
            },
        });
        const data = results.map(v => ({
            value: `village_id_${v.id}`,
            label: v.name,
            fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`,
            hierarchy: {
                village: v.name,
                subDistrict: v.subDistrict.name,
                district: v.subDistrict.district.name,
                state: v.subDistrict.district.state.name,
                country: 'India',
            },
        }));
        res.json(formatResponse(req, data));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── ANALYTICS / DASHBOARD ────────────────────────────────────────────────────
app.get('/v1/analytics/dashboard', async (req, res) => {
    try {
        const CACHE_KEY = 'analytics_dashboard';
        const cached = getCache(CACHE_KEY);
        if (cached) return res.json(formatResponse(req, cached));

        const [countResult, topStatesResult] = await Promise.all([
            prisma.$queryRaw`SELECT COUNT(*)::int AS total FROM "Village"`,
            prisma.$queryRaw`
                SELECT s.name, COUNT(v.id)::int AS count
                FROM "Village" v
                JOIN "SubDistrict" sd ON v."subDistrictId" = sd.id
                JOIN "District" d ON sd."districtId" = d.id
                JOIN "State" s ON d."stateId" = s.id
                GROUP BY s.name
                ORDER BY count DESC
                LIMIT 10
            `,
        ]);

        const result = {
            totalVillages: countResult[0].total,
            topStates: topStatesResult.map(r => ({ name: r.name, count: r.count })),
        };

        setCache(CACHE_KEY, result, 10 * 60 * 1000);
        res.json(formatResponse(req, result));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('🛑 Prisma disconnected. Server shutting down.');
    process.exit(0);
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
