import os
from PIL import Image

def compress_png_to_target(source_path, output_path, target_kb=20):
    """Mengompres gambar murni PNG dengan mempertahankan transparansi semaksimal mungkin."""
    try:
        # Buka gambar asli
        with Image.open(source_path) as img:
            # Pastikan gambar dalam format RGBA agar transparansi terjaga saat proses
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Langkah 1: Gunakan metode Quantization (mengurangi jumlah tabel warna tanpa hapus transparansi)
            # Ini adalah cara paling efektif memperkecil ukuran file PNG
            img_quantized = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
            
            # Simpan sementara dengan optimasi PNG maksimal (compress_level=9)
            img_quantized.save(output_path, format='PNG', optimize=True, compress_level=9)
            
            # Cek ukuran file hasil kompresi (dalam KB)
            file_size_kb = os.path.getsize(output_path) / 1024
            
            # Langkah 2: Jika ukuran masih di atas target, turunkan resolusi gambar (Resize) secara bertahap
            scale = 0.8
            while file_size_kb > target_kb and scale > 0.2:
                width, height = img.size
                new_width = max(10, int(width * scale))
                new_height = max(10, int(height * scale))
                
                # Resize gambar asli RGBA
                img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Jalankan kuantisasi ulang pada gambar yang sudah diperkecil
                img_resized_quantized = img_resized.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
                img_resized_quantized.save(output_path, format='PNG', optimize=True, compress_level=9)
                
                # Update data ukuran file terkini
                file_size_kb = os.path.getsize(output_path) / 1024
                scale -= 0.15 # Turunkan skala untuk perulangan berikutnya jika belum cukup

            print(f"[SUKSES] {os.path.basename(source_path)} -> {os.path.getsize(output_path)/1024:.1f} KB (PNG Transparan)")

    except Exception as e:
        print(f"[GAGAL] Gagal memproses {source_path}: {e}")

def batch_process_folders(source_root, output_root, target_kb=20):
    """Menelusuri folder input dan menduplikasi strukturnya ke folder output."""
    for root, dirs, files in os.walk(source_root):
        for file in files:
            # Filter hanya untuk file gambar PNG
            if file.lower().endswith('.png'):
                # Dapatkan path lengkap file sumber
                source_file_path = os.path.join(root, file)
                
                # Hitung path relatif dari folder sumber utama
                relative_path = os.path.relpath(root, source_root)
                
                # Tentukan folder output yang sesuai dengan struktur asli
                target_folder_path = os.path.join(output_root, relative_path)
                
                # Kembalikan output secara konsisten menggunakan format .png asli
                filename_only, _ = os.path.splitext(file)
                output_file_path = os.path.join(target_folder_path, f"{filename_only}.png")
                
                # Fitur Skip: Cek apakah file output sudah ada
                if os.path.exists(output_file_path):
                    print(f"[SKIP] File sudah ada: {os.path.relpath(output_file_path, output_root)}")
                    continue
                
                # Buat folder jika belum ada (menjaga struktur batch)
                os.makedirs(target_folder_path, exist_ok=True)
                
                print(f"Memproses: {os.path.relpath(source_file_path, source_root)}")
                compress_png_to_target(source_file_path, output_file_path, target_kb)

if __name__ == "__main__":
    # Tentukan folder input (sumber) dan output (tujuan) Anda di sini
    FOLDER_SUMBER = r"D:\PROJECT\edubook\img_ori" 
    FOLDER_TUJUAN = r"D:\PROJECT\edubook\img"

    print("--- Memulai Kompresi Batch Murni PNG (Transparan Tetap Aman) ---")
    batch_process_folders(FOLDER_SUMBER, FOLDER_TUJUAN, target_kb=20)
    print("--- Kompresi Selesai! ---")
