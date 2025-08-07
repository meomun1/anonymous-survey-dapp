# Quick Start Guide - Local Testing

**Get your server running and tested in under 5 minutes!**

## 🚀 Instant Setup

### 1. Prerequisites Check
```bash
# Make sure you have these installed:
node --version   # Should be 16+
docker --version
docker-compose --version
```

### 2. One-Command Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment file
cp env.txt .env

# Start database and Redis
docker-compose up -d

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Generate admin password (optional - default is 'admin123')
# npm run generate-admin-hash

# Start the server
npm run dev
```

### 3. Instant Test
```bash
# Run the quick test script (in a new terminal)
chmod +x test-scripts/quick-test.sh
./test-scripts/quick-test.sh
```

**Expected output:**
```
===========================================
  Anonymous Survey Server - Quick Test
===========================================

→ Checking if server is running...
✓ Server is responding
→ Testing admin authentication...
✓ Admin login successful
→ Creating test survey...
✓ Survey created successfully
→ Retrieving survey public keys...
✓ Public keys retrieved successfully
→ Generating student tokens...
✓ Student tokens generated successfully
→ Checking survey statistics...
✓ Survey statistics retrieved
→ Testing commitment generation...
✓ Commitment generated successfully
→ Testing commitment verification...
✓ Commitment verification successful
→ Listing all surveys...
✓ Survey list retrieved successfully

===========================================
  All tests completed successfully! ✓
===========================================
```

---

## 🔧 If Something Goes Wrong

### Database Issues
```bash
# Reset everything
docker-compose down -v
docker-compose up -d
npx prisma migrate reset
```

### Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Use different port
PORT=3001 npm run dev
```

### Authentication Issues
```bash
# Generate new admin password hash
npm run generate-admin-hash
# Then update ADMIN_PASSWORD_HASH in .env
```

---

## 📊 What You Can Test

### Manual API Testing
```bash
# Health check
curl http://localhost:3000/health

# Admin login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu","password":"admin123"}'

# Create survey (replace YOUR_JWT_TOKEN)
curl -X POST http://localhost:3000/api/surveys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"Test Survey","description":"Testing","question":"How is it?"}'
```

### Database Exploration
```bash
# Open visual database browser
npx prisma studio

# Direct database access
psql "postgresql://postgres:postgres@localhost:5432/anonymous_survey"
```

### Redis Testing
```bash
# Connect to Redis
redis-cli

# Test operations
> ping
> keys *
```

---

## 🎯 Next Steps

1. **Full Testing Guide**: See `LOCAL_TESTING.md` for comprehensive testing
2. **API Documentation**: See `README.md` for complete API reference
3. **Development**: Start building your client application
4. **Deployment**: Check deployment guides when ready for production

---

## 📋 Default Test Data

After running the quick test, you'll have:

- **Admin User**: `admin@school.edu` / `admin123`
- **Test Survey**: "Quick Test Survey" with generated tokens
- **Student Emails**: `student1@test.edu`, `student2@test.edu`
- **Crypto Keys**: RSA-2048 blind signature and encryption keys
- **Sample Tokens**: Ready for student authentication testing

---

## 🆘 Need Help?

1. **Check Logs**: Server logs show detailed error information
2. **Health Endpoint**: Visit `http://localhost:3000/health` for status
3. **Prisma Studio**: Visual database interface at `npx prisma studio`
4. **Docker Logs**: `docker-compose logs postgres` or `docker-compose logs redis`

**Everything working?** 🎉 Your anonymous survey server is ready for development! 