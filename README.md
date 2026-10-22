# THE ROYALS CLUB — Poker Room Management System

MERN stack project (MongoDB, Express, React Create React App, Node.js) using the supplied black-and-gold THE ROYALS CLUB logo. This is management software; it does not contain a poker game engine. Phase 12 (Loyalty/VIP/Promotions/Marketing) is intentionally omitted. Razorpay checkout integration is included in test-mode-ready form; live use is blocked until merchant eligibility, chip conversion policy and configuration are verified.

## Project structure

- `backend/`: Express API, Mongoose models/services, JWT auth, Socket.IO operational events
- `frontend/`: React Create React App dashboard
- `frontend/public/royals-logo.png`: raster export of the supplied logo PDF

## Prerequisites

- Node.js 18 or 20 LTS recommended
- npm
- MongoDB local instance or MongoDB Atlas database

## Shared login and player signup

The same branded login page supports sign-in and public player registration. Public signup can only create a `player` account; staff accounts are created by the owner through Staff & Access. Players are sent to the member portal, where they can view open tables and submit a waiting-list request. A waiting-list request is not a confirmed reservation. Email OTP signup is included. Razorpay chip-purchase checkout is available when server-side keys, a chip conversion rate, approved merchant eligibility and a transaction-capable MongoDB deployment are configured.

## Local setup

1. Copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI` and a unique random `JWT_SECRET` (at least 32 random characters recommended). Set a unique owner password of at least 12 characters. Do not commit `.env`.
2. In a terminal: `cd backend` then `npm install`.
3. Create the initial owner once: `npm run create-owner`. The script refuses to create a second owner if one already exists.
4. Start the API: `npm start`. Default API base URL: `http://localhost:5000/api`.
5. In another terminal: `cd frontend`, copy `.env.example` to `.env`, then run `npm install` and `npm start`. CRA opens `http://localhost:3000`.
6. Sign in using the owner email/password configured in `backend/.env`.

## Environment variables

Backend: `PORT`, `MONGODB_URI`, `CLIENT_URL`, `JWT_SECRET`, `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD`. Frontend: `REACT_APP_API_URL` (defaults to `http://localhost:5000/api`). Frontend environment variables are public at build time; never put secrets there.

## Deploying

- Provision MongoDB Atlas and restrict network access to the deployment provider where possible.
- Deploy backend with `npm install` and `npm start`; configure all backend environment variables in the provider dashboard. Set `CLIENT_URL` to the exact deployed frontend origin.
- Deploy frontend as a static CRA build using `npm install && npm run build`, serving the `build/` directory. Set `REACT_APP_API_URL` to the deployed backend API base URL including `/api`, then rebuild.
- Enable HTTPS, rotate secrets, restrict database credentials, configure backups and verify provider logs before using real financial data.

## Important operational notes

- The cashier `card` payment method remains only a recorded method label; Razorpay checkout is a separate player chip-purchase flow and does not turn cashier card entries into actual card charges.
- KYC currently stores a document reference, not an encrypted file-upload/storage pipeline. Do not place actual identity documents in a public URL.
- Financial ledger, chip inventory concurrency, atomic transaction/reversal flows, daily closing controls, and complete automatic audit coverage need further production hardening and real-world verification.
- Socket.IO sends transient operational events; it is not a durable notification queue.
- Use a staging database first. This source package has not been tested against your live MongoDB or hosting account. Treat it as a candidate build until the operational flows below are verified in staging.


## Customer portal scope added

The customer portal includes registration/login, profile editing, Player ID and Membership ID, membership status/history, private KYC document submission and status/review-note visibility, transaction-derived operational history, demo chip purchase requests, open table information, waiting-list submit/cancel/status, and the customer's own game-session history.

Dummy chip requests are stored separately from cashier transactions and always start in `pending_review`. They do not accept real payment and do not credit chips or wallet balances. Staff approval integration is intentionally left for the staff/owner phase.

KYC uploads accept PDF/JPG/PNG files up to 5 MB and are stored under `backend/private-uploads/kyc` when the backend is run from its project directory. This directory is excluded from git. Configure persistent private storage before cloud deployment; local disk may not persist on ephemeral hosting.

Backend environment variables: copy `backend/.env.example` to `backend/.env` and set a strong `JWT_SECRET` and your MongoDB URI.


## Owner/Staff Phase 1
- Customer-submitted KYC records are reviewed from **KYC Review**.
- Demo chip purchase requests are reviewed from **Chip Purchase Requests**. The `Approve demo` action only records review status and audit history; it never credits chips or processes a payment.
- Membership plans are created in **Memberships → Membership plans**; membership activation requires an active player, an active plan, and an approved KYC record.
- If you changed a user's role while they were logged in, sign out and sign in again after updating the package. Protected APIs now read the current role and account status from MongoDB.


## Owner/Staff Phase 2 — Operational modules
- **Tables & Floor:** create tables, assign dealers, open/close tables, and manage seats.
- **Cashier Ledger:** record buy-ins and cash-outs; this is an operational record, not a payment gateway.
- **Game Sessions:** start/end sessions and record final chip counts. Session start requires the player to be seated at the selected table.
- **Chip Inventory:** manage denominations, locations, opening balances, transfers, player issue/redemption, and ledger views.
- **Daily Reconciliation:** close a business date, calculate expected closing cash from recorded transactions, and show variance.
- **Reports & Audit:** use the existing report and audit endpoints for operational summaries and traceability.
- Forms for players, tables, membership plans, chip denominations, locations and chip movements use readable dropdowns where reference data is required; staff should not have to copy MongoDB IDs manually.
- **Important financial scope:** buy-in/cash-out and chip movement entries are management records only. They do not process real payments. Demo chip purchase approval does not credit chips.


## UI and defect-fix update (2026-10-18)
- Chip Inventory controls now load table, player, denomination and location options from API data instead of undefined variables. Lists can be refreshed after configuration changes.
- Duplicate chip denomination names are checked case-insensitively in the service before creation; the existing database entries are preserved (no automatic destructive cleanup).
- Reports cards now render nested report summary values such as players.total and tables.open rather than passing whole objects into React children.
- Refresh controls now show an animated refresh indicator while records are loading.
- Added a responsive poker-table visual banner to the owner dashboard and polished mobile chip controls.

Verification note: backend JavaScript syntax and archive integrity are checked for this package. A frontend production build and live MongoDB/browser end-to-end run require installing dependencies and testing against your configured environment; do not treat this package as independently production-certified until those checks pass.


## Customer email OTP registration and email/mobile login

1. In `backend`, copy `.env.example` to `.env`. Keep your existing MongoDB URI and set a long random `JWT_SECRET` and a different `OTP_SECRET`.
2. For real email delivery, enable 2-Step Verification on the club Gmail account and create a Google App Password. Set `EMAIL_USER` and `EMAIL_APP_PASSWORD` in `backend/.env`. Do not use your normal Gmail password and do not commit `.env`.
3. Run `npm install` in `backend` and `npm install` in `frontend`.
4. Start backend with `npm run dev` and frontend with `npm start`.
5. Customer signup requires name, unique mobile number, email and password (minimum 8 characters). A 6-digit OTP is emailed and expires after 10 minutes. The active player account is created only after OTP verification.
6. Customer login accepts email or mobile number with the same password. Existing legacy accounts without `User.phone` may log in with mobile if their Player profile contains the matching phone number.

OTP email sending requires valid SMTP credentials. If `EMAIL_USER` or `EMAIL_APP_PASSWORD` is missing, registration will return a configuration error rather than pretending an OTP was sent.


## Owner login and KYC review (updated)

1. Copy `backend/.env.example` to `backend/.env` and configure `MONGODB_URI`, a strong `JWT_SECRET`, and (for registration OTP) `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_FROM`, and `OTP_SECRET`. Do not commit `.env`.
2. Set `OWNER_NAME`, `OWNER_EMAIL`, and `OWNER_PASSWORD` in `backend/.env`. The owner password must be at least 12 characters.
3. From the `backend` folder run `npm install`, then `npm run create-owner` once. The script creates the owner account in MongoDB; putting credentials in `.env` alone does not create an account. If an owner already exists, the script intentionally refuses to create a duplicate.
4. Start the backend with `npm run dev`. Start the CRA frontend in a separate terminal with `npm install` and `npm start`.
5. Sign in from the common login page with the configured owner email/password. Owner and authorized KYC staff can open the KYC Review module, use **View document**, then approve or reject pending records. Rejection requires a reason.
6. Customer documents are stored under `backend/private-uploads/kyc` (private server storage, not served as static files). Keep this folder private and include it in protected backup/retention procedures. The authorized document endpoint requires a staff JWT.
7. Customer chip-purchase requests and waiting-list requests are blocked by the backend until at least one KYC record is approved. The frontend also disables those actions while KYC is unapproved.

## Verification notes

This package has been updated in the existing project structure. Backend files were syntax-checked with `node --check`; no live MongoDB/Gmail end-to-end test or full production frontend build is claimed here. Test those workflows in your configured environment before production use.


## Razorpay payment integration (test mode first)

**Important business/compliance gate:** before accepting real payments, confirm directly with Razorpay that this exact poker-room/chip-purchase model is permitted for your merchant account and that the club's jurisdictional/legal requirements are satisfied. Do not use live keys until approval. This integration does not run a poker game engine and does not itself establish that purchased chips are legally redeemable. Rejected captured payments require a separate, reconciled refund workflow; the app does not silently refund money.

### Backend environment
Set these server-side values in `backend/.env` / hosting secrets (never in React):
- `RAZORPAY_KEY_ID=rzp_test_...`
- `RAZORPAY_KEY_SECRET=...`
- `RAZORPAY_WEBHOOK_SECRET=...` (the secret configured in Razorpay Dashboard for the webhook)
- `RAZORPAY_CHIP_RATE=...` (the club-approved number of chip accounting units per ₹1; a positive value is required before online purchase is enabled)

Keep `RAZORPAY_CHIP_RATE` empty until the business owner has explicitly selected and approved the conversion. The current chip credit is a dedicated append-only `ChipPurchaseCredit` ledger visible in the member wallet and owner API; it is not a bank balance and is not automatically mapped to physical chip inventory denominations.

### Razorpay dashboard
1. Use **test mode** and test API keys.
2. Add webhook URL `https://YOUR-BACKEND-HOST/api/payments/razorpay/webhook` (for local testing, use a secure tunnel URL).
3. Configure `payment.captured` and `payment.failed` events.
4. Set exactly the same webhook secret in backend environment variables.
5. Use HTTPS for hosted environments. Never put `RAZORPAY_KEY_SECRET` or webhook secret in frontend environment variables.

### Flow and safeguards
- Player must have active status and approved KYC to create a purchase order.
- Backend creates a server-side Razorpay order in INR; client cannot set the gateway order amount after creation.
- `Idempotency-Key` prevents repeat order creation for the same purchase intent; unique database indexes backstop duplicates.
- Checkout signature is verified server-side with HMAC-SHA256 using timing-safe comparison. The server then fetches the payment from Razorpay and matches order ID, payment ID, amount, currency and `captured` status.
- The signed webhook uses the exact raw request bytes and `X-Razorpay-Signature`. Captured and failed events are processed idempotently.
- Verified payments move to `awaiting_owner_approval`. Payment success alone never credits chips.
- Owner/general manager approval rechecks payment capture, player status and KYC, then commits request status + unique credit ledger row + audit log in a MongoDB transaction. A unique credit per purchase and a conditional status update prevent double approval/credit.
- Rejection after capture records the reason and explicitly flags the need for refund/reconciliation; no chips are credited.
- MongoDB transactions require a replica set or supported sharded cluster. A standalone local MongoDB deployment is not sufficient for the approval transaction.
- Customer wallet shows payment status and approved chip credits. Owner **Chip Purchase & Payment Approvals** queue includes gateway/payment references.

### Endpoints
- `POST /api/payments/razorpay/order` — authenticated player; requires `Idempotency-Key` header and amount body.
- `POST /api/payments/razorpay/verify` — authenticated player; verifies checkout response and gateway capture.
- `POST /api/payments/razorpay/webhook` — public gateway callback; raw body signature verification required.
- `PATCH /api/payments/chip-purchases/:id/approve` — owner/general manager only; requires `reviewNote`.
- `PATCH /api/payments/chip-purchases/:id/reject` — owner/general manager only; requires `reviewNote`.
- `GET /api/payments/credits` — authorized staff credit ledger.

### Staging test checklist
1. Missing keys or empty chip rate returns configuration error and does not create a payment.
2. Non-active player or unapproved KYC cannot create an order.
3. Amount below ₹1, above configured limit, malformed amount, or amount tampering is rejected.
4. Invalid checkout signature, wrong order, wrong amount/currency, and non-captured payment cannot move request to approval.
5. Replay the same `Idempotency-Key`: same order/request is returned, not a new purchase.
6. Replay the same webhook or verify request: no duplicate chip credit.
7. Concurrent owner approval requests: only one `ChipPurchaseCredit` row per request.
8. Failed payment never appears as approved and never credits chips.
9. Successful payment remains awaiting owner approval until an authorized owner approves it.
10. Owner approval writes one credit and audit record; retrying approval returns conflict/already-credited behavior without a second credit.
11. Rejecting a captured payment creates no credit and leaves an explicit refund/reconciliation obligation.
12. Verify these cases against a staging replica-set MongoDB and Razorpay test mode before live deployment.

This ZIP has not been tested against your Razorpay merchant account, live webhook, configured MongoDB replica set, or hosted deployment. The code still needs dependency installation, syntax/build checks and end-to-end staging tests before it should be considered ready for real payments.

## Razorpay real-money chip purchase (test mode first)

- Conversion is fixed server-side at **₹1 = 1 chip**. Chip purchase amounts must be whole rupees so chip quantities remain integers.
- Customer must have approved KYC. Customer starts Razorpay Checkout from the Player Portal; the server creates the order and verifies the checkout signature and then fetches the payment from Razorpay before marking it paid.
- A valid `payment.captured` webhook can also mark the order as verified. Chips are **not** credited by checkout success alone: an authorized owner/general manager must review the verified payment and approve it.
- Approval writes a unique `ChipPurchaseCredit` record and audit entry in a MongoDB transaction. Unique request/payment/reference indexes prevent duplicate credits. The customer portal reads the approved credit records for their chip total and history.
- Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`; never put secrets in frontend environment variables or commit them. Use test keys and a webhook URL of `https://YOUR_API_HOST/api/payments/razorpay/webhook`. Subscribe to `payment.captured` and `payment.failed`. Ensure MongoDB is a replica set or supported sharded deployment because approvals use multi-document transactions.
- Do not enable live collection until Razorpay confirms in writing that the club's exact poker/chip model is permitted and all legal/compliance requirements are satisfied. Rejected captured payments require a manual refund/reconciliation process; this build does not automatically refund.

### Staging acceptance checklist

1. KYC-pending player cannot create a payment order.
2. Approved-KYC player enters ₹100; checkout order amount is 10000 paise and conversion preview is 100 chips.
3. Cancel checkout; no chip credit appears.
4. Simulate failed payment; no chip credit appears and history shows failure when webhook arrives.
5. Complete a test payment; backend signature and Razorpay API verification must succeed, and request becomes `awaiting_owner_approval`.
6. Customer must still have zero additional chips before owner approval.
7. Owner approves once; one credit record appears for 100 chips and customer portal total increases by 100.
8. Repeat approval and webhook delivery; no second credit is created.
9. Amount/order/currency mismatch and invalid signatures must be rejected.
10. Test with MongoDB replica set; confirm a failed transaction leaves no partial approval/credit/audit changes.

The ZIP and JavaScript syntax checks can be validated locally, but a real Razorpay sandbox transaction, frontend build, MongoDB replica-set transaction test, and browser end-to-end run require your configured environment and gateway credentials; do not treat this package as live-payment certified until those pass.
