'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { QrCode, ExternalLink, CheckCircle2 } from 'lucide-react';
import { PayoutRequestModal } from './PayoutRequestModal';
import { TableSearchBar } from '@/components/ui/TableSearchBar';
import { PaginationControls } from '@/components/ui/PaginationControls';

/**
 * Modal to display the generated UPI QR Code.
 */
function QRCodeModal({ isOpen, onClose, upiDeepLink, amount, barberName }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (upiDeepLink && isOpen) {
      import('qrcode')
        .then((lib) => lib.default.toDataURL(upiDeepLink, { width: 256, margin: 2 }))
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }

    return () => {
      setQrCodeUrl('');
    };
  }, [upiDeepLink, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-card border border-border text-card-foreground rounded-lg shadow-2xl p-6 flex flex-col items-center z-10 text-center animate-in fade-in zoom-in duration-200">
        <h3 className="font-bold text-lg mb-1 font-display text-foreground">UPI Payment QR</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Scan to transfer <strong className="text-primary font-mono">₹{amount}</strong> to <strong className="text-foreground">{barberName}</strong>
        </p>
        
        <div className="bg-white p-3 rounded-lg border border-border shadow-md">
          {qrCodeUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qrCodeUrl} alt="UPI QR Code" className="w-52 h-52 block" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-muted-foreground font-mono text-xs">
              Generating Code...
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-sm font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * Display grid for listing pending payout balances.
 *
 * @param {Object} props
 * @param {Array} props.initialData - Pending payouts items list
 * @param {number} props.totalItems - Total pending items
 * @param {number} [props.defaultLimit=20]
 */
export function PendingPayoutsTable({ initialData = [], pagination, defaultLimit = 20 }) {
  const searchParams = useSearchParams();

  // Dialog state management
  const [qrModalData, setQrModalData] = useState(null);
  const [activePayoutModal, setActivePayoutModal] = useState(null);

  const currentPage = Number(searchParams.get('page')) || 1;
  const currentLimit = Number(searchParams.get('limit')) || defaultLimit;
  const totalPages = pagination?.totalPages || 1;

  const hasSearch = Boolean(searchParams.get('search'));

  return (
    <div className="space-y-4">
      {/* Search Header Bar */}
      <div className="flex bg-card p-3 rounded-lg border border-border items-center justify-between gap-4">
        <TableSearchBar placeholder="Search barber or shop name..." queryParam="search" />
        <div className="text-xs text-muted-foreground select-none hidden md:block">
          Settle pending EOD balances. Scan QR codes or launch direct UPI payment triggers.
        </div>
      </div>

      {/* Main Grid View */}
      <div className="w-full overflow-x-auto rounded-md border border-border bg-card shadow-sm">
        <table className="w-full min-w-max text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="p-4 font-semibold text-muted-foreground">Barber Profile</th>
              <th className="p-4 font-semibold text-muted-foreground">Shop</th>
              <th className="p-4 font-semibold text-muted-foreground">Pending Amount (INR)</th>
              <th className="p-4 font-semibold text-muted-foreground text-center">Bookings</th>
              <th className="p-4 font-semibold text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialData.length > 0 ? (
              initialData.map((item) => (
                <tr key={item.barberId} className="border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors">
                  {/* Barber Profile */}
                  <td className="p-4 align-middle">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{item.barberName || item.accountHolderName || 'N/A'}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                        {item.upiId || 'No UPI ID'}
                      </span>
                    </div>
                  </td>

                  {/* Shop */}
                  <td className="p-4 align-middle">
                    <span className="text-muted-foreground font-medium">{item.shopName || 'N/A'}</span>
                  </td>

                  {/* Pending Amount */}
                  <td className="p-4 align-middle">
                    <span className="font-bold font-mono text-foreground">
                      ₹{(item.totalAmountInRupees || 0).toLocaleString('en-IN')}
                    </span>
                  </td>

                  {/* Booking count */}
                  <td className="p-4 align-middle text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground font-mono">
                      {item.bookingCount}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Show QR Action */}
                      <button
                        onClick={() => setQrModalData({
                          upiDeepLink: item.upiDeepLink,
                          amount: item.totalAmountInRupees,
                          barberName: item.barberName
                        })}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold border border-border bg-muted text-foreground hover:bg-accent hover:text-accent-foreground rounded transition-colors"
                        title="Display UPI Payment QR"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Show QR</span>
                      </button>

                      {/* Pay Action (Open UPI link) */}
                      {item.upiDeepLink ? (
                        <a
                          href={item.upiDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold border border-border bg-muted text-foreground hover:bg-accent hover:text-accent-foreground rounded transition-colors animate-none"
                          title="Execute Direct UPI Payment Protocol"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">Pay</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold border border-border bg-muted text-muted-foreground rounded cursor-not-allowed opacity-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">Pay</span>
                        </button>
                      )}

                      {/* Mark as Paid Action */}
                      <button
                        onClick={() => setActivePayoutModal(item)}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                        title="Mark Payout as Completed"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Mark as Paid</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">
                  {hasSearch ? 'No pending payouts match your query.' : 'Zero pending balances in current cycle.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <PaginationControls pagination={{ ...pagination, currentPage }} pageSize={currentLimit} />
      )}

      {/* UPI QR Display Popup */}
      <QRCodeModal
        isOpen={!!qrModalData}
        onClose={() => setQrModalData(null)}
        upiDeepLink={qrModalData?.upiDeepLink}
        amount={qrModalData?.amount}
        barberName={qrModalData?.barberName}
      />

      {/* Mark As Paid Dialog */}
      <PayoutRequestModal
        isOpen={!!activePayoutModal}
        onClose={() => setActivePayoutModal(null)}
        pendingPayout={activePayoutModal}
      />
    </div>
  );
}

export default PendingPayoutsTable;
