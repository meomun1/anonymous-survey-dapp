 # AWS Deployment Guide - Anonymous Survey DApp

## Overview

This guide covers deploying the Anonymous Survey DApp to AWS. The application consists of three main components:
- **Client**: Next.js 14 frontend application
- **Server**: Express.js backend with Node.js
- **Database**: PostgreSQL + Redis
- **Blockchain**: Solana smart contracts (devnet/mainnet connection)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          AWS Cloud                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐        ┌──────────────┐                       │
│  │  CloudFront  │───────▶│  S3 Bucket   │  (Client - Next.js)   │
│  │  (CDN)       │        │  (Static)    │                       │
│  └──────┬───────┘        └──────────────┘                       │
│         │                                                         │
│         │                                                         │
│  ┌──────▼───────────────────────────────┐                       │
│  │     Application Load Balancer         │                       │
│  └──────┬───────────────────────────────┘                       │
│         │                                                         │
│  ┌──────▼──────────┐     ┌──────────────┐                       │
│  │   EC2 Instance  │────▶│  RDS Postgres │  (Database)          │
│  │   (Server)      │     │               │                       │
│  │   + PM2         │     └──────────────┘                       │
│  └─────────┬───────┘                                             │
│            │              ┌──────────────┐                       │
│            └─────────────▶│ ElastiCache  │  (Redis)             │
│                           │  (Redis)     │                       │
│                           └──────────────┘                       │
│                                                                   │
│  External: Solana RPC (devnet.solana.com or mainnet-beta)       │
└─────────────────────────────────────────────────────────────────┘
```

## AWS Services Required

### 1. **EC2 (Elastic Compute Cloud)** - Server Backend
- **Purpose**: Run Express.js server
- **Instance Type**: t3.medium or t3.large (2-4 vCPU, 4-8 GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 20-30 GB EBS (gp3)

### 2. **RDS (Relational Database Service)** - PostgreSQL
- **Purpose**: Primary database
- **Engine**: PostgreSQL 15
- **Instance Class**: db.t4g.medium (2 vCPU, 4 GB RAM)
- **Storage**: 20-50 GB (gp3), auto-scaling enabled
- **Multi-AZ**: Recommended for production

### 3. **ElastiCache** - Redis
- **Purpose**: Caching and session management
- **Engine**: Redis 7.x
- **Node Type**: cache.t4g.micro or cache.t4g.small
- **Cluster Mode**: Disabled (single node for simplicity)

### 4. **S3 + CloudFront** - Client Frontend
- **S3 Purpose**: Static file hosting for Next.js build
- **CloudFront Purpose**: CDN for fast global delivery
- **Alternative**: AWS Amplify (simpler, managed Next.js hosting)

### 5. **Additional Services**
- **VPC**: Private networking and security groups
- **ALB (Application Load Balancer)**: SSL termination, load distribution
- **Route 53**: DNS management (optional)
- **ACM (Certificate Manager)**: Free SSL certificates
- **Secrets Manager**: Store sensitive credentials
- **CloudWatch**: Monitoring and logging

## Cost Estimate (Monthly - US East)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| EC2 (t3.medium) | 730 hours/month | ~$30 |
| RDS PostgreSQL (db.t4g.medium) | 730 hours/month | ~$60 |
| ElastiCache Redis (cache.t4g.micro) | 730 hours/month | ~$12 |
| S3 Storage | 5 GB + requests | ~$1 |
| CloudFront | 10 GB transfer | ~$1 |
| ALB | 730 hours + LCU | ~$20 |
| **Total Estimated** | | **~$124/month** |

*Note: Actual costs depend on traffic, data transfer, and usage patterns. Add ~20% buffer for misc costs.*

## Deployment Steps

### Phase 1: Setup AWS Infrastructure

#### 1.1 Create VPC and Security Groups

```bash
# VPC Configuration
- VPC CIDR: 10.0.0.0/16
- Public Subnets: 10.0.1.0/24, 10.0.2.0/24 (2 AZs)
- Private Subnets: 10.0.10.0/24, 10.0.11.0/24 (2 AZs)
- Internet Gateway: Attached to public subnets
- NAT Gateway: For private subnet internet access
```

**Security Groups:**

```
SG-ALB (Application Load Balancer)
- Inbound: 443 (HTTPS) from 0.0.0.0/0
- Inbound: 80 (HTTP) from 0.0.0.0/0
- Outbound: All

SG-EC2-Server
- Inbound: 3000 (Node.js) from SG-ALB
- Inbound: 22 (SSH) from your IP only
- Outbound: All

SG-RDS-Postgres
- Inbound: 5432 (PostgreSQL) from SG-EC2-Server
- Outbound: None

SG-ElastiCache-Redis
- Inbound: 6379 (Redis) from SG-EC2-Server
- Outbound: None
```

#### 1.2 Launch RDS PostgreSQL

1. **Create RDS Instance**:
   - Engine: PostgreSQL 15.x
   - Template: Production or Dev/Test
   - DB Instance: db.t4g.medium
   - Storage: 20 GB gp3, autoscaling up to 100 GB
   - Multi-AZ: Yes (production) or No (staging)
   - VPC: Use your VPC, private subnets
   - Security Group: SG-RDS-Postgres
   - Database name: `anonymous_survey_university`
   - Master username: `postgres`
   - Master password: Generate strong password (save in Secrets Manager)
   - Backup retention: 7 days
   - Enhanced monitoring: Enabled

2. **Post-Creation**:
   - Note the endpoint: `xxx.region.rds.amazonaws.com`
   - Connection string: `postgresql://postgres:PASSWORD@ENDPOINT:5432/anonymous_survey_university`

#### 1.3 Launch ElastiCache Redis

1. **Create Redis Cluster**:
   - Engine: Redis 7.x
   - Cluster mode: Disabled
   - Node type: cache.t4g.micro
   - Number of replicas: 0 (single node) or 1 (with replica)
   - VPC: Use your VPC, private subnets
   - Security Group: SG-ElastiCache-Redis
   - Encryption at rest: Enabled
   - Encryption in transit: Enabled (requires AUTH token)
   - Automatic backups: Enabled

2. **Post-Creation**:
   - Note the primary endpoint: `xxx.cache.amazonaws.com:6379`
   - If AUTH enabled, save token in Secrets Manager

#### 1.4 Launch EC2 Instance

1. **Create EC2 Instance**:
   - AMI: Ubuntu 22.04 LTS
   - Instance type: t3.medium
   - Key pair: Create/use existing SSH key
   - VPC: Use your VPC, **public subnet** (for internet access)
   - Auto-assign public IP: Enabled
   - Security group: SG-EC2-Server
   - Storage: 30 GB gp3
   - IAM role: Create role with permissions for Secrets Manager, CloudWatch

2. **Connect via SSH**:
```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

3. **Install Dependencies**:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL client (for psql)
sudo apt install -y postgresql-client

# Install git
sudo apt install -y git
```

### Phase 2: Deploy Server Backend

#### 2.1 Clone and Setup Server Code

```bash
# Clone repository
cd /home/ubuntu
git clone <YOUR-REPO-URL> anonymous-survey-dapp
cd anonymous-survey-dapp/server

# Install dependencies
npm install
```

#### 2.2 Configure Environment Variables

```bash
# Create production .env file
nano .env.production
```

**Production Environment Variables** (`/server/.env.production`):

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database (RDS PostgreSQL)
DATABASE_URL="postgresql://postgres:YOUR_RDS_PASSWORD@your-rds-endpoint.region.rds.amazonaws.com:5432/anonymous_survey_university"

# Redis (ElastiCache)
REDIS_URL="redis://your-redis-endpoint.cache.amazonaws.com:6379"
REDIS_HOST=your-redis-endpoint.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_AUTH_TOKEN  # If AUTH enabled

# JWT Secret (generate strong secret)
JWT_SECRET="GENERATE_STRONG_RANDOM_SECRET_HERE"
JWT_EXPIRES_IN="24h"

# Admin Credentials
ADMIN_EMAIL="admin@youruniversity.edu"
ADMIN_PASSWORD_HASH='$2b$10$...'  # Generate using bcrypt

# Blockchain (Solana)
SOLANA_RPC_URL="https://api.devnet.solana.com"  # Or mainnet-beta for production
PROGRAM_ID="mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq"
KEY_SOLANA="[YOUR_SOLANA_KEYPAIR_ARRAY]"

# SMTP Configuration (for emails)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@university.edu
SMTP_PASS=YOUR_SMTP_PASSWORD
SMTP_FROM=your-email@university.edu
```

**Security Best Practices**:
- Use AWS Secrets Manager to store sensitive values
- Generate JWT_SECRET: `openssl rand -base64 32`
- Generate admin password hash: `npm run generate-admin-hash`
- Never commit `.env.production` to git

#### 2.3 Initialize Database

```bash
# Test database connection
psql "$DATABASE_URL"

# If connection successful, run schema
psql "$DATABASE_URL" < database/university-schema.sql

# Exit psql
\q
```

#### 2.4 Build and Start Server

```bash
# Build TypeScript
npm run build

# Test server locally
NODE_ENV=production node dist/index.js
# Should see: "Server is running on port 3000"
# Ctrl+C to stop

# Start with PM2 (production process manager)
pm2 start dist/index.js --name anonymous-survey-server --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on system reboot
pm2 startup systemd
# Run the command PM2 outputs

# Check status
pm2 status
pm2 logs anonymous-survey-server

# Monitor in real-time
pm2 monit
```

**PM2 Useful Commands**:
```bash
pm2 restart anonymous-survey-server  # Restart server
pm2 stop anonymous-survey-server     # Stop server
pm2 delete anonymous-survey-server   # Remove from PM2
pm2 logs anonymous-survey-server     # View logs
pm2 logs --lines 100                 # Last 100 lines
```

#### 2.5 Setup Application Load Balancer

1. **Create Target Group**:
   - Target type: Instances
   - Protocol: HTTP, Port: 3000
   - VPC: Your VPC
   - Health check path: `/health`
   - Health check interval: 30 seconds
   - Healthy threshold: 2
   - Unhealthy threshold: 3
   - Register target: Select your EC2 instance

2. **Create Application Load Balancer**:
   - Scheme: Internet-facing
   - IP address type: IPv4
   - VPC: Your VPC
   - Subnets: Select both public subnets (multi-AZ)
   - Security group: SG-ALB
   - Listeners:
     - **HTTP (80)**: Redirect to HTTPS
     - **HTTPS (443)**: Forward to target group
   - SSL Certificate: Request certificate from ACM (Certificate Manager)

3. **Update Security Group**:
   - Ensure SG-EC2-Server allows inbound traffic from SG-ALB on port 3000

4. **Test Load Balancer**:
```bash
curl http://your-alb-dns-name.region.elb.amazonaws.com/health
# Should return: {"status":"ok",...}
```

### Phase 3: Deploy Client Frontend

You have two options: **S3 + CloudFront** (manual) or **AWS Amplify** (managed). Amplify is recommended for simplicity.

#### Option A: AWS Amplify (Recommended)

1. **Build Client Locally** (to test):
```bash
cd /path/to/anonymous-survey-dapp/client

# Create production .env
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://your-alb-dns-name.region.elb.amazonaws.com/api
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq
EOF

# Test build
npm install
npm run build
npm run start
# Visit http://localhost:3000 to verify
```

2. **Deploy to AWS Amplify**:
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"
   - Connect to your Git repository (GitHub, GitLab, Bitbucket)
   - Select repository and branch (e.g., `main`)
   - Framework: Automatically detected as Next.js
   - Build settings (auto-generated):
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - cd client
             - npm ci
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: client/.next
         files:
           - '**/*'
       cache:
         paths:
           - client/node_modules/**/*
     ```
   - **Environment variables** (add in Amplify console):
     - `NEXT_PUBLIC_API_URL`: `https://your-alb-dns.elb.amazonaws.com/api`
     - `NEXT_PUBLIC_SOLANA_RPC_URL`: `https://api.devnet.solana.com`
     - `NEXT_PUBLIC_PROGRAM_ID`: `mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq`
   - Click "Save and deploy"

3. **Post-Deployment**:
   - Amplify will provide a URL: `https://xxx.amplifyapp.com`
   - You can add a custom domain in Amplify settings
   - SSL is automatically provisioned

#### Option B: S3 + CloudFront (Manual)

1. **Build Static Export**:
```bash
cd client

# Update next.config.js for static export
# Add: output: 'export'

npm run build
# This creates ./out directory with static files
```

2. **Create S3 Bucket**:
   - Bucket name: `anonymous-survey-client` (must be globally unique)
   - Region: Same as other resources
   - Block all public access: **Uncheck** (we'll use CloudFront)
   - Enable static website hosting
   - Index document: `index.html`
   - Error document: `404.html`

3. **Upload Build Files**:
```bash
aws s3 sync ./out s3://anonymous-survey-client --delete
```

4. **Create CloudFront Distribution**:
   - Origin domain: `anonymous-survey-client.s3.amazonaws.com`
   - Origin access: Origin Access Identity (OAI)
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD, OPTIONS
   - Cache policy: CachingOptimized
   - SSL certificate: Request from ACM or use default
   - Default root object: `index.html`
   - Custom error responses:
     - 403, 404 → /index.html (for Next.js client-side routing)

5. **Update S3 Bucket Policy**:
   - Allow CloudFront OAI to read objects

6. **Test**:
   - Visit CloudFront distribution URL: `https://xxx.cloudfront.net`

### Phase 4: Configure CORS and Environment

#### 4.1 Update Server CORS Configuration

Ensure the server allows requests from the client domain:

```typescript
// server/src/config/cors.ts
const allowedOrigins = [
  'http://localhost:3002',
  'https://xxx.amplifyapp.com',           // Add Amplify URL
  'https://your-custom-domain.com',       // Add custom domain if any
];
```

Rebuild and restart server:
```bash
cd /home/ubuntu/anonymous-survey-dapp/server
npm run build
pm2 restart anonymous-survey-server
```

#### 4.2 Update Client API URL

If you set up a custom domain for the ALB, update client environment:

In Amplify:
- Go to environment variables
- Update `NEXT_PUBLIC_API_URL` to `https://api.yourdomain.com/api`
- Redeploy

### Phase 5: Solana Blockchain Configuration

#### 5.1 Deploy Smart Contract (if not already deployed)

```bash
# On your local machine (with Solana CLI installed)
cd blockchain/anonymous-survey

# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Note the Program ID
# Update PROGRAM_ID in server and client environment variables
```

#### 5.2 Fund Solana Wallet

```bash
# The server uses KEY_SOLANA to submit transactions
# Fund this wallet with SOL for transaction fees

# Get wallet public key from KEY_SOLANA array
# Then airdrop SOL (devnet):
solana airdrop 2 <PUBLIC_KEY> --url devnet

# For mainnet, transfer SOL from your wallet
```

#### 5.3 Configure RPC Endpoints

**Free Solana RPC URLs**:
- Devnet: `https://api.devnet.solana.com`
- Mainnet: `https://api.mainnet-beta.solana.com`

**Paid RPC Providers** (better reliability, higher rate limits):
- QuickNode: https://www.quicknode.com/
- Alchemy: https://www.alchemy.com/solana
- Helius: https://www.helius.dev/

Update `.env.production` and Amplify environment variables with chosen RPC URL.

### Phase 6: DNS and SSL Configuration (Optional)

#### 6.1 Setup Custom Domain with Route 53

1. **Register/Transfer Domain** to Route 53 (or use external DNS)

2. **Create Hosted Zone** in Route 53

3. **Create A Records**:
   - `api.yourdomain.com` → Alias to ALB
   - `app.yourdomain.com` → Alias to CloudFront or Amplify

4. **Request SSL Certificates** in ACM:
   - Certificate 1: `*.yourdomain.com` (wildcard)
   - Validation: DNS validation (Route 53 auto-creates records)
   - Use in ALB and CloudFront/Amplify

5. **Update Environment Variables**:
   - Client: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
   - Server CORS: Allow `https://app.yourdomain.com`

### Phase 7: Monitoring and Logging

#### 7.1 Setup CloudWatch Logs

**Server Logs**:
```bash
# Install CloudWatch agent on EC2
sudo apt install -y amazon-cloudwatch-agent

# Configure PM2 to output logs to files
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# PM2 logs location: /home/ubuntu/.pm2/logs/
# Configure CloudWatch agent to ship these logs
```

**CloudWatch Agent Config** (`/opt/aws/amazon-cloudwatch-agent/etc/config.json`):
```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/.pm2/logs/anonymous-survey-server-out.log",
            "log_group_name": "/aws/ec2/anonymous-survey/server",
            "log_stream_name": "{instance_id}/out"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/anonymous-survey-server-error.log",
            "log_group_name": "/aws/ec2/anonymous-survey/server",
            "log_stream_name": "{instance_id}/error"
          }
        ]
      }
    }
  }
}
```

Start CloudWatch agent:
```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json \
  -s
```

#### 7.2 Setup CloudWatch Alarms

Create alarms for:
- EC2 CPU > 80% for 5 minutes
- RDS CPU > 80% for 5 minutes
- ALB 5XX errors > 10 in 5 minutes
- RDS storage < 20% free
- ElastiCache memory > 80%

#### 7.3 Application Performance Monitoring

Consider integrating:
- **AWS X-Ray**: Distributed tracing
- **Datadog**: Full-stack monitoring (paid)
- **New Relic**: APM (paid)

### Phase 8: Security Hardening

#### 8.1 Secrets Management

Move all secrets to AWS Secrets Manager:

```bash
# Create secret for database URL
aws secretsmanager create-secret \
  --name anonymous-survey/database-url \
  --secret-string "$DATABASE_URL"

# Create secret for JWT
aws secretsmanager create-secret \
  --name anonymous-survey/jwt-secret \
  --secret-string "$JWT_SECRET"

# etc.
```

Update server code to fetch secrets from Secrets Manager on startup.

#### 8.2 Enable WAF (Web Application Firewall)

Attach AWS WAF to ALB and CloudFront:
- Block common attack patterns (SQL injection, XSS)
- Rate limiting (100 requests/5 minutes per IP)
- Geo-blocking if needed

#### 8.3 Enable AWS Shield Standard (DDoS Protection)

Automatically enabled for ALB and CloudFront.

#### 8.4 Fix Blind Signature Authentication Vulnerability

**CRITICAL**: The blind signature endpoint currently has no authentication.

Add authentication middleware:

```typescript
// server/src/routes/crypto.routes.ts
import { authenticateStudent } from '../middleware/auth.middleware';

router.post('/campaigns/:campaignId/blind-sign',
  authenticateStudent,  // ← Add this middleware
  cryptoController.blindSignCampaign.bind(cryptoController)
);
```

Implement token validation in the middleware to ensure only students with valid tokens can request signatures.

#### 8.5 Database Security

- Enable RDS encryption at rest (already enabled in setup)
- Enable SSL/TLS for database connections
- Rotate database credentials quarterly
- Enable RDS Performance Insights for query monitoring

### Phase 9: Backup and Disaster Recovery

#### 9.1 RDS Automated Backups

- Already configured: 7-day retention
- Test restore process monthly

#### 9.2 Application Backups

```bash
# Backup server code and configurations
tar -czf server-backup-$(date +%Y%m%d).tar.gz \
  /home/ubuntu/anonymous-survey-dapp/server

# Upload to S3
aws s3 cp server-backup-*.tar.gz s3://your-backup-bucket/
```

#### 9.3 Disaster Recovery Plan

Document recovery procedures:
1. Restore RDS from snapshot
2. Launch new EC2 instance from AMI
3. Update ALB target group
4. Update DNS if needed
5. Verify application functionality

**Recovery Time Objective (RTO)**: 2 hours
**Recovery Point Objective (RPO)**: 24 hours

### Phase 10: Continuous Deployment (Optional)

#### 10.1 Setup CI/CD with GitHub Actions

Create `.github/workflows/deploy-server.yml`:

```yaml
name: Deploy Server to EC2

on:
  push:
    branches: [ main ]
    paths:
      - 'server/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/anonymous-survey-dapp
            git pull origin main
            cd server
            npm install
            npm run build
            pm2 restart anonymous-survey-server
```

#### 10.2 Amplify Auto-Deployment

Amplify automatically deploys on git push (already configured).

## Deployment Checklist

### Pre-Deployment
- [ ] Update all environment variables for production
- [ ] Generate strong JWT secret
- [ ] Configure SMTP credentials
- [ ] Fund Solana wallet with SOL
- [ ] Test database schema locally
- [ ] Review security groups and network configuration
- [ ] Request SSL certificates in ACM
- [ ] Document all passwords and endpoints

### During Deployment
- [ ] Launch RDS PostgreSQL instance
- [ ] Launch ElastiCache Redis instance
- [ ] Launch EC2 instance and install dependencies
- [ ] Deploy and configure server with PM2
- [ ] Initialize database with schema
- [ ] Setup Application Load Balancer
- [ ] Deploy client to Amplify or S3+CloudFront
- [ ] Configure CORS between client and server
- [ ] Test all endpoints via ALB

### Post-Deployment
- [ ] Setup CloudWatch monitoring and alarms
- [ ] Configure automated backups
- [ ] Enable WAF on ALB and CloudFront
- [ ] Fix blind signature authentication vulnerability
- [ ] Test full user workflow (registration → survey → submission)
- [ ] Load test with expected traffic (use tools like k6, Artillery)
- [ ] Document disaster recovery procedures
- [ ] Setup CI/CD pipelines
- [ ] Train team on AWS console and monitoring

### Security Review
- [ ] No `.env` files in version control
- [ ] All secrets in AWS Secrets Manager
- [ ] Database not publicly accessible
- [ ] Redis not publicly accessible
- [ ] SSH access restricted to your IP
- [ ] HTTPS enforced on all public endpoints
- [ ] Blind signature endpoint authenticated
- [ ] Rate limiting configured
- [ ] WAF rules active
- [ ] Regular security updates scheduled

## Troubleshooting

### Server Won't Start
```bash
# Check PM2 logs
pm2 logs anonymous-survey-server

# Common issues:
# - Database connection failed: Verify DATABASE_URL and security group
# - Redis connection failed: Verify REDIS_URL and security group
# - Port already in use: Check with netstat -tulpn | grep 3000
```

### Database Connection Timeout
```bash
# Test from EC2
psql "$DATABASE_URL"

# If fails:
# - Check RDS security group allows EC2 security group
# - Verify RDS endpoint is correct
# - Check VPC route tables and NACLs
```

### Client Can't Reach Server (CORS)
```bash
# Check browser console for CORS errors
# Verify server CORS configuration includes client domain
# Check ALB health checks are passing
# Verify security groups allow traffic
```

### High Costs
```bash
# Check AWS Cost Explorer
# Common cost drivers:
# - NAT Gateway (~$32/month) - consider removing if not needed
# - RDS Multi-AZ - use single-AZ for staging
# - Data transfer - optimize API responses
# - CloudWatch logs - set retention to 7 days
```

### Solana Transactions Failing
```bash
# Check wallet balance
solana balance <PUBLIC_KEY> --url devnet

# Check RPC endpoint
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# If rate limited, consider paid RPC provider
```

## Maintenance Tasks

### Weekly
- Review CloudWatch logs for errors
- Check PM2 status: `pm2 status`
- Monitor AWS billing

### Monthly
- Review and rotate credentials
- Update npm dependencies (security patches)
- Test RDS backup restore
- Review CloudWatch alarms
- Update OS packages: `sudo apt update && sudo apt upgrade`

### Quarterly
- Full security audit
- Load testing
- Review and optimize costs
- Update Node.js version if needed
- Disaster recovery drill

## Additional Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Solana RPC Docs**: https://docs.solana.com/api/
- **Anchor Framework**: https://www.anchor-lang.com/

## Support and Escalation

For production issues:
1. Check CloudWatch logs first
2. Review server logs: `pm2 logs`
3. Check RDS Performance Insights
4. Review ALB access logs
5. Escalate to AWS Support if infrastructure issue

---

**Document Version**: 1.0
**Last Updated**: 2025-11-04
**Maintained By**: DevOps Team
