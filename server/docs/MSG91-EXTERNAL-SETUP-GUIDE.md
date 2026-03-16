# MSG91 Account, DLT & External Setup Guide

> **Parent Document:** [`MSG91-INTEGRATION-GUIDE.md`](./MSG91-INTEGRATION-GUIDE.md)  
> **Scope:** MSG91 dashboard configuration, DLT registration, and test/sandbox environment setup  
> **When to use:** Complete these steps **before** implementing the backend integration

---

## Project Timeline

| Day | Key Tasks & Milestones |
|---|---|
| **1** | MSG91 account created · Auth Key noted · OTP template created · DLT Entity registration submitted (Jio / Airtel / Vi) |
| **2** | Development bypass enabled (`testMode: true` in `config/index.js`) · backend dev begins unblocked |
| **3** | DLT Sender ID (`EVRCUT`) submitted for registration |
| **4** | DLT OTP template text submitted for approval |
| **5–7** | *(DLT approvals in progress — no action needed)* Backend integration continues in parallel |
| **7** | PE–TM chain binding completed — MSG91 (Walkover) added as Telemarketer in DLT portal |
| **8–9** | DLT approvals received · Entity ID + Sender ID + Template ID entered in MSG91 dashboard |
| **10** | Staging SMS test with real credits · annual renewal reminder set · external setup checklist signed off |

> ⏱ *DLT approval timelines are set by the telecom portals (typically 5–10 business days). All backend development proceeds in parallel using test mode.*

---

## 1. Create MSG91 Account

1. Sign up at [msg91.com](https://msg91.com)
2. Navigate to **Dashboard → OTP** → Create a new OTP configuration
3. Note your **Auth Key** from **Dashboard → API Keys**
4. Create an **OTP Template**:
   - Go to **OTP → Templates → Create Template**
   - Template text: `Your OTP for EverCut is {otp}. Valid for {expiry} minutes. Do not share this code.`
   - Set OTP length: **6 digits**
   - Set OTP expiry: **10 minutes**
   - Note the generated **Template ID**

---

## 2. DLT Registration (Mandatory for India Production)

> ⚠️ **Without DLT registration, MSG91 cannot deliver SMS in India.** Complete this before going live.

| Step | Action | Timeline | Cost |
|---|---|---|---|
| 1 | Register as **Principal Entity** on a DLT portal (Jio TrueConnect / Airtel DLT / Vi) | 1–3 working days | ~₹5,900/year (incl. GST) |
| 2 | Register **Sender ID** (Header): `EVRCUT` (6 chars, representing your brand) | 1–2 working days | ₹0 (included) |
| 3 | Register **OTP Template**: `Your OTP for EverCut is {#var#}. Valid for {#var#} minutes. Do not share this code.` | 1–2 working days | ₹0 (included) |
| 4 | **PE–TM Chain Binding**: Add MSG91 (Walkover Web Solutions) as your Telemarketer in the DLT portal | Immediate | ₹0 |
| 5 | In MSG91 Dashboard → **Settings → DLT**: Enter your DLT Entity ID, Sender ID, and approved Template ID | Immediate | ₹0 |

**Required Documents:**
- Company PAN Card
- GST Certificate (or Certificate of Incorporation)
- Authorized signatory ID proof (Aadhaar / PAN / Passport)
- Authorization Letter on company letterhead

---

## 3. Test / Sandbox Environment

Since DLT registration takes 1–2 weeks, use these strategies for development:

### 3.1 Development Bypass (Recommended)

In `src/config/index.js`, flip `testMode: true` inside the `msg91` config block. This makes `sms-provider.service.js`:
- **Skip MSG91 API calls** entirely
- Accept the hardcoded OTP (`testOtp: '123456'` in the same config block)
- Log the "sent" OTP to console for debugging

### 3.2 Staging with Real SMS

Once DLT is approved:
- Use a separate MSG91 project/auth key for staging
- Top up with minimal credits (~₹500) for testing
- Restrict to a whitelist of team phone numbers initially

---

## 4. Pre-Launch Checklist — External Setup

- [ ] MSG91 account created and Auth Key obtained
- [ ] OTP template created in MSG91 dashboard (note Template ID)
- [ ] DLT Entity Registration submitted (Jio/Airtel/Vi) — ~1–2 weeks
- [ ] DLT Sender ID registered: `EVRCUT`
- [ ] DLT OTP template text approved
- [ ] PE–TM chain binding: MSG91 (Walkover) added as Telemarketer
- [ ] DLT Entity ID + Sender ID + Template ID configured in MSG91 dashboard
- [ ] Calendar reminder set for annual DLT renewal (~₹5,900/year)