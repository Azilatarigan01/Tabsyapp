import { describe, it, expect } from 'vitest';
import { simplifyGroupDebts } from '../debtSimplifier';

describe('Group Debt Simplification (Algoritma Ringkas Utang)', () => {
  it('simplifies cross debts among 3 friends (1 payer, 2 debtors)', () => {
    // Skenario nongkrong:
    // Total Tagihan: Rp160.000
    // Aku bayar kasir: Rp160.000 (Porsi sendiri: Rp60.000)
    // Budi porsi: Rp65.000 (Belum bayar)
    // Siti porsi: Rp35.000 (Belum bayar)
    const participants = [
      { id: '1', name: 'Aku', totalPaid: 160000, totalShare: 60000 },
      { id: '2', name: 'Budi', totalPaid: 0, totalShare: 65000 },
      { id: '3', name: 'Siti', totalPaid: 0, totalShare: 35000 },
    ];

    const result = simplifyGroupDebts(participants);

    expect(result.isBalanced).toBe(true);
    expect(result.totalBill).toBe(160000);
    expect(result.totalPaid).toBe(160000);

    // Budi (-65.000) & Siti (-35.000) -> Aku (+100.000)
    expect(result.transfers).toHaveLength(2);

    const budiTransfer = result.transfers.find((t) => t.fromName === 'Budi');
    expect(budiTransfer?.toName).toBe('Aku');
    expect(budiTransfer?.amount).toBe(65000);

    const sitiTransfer = result.transfers.find((t) => t.fromName === 'Siti');
    expect(sitiTransfer?.toName).toBe('Aku');
    expect(sitiTransfer?.amount).toBe(35000);

    // Total yang diterima Creditor sama persis dengan total yang ditransfer Debtors
    const totalTransferred = result.transfers.reduce((sum, t) => sum + t.amount, 0);
    expect(totalTransferred).toBe(100000);
  });

  it('drastically simplifies multi-payer debts with 4 people (Greedy match reduces transactions)', () => {
    // Skenario 4 orang:
    // Ali bayar makanan: Rp120.000 (beban Ali: Rp40.000) -> Net: +Rp80.000
    // Budi bayar minuman: Rp80.000 (beban Budi: Rp50.000) -> Net: +Rp30.000
    // Cici tidak bayar apapun (beban Cici: Rp70.000) -> Net: -Rp70.000
    // Dedi tidak bayar apapun (beban Dedi: Rp40.000) -> Net: -Rp40.000
    // Total Bill: 200.000, Total Paid: 200.000
    const participants = [
      { id: '1', name: 'Ali', totalPaid: 120000, totalShare: 40000 },
      { id: '2', name: 'Budi', totalPaid: 80000, totalShare: 50000 },
      { id: '3', name: 'Cici', totalPaid: 0, totalShare: 70000 },
      { id: '4', name: 'Dedi', totalPaid: 0, totalShare: 40000 },
    ];

    const result = simplifyGroupDebts(participants);

    expect(result.isBalanced).toBe(true);
    expect(result.transfers.length).toBeLessThanOrEqual(3);

    // Verifikasi total uang keluar = total uang diterima
    const sumDebtorTransfers = result.transfers.reduce((sum, t) => sum + t.amount, 0);
    const sumPositiveBalances = result.balances
      .filter((b) => b.netBalance > 0)
      .reduce((sum, b) => sum + b.netBalance, 0);

    expect(sumDebtorTransfers).toBe(sumPositiveBalances);
    expect(sumDebtorTransfers).toBe(110000); // 80.000 + 30.000
  });

  it('handles already settled participants with 0 transfer', () => {
    const participants = [
      { id: '1', name: 'Ali', totalPaid: 50000, totalShare: 50000 },
      { id: '2', name: 'Budi', totalPaid: 50000, totalShare: 50000 },
    ];

    const result = simplifyGroupDebts(participants);
    expect(result.transfers).toHaveLength(0);
    expect(result.balances.every((b) => b.netBalance === 0)).toBe(true);
  });
});
