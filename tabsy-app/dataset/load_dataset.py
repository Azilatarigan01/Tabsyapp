"""
Script untuk memuat dataset struk dari Hugging Face (CORD & SROIE)
Digunakan untuk keperluan benchmark & evaluasi model OCR lokal Tabsy.
"""
from datasets import load_dataset
import os

def load_cord_samples(limit=5):
    print("Menghubungkan ke dataset Hugging Face: naver-clova-ix/cord-v2...")
    try:
        ds = load_dataset("naver-clova-ix/cord-v2", split="train", streaming=True)
        count = 0
        for sample in ds:
            count += 1
            filename = f"cord_sample_{count}.jpg"
            sample["image"].save(os.path.join(os.path.dirname(__file__), filename))
            print(f"[{count}/{limit}] Tersimpan: {filename}")
            if count >= limit:
                break
        print("Selesai mengunduh sampel CORD!")
    except Exception as e:
        print("Error saat mengunduh dari Hugging Face:", e)

if __name__ == "__main__":
    load_cord_samples(limit=3)
