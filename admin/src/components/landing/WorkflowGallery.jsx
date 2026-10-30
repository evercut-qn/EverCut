'use client';

import React from 'react';

const workflowSteps = [
  {
    step: 1,
    title: 'Salon menus and deals',
    desc: 'Browse transparent rates with coupon savings at salons like Artwood.'
  },
  {
    step: 2,
    title: 'Pick a stylist and slot',
    desc: 'Choose your favorite barber, like Shankya Mali, and your exact time.'
  },
  {
    step: 3,
    title: 'Clear bill summary',
    desc: 'A full breakdown with subtotal, ₹4 platform fee and exact duration.'
  },
  {
    step: 4,
    title: 'Real-time updates',
    desc: 'Get instant alerts when salons confirm or barbers reply.'
  }
];

export function WorkflowGallery() {
  return (
    <section className="block" id="workflow">
      <div className="wrap">
        <div className="head">
          <h2>A flawless experience from search to chair.</h2>
          <p>Every screen is built for speed, convenience and complete price clarity.</p>
        </div>
        <div className="flow">
          {workflowSteps.map(({ step, title, desc }) => (
            <div key={step} className="step raised">
              <div className="n inset">{step}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
