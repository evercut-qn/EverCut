# Payment & Payout Logic

## ⚠️ Note
- Service amounts shown below (₹99, ₹309, etc.) are **examples for explanation purposes only** and can vary dynamically.  
- **Platform fees, payout charges, and refund fees are fixed** as per platform rules.  
- The **only enforced pricing rule** is:  
  👉 Minimum bundle service amount must be **₹300**.

---

## 1. Payment Logic (Customer → Platform)

### A. Single Service (e.g., Haircut)
- Service Fee: ₹99 *(example)*  
- Platform Fee: ₹3  

**Total Paid by Customer:**  
₹99 + ₹3 = **₹102**

---

### B. Bundle of Services (e.g., Haircut + Beard Trim + Additional Service)
- Service Fee: ₹309 *(example, must be ≥ ₹300)*  
- Platform Fee: ₹10  

**Total Paid by Customer:**  
₹309 + ₹10 = **₹319**

**Rule:**  
- The **minimum total service amount for any bundle must be ₹300**.  
- If the bundle total is less than ₹300, additional services must be added to meet the minimum requirement.

---

## 2. Payout Logic (Platform → Barber)

The platform sends the **exact service amount** to the barber.  
Payout fees and GST are **deducted separately by Cashfree from the platform account**.

**Payout Timing:**  
- Payouts are processed **at the end of the day** for completed services.  
- Once payout is initiated, the **refund window is closed**.

---

### A. Single Service (e.g., Haircut)
- Service Amount: ₹99 *(example)*  

**Payout Sent:** ₹99  
**Cashfree Charges:** ₹3 + ₹0.54 (GST)  

**Total Deducted from Platform:**  
₹102.54  

**Amount Received by Barber:**  
₹99  

---

### B. Bundle of Services (e.g., Haircut + Beard Trim + Additional Service)
- Service Amount: ₹309 *(example, must be ≥ ₹300)*  

**Payout Sent:** ₹309  
**Cashfree Charges:** ₹3 + ₹0.54 (GST)  

**Total Deducted from Platform:**  
₹312.54  

**Amount Received by Barber:**  
₹309  

---

## 3. Refund Logic

### A. Single Service (e.g., Haircut)
- Total Paid: ₹102  
- Refund Fee: ₹7  
- Platform Fee (Non-refundable): ₹3  

**Refund Amount:**  
₹102 - ₹7 - ₹3 = **₹92**

---

### B. Bundle of Services (e.g., Haircut + Beard Trim + Additional Service)
- Total Paid: ₹319  
- Refund Fee: ₹15  
- Platform Fee (Non-refundable): ₹10  

**Refund Amount:**  
₹319 - ₹15 - ₹10 = **₹294**

---

### Refund Rules
- Platform fee is **non-refundable**.  
- Refund fee is **deducted before processing refund**.  
- No refunds are allowed **after payout is processed**.