'use client';

import React from 'react';
import Link from 'next/link';

export function LandingHeader({ theme, setTheme }) {
  return (
    <nav>
      <div className="wrap">
        <div className="nav-in glass">
          <a className="brand" href="#top">
            Evercut
          </a>

          <div className="links">
            <a href="#for-customers">For customers</a>
            <a href="#for-salons">For salons</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="navr">
            <div className="themes inset" role="group" aria-label="Color theme">
              <button
                type="button"
                data-t="light"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                type="button"
                data-t="dark"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button
                type="button"
                data-t="green"
                aria-pressed={theme === 'green'}
                onClick={() => setTheme('green')}
              >
                Green
              </button>
            </div>

            <a className="btn solid small" href="#download">
              Get the app
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
