import os
import json
from gtts import gTTS

def bikin_audio_kamus():
    # 1. Pastikan folder 'audio' sudah dibuat
    folder_audio = "./audio"
    if not os.path.exists(folder_audio):
        os.makedirs(folder_audio)
        print("✓ Folder './audio' berhasil dibuat.")

    # 2. Buka dan baca file kosakata.json kamu
    path_json = "./data/kosakata.json"
    if not os.path.exists(path_json):
        print(f"❌ Error: File {path_json} tidak ditemukan!")
        return

    with open(path_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    chapters = data.get("chapters", [])
    total_kata = 0

    print("🚀 Memulai proses pembuatan audio MP3...")

    # 3. Looping semua bab dan kata di dalam JSON
    for bab in chapters:
        nama_bab = bab.get("title", "Tanpa Nama")
        words = bab.get("words", [])
        print(f"\n📁 Memproses Bab: {nama_bab} ({len(words)} kata)")

        for w in words:
            text_en = w.get("en")
            text_id = w.get("id_")

            if not text_en or not text_id:
                continue

            # Format nama file agar rapi (huruf kecil, spasi diganti underscore)
            nama_file_en = text_en.lower().replace(" ", "_").replace("/", "_")
            nama_file_id = text_id.lower().replace(" ", "_").replace("/", "_")

            path_en = f"{folder_audio}/{nama_file_en}_en.mp3"
            path_id = f"{folder_audio}/{nama_file_id}_id.mp3"

            # --- GENERATE AUDIO INGGRIS ---
            if not os.path.exists(path_en):
                tts_en = gTTS(text=text_en, lang='en', slow=False)
                tts_en.save(path_en)
                print(f"  -> Generated: {path_en}")
            
            # --- GENERATE AUDIO INDONESIA ---
            if not os.path.exists(path_id):
                tts_id = gTTS(text=text_id, lang='id', slow=False)
                tts_id.save(path_id)
                print(f"  -> Generated: {path_id}")

            total_kata += 1

    print(f"\n✨ Selesai! {total_kata * 2} file audio berhasil dibuat di folder './audio'.")

if __name__ == "__main__":
    bikin_audio_kamus()