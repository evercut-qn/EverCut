'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

function QRCodeCanvas({ url }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: 160,
      margin: 1,
      color: {
        dark: '#14191d',
        light: '#ffffff'
      }
    })
      .then(setDataUrl)
      .catch((err) => console.error('QR generation error:', err));
  }, [url]);

  return (
    <div className="qr" aria-hidden="true">
      {dataUrl ? (
        <img src={dataUrl} alt="Scan QR code to download app" />
      ) : (
        <div style={{ width: 76, height: 76 }} />
      )}
    </div>
  );
}

export function CustomerDownloadSection() {
  const customerAppUrl = 'https://play.google.com/store/apps/details?id=com.quantneural.evercut.customer';

  return (
    <section className="block" id="download">
      <div className="field" style={{ width: 520, height: 520, top: 40, left: '20%' }}></div>
      <div className="field" style={{ width: 380, height: 380, bottom: 0, right: '8%' }}></div>
      <div className="wrap">
        <div className="head">
          <h2>Get the Customer App.</h2>
          <p>Download the Android app from Google Play and book your first slot.</p>
        </div>
        <div className="dl one">
          <article className="card glass" id="customers">
            <span className="kicker">For customers</span>
            <h3>Evercut Customer App</h3>
            <p>
              Skip the salon waiting room. Browse neighborhood salons, choose your barber and reserve a guaranteed 5-minute slot.
            </p>
            <ul>
              <li>Discover top-rated salons like Men Super Salon and Artwood</li>
              <li>Select your stylist, for example Shankya Mali</li>
              <li>No surprise bills: a clear summary with the platform fee</li>
              <li>Instant notifications on booking status and barber replies</li>
            </ul>
            <div className="getrow">
              <a
                className="btn solid"
                href={customerAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <small>Get it on</small> Google Play
              </a>
              <QRCodeCanvas url={customerAppUrl} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function MerchantDownloadSection() {
  const merchantAppUrl = 'https://play.google.com/store/apps/details?id=com.quantneural.evercut.merchant';

  return (
    <section className="block" id="salons-dl">
      <div className="field" style={{ width: 420, height: 420, top: 20, right: '6%' }}></div>
      <div className="wrap">
        <div className="dl one">
          <article className="card glass" id="merchants">
            <span className="kicker">For salons and stylists</span>
            <h3>Evercut Merchant Partner</h3>
            <p>
              Maximize chair utilization, cut idle hours, manage your barbers’ schedules and receive verified client bookings.
            </p>
            <ul>
              <li>Real-time queue and digital appointment management</li>
              <li>Assign walk-ins or online bookings to specific chairs</li>
              <li>Reply to client reviews and ratings from the app</li>
              <li>Direct UPI bank settlements with full commission transparency</li>
            </ul>
            <div className="getrow">
              <a
                className="btn solid"
                href={merchantAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <small>Get it on</small> Google Play Partner
              </a>
              <QRCodeCanvas url={merchantAppUrl} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
