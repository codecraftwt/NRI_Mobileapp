# NRI Circle — Work Status

## Auth Flow
```
Splash → Onboarding → Login → OTP (or Email Sign In) → Plans → Payment → Dashboard
                                                                              ↓
                                                                      Family, Properties,
                                                                      Services, etc.
```

## Static Credentials
- **Email:** `test@nricircle.com`
- **Password:** `password123`

---

## All Screens & UI Fields

### Auth Screens

| Screen | Key UI Elements |
|--------|----------------|
| **Splash** | Logo (radio-button-checked icon), "NRI Circle" title, "India's Most Trusted Family & Property Care" subtitle, ActivityIndicator loader |
| **Onboarding** | 3 slides with illustration icons + taglines, "Get Started" button → Login, "Sign In" link → Login, "See Plans" link → Plans |
| **Login** | Email field, Password field (secure), **Sign In** button, OR divider, Phone field (+1 prefix), T&C checkbox, **Send OTP** button, "See Membership Plans" link, "Become a Vendor" link |
| **OTPVerify** | Back arrow, "Verify phone" title, 6-digit OTP input, Resend timer (59s), **Verify & Continue** button |
| **Plans** | **Back arrow**, 4 plan cards: Essential (₹9,999), **Family (₹24,999 - MOST POPULAR)**, Premium (₹49,999), Elite (₹99,999) — each with feature list + Choose button |
| **Payment** | Back arrow, **Plan Summary** card, **Apply Coupon** input (WELCOME20, SAVE2000), **Billing Summary** (Base + Discount + GST + Grand Total), **Payment Methods** (Stripe Card / Razorpay UPI), **Pay & Activate** button |
| **SetupWizard** | Step 1: **Family Member** (Name, Relation, Age, Health Notes), Step 2: **Property** (Name, Type, Address), **Finish & Open Dashboard** button |

### Dashboard & Core Screens

| Screen | Key UI Elements |
|--------|----------------|
| **Dashboard** | **Header** with hamburger + title, **4 KPI cards** (Active Requests count, Completed count, Membership tier, Wallet Credits), **Active Requests** list (ID, service, vendor, status badge, details eye icon), **RM Widget** (avatar, name, phone, email, Call/WhatsApp/Email buttons), **Recent Reports**, **6 Quick Actions** grid (Book Service, My Family, My Properties, Document Vault, Refer & Earn, Wallet & Coupons), **Floating SOS button** |
| **MyAccount** | Profile avatar (initials), Name, Email, Phone, Language, Membership plan, RM details, Edit/Save |
| **MyTickets** | Ticket list with status filters, each ticket shows ID, service, vendor, status badge, date |
| **MyMembership** | Current plan card, features list, upgrade options, expiry date, add-on packages link |
| **Family** | Member cards (avatar initials, name, relation, phone, city/state, health notes), **Add Family Member** button toggles form: **Name***, **Relationship***, **Phone**, **Emergency Contact**, **State**, **City**, **Address** (multiline), **Date of Birth** (dd-mm-yyyy), **Health Notes** (multiline), Cancel / Add Member buttons |
| **Properties** | Property cards (name, type, address, tenant, rent), **Add Property** button toggles form: Name, Type, Address, Tenant Name, Rent Amount, Electricity/Water/Tax numbers |
| **DocumentVault** | Document list with type tags (Aadhaar, PAN, Property, Medical), upload button, expiry badges |
| **BillingPayments** | Invoice list (ID, date, description, amount, status badge Paid/Pending), download button |
| **AddonPackages** | Add-on cards (Parent Care Gold, Enhanced Security, etc.) with price, features, Add button |
| **ReportsMedia** | Report cards (date, service type, vendor, description), view/download buttons |
| **WalletCoupons** | Wallet balance card, coupon codes list (code, discount, description, expiry), transaction history (date, description, amount, credit/debit) |
| **ReferEarn** | Referral code (display + copy), share button, referral rewards progress, referred friends list |

### Service Booking Screens

| Screen | Key UI Elements |
|--------|----------------|
| **ServicesCatalog** | Category grid: Parent Care, Property Care, Legal & Financial, Emergency Support, Concierge, Health & Wellness — each with icon, title, description |
| **ServiceDetail** | Service image/icon, title, description, pricing, features list, **Book Now** button |
| **BookingSummary** | Service name, schedule date/time, address, pricing breakdown, **Confirm Booking** button |

### Navigation

| Component | Details |
|-----------|---------|
| **AppNavigator** | Stack: Splash → Onboarding → Login → OTPVerify → Plans → Payment → SetupWizard → AppHome (Drawer) |
| **Drawer** | 12 menu items: Dashboard, My Account, My Tickets, My Membership, Family, Properties, Document Vault, Billing & Payments, Add-on Packages, Reports & Media, Wallet & Coupons, Refer & Earn + nested Services Stack + Logout |
| **Header** | Hamburger menu (drawer toggle), title, notification bell icon |
| **RMWidget** | RM card with avatar, name, phone, email, Call/WhatsApp/Email action buttons |
| **SOSButton** | Floating red emergency button (bottom-right), triggers emergency alert |

### Redux Slices

| Slice | State Shape |
|-------|-------------|
| **userSlice** | `{ user: { id, name, email, phone, membership, membershipExpiry, language, onboarded, rm }, isAuthenticated, token }` |
| **ticketsSlice** | `{ tickets: [{ id, service, vendor, status, date, description }] }` |
| **familySlice** | `{ members: [{ id, name, relation, phone, emergencyContact, state, city, address, dob, healthNotes }] }` |
| **propertiesSlice** | `{ properties: [{ id, name, type, address, tenantName, rentAmount, utilities, inspections }] }` |
| **walletSlice** | `{ walletCredits, invoices[], coupons[], transactions[] }` |
| **counterSlice** | Default template slice |

### Changes Made Today

1. **userSlice.js** — Default `isAuthenticated: false`, `user: null`, `token: null` so auth flow runs from splash
2. **store.js** — Persist `version: 2` with migrate to clear stale cache
3. **Login.js** — Added Email + Password fields + Sign In (static creds: `test@nricircle.com`)
4. **Plans.js** — Added back arrow button
5. **Payment.js** — Success now goes to Dashboard not SetupWizard
6. **Family.js** — Full form with all fields (Name*, Relationship*, Phone, Emergency Contact, State, City, Address, DOB, Health Notes), supports multiple members
7. **familySlice.js** — Updated to store phone, state, city, dob fields
