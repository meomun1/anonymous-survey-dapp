# Security Fixes - Implementation Details
**Date**: 2025-12-01 | **Status**: Ready to Implement

## Overview

This document provides technical details for implementing the security fixes identified in SECURITY_AUDIT.md.

---

## Fix #1: Random Delay (1-5 minutes)

### How It Works
**Students see instant "Success" - NO WAITING!**

```
Student clicks "Submit"
    ↓
Server returns "Success!" ← Student sees immediately
    ↓
Submission queued in Redis
    ↓
Random delay: 1-5 minutes
    ↓
Background worker writes to database
```

### Implementation
```javascript
// Server-side (students don't wait!)
app.post('/api/responses/submit-batch', async (req, res) => {
  const submissionId = req.body.submissionId;

  // Add to queue with random delay
  const delay = Math.floor(Math.random() * 4 * 60 * 1000) + 60 * 1000; // 1-5 min
  await queue.add('process-submission', req.body, { delay });

  // Return success immediately
  res.json({ success: true, message: 'Submission received' });
});
```

**Privacy Benefit**: Server cannot correlate token time with submission time

---

## Fix #2: Submission Mixing Proxy

### Architecture
```
Student (Real IP: 192.168.1.100)
    ↓
Mixing Proxy (submit.university.edu)
    ↓
Real Server (Only sees proxy IP: 203.0.113.50)
```

### nginx Configuration
```nginx
# /etc/nginx/sites-available/survey-proxy
server {
    listen 443 ssl;
    server_name submit.university.edu;

    access_log off; # Don't log IPs

    # Remove IP headers
    proxy_set_header X-Real-IP "";
    proxy_set_header X-Forwarded-For "";

    location /api/responses/submit-batch {
        proxy_pass https://real-server.university.edu;
    }
}
```

**Privacy Benefit**: Server cannot see student IPs, only sees proxy IP (same for everyone)

---

## Fix #3: SHA-256 Ticket Commitment

### Problem with RSA-OAEP
```javascript
// BAD: Creates unique ciphertext
const encrypted1 = rsaEncrypt("ticket-type-3"); // → abc123...
const encrypted2 = rsaEncrypt("ticket-type-3"); // → def456... (DIFFERENT!)
```

### Solution: SHA-256 Commitment
```javascript
// GOOD: Deterministic (identical for same input)
const commitment1 = SHA256('{"type":3}'); // → abc123...
const commitment2 = SHA256('{"type":3}'); // → abc123... (SAME!)
```

### Implementation
```javascript
// Phase 1: Server generates commitment
const ticketData = { type: surveyCount };
const ticketCommitment = crypto.createHash('sha256')
  .update(JSON.stringify(ticketData))
  .digest('hex');

// Phase 3: Server verifies commitment
const expectedCommitment = crypto.createHash('sha256')
  .update(JSON.stringify({ type: responses.length }))
  .digest('hex');

if (receivedCommitment !== expectedCommitment) {
  return res.status(403).json({ error: 'Ticket mismatch' });
}
```

**Privacy Benefit**: All students with same survey count get identical commitment

---

## Fix #4: Idempotency Support

### Problem
```
Student submits → Network drops → Student retries → DUPLICATE!
```

### Solution
```javascript
// Client: Generate unique submission ID
const submissionId = crypto.randomUUID();

// Client: Retry with same ID
fetch('/api/submit', {
  headers: { 'X-Idempotency-Key': submissionId },
  body: JSON.stringify({ submissionId, ...data })
});

// Server: Check if already processed
const existing = await db.query(
  'SELECT * FROM submission_attempts WHERE submission_id = $1',
  [submissionId]
);

if (existing.rows[0]?.status === 'completed') {
  // Return cached result (idempotent!)
  return res.json({ blindSignature: existing.rows[0].blind_signature });
}
```

**Reliability Benefit**: Network interruptions don't cause duplicate submissions

---

## Fix #5: Content Security Policy

### Implementation
```javascript
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "connect-src 'self' https://submit.university.edu;"
  );
  next();
});
```

**Security Benefit**: Prevents script injection attacks

---

## Fix #6: Remove IP Logging

### Implementation
```javascript
// Express middleware
app.use('/api/responses/submit-batch', (req, res, next) => {
  delete req.ip;
  delete req.ips;
  req.headers['x-forwarded-for'] = undefined;
  next();
});
```

**Privacy Benefit**: Server doesn't log IPs even if requested

---

## Database Changes

```sql
-- Idempotency table
CREATE TABLE submission_attempts (
  id TEXT PRIMARY KEY,
  submission_id TEXT UNIQUE NOT NULL,
  blind_signature TEXT,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ticket commitment
ALTER TABLE survey_tokens
ADD COLUMN ticket_count INTEGER DEFAULT 0,
ADD COLUMN ticket_commitment TEXT;
```

---

## Implementation Checklist

- [ ] Set up Redis for job queue
- [ ] Deploy nginx mixing proxy
- [ ] Implement SHA-256 commitments
- [ ] Add idempotency checking
- [ ] Add CSP headers
- [ ] Remove IP logging
- [ ] Test with network interruptions

**Estimated Time**: 2-3 days
