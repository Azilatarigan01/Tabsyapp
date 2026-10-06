import { formatRupiah } from './calculator';

export interface ParticipantBalance {
  id: string;
  name: string;
  totalPaid: number;      // Total uang yang dikeluarkan (nalangin kasir)
  totalShare: number;     // Total beban yang harus dibayar
  netBalance: number;     // totalPaid - totalShare: (+) Creditor, (-) Debtor, (0) Lunas
}

export interface SimplifiedTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface DebtSimplificationResult {
  totalBill: number;
  totalPaid: number;
  balances: ParticipantBalance[];
  transfers: SimplifiedTransfer[];
  rawTransferCountEstimate: number; // Jumlah transfer silang naif jika tiap orang bayar ke masing-masing pembayar
  simplifiedTransferCount: number;  // Jumlah transfer minimal hasil greedy match
  savedTransfersCount: number;      // Berapa transaksi yang berhasil dihemat
  isBalanced: boolean;              // Apakah sum(paid) === sum(share)
}

/**
 * Group Debt Simplification Algorithm (Greedy Match)
 * 
 * 1. Menghitung Saldo Bersih (Net Balance) tiap orang:
 *    Net Balance = Total Uang Dikeluarkan - Total Beban
 *    - Nilai (+) = Creditor (berhak menerima uang)
 *    - Nilai (-) = Debtor (berutang)
 *    - Nilai (0) = Selesai / Lunas
 * 
 * 2. Penyelesaian Bertahap (Greedy Match):
 *    - Cari Debtor dengan utang terbesar (Debtor maksimum, misal: -Rp50.000)
 *    - Cari Creditor dengan piutang terbesar (Creditor maksimum, misal: +Rp70.000)
 *    - Buat transaksi penyelesaian: min(|Debtor|, Creditor)
 *    - Ulangi proses sampai semua saldo bersih menjadi nol.
 */
export function simplifyGroupDebts(
  participants: { id: string; name: string; totalPaid: number; totalShare: number }[]
): DebtSimplificationResult {
  if (!participants || participants.length === 0) {
    return {
      totalBill: 0,
      totalPaid: 0,
      balances: [],
      transfers: [],
      rawTransferCountEstimate: 0,
      simplifiedTransferCount: 0,
      savedTransfersCount: 0,
      isBalanced: true,
    };
  }

  const totalBill = participants.reduce((sum, p) => sum + p.totalShare, 0);
  const totalPaid = participants.reduce((sum, p) => sum + p.totalPaid, 0);

  // 1. Hitung Net Balance tiap orang
  const balances: ParticipantBalance[] = participants.map((p) => {
    const net = Math.round(p.totalPaid - p.totalShare);
    return {
      id: p.id,
      name: p.name,
      totalPaid: Math.round(p.totalPaid),
      totalShare: Math.round(p.totalShare),
      netBalance: net,
    };
  });

  // Pisahkan Debtors (< 0) dan Creditors (> 0)
  // Catatan: Debtor disimpan dalam nilai absolut positif untuk memudahkan kalkulasi min()
  interface PersonNode {
    id: string;
    name: string;
    amount: number;
  }

  const debtors: PersonNode[] = balances
    .filter((b) => b.netBalance < 0)
    .map((b) => ({ id: b.id, name: b.name, amount: Math.abs(b.netBalance) }));

  const creditors: PersonNode[] = balances
    .filter((b) => b.netBalance > 0)
    .map((b) => ({ id: b.id, name: b.name, amount: b.netBalance }));

  // Hitung estimasi transfer silang naif jika tanpa algoritma
  // Tiap debtor harus transfer ke setiap pembayar yang nalangin
  const rawTransferCountEstimate = debtors.length * Math.max(1, creditors.length);

  const transfers: SimplifiedTransfer[] = [];

  // 2. Greedy Matching: Selalu pasangkan Debtor terbesar dengan Creditor terbesar
  while (debtors.length > 0 && creditors.length > 0) {
    // Sort descending by remaining amount
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const maxDebtor = debtors[0];
    const maxCreditor = creditors[0];

    const settleAmount = Math.min(maxDebtor.amount, maxCreditor.amount);

    if (settleAmount > 0) {
      transfers.push({
        fromId: maxDebtor.id,
        fromName: maxDebtor.name,
        toId: maxCreditor.id,
        toName: maxCreditor.name,
        amount: settleAmount,
      });

      maxDebtor.amount -= settleAmount;
      maxCreditor.amount -= settleAmount;
    }

    // Hapus yang sudah lunas (amount === 0)
    if (maxDebtor.amount === 0) {
      debtors.shift();
    }
    if (maxCreditor.amount === 0) {
      creditors.shift();
    }
  }

  const simplifiedTransferCount = transfers.length;
  const savedTransfersCount = Math.max(0, rawTransferCountEstimate - simplifiedTransferCount);

  return {
    totalBill,
    totalPaid,
    balances,
    transfers,
    rawTransferCountEstimate,
    simplifiedTransferCount,
    savedTransfersCount,
    isBalanced: Math.abs(totalBill - totalPaid) === 0,
  };
}
