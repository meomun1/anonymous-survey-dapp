████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
█                                                                                                                  █
█                          ANONYMOUS SURVEY WORKFLOW - DATA TRACKING TABLE                                        █
█                          Showing all variables and their values at each step                                    █
█                                                                                                                  █
████████████████████████████████████████████████████████████████████████████████████████████████████████████████████


📋 STEP 1: ADMIN CREATES CAMPAIGN & GENERATES KEYS

========================================================================================================================
STEP 1: Campaign Creation - Server Side
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ campaignId             │ string       │ 19 chars   │ campaign-fall-2024                       │ Server     │ Public     │
│ encryptionPublicKey    │ CryptoKey    │ 2048 bits  │ MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBC... │ Server     │ Public     │
│ encryptionPrivateKey   │ CryptoKey    │ 2048 bits  │ [SENSITIVE - NOT SHOWN]                  │ Server     │ Private    │
│ blindSignPublicKey     │ CryptoKey    │ 2048 bits  │ MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBC... │ Server     │ Public     │
│ blindSignPrivateKey    │ CryptoKey    │ 2048 bits  │ [SENSITIVE - NOT SHOWN]                  │ Server     │ Private    │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

========================================================================================================================
STEP 1: Token Generation - Database
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ token                  │ string       │ 64 chars   │ 7240708f30c405fe78c816525852a67b1a85a... │ Database   │ Private    │
│ student_email          │ string       │ 24 chars   │ alice@university.edu                     │ Database   │ Private    │
│ campaign_id            │ UUID         │ 36 chars   │ campaign-fall-2024                       │ Database   │ Private    │
│ used                   │ boolean      │ 1 bit      │ false                                    │ Database   │ Private    │
│ is_completed           │ boolean      │ 1 bit      │ false                                    │ Database   │ Private    │
│ blockchain_submitted   │ boolean      │ 1 bit      │ false                                    │ Database   │ Private    │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 2: STUDENT RECEIVES TOKEN & VALIDATES

========================================================================================================================
STEP 2: Token Validation - Client Side
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ token                  │ string       │ 64 chars   │ 7240708f30c405fe78c816525852a67b1a85a... │ Client     │ Private    │
│ campaignId             │ string       │ 19 chars   │ campaign-fall-2024                       │ Client     │ Public     │
│ encryptionPublicKey    │ CryptoKey    │ 2048 bits  │ MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBC... │ Client     │ Public     │
│ blindSignPublicKey     │ CryptoKey    │ 2048 bits  │ MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBC... │ Client     │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 3: STUDENT PREPARES ANSWER

========================================================================================================================
STEP 3: Answer Preparation - Client Side
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ surveyId               │ string       │ 22 chars   │ survey-cs101-teacher1                    │ Client     │ Private    │
│ courseCode             │ string       │ 5 chars    │ CS101                                    │ Client     │ Private    │
│ teacherId              │ string       │ 11 chars   │ teacher-001                              │ Client     │ Private    │
│ answers                │ string       │ 5 chars    │ 54321                                    │ Client     │ Private    │
│ answerString           │ string       │ 50 chars   │ survey-cs101-teacher1|CS101|teacher-0... │ Client     │ Private    │
│ commitment             │ SHA-256      │ 64 hex     │ c11c8acd63f245407bdff8e1fde994189c083... │ Client     │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 4: BLIND SIGNATURE PROTOCOL

========================================================================================================================
STEP 4a: Client Blinds Commitment
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ commitment             │ SHA-256      │ 64 hex     │ c11c8acd63f245407bdff8e1fde994189c083... │ Client     │ Public     │
│ preparedMsg            │ Uint8Array   │ 96 bytes   │ d4716afd5df82260239eb41418d6f475c920c... │ Client     │ Private    │
│ blindedMsg             │ Uint8Array   │ 256 bytes  │ 673f3ad6debdf0e5ab56fd46d1bcd7a8ea069... │ Client     │ Public     │
│ inv (blinding factor)  │ Uint8Array   │ 256 bytes  │ 33e09343d0bf78779f05958d6b2b86208a6f7... │ Client     │ Private    │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

========================================================================================================================
STEP 4b: Server Signs Blinded Message
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ blindedMsg (received)  │ Uint8Array   │ 256 bytes  │ 673f3ad6debdf0e5ab56fd46d1bcd7a8ea069... │ Server     │ Public     │
│ blindSignPrivateKey    │ CryptoKey    │ 2048 bits  │ [USED TO SIGN - NOT SHOWN]               │ Server     │ Private    │
│ blindSignature         │ Uint8Array   │ 256 bytes  │ 266fc06a327fde14e13a15d495cd47491440e... │ Server     │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

🔐 CRITICAL: Server NEVER sees the actual commitment value!
   Server only sees: blindedMsg (random-looking bytes)
   Server cannot link blindedMsg to final signature

========================================================================================================================
STEP 4c: Client Unblinds Signature
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ blindSignature         │ Uint8Array   │ 256 bytes  │ 266fc06a327fde14e13a15d495cd47491440e... │ Client     │ Public     │
│ inv (blinding factor)  │ Uint8Array   │ 256 bytes  │ 33e09343d0bf78779f05958d6b2b86208a6f7... │ Client     │ Private    │
│ signature (final)      │ Uint8Array   │ 256 bytes  │ 0cd88f87fa9aff114bceb6383614ce8ee96e8... │ Client     │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 5: ENCRYPT ANSWER

========================================================================================================================
STEP 5: Answer Encryption - Client Side
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ answerString (plaintext) │ string       │ 50 chars   │ survey-cs101-teacher1|CS101|teacher-0... │ Client     │ Private    │
│ encryptionPublicKey    │ CryptoKey    │ 2048 bits  │ [USED FOR ENCRYPTION]                    │ Client     │ Public     │
│ encryptedAnswer        │ Uint8Array   │ 256 bytes  │ 81ec97e9fec5b0366531503ebb1f41c349f1d... │ Client     │ Encrypted  │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 6: CLIENT SAVES PROOF TO LOCAL STORAGE

========================================================================================================================
STEP 6: Proof Stored in Browser localStorage
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ surveyId               │ string       │ 22 chars   │ survey-cs101-teacher1                    │ Client     │ Private    │
│ commitment             │ SHA-256      │ 64 hex     │ c11c8acd63f245407bdff8e1fde994189c083... │ Client     │ Public     │
│ encryptedData          │ Uint8Array   │ 256 bytes  │ 81ec97e9fec5b0366531503ebb1f41c349f1d... │ Client     │ Encrypted  │
│ signature              │ Uint8Array   │ 256 bytes  │ 0cd88f87fa9aff114bceb6383614ce8ee96e8... │ Client     │ Public     │
│ timestamp              │ ISO-8601     │ 24 chars   │ 2025-12-01T13:17:59.617Z                 │ Client     │ Private    │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 7: SUBMIT TO BLOCKCHAIN

========================================================================================================================
STEP 7: Blockchain Submission - Transaction Data
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ commitment             │ SHA-256      │ 64 hex (32B) │ c11c8acd63f245407bdff8e1fde994189c083... │ Blockchain │ Public     │
│ encryptedAnswer        │ Uint8Array   │ 256 bytes  │ 81ec97e9fec5b0366531503ebb1f41c349f1d... │ Blockchain │ Encrypted  │
│ campaignPDA            │ Pubkey       │ 32 bytes   │ [Solana Account Address]                 │ Blockchain │ Public     │
│ transaction_signature  │ Signature    │ 64 bytes   │ [Solana Transaction Signature]           │ Blockchain │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

🔐 CRITICAL: Server does NOT receive this data yet!
   Data goes directly to Solana blockchain
   Server will ingest LATER when admin closes campaign

========================================================================================================================
STEP 7: Database Token Update (After Blockchain Submit)
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ token                  │ string       │ 64 chars   │ 7240708f30c405fe78c816525852a67b1a85a... │ Database   │ Private    │
│ used                   │ boolean      │ 1 bit      │ true                                     │ Database   │ Private    │
│ is_completed           │ boolean      │ 1 bit      │ true                                     │ Database   │ Private    │
│ blockchain_submitted   │ boolean      │ 1 bit      │ true                                     │ Database   │ Private    │
│ completed_at           │ timestamp    │ 8 bytes    │ 2025-12-01T13:17:59.618Z                 │ Database   │ Private    │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

⚠️  NOTE: Database knows Alice completed survey, but NOT which response is hers!


📋 STEP 8: ADMIN CLOSES CAMPAIGN

========================================================================================================================
STEP 8: Campaign Status Update - Database
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ campaign_id            │ UUID         │ 36 chars   │ campaign-fall-2024                       │ Database   │ Public     │
│ status (before)        │ enum         │ 8 chars    │ launched                                 │ Database   │ Public     │
│ status (after)         │ enum         │ 6 chars    │ closed                                   │ Database   │ Public     │
│ closed_at              │ timestamp    │ 8 bytes    │ 2025-12-01T13:17:59.618Z                 │ Database   │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 9: INGEST RESPONSES FROM BLOCKCHAIN

========================================================================================================================
STEP 9: Data Ingested into Database (survey_responses)
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ response_id            │ UUID         │ 36 chars   │ [Generated UUID]                         │ Database   │ Public     │
│ campaign_id            │ UUID         │ 36 chars   │ campaign-fall-2024                       │ Database   │ Public     │
│ commitment             │ SHA-256      │ 64 hex     │ c11c8acd63f245407bdff8e1fde994189c083... │ Database   │ Public     │
│ encrypted_response     │ bytea        │ 256 bytes  │ 81ec97e9fec5b0366531503ebb1f41c349f1d... │ Database   │ Encrypted  │
│ blockchain_tx          │ string       │ 88 chars   │ [Solana Transaction Signature]           │ Database   │ Public     │
│ ingested_at            │ timestamp    │ 8 bytes    │ 2025-12-01T13:17:59.618Z                 │ Database   │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

🔐 PRIVACY CHECK:
   ❌ No student_email column in survey_responses table
   ❌ No FK linking to survey_tokens table
   ✅ Response is anonymous in database!


📋 STEP 10: ADMIN DECRYPTS RESPONSES

========================================================================================================================
STEP 10a: Decryption Process - Server Side
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ encrypted_response     │ bytea        │ 256 bytes  │ 81ec97e9fec5b0366531503ebb1f41c349f1d... │ Server     │ Encrypted  │
│ encryptionPrivateKey   │ CryptoKey    │ 2048 bits  │ [USED FOR DECRYPTION - NOT SHOWN]        │ Server     │ Private    │
│ decrypted_string       │ string       │ 45 chars   │ survey-cs101-teacher1|CS101|teacher-0... │ Server     │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

========================================================================================================================
STEP 10b: Commitment Verification
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ stored_commitment      │ SHA-256      │ 64 hex     │ c11c8acd63f245407bdff8e1fde994189c083... │ Database   │ Public     │
│ decrypted_string       │ string       │ 45 chars   │ survey-cs101-teacher1|CS101|teacher-0... │ Server     │ Public     │
│ recomputed_commitment  │ SHA-256      │ 64 hex     │ c11c8acd63f245407bdff8e1fde994189c083... │ Server     │ Public     │
│ is_valid               │ boolean      │ 1 bit      │ true                                     │ Server     │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

========================================================================================================================
STEP 10c: Parse Decrypted Answer
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ surveyId (parsed)      │ string       │ 21 chars   │ survey-cs101-teacher1                    │ Server     │ Public     │
│ courseCode (parsed)    │ string       │ 5 chars    │ CS101                                    │ Server     │ Public     │
│ teacherId (parsed)     │ string       │ 11 chars   │ teacher-001                              │ Server     │ Public     │
│ answers (parsed)       │ string       │ 5 chars    │ 54321                                    │ Server     │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 11: STORE DECRYPTED & PARSED DATA

========================================================================================================================
STEP 11a: Decrypted Responses Table
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ id                     │ UUID         │ 36 chars   │ [Generated UUID]                         │ Database   │ Public     │
│ survey_response_id     │ UUID         │ 36 chars   │ [FK to survey_responses]                 │ Database   │ Public     │
│ decrypted_answer       │ text         │ 45 chars   │ survey-cs101-teacher1|CS101|teacher-0... │ Database   │ Public     │
│ commitment_verified    │ boolean      │ 1 bit      │ true                                     │ Database   │ Public     │
│ decrypted_at           │ timestamp    │ 8 bytes    │ 2025-12-01T13:17:59.620Z                 │ Database   │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘

========================================================================================================================
STEP 11b: Parsed Responses Table (per question)
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ id                     │ UUID         │ 36 chars   │ [Generated UUID]                         │ Database   │ Public     │
│ survey_id              │ UUID         │ 36 chars   │ survey-cs101-teacher1                    │ Database   │ Public     │
│ course_code            │ string       │ 5 chars    │ CS101                                    │ Database   │ Public     │
│ teacher_id             │ UUID         │ 36 chars   │ teacher-001                              │ Database   │ Public     │
│ question_1_rating      │ integer      │ 4 bytes    │ 5                                        │ Database   │ Public     │
│ question_2_rating      │ integer      │ 4 bytes    │ 4                                        │ Database   │ Public     │
│ question_3_rating      │ integer      │ 4 bytes    │ 3                                        │ Database   │ Public     │
│ question_4_rating      │ integer      │ 4 bytes    │ 2                                        │ Database   │ Public     │
│ question_5_rating      │ integer      │ 4 bytes    │ 1                                        │ Database   │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


📋 STEP 12: ADMIN VIEWS ANALYTICS

========================================================================================================================
STEP 12: Analytics API Response
========================================================================================================================
┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐
│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │
├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤
│ surveyId               │ string       │ 21 chars   │ survey-cs101-teacher1                    │ Server     │ Public     │
│ courseCode             │ string       │ 5 chars    │ CS101                                    │ Server     │ Public     │
│ teacherId              │ string       │ 11 chars   │ teacher-001                              │ Server     │ Public     │
│ total_responses        │ integer      │ 4 bytes    │ 1                                        │ Server     │ Public     │
│ avg_question_1         │ float        │ 8 bytes    │ 5                                        │ Server     │ Public     │
│ avg_question_2         │ float        │ 8 bytes    │ 4                                        │ Server     │ Public     │
│ student_identity       │ N/A          │ N/A        │ ❌ UNKNOWN (anonymous)                    │ Server     │ Public     │
└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘


========================================================================================================================
DATA FLOW SUMMARY: What Data Exists Where?
========================================================================================================================

📍 CLIENT (Browser):
   • Token (64 hex chars)
   • Answer plaintext (e.g., "survey-cs101|CS101|teacher-001|54321")
   • Commitment (SHA-256 hash)
   • Blinding factor inv (for unlinkability)
   • Encrypted answer (256 bytes)
   • Signature (256 bytes)
   • Proof in localStorage (surveyId + commitment + encrypted + signature)

📍 SERVER:
   • Campaign encryption keys (public + private, 2048-bit RSA-OAEP)
   • Campaign blind signature keys (public + private, 2048-bit RSA-PSS)
   • Blinded message during signature request (NEVER sees actual commitment!)
   • After ingestion: encrypted responses + commitments from blockchain
   • After decryption: plaintext answers + parsed ratings
   ❌ NEVER has: Link between student identity and specific answer

📍 DATABASE (PostgreSQL):
   • survey_tokens: token, student_email, campaign_id, used, is_completed
   • survey_responses: commitment, encrypted_response, blockchain_tx
   • decrypted_responses: decrypted_answer, commitment_verified
   • parsed_responses: survey_id, ratings for each question
   ❌ NO FK from responses to students (preserves anonymity!)

📍 BLOCKCHAIN (Solana):
   • Campaign PDA (Program Derived Address)
   • Array of commitments (32 bytes each)
   • Array of encrypted responses (256 bytes each)
   • Total responses count
   • Merkle root (after campaign published)
   • Immutable, publicly verifiable


========================================================================================================================
PRIVACY PROPERTIES
========================================================================================================================

✅ What IS Protected:
   1. Server cannot link students to their specific answers
   2. Server cannot see commitment during blind signature (only blindedMsg)
   3. Same plaintext → different ciphertext (RSA-OAEP randomization)
   4. Same commitment → different blindedMsg (blind signature randomization)
   5. Database has no FK from responses to students
   6. Blockchain submission bypasses server (no real-time correlation)

⚠️  What is NOT Protected:
   1. Server knows which students participated (survey_tokens.is_completed)
   2. Server knows how many students submitted (COUNT)
   3. If only 1 student submits, that response is obviously theirs
   4. Blind signature endpoint currently has NO authentication (vulnerability!)

💰 Data Storage Costs:
   • Blockchain: 5.76 MB account = 40 SOL rent (~$5,200 upfront)
   • Database: ~1 KB per response (negligible with PostgreSQL)
   • Client localStorage: ~1 KB per proof


========================================================================================================================
END OF DATA TRACKING DEMONSTRATION
========================================================================================================================