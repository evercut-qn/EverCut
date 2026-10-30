'use client';

import React from 'react';

export function LandingFacts() {
  return (
    <section className="facts">
      <div className="wrap facts-grid">
        <div className="fact raised">
          <strong>Area rates</strong>
          <span>Local salon pricing, shown before you book</span>
        </div>
        <div className="fact raised">
          <strong>5 mins</strong>
          <span>Time-slot precision</span>
        </div>
        <div className="fact raised">
          <strong>0 waiting</strong>
          <span>Reserved chairs, ready on arrival</span>
        </div>
      </div>
    </section>
  );
}
