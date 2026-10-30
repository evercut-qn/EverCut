'use client';

import React from 'react';
import Link from 'next/link';

export function LandingFooter({ onSelectDoc }) {
  const handleLegalClick = (e, docId) => {
    e.preventDefault();
    if (onSelectDoc) {
      onSelectDoc(docId, true);
    }
  };

  return (
    <>
      <footer>
        <div className="wrap">
          <div className="foot raised">
            <div>
              <a className="brand" href="#top">
                Evercut
              </a>
              <p>
                India’s on-demand salon and grooming platform, connecting clients to top neighborhood parlors with precise 5-minute scheduling.
              </p>
            </div>

            <div>
              <h5>Platform</h5>
              <ul>
                <li>
                  <a href="#screens">App screens</a>
                </li>
                <li>
                  <a href="#workflow">How it works</a>
                </li>
                <li>
                  <a href="#customers">Customer app</a>
                </li>
                <li>
                  <a href="#merchants">Merchant app</a>
                </li>
              </ul>
            </div>

            <div>
              <h5>Legal and policies</h5>
              <ul>
                <li>
                  <a
                    href="#customer-privacy"
                    data-doc="customer-privacy"
                    onClick={(e) => handleLegalClick(e, 'customer-privacy')}
                  >
                    Customer privacy policy
                  </a>
                </li>
                <li>
                  <a
                    href="#merchant-privacy"
                    data-doc="merchant-privacy"
                    onClick={(e) => handleLegalClick(e, 'merchant-privacy')}
                  >
                    Merchant privacy policy
                  </a>
                </li>
                <li>
                  <a
                    href="#terms"
                    data-doc="terms"
                    onClick={(e) => handleLegalClick(e, 'terms')}
                  >
                    Terms and conditions
                  </a>
                </li>
                <li>
                  <a
                    href="#refund"
                    data-doc="refund"
                    onClick={(e) => handleLegalClick(e, 'refund')}
                  >
                    Cancellation and refund policy
                  </a>
                </li>
                <li>
                  <a
                    href="#merchant-agreement"
                    data-doc="merchant-agreement"
                    onClick={(e) => handleLegalClick(e, 'merchant-agreement')}
                  >
                    Merchant partner agreement
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h5>Customer support</h5>
              <ul>
                <li>
                  <a href="mailto:support@evercut.in">support@evercut.in</a>
                </li>
                <li>
                  <a href="mailto:grievance@evercut.in">grievance@evercut.in</a>
                </li>
                <li>evercut.in</li>
                <li>Nagpur, Maharashtra</li>
              </ul>
            </div>
          </div>

          <div className="legal">
            <span>© 2026 Quantneural Private Limited. All rights reserved.</span>
            <div>
              <a
                href="#customer-privacy"
                data-doc="customer-privacy"
                onClick={(e) => handleLegalClick(e, 'customer-privacy')}
              >
                Privacy policy
              </a>
              <a
                href="#terms"
                data-doc="terms"
                onClick={(e) => handleLegalClick(e, 'terms')}
              >
                Terms of service
              </a>
              <a
                href="#refund"
                data-doc="refund"
                onClick={(e) => handleLegalClick(e, 'refund')}
              >
                Refund policy
              </a>
              <a
                href="#merchant-agreement"
                data-doc="merchant-agreement"
                onClick={(e) => handleLegalClick(e, 'merchant-agreement')}
              >
                Merchant agreement
              </a>
              <Link
                href="/adminevercut"
                style={{ opacity: 0.5 }}
                title="EverCut Administrative Gateway"
              >
                Portal
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating mobile glass action bar */}
      <div className="mbar glass">
        <a className="btn solid" href="#download">
          Get the app on Google Play
        </a>
      </div>
    </>
  );
}
