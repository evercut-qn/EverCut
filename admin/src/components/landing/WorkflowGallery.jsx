'use client';

import React from 'react';
import { AppPhoneMockup } from './AppPhoneMockup';

const workflowSteps = [
  {
    step: 'Step 1',
    title: 'Salon Menus & Deals',
    description: 'Browse transparent rates with coupon savings at salons like Artwood.',
    screenType: 'services',
    image: '/screenshots/Screenshot_20261005_191416.png'
  },
  {
    step: 'Step 2',
    title: 'Pick Stylist & 5-Min Slot',
    description: 'Choose your favorite barber like Shankya Mali and your exact time.',
    screenType: 'schedule',
    image: '/screenshots/Screenshot_20261005_182945.png'
  },
  {
    step: 'Step 3',
    title: 'Clear Bill Summary',
    description: 'Full breakdown with subtotal, ₹4 platform fee, and exact duration.',
    screenType: 'bill',
    image: '/screenshots/Screenshot_20261005_183310.png'
  },
  {
    step: 'Step 4',
    title: 'Real-Time Updates',
    description: 'Stay informed with instant alerts when salons confirm or barbers reply.',
    screenType: 'notify',
    image: '/screenshots/Screenshot_20261005_221719.png'
  }
];

export function WorkflowGallery() {
  return (
    <section id="workflow" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-evercut-green/10 text-evercut-green border border-evercut-green/20">
          Full Mobile Flow
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white mt-3">
          A Flawless Experience From Search to Chair
        </h2>
        <p className="text-slate-400 mt-3 text-sm sm:text-base">
          Every screen is crafted for speed, convenience, and complete price clarity.
        </p>
      </div>

      {/* 4-Card Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {workflowSteps.map((item, index) => (
          <div
            key={index}
            className="bg-evercut-cardDark rounded-3xl p-4 sm:p-5 border border-slate-800 hover:border-evercut-green transition-all flex flex-col justify-between group shadow-lg"
          >
            <div className="mb-4">
              <span className="text-[11px] font-bold text-evercut-green uppercase tracking-wider">
                {item.step}
              </span>
              <h4 className="text-lg font-bold text-white mt-1">{item.title}</h4>
              <p className="text-xs text-slate-400 mt-1">{item.description}</p>
            </div>

            <div className="py-2 flex justify-center">
              <div className="w-full max-w-[170px] sm:max-w-[190px] lg:max-w-[200px] flex justify-center transform transition-transform duration-300 group-hover:scale-105">
                <AppPhoneMockup
                  screenType={item.screenType}
                  imageSrc={item.image}
                  alt={item.title}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
