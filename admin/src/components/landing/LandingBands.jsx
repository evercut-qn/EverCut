'use client';

import React from 'react';

export function CustomerBand() {
  return (
    <section className="band" id="for-customers">
      <div className="wrap">
        <div className="bandbox raised">
          <div>
            <h2>For Customers</h2>
            <p>Find a salon, pick your stylist and book an exact 5-minute slot.</p>
          </div>
          <a className="btn solid" href="#customers">
            Get the Customer App
          </a>
        </div>
      </div>
    </section>
  );
}

export function SalonBand() {
  return (
    <section className="band" id="for-salons">
      <div className="wrap">
        <div className="bandbox raised">
          <div>
            <h2>For Salons and Stylists</h2>
            <p>Manage your chairs, fill idle hours and get paid by UPI with full commission transparency.</p>
          </div>
          <a className="btn solid" href="#merchants">
            Get the Partner App
          </a>
        </div>
      </div>
    </section>
  );
}
