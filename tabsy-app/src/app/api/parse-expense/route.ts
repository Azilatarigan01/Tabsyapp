import { NextRequest, NextResponse } from 'next/server';
import { parseQuickInput } from '@/lib/domain/parser';
import { ExpenseCategory } from '@/types';

interface ParsedExpenseResponse {
  title: string;
  amount: number;
  category: string;
  categoryKey: ExpenseCategory;
  tagged_person: string | null;
  source: 'ai' | 'smart_rules';
}

const CATEGORY_MAP_TO_APP: Record<string, ExpenseCategory> = {
  makanan: 'makan',
  makan: 'makan',
  minuman: 'makan',
  transportasi: 'transport',
  transport: 'transport',
  belanja: 'belanja',
  tagihan: 'tagihan',
  hiburan: 'hiburan',
  kesehatan: 'kesehatan',
  pendidikan: 'pendidikan',
  lainnya: 'lainnya',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body.text || '').trim();

    if (!text) {
      return NextResponse.json(
        { error: 'Teks transaksi tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // 1. Ekstrak tagged person manual (misal: @dimas atau @budi)
    const taggedPersonMatch = text.match(/@([a-zA-Z0-9_.-]+)/);
    const taggedPersonFromText = taggedPersonMatch ? taggedPersonMatch[1] : null;

    // 2. Coba via AI API jika API Key tersedia
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      try {
        const aiPrompt = `Kamu adalah parser transaksi keuangan bahasa Indonesia.
Ekstrak teks berikut menjadi format JSON murni TANPA markdown, TANPA tanda kutip backtick, dengan properti:
{
  "title": string (nama barang atau aktivitas, huruf rapi),
  "amount": number (integer positif, ubah k/rb/ribu menjadi ribuan, jt/juta jadi jutaan),
  "category": string (pilihan persis salah satu: Makanan, Transportasi, Belanja, Tagihan, Hiburan, Kesehatan, Pendidikan, Lainnya),
  "tagged_person": string atau null (jika ada nama orang yang disebut atau diawali tanda @)
}

Teks transaksi: "${text}"`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: aiPrompt }] }],
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawReply) {
            const parsed = JSON.parse(rawReply.replace(/```json|```/g, '').trim());
            const amountNum = parseInt(String(parsed.amount).replace(/\D/g, ''), 10);

            if (parsed.title && !isNaN(amountNum) && amountNum > 0) {
              const catKey = CATEGORY_MAP_TO_APP[String(parsed.category || '').toLowerCase()] || 'makan';
              const response: ParsedExpenseResponse = {
                title: parsed.title,
                amount: amountNum,
                category: parsed.category || 'Makanan',
                categoryKey: catKey,
                tagged_person: parsed.tagged_person || taggedPersonFromText,
                source: 'ai',
              };
              return NextResponse.json(response);
            }
          }
        }
      } catch (aiErr) {
        console.warn('AI Parsing failed, falling back to smart rules:', aiErr);
      }
    }

    // 3. Fallback Smart Rule Parser (Offline-First & Fast)
    const quickResult = parseQuickInput(text);
    if (!quickResult.isValid || !quickResult.amountRupiah) {
      return NextResponse.json(
        {
          error:
            quickResult.ambiguousReason ||
            'Tidak dapat mendeteksi nominal transaksi. Masukkan contoh: "kopi kenangan 24k @dimas"',
        },
        { status: 422 }
      );
    }

    // Bersihkan nama dari tanda @person jika ada
    let cleanTitle = quickResult.description;
    if (taggedPersonMatch) {
      cleanTitle = cleanTitle.replace(taggedPersonMatch[0], '').replace(/\s+/g, ' ').trim();
    }
    if (!cleanTitle) {
      cleanTitle = 'Pengeluaran';
    }

    const categoryKey = quickResult.suggestedCategory || 'makan';
    const categoryLabels: Record<ExpenseCategory, string> = {
      makan: 'Makanan',
      transport: 'Transportasi',
      belanja: 'Belanja',
      tagihan: 'Tagihan',
      hiburan: 'Hiburan',
      kesehatan: 'Kesehatan',
      pendidikan: 'Pendidikan',
      lainnya: 'Lainnya',
    };

    const response: ParsedExpenseResponse = {
      title: cleanTitle,
      amount: quickResult.amountRupiah,
      category: categoryLabels[categoryKey],
      categoryKey,
      tagged_person: taggedPersonFromText,
      source: 'smart_rules',
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Error in /api/parse-expense:', err);
    return NextResponse.json(
      { error: 'Gagal memproses teks. Silakan coba lagi atau gunakan input manual.' },
      { status: 500 }
    );
  }
}
