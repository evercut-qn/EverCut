'use client';

import React, { useState } from 'react';
import { Compass, Tag, Clock, Receipt, Bell, ArrowRight, Check } from 'lucide-react';
import { AppPhoneMockup } from './AppPhoneMockup';

const showcaseData = {
  dashboard: {
    key: 'dashboard',
    label: '1. Home Dashboard',
    image: '/screenshots/Screenshot_20261005_222943.png',
    icon: Compass,
    badgeText: 'Instant Discovery',
    title: 'Welcome Dashboard & Nearby Salons',
    text: 'Find vetted local parlors like Men Super Salon and Artwood Salon right on your home screen. Filter by Male or Female categories, search tailored treatments, and view immediate live open/closed statuses.',
    bullets: [
      'Immediate nearby salon suggestions based on your location',
      'Fast search for specific styles, shops, and treatments',
      'Gender-specific grooming catalogs with dedicated filters'
    ]
  },
  services: {
    key: 'services',
    label: '2. Salon Menu & Deals',
    image: '/screenshots/Screenshot_20261005_191416.png',
    icon: Tag,
    badgeText: 'Live Prices & Deals',
    title: 'Real Salon Menus with Instant Coupon Savings',
    text: 'Say goodbye to arbitrary charges. View precise services like Beard Trimming (₹84 with ₹15 OFF) or Hair Colouring (₹319 with ₹50 OFF). Filter directly by Men, Women, or Unisex salon options in your locality.',
    bullets: [
      'Categorized filters for Men, Women & Unisex',
      'Promotional coupon tags applied directly on each service',
      'Estimated service duration shown upfront (e.g. 50 min, 1h)'
    ]
  },
  schedule: {
    key: 'schedule',
    label: '3. Stylist & 5-Min Slot',
    image: '/screenshots/Screenshot_20261005_182945.png',
    icon: Clock,
    badgeText: '5-Minute Precision',
    title: 'Pick Your Stylist & Exact 5-Min Time Slot',
    text: 'Choose your preferred specialist like Shankya Mali. Evercut lets you book exact 5-minute slots (09:00, 09:05, 09:10) so your chair is ready the instant you arrive without wasting time waiting.',
    bullets: [
      'Personal stylist selection with live availability badge',
      'Day-by-day calendar navigation (Mon 5, Tue 6, Wed 7...)',
      'Micro-interval morning & afternoon time slot selection'
    ]
  },
  bill: {
    key: 'bill',
    label: '4. Bill & Checkout',
    image: '/screenshots/Screenshot_20261005_183310.png',
    icon: Receipt,
    badgeText: 'Clear Billing',
    title: 'Transparent Summary: Exactly What You Pay',
    text: 'No unexpected upsells. View the complete summary before confirmation: service sub-total, exact service duration (50 Min), and an honest ₹4 platform fee.',
    bullets: [
      'Detailed service line-items & duration tracking',
      'Transparent platform convenience fee (only ₹4.00)',
      'Grand total with all taxes and inclusive charges'
    ]
  },
  notify: {
    key: 'notify',
    label: '5. Live Notifications',
    image: '/screenshots/Screenshot_20261005_221719.png',
    icon: Bell,
    badgeText: 'Real-Time Alerts',
    title: 'Instant Alerts: Confirmations & Barber Replies',
    text: 'Stay updated with the Evercut notification stream. Receive immediate alerts when Artwood Salon confirms your slot, when your barber responds to your review, or when profile updates complete.',
    bullets: [
      'Instant push notifications on booking confirmation',
      'Direct replies from barbers to your rating and feedback',
      'Automated payment failure and quick retry guidance'
    ]
  }
};

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const current = showcaseData[activeTab];
  const IconComponent = current.icon;

  return (
    <section id="screens" className="py-20 bg-evercut-cardDark/90 border-y border-slate-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-evercut-green/10 text-evercut-green border border-evercut-green/20">
            Interactive Showcase
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white mt-3">
            Experience the Real <span className="text-evercut-green">Evercut App</span>
          </h2>
          <p className="text-slate-400 mt-3 text-sm sm:text-base">
            Click through each step below to view the authentic in-app screens on a real device.
          </p>

          {/* Step Selector Buttons */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mt-6 sm:mt-8">
            {Object.keys(showcaseData).map((key) => {
              const item = showcaseData[key];
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm ${
                    isActive
                      ? 'bg-evercut-green text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Showcase Two-Column Presentation */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center bg-[#0C1017] rounded-3xl p-5 sm:p-8 lg:p-12 border border-slate-800">
          
          {/* Left Column: Details */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-evercut-green text-xs font-bold">
              <IconComponent className="w-4 h-4" /> {current.badgeText}
            </div>

            <h3 className="text-xl sm:text-3xl font-extrabold text-white font-heading">
              {current.title}
            </h3>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {current.text}
            </p>

            <div className="space-y-3 pt-1 sm:pt-2 text-xs sm:text-sm text-slate-300">
              {current.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-evercut-green/20 text-evercut-green flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 sm:pt-4 flex items-center gap-4">
              <a
                href="#download-section"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-evercut-green text-white font-bold text-xs hover:bg-evercut-greenHover transition shadow-md"
              >
                Get App on Google Play <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right Column: Phone Mockup */}
          <div className="lg:col-span-6 flex justify-center w-full mt-4 lg:mt-0">
            <div className="w-full max-w-[260px] xs:max-w-[280px] sm:max-w-[300px] lg:max-w-[320px] mx-auto transition-all duration-300 flex justify-center">
              <AppPhoneMockup
                screenType={current.key}
                imageSrc={current.image}
                alt={current.title}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
