'use client';

import React, { useRef, useEffect } from 'react';

export const LEGAL_DOCS = [
  { id: 'customer-privacy', label: 'Customer Privacy Policy' },
  { id: 'merchant-privacy', label: 'Merchant Privacy Policy' },
  { id: 'terms', label: 'Terms and Conditions' },
  { id: 'refund', label: 'Cancellation and Refund Policy' },
  { id: 'merchant-agreement', label: 'Merchant Partner Agreement' }
];

export function LegalReader({ activeDocId, onSelectDoc }) {
  const readerRef = useRef(null);

  // Scroll reader to top when activeDocId changes
  useEffect(() => {
    if (readerRef.current) {
      readerRef.current.scrollTop = 0;
    }
  }, [activeDocId]);

  const activeIndex = LEGAL_DOCS.findIndex((d) => d.id === activeDocId);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  const handleKeyDown = (e, index) => {
    let nextIndex = index;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      nextIndex = (index + 1) % LEGAL_DOCS.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + LEGAL_DOCS.length) % LEGAL_DOCS.length;
    } else {
      return;
    }
    e.preventDefault();
    onSelectDoc(LEGAL_DOCS[nextIndex].id, false);
  };

  return (
    <section className="block" id="legal">
      <div className="wrap">
        <div className="head">
          <h2>Legal and Policies.</h2>
          <p>Everything about how Evercut handles your data, bookings, payments and partnerships, in one place.</p>
        </div>

        <div className="legal-grid">
          <div className="ltabs" role="tablist" aria-label="Legal documents">
            {LEGAL_DOCS.map((doc, idx) => (
              <button
                key={doc.id}
                className="tab ltab"
                role="tab"
                aria-selected={safeIndex === idx}
                onClick={() => onSelectDoc(doc.id, false)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
              >
                {doc.label}
              </button>
            ))}
          </div>

          <div className="reader raised" id="reader" ref={readerRef} tabIndex={0} aria-live="polite">
            {/* 1. Customer Privacy Policy */}
            <article className="doc" id="customer-privacy" hidden={safeIndex !== 0}>
              <h3>Customer Privacy Policy</h3>
              <p className="eff">Effective 30 October 2026</p>
              <p>
                This policy explains how Quantneural Private Limited (“Evercut”, “we”, “us”) collects, uses, shares and protects your personal data when you use the Evercut Customer App and evercut.in. We handle personal data in line with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023, as they apply.
              </p>

              <h4>1. Information we collect</h4>
              <ul>
                <li>Account details: your name, mobile number, email address and the grooming category you browse (male or female).</li>
                <li>Location: your approximate or precise location, only with your permission, so we can show nearby salons.</li>
                <li>Booking details: the salons, services, stylists and time slots you choose, bills, coupons used and appointment history.</li>
                <li>Reviews, ratings and messages you send through the app.</li>
                <li>Device and usage data: device model, operating system, app version, IP address and crash logs.</li>
                <li>Payment information: payments are handled by licensed payment partners. We do not store your card number, UPI PIN or banking passwords.</li>
              </ul>

              <h4>2. How we use your information</h4>
              <ul>
                <li>To create and verify your account.</li>
                <li>To show nearby salons and open or closed status.</li>
                <li>To book exact 5-minute slots and calculate your bill, including discounts and the platform fee.</li>
                <li>To send booking confirmations, barber replies and reminders.</li>
                <li>To give support, prevent fraud and misuse, and improve the app.</li>
                <li>To meet legal, tax and regulatory obligations.</li>
              </ul>

              <h4>3. Consent</h4>
              <p>
                We process your data based on your consent and, where the law allows, for legitimate uses such as completing a booking you requested. You can withdraw consent at any time by writing to us. Withdrawing consent may mean we can no longer provide some features.
              </p>

              <h4>4. Who we share data with</h4>
              <ul>
                <li>The salon and stylist you book, who receive your name, contact details and booking details to serve you.</li>
                <li>Service providers who help us run Evercut, such as cloud hosting, notifications, payments and analytics. They may use data only to provide their service to us.</li>
                <li>Government or law-enforcement authorities when required by law or a valid legal order.</li>
                <li>A successor, if Evercut is merged, acquired or restructured, subject to this policy.</li>
              </ul>
              <p>We do not sell your personal data.</p>

              <h4>5. How long we keep data</h4>
              <p>
                We keep your data while your account is active and for as long as needed for the purposes above or to meet legal, accounting and dispute-resolution requirements. After that we delete or anonymise it.
              </p>

              <h4>6. Security</h4>
              <p>
                We use reasonable technical and organisational safeguards, including encrypted connections and access controls. No system is completely secure, so please keep your device and account details safe.
              </p>

              <h4>7. Your rights</h4>
              <p>
                You may ask us to give you a summary of the data we hold, correct or update it, erase it, withdraw consent, or nominate another person to exercise these rights for you. Write to <a href="mailto:support@evercut.in">support@evercut.in</a> and we will respond within a reasonable time.
              </p>

              <h4>8. Children</h4>
              <p>
                Evercut is intended for people aged 18 and above. We do not knowingly collect personal data of children without verifiable consent from a parent or legal guardian.
              </p>

              <h4>9. App permissions</h4>
              <p>
                The app may ask for location and notification permissions. You can change them at any time in your device settings. Some features, such as nearby salon suggestions, need location access.
              </p>

              <h4>10. Changes to this policy</h4>
              <p>
                We may update this policy from time to time. The latest version, with its effective date, is always on this page. Material changes will be notified in the app.
              </p>

              <h4>11. Contact and grievances</h4>
              <p>
                Grievance Officer, Quantneural Private Limited, House No. 288/1/15, Ward No. Kandri, Nagpur, Maharashtra – 441401. Email: <a href="mailto:grievance@evercut.in">grievance@evercut.in</a>. We acknowledge complaints within 48 hours and aim to resolve them within one month.
              </p>
            </article>

            {/* 2. Merchant Privacy Policy */}
            <article className="doc" id="merchant-privacy" hidden={safeIndex !== 1}>
              <h3>Merchant Privacy Policy</h3>
              <p className="eff">Effective 30 October 2026</p>
              <p>
                This policy applies to salons, stylists and their authorised representatives who use the Evercut Merchant Partner app (“Merchants”). It explains what Quantneural Private Limited (“Evercut”, “we”, “us”) collects about you and your business, and how we use and protect it.
              </p>

              <h4>1. Information we collect</h4>
              <ul>
                <li>Business details: salon name, address, opening hours, services, price list and photos.</li>
                <li>Representative details: the name, mobile number and email of the owner or authorised person.</li>
                <li>Verification and tax details: identity and business documents, PAN and GST details where applicable.</li>
                <li>Settlement details: bank account or UPI details used to pay you.</li>
                <li>Roster details: names and schedules of the stylists and chairs you add. You must have their permission to share this.</li>
                <li>Customer booking data: name, contact and booking details of customers who book with you.</li>
                <li>Device and usage data, such as app version, IP address and crash logs.</li>
              </ul>

              <h4>2. How we use it</h4>
              <ul>
                <li>To verify and onboard your salon.</li>
                <li>To show your listing, ratings and replies to customers.</li>
                <li>To manage your queue, chairs and appointments.</li>
                <li>To calculate commission and make UPI or bank settlements, with a clear statement for each payout.</li>
                <li>To give support, prevent fraud, and meet tax and legal requirements.</li>
              </ul>

              <h4>3. What customers can see</h4>
              <p>
                Customers see your salon name, address, services, prices, availability, stylist names, ratings and your replies to reviews. They do not see your bank details or identity documents.
              </p>

              <h4>4. Your duties for customer data</h4>
              <p>
                Customer details you receive through Evercut may be used only to deliver the booked service and to contact the customer about that booking. You must not sell them, use them for marketing without the customer’s consent, or share them with others. Delete or stop using them when the purpose ends or when we ask.
              </p>

              <h4>5. Sharing</h4>
              <p>
                We share data only with payment and settlement partners, service providers who help us run the platform, authorities when legally required, and a successor in a business transfer. We do not sell your data.
              </p>

              <h4>6. Retention</h4>
              <p>
                We keep your data while your account is active and afterwards for as long as tax, accounting and other laws require, or as needed to settle disputes.
              </p>

              <h4>7. Security</h4>
              <p>
                We protect your data with reasonable technical and organisational safeguards. Keep your login details confidential and tell us at once about any unauthorised use.
              </p>

              <h4>8. Your rights</h4>
              <p>
                You may request access to, correction of, or erasure of your data, and withdraw consent, subject to legal retention duties. Write to <a href="mailto:support@evercut.in">support@evercut.in</a>.
              </p>

              <h4>9. Grievances</h4>
              <p>
                Grievance Officer, Quantneural Private Limited, House No. 288/1/15, Ward No. Kandri, Nagpur, Maharashtra – 441401. Email: <a href="mailto:grievance@evercut.in">grievance@evercut.in</a>. We acknowledge complaints within 48 hours and aim to resolve them within one month.
              </p>
            </article>

            {/* 3. Terms and Conditions */}
            <article className="doc" id="terms" hidden={safeIndex !== 2}>
              <h3>Terms and Conditions</h3>
              <p className="eff">Effective 30 October 2026</p>
              <p>
                These terms govern your use of the Evercut Customer App and evercut.in, operated by Quantneural Private Limited (“Evercut”, “we”, “us”). By creating an account or booking through Evercut, you agree to them.
              </p>

              <h4>1. What Evercut is</h4>
              <p>
                Evercut is a technology platform that connects customers with independent salons and stylists. Salons, not Evercut, provide the grooming services. Evercut acts as an intermediary and is not a party to the service you receive from a salon.
              </p>

              <h4>2. Eligibility and account</h4>
              <p>
                You must be at least 18 years old and able to enter into a binding contract under Indian law. Give accurate information, keep your login details secure, and tell us about any unauthorised use. You are responsible for activity on your account.
              </p>

              <h4>3. Booking slots</h4>
              <p>
                You can reserve exact 5-minute slots with a stylist at a listed salon. A booking is confirmed when the app shows confirmation. Please arrive on time. If you are late, the salon may shorten your service or release the slot.
              </p>

              <h4>4. Prices, fees and taxes</h4>
              <ul>
                <li>Service rates are set by each salon and shown in the app before you book.</li>
                <li>The bill summary shows the subtotal, any coupon discount, the platform fee (₹4 per booking at the time of writing) and the total duration.</li>
                <li>Applicable taxes are included or shown separately as required by law.</li>
              </ul>

              <h4>5. Payments</h4>
              <p>
                Where online payment is offered, it is processed by licensed payment partners. You agree to pay the amount shown in your bill. Evercut does not store your full card details or UPI PIN.
              </p>

              <h4>6. Coupons and offers</h4>
              <p>
                Coupons have their own terms, may expire, and cannot be exchanged for cash. We may withdraw an offer that is misused.
              </p>

              <h4>7. Your conduct</h4>
              <ul>
                <li>Arrive promptly for your booked slot.</li>
                <li>Treat stylists and salon staff with courtesy.</li>
                <li>Do not make fraudulent bookings, post abusive or fake reviews, or try to bypass the platform.</li>
              </ul>

              <h4>8. Cancellations and refunds</h4>
              <p>
                Cancellations and refunds are handled under our <a href="#refund" onClick={() => onSelectDoc('refund', true)}>Cancellation and Refund Policy</a>, which forms part of these terms.
              </p>

              <h4>9. Reviews</h4>
              <p>
                Reviews must reflect your genuine experience. We may remove reviews that are defamatory, abusive, fraudulent or in breach of law.
              </p>

              <h4>10. Intellectual property</h4>
              <p>
                The Evercut app, website, logos, designs and software belong to Quantneural Private Limited or our licensors. You may not copy, reverse-engineer or reuse them without our written permission.
              </p>

              <h4>11. Disclaimers and limits of liability</h4>
              <p>
                Evercut is provided on an “as is” and “as available” basis. We do our best to keep the platform reliable, but we cannot guarantee uninterrupted access. To the fullest extent allowed by law, Evercut is not liable for grooming services provided by salons, salon cancellations, or indirect or consequential losses. Our total liability to you for any claim arising from a booking is limited to the fees you paid us for that booking.
              </p>

              <h4>12. Ending your account</h4>
              <p>
                You may close your account at any time. We may suspend or terminate your account if you violate these terms or if required by law.
              </p>

              <h4>13. Governing law and disputes</h4>
              <p>
                These terms are governed by the laws of India. Any dispute will be subject to the exclusive jurisdiction of the courts at Nagpur, Maharashtra.
              </p>

              <h4>14. Changes to terms</h4>
              <p>
                We may revise these terms from time to time. The latest version is always available here. Continued use of the app after an update means you accept the changes.
              </p>

              <h4>15. Contact and grievances</h4>
              <p>
                Questions: <a href="mailto:support@evercut.in">support@evercut.in</a>. Grievances: Grievance Officer, Quantneural Private Limited, House No. 288/1/15, Ward No. Kandri, Nagpur, Maharashtra – 441401. Email: <a href="mailto:grievance@evercut.in">grievance@evercut.in</a>.
              </p>
            </article>

            {/* 4. Cancellation and Refund Policy */}
            <article className="doc" id="refund" hidden={safeIndex !== 3}>
              <h3>Cancellation and Refund Policy</h3>
              <p className="eff">Effective 30 October 2026</p>
              <p>
                This policy explains how cancellations and refunds work for bookings made through the Evercut Customer App. We aim to be fair to both customers who reserve chairs and salons that hold slots for them.
              </p>

              <h4>1. When you cancel</h4>
              <ul>
                <li>More than 2 hours before the slot: you receive a full refund of the service amount paid online.</li>
                <li>Between 30 minutes and 2 hours before the slot: you receive a 50% refund of the service amount paid online.</li>
                <li>Less than 30 minutes before the slot, or a no-show: no refund is payable, because the salon kept the chair reserved for you.</li>
              </ul>

              <h4>2. Platform fee</h4>
              <p>
                The platform fee is non-refundable when you cancel. It is refunded in full if the salon or Evercut cancels the booking.
              </p>

              <h4>3. When the salon cancels</h4>
              <p>
                If a salon or stylist cancels or cannot serve you, we will offer another slot or refund everything you paid online for that booking, including the platform fee, and restore any coupon you used.
              </p>

              <h4>4. Problems with a service</h4>
              <p>
                If you are not satisfied, write to <a href="mailto:support@evercut.in">support@evercut.in</a> within 24 hours of the appointment with your booking details. We review each case with the salon and may arrange a correction, a partial refund or a full refund.
              </p>

              <h4>5. Refund method and timing</h4>
              <p>
                Approved refunds go back to your original payment method, normally within 5 to 7 business days. Your bank or payment provider may need extra time to show it.
              </p>

              <h4>6. Failed or duplicate payments</h4>
              <p>
                If money is deducted but no booking is confirmed, or you are charged twice, the amount is normally reversed automatically within 5 to 7 business days. If not, write to us with the transaction details.
              </p>

              <h4>7. Bookings paid at the salon</h4>
              <p>
                If you pay at the salon, there is nothing to refund through Evercut. Any dispute about that payment should first be raised with the salon and, if unresolved, with us.
              </p>

              <h4>8. Escalation</h4>
              <p>
                If you are not satisfied with our response, contact <a href="mailto:grievance@evercut.in">grievance@evercut.in</a>. We acknowledge complaints within 48 hours and aim to resolve them within one month.
              </p>
            </article>

            {/* 5. Merchant Partner Agreement */}
            <article className="doc" id="merchant-agreement" hidden={safeIndex !== 4}>
              <h3>Merchant Partner Agreement</h3>
              <p className="eff">Effective 30 October 2026</p>
              <p>
                This agreement is between Quantneural Private Limited (“Evercut”) and the salon or stylist business that registers on the Evercut Merchant Partner app (“Merchant”). By registering, you accept it.
              </p>

              <h4>1. Eligibility</h4>
              <p>
                You must be a lawfully operating salon or grooming business in India, hold the licences and registrations your business needs, and be authorised to enter this agreement.
              </p>

              <h4>2. Onboarding and verification</h4>
              <p>
                You will give accurate business, identity, tax and bank details. We may verify them and may refuse or remove a listing that we cannot verify.
              </p>

              <h4>3. Your listing</h4>
              <p>
                You are responsible for keeping your services, prices, opening hours, stylists and chair availability accurate. Prices shown to customers must match what you charge.
              </p>

              <h4>4. Bookings and chairs</h4>
              <p>
                You will use the app to manage your queue and roster, and assign online bookings and walk-ins to specific chairs. A confirmed booking is a commitment to serve the customer in the reserved 5-minute slot.
              </p>

              <h4>5. Service standards</h4>
              <ul>
                <li>Keep your premises, tools and products clean and safe.</li>
                <li>Use trained staff and follow applicable laws and local rules.</li>
                <li>Treat every customer fairly and without discrimination.</li>
              </ul>

              <h4>6. Commission and fees</h4>
              <p>
                Evercut charges a commission on bookings made through the platform. The rate is communicated in the Merchant app and shown in every settlement statement, so you can see exactly what was deducted. Taxes on our fees are charged as the law requires.
              </p>

              <h4>7. Settlements</h4>
              <p>
                Amounts due to you are paid by UPI or bank transfer to your verified account on the settlement cycle shown in the app. Refunds, chargebacks and adjustments owed to customers or Evercut may be set off against your settlements.
              </p>

              <h4>8. Cancellations by the Merchant</h4>
              <p>
                Avoid cancelling confirmed bookings. Repeated or late cancellations can reduce your visibility or lead to suspension.
              </p>

              <h4>9. Reviews and ratings</h4>
              <p>
                You may reply to customer reviews. You must not post fake reviews, offer rewards for reviews or pressure customers to change them.
              </p>

              <h4>10. Customer data</h4>
              <p>
                Use customer information only to deliver the booked service, as described in the Merchant Privacy Policy. Do not sell it, share it or use it for marketing without the customer’s consent.
              </p>

              <h4>11. Use of your name and images</h4>
              <p>
                You allow Evercut to display your salon name, logo, photos, services and prices on the platform and in related communications.
              </p>

              <h4>12. Independent relationship</h4>
              <p>
                You are an independent business. Nothing here creates an employment, partnership, agency or joint venture between you and Evercut. You are responsible for your staff, taxes and compliance.
              </p>

              <h4>13. Liability and indemnity</h4>
              <p>
                You are responsible for the services you provide. You will compensate Evercut for losses arising from your breach of this agreement, your violation of law, or claims caused by your services or staff. To the extent permitted by law, Evercut’s liability to you is limited to the fees you paid us in the three months before the claim.
              </p>

              <h4>14. Confidentiality</h4>
              <p>
                Each party will keep the other’s non-public business information confidential, except where disclosure is required by law.
              </p>

              <h4>15. Term and termination</h4>
              <p>
                This agreement continues until ended. Either party may end it by giving 15 days’ written notice, including by email. We may suspend or end it immediately for fraud, serious breach, legal requirement or safety risk. Amounts already earned remain payable after adjustments.
              </p>

              <h4>16. Governing law</h4>
              <p>
                This agreement is governed by the laws of India. The courts at Nagpur, Maharashtra have exclusive jurisdiction.
              </p>

              <h4>17. Changes and contact</h4>
              <p>
                We may update this agreement by notice in the app or by email; continuing to use the platform means you accept the update. Questions: <a href="mailto:support@evercut.in">support@evercut.in</a>. Grievances: <a href="mailto:grievance@evercut.in">grievance@evercut.in</a>.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
