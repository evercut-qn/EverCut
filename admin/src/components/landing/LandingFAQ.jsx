'use client';

import React from 'react';

const FAQS = [
  {
    q: 'How does the 5-minute slot work?',
    a: (
      <p>
        You choose a stylist and an exact start time in 5-minute steps. Your chair is reserved for the length of your services, so you walk in and sit down.
      </p>
    )
  },
  {
    q: 'What is the platform fee?',
    a: (
      <p>
        A flat ₹4 per booking, shown in your bill summary before you confirm. Salon rates, any coupon and the total duration are listed beside it.
      </p>
    )
  },
  {
    q: 'Can I cancel a booking?',
    a: (
      <p>
        Yes, from the app before your slot starts. Cancelling at least 2 hours ahead gets a full refund of the service amount paid online.{' '}
        <a href="#refund" data-doc="refund">
          Read the full policy
        </a>
        .
      </p>
    )
  },
  {
    q: 'What if I am late?',
    a: (
      <p>
        Please arrive on time. If you are late, the salon may shorten your service or release the slot so the next customer is not kept waiting.
      </p>
    )
  },
  {
    q: 'How do salons get paid?',
    a: (
      <p>
        Salons receive direct UPI or bank settlements, with a statement showing exactly what commission was deducted.{' '}
        <a href="#merchant-agreement" data-doc="merchant-agreement">
          See the partner agreement
        </a>
        .
      </p>
    )
  },
  {
    q: 'How do I list my salon?',
    a: (
      <p>
        Download the Evercut Merchant Partner app from Google Play, add your salon, services and stylists, and complete verification.
      </p>
    )
  }
];

export function LandingFAQ({ onSelectDoc }) {
  const handleClick = (e) => {
    const target = e.target.closest('a[data-doc]');
    if (target && onSelectDoc) {
      e.preventDefault();
      onSelectDoc(target.getAttribute('data-doc'), true);
    }
  };

  return (
    <section className="block" id="faq" onClick={handleClick}>
      <div className="wrap">
        <div className="head">
          <h2>Questions, Answered.</h2>
        </div>
        <div className="faq">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="raised">
              <summary>{q}</summary>
              {a}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
