import { NextRequest, NextResponse } from 'next/server';
import { PublicBillData, generateShareToken } from '@/lib/domain/shareableBill';

// Global cache for server-stored bills
declare global {
  var __TABSY_BILLS_MAP: Map<string, PublicBillData> | undefined;
}

if (!global.__TABSY_BILLS_MAP) {
  global.__TABSY_BILLS_MAP = new Map<string, PublicBillData>();
}

const billsCache = global.__TABSY_BILLS_MAP;

export async function POST(req: NextRequest) {
  try {
    const data: PublicBillData = await req.json();
    const token = data.shareToken || generateShareToken();
    data.shareToken = token;

    billsCache.set(token, data);
    billsCache.set(data.id, data);

    return NextResponse.json({
      success: true,
      shareToken: token,
      shortUrlPath: `/b/${token}`,
    });
  } catch (err) {
    console.error('Error saving short bill:', err);
    return NextResponse.json(
      { error: 'Gagal menyimpan tagihan ke server.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token diperlukan.' }, { status: 400 });
  }

  const bill = billsCache.get(token);
  if (!bill) {
    return NextResponse.json({ error: 'Tagihan tidak ditemukan.' }, { status: 404 });
  }

  return NextResponse.json(bill);
}
