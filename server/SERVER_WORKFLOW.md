# Server Workflow (Campaign-First, University Scale)

## Overview
This document outlines the end-to-end backend workflow for the anonymous survey system at university scale. The server is campaign-first: surveys are children of campaigns, cryptographic keys are scoped to campaigns, and responses are ingested/decrypted per campaign.

## Actors
- Admin (university ops)
- Teacher (optional involvement depending on campaign type)
- Student (respondent)
- Server (Node.js/Express, PostgreSQL, Redis)
- Blockchain (Solana program)

## Core Data
- Campaign: semester context, cryptographic keys, lifecycle status
- Surveys: lightweight child records (course/teacher link)
- Tokens: campaign-level one-time tokens for students
- Responses: encrypted on-chain; decrypted/parsed off-chain

## Lifecycle

1) Plan and Configure
- Create schools, courses, teachers, students, semesters via `/api/university/*`.
- Create course assignments and enrollments via `/api/university/course-assignments` and `/api/university/enrollments`.

2) Create and Open Campaign
- Admin creates campaign `/api/campaigns`.
- Open campaign `/api/campaigns/{id}/open` to allow teacher inputs (if any).

3) Launch Campaign
- Launch `/api/campaigns/{id}/launch`:
  - Create surveys from assignments
  - Generate campaign tokens for enrolled students
  - Send email notifications

4) Student Participation
- Student validates token `/api/tokens/validate/{token}`.
- Client fetches eligible surveys `/api/surveys/token/{token}`.
- Client fetches campaign public keys `/api/crypto/campaigns/{campaignId}/public-keys`.
- Client requests blind signature `/api/crypto/campaigns/{campaignId}/blind-sign` and submits responses on-chain directly.

5) Close Campaign
- Admin closes campaign `/api/campaigns/{id}/close`.

6) Ingest and Decrypt
- Ingest on-chain responses `/api/responses/ingest/{campaignId}`.
- Decrypt and parse `/api/responses/decrypt-campaign/{campaignId}`.
- Optional: inspect parsed data `/api/responses/parsed/survey/{surveyId}` and commitment lookups `/api/responses/commitment/{commitmentHex}`.

7) Analytics and Merkle
- Merkle ops: `/api/analytics/merkle/*` (calculate roots, generate/verify proofs).
- Campaign analytics `/api/analytics/campaigns/{campaignId}/analytics`.
- Teacher performance `/api/analytics/teachers/{teacherId}/performance` (verify via `/verify-performance`).
- Student completion `/api/analytics/campaigns/{campaignId}/student-completion`.
- University-/school-level analytics as needed.

8) Publish
- Publish campaign `/api/campaigns/{id}/publish` with Merkle root.

## Security
- Admin JWT required for mutating endpoints.
- Rate limiting on crypto and ingest/decrypt endpoints.
- All cryptographic private keys stored encrypted in DB.

## Operational Notes
- Redis used for caching hot lists (schools, teachers, courses, students).
- All SQL is parameterized; ensure DB indexes on foreign keys and common filters.
- Background jobs can be added later for scheduled ingest/decrypt.

## Quick Smoke Checklist
- Campaign CRUD and lifecycle (open/close/launch/publish)
- Token: generate/validate/mark used/mark completed/list by campaign
- Crypto: campaign keys, blind sign, decrypt
- Responses: ingest, decrypt-campaign, parsed-by-survey, verify
- Analytics: merkle ops, campaign analytics, teacher performance, student completion
