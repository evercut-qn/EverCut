'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const showcaseData = [
  {
    k: 'Instant discovery',
    t: 'Welcome Dashboard and Nearby Salons',
    p: 'Find vetted local parlors like Men Super Salon and Artwood Salon right on your home screen. Filter by male or female, search tailored treatments, and see live open or closed status.',
    l: [
      'Nearby salon suggestions based on your location',
      'Fast search for styles, shops and treatments',
      'Gender-specific grooming catalogs with dedicated filters'
    ]
  },
  {
    k: 'Transparent pricing',
    t: 'Menu and Deals',
    p: 'Browse every service with its rate and duration, and see coupon savings applied before you commit.',
    l: [
      'Clear rates for every haircut, trim and facial',
      'Coupons applied in plain sight',
      'No hidden charges at the chair'
    ]
  },
  {
    k: 'Exact timing',
    t: 'Stylist and 5-Minute Slot',
    p: 'Choose a barber you trust, like Shankya Mali, then select the exact five-minute slot that suits your day.',
    l: [
      'Slots in 5-minute precision',
      'Your chair is reserved for the full slot',
      'Pick the same stylist every visit'
    ]
  },
  {
    k: 'Complete clarity',
    t: 'Bill and Checkout',
    p: 'A full breakdown before you book: subtotal, discounts, the ₹4 platform fee and the exact duration.',
    l: [
      'Itemized subtotal and discount',
      'A flat ₹4 platform fee',
      'Exact appointment duration'
    ]
  },
  {
    k: 'Always informed',
    t: 'Live Notifications',
    p: 'Get instant alerts when a salon confirms your booking or a barber replies, so you always know where you stand.',
    l: [
      'Booking confirmations in real time',
      'Replies from your barber',
      'Reminders before your slot'
    ]
  }
];

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const showcaseRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const lastInteractionRef = useRef(Date.now());
  const inViewRef = useRef(false);

  const resetTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  const handleSelectTab = useCallback((index) => {
    setActiveTab(index);
    resetTimer();

    // Auto-scroll tab into view on small screens
    const container = tabsContainerRef.current;
    if (container && container.scrollWidth > container.clientWidth) {
      const activeBtn = container.children[index];
      if (activeBtn) {
        container.scrollLeft = activeBtn.offsetLeft - (container.clientWidth - activeBtn.offsetWidth) / 2;
      }
    }
  }, [resetTimer]);

  // Viewport intersection observer to auto-start when visible
  useEffect(() => {
    const el = showcaseRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      inViewRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[entries.length - 1].isIntersecting;
        if (isVisible && !inViewRef.current) {
          inViewRef.current = true;
          setActiveTab(0);
          resetTimer();
        } else if (!isVisible) {
          inViewRef.current = false;
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [resetTimer]);

  // Interval-driven heartbeat auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      if (!inViewRef.current) return;
      const wait = activeTab === showcaseData.length - 1 ? 2500 : 2000;
      if (Date.now() - lastInteractionRef.current >= wait) {
        setActiveTab((prev) => (prev + 1) % showcaseData.length);
        lastInteractionRef.current = Date.now();
      }
    }, 200);

    const onVisibilityChange = () => resetTimer();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [activeTab, resetTimer]);

  const currentData = showcaseData[activeTab];

  return (
    <section className="block" id="screens" ref={showcaseRef}>
      <div className="field" style={{ width: 460, height: 460, top: 140, right: -160 }}></div>
      <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
        <div className="head">
          <h2>Experience the real Evercut app.</h2>
          <p>Select a step to see the in-app screen on a device.</p>
        </div>

        <div className="show">
          <div className="show-left raised">
            <div className="tabs" ref={tabsContainerRef} role="tablist" aria-label="App screens">
              {showcaseData.map((item, idx) => (
                <button
                  key={item.t}
                  className="tab"
                  role="tab"
                  aria-selected={activeTab === idx}
                  onClick={() => handleSelectTab(idx)}
                >
                  {idx === 0 && 'Home Dashboard'}
                  {idx === 1 && 'Menu and Deals'}
                  {idx === 2 && 'Stylist and 5-Minute Slot'}
                  {idx === 3 && 'Bill and Checkout'}
                  {idx === 4 && 'Live Notifications'}
                </button>
              ))}
            </div>

            <div className="copy" aria-live="polite">
              <span className="kicker">{currentData.k}</span>
              <h3>{currentData.t}</h3>
              <p>{currentData.p}</p>
              <ul>
                {currentData.l.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <a className="btn solid" href="#download">
                Get the app on Google Play
              </a>
            </div>
          </div>

          <div className="show-stage inset">
            <div className="tilt">
              <div className="phone">
                <div className="screen" id="showScreen">
                  {/* Screen 1: Home Dashboard */}
                  <div className={`scr ${activeTab === 0 ? 'on' : ''}`}>
                    <small>Nearby salons</small>
                    <h4>Find your next haircut</h4>
                    <div className="search">Search salons, styles, treatments</div>
                    <div className="seg">
                      <span className="a">Male</span>
                      <span>Female</span>
                    </div>
                    <div className="sc">
                      <div className="row">
                        <b>Men Super Salon</b>
                        <span className="tag">Open</span>
                      </div>
                      <small>Haircut, beard, facial</small>
                    </div>
                    <div className="sc">
                      <div className="row">
                        <b>Artwood Salon</b>
                        <span className="tag">Open</span>
                      </div>
                      <small>Styling, color, spa</small>
                    </div>
                    <div className="sc">
                      <small>Suggestions are based on your location.</small>
                    </div>
                  </div>

                  {/* Screen 2: Menu and Deals */}
                  <div className={`scr ${activeTab === 1 ? 'on' : ''}`}>
                    <small>Artwood Salon</small>
                    <h4>Services and deals</h4>
                    <div className="sc">
                      <div className="row">
                        <b>Haircut</b>
                        <b>₹150</b>
                      </div>
                      <small>30 min</small>
                    </div>
                    <div className="sc">
                      <div className="row">
                        <b>Beard trim</b>
                        <b>₹80</b>
                      </div>
                      <small>15 min</small>
                    </div>
                    <div className="sc">
                      <div className="row">
                        <b>Classic facial</b>
                        <b>₹400</b>
                      </div>
                      <small>45 min</small>
                    </div>
                    <div className="sc">
                      <div className="row">
                        <span>Coupon applied</span>
                        <span className="tag line">₹30 off</span>
                      </div>
                    </div>
                    <div className="cta-bar">Continue</div>
                  </div>

                  {/* Screen 3: Stylist and 5-Minute Slot */}
                  <div className={`scr ${activeTab === 2 ? 'on' : ''}`}>
                    <small>Choose your stylist</small>
                    <h4>Shankya Mali</h4>
                    <div className="sc">
                      <div className="row">
                        <b>Today</b>
                        <small>Pick an exact time</small>
                      </div>
                    </div>
                    <div className="slots">
                      <span className="x">10:00</span>
                      <span className="x">10:05</span>
                      <span>10:10</span>
                      <span className="s">10:15</span>
                      <span>10:20</span>
                      <span>10:25</span>
                      <span>10:30</span>
                      <span className="x">10:35</span>
                      <span>10:40</span>
                    </div>
                    <div className="sc">
                      <small>Your chair is reserved for the full slot.</small>
                    </div>
                    <div className="cta-bar">Confirm slot</div>
                  </div>

                  {/* Screen 4: Bill and Checkout */}
                  <div className={`scr ${activeTab === 3 ? 'on' : ''}`}>
                    <small>Bill summary</small>
                    <h4>Review and pay</h4>
                    <div className="sc" style={{ display: 'grid', gap: 10 }}>
                      <div className="row">
                        <span>Subtotal</span>
                        <span>₹230</span>
                      </div>
                      <div className="row">
                        <span>Coupon</span>
                        <span>−₹30</span>
                      </div>
                      <div className="row">
                        <span>Platform fee</span>
                        <span>₹4</span>
                      </div>
                      <div className="row">
                        <span>Duration</span>
                        <span>45 min</span>
                      </div>
                      <div className="sep"></div>
                      <div className="row">
                        <b>Total</b>
                        <span className="total">₹204</span>
                      </div>
                    </div>
                    <small>Sample values for illustration.</small>
                    <div className="cta-bar">Book appointment</div>
                  </div>

                  {/* Screen 5: Live Notifications */}
                  <div className={`scr ${activeTab === 4 ? 'on' : ''}`}>
                    <small>Notifications</small>
                    <h4>Stay in the loop</h4>
                    <div className="sc">
                      <b>Booking confirmed</b>
                      <br />
                      <small>Artwood Salon accepted your 10:15 am slot.</small>
                    </div>
                    <div className="sc">
                      <b>Reply from your barber</b>
                      <br />
                      <small>Shankya Mali responded to your message.</small>
                    </div>
                    <div className="sc">
                      <b>Reminder</b>
                      <br />
                      <small>Your appointment starts in 30 minutes.</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="note">Screens redrawn for this preview.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
