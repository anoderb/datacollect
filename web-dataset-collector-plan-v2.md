# Web Dataset Collector — Prototype Kasir Tokiva

## 1. Konsep

Web buat ngumpulin dataset foto produk lewat hape. CRUD sederhana. Tinggal buka web → buat/edit/hapus dataset → foto langsung dari kamera → simpan ke Supabase. Download ZIP buat training di Colab.

```
Hape → Buka Web → CRUD Dataset → Foto Produk → Supabase Storage → Download ZIP → Colab
```

---

## 2. Arsitektur

```
┌─────────────────────────────────┐
│  Frontend (HTML/CSS/JS)         │
│  ┌───────────────────────────┐  │
│  │ Halaman: Daftar Dataset   │  │
│  │   ├─ Lihat semua dataset  │  │
│  │   ├─ Tambah dataset       │  │
│  │   ├─ Edit nama dataset    │  │
│  │   └─ Hapus dataset        │  │
│  │                           │  │
│  │ Halaman: Detail Dataset   │  │
│  │   ├─ Kamera preview       │  │
│  │   ├─ Capture foto         │  │
│  │   ├─ Grid thumbnail       │  │
│  │   ├─ Hapus foto           │  │
│  │   └─ Download ZIP         │  │
│  └───────────────────────────┘  │
│         │                       │
│         ▼                       │
│  Supabase Client (JS)           │
│  Config dari .env               │
└─────────┬───────────────────────┘
          │
          ▼
┌──────────────────────┐
│ Supabase             │
│ ├─ Storage: dataset/ │
│ │  ├─ indomie/       │
│ │  │  ├─ 001.jpg     │
│ │  │  └─ 002.jpg     │
│ │  └─ aqua/          │
│ └─ DB: datasets      │
│    └─ photos         │
└──────────────────────┘
```

---

## 3. Halaman & Fitur (CRUD Lengkap)

### 3.1 Halaman Utama — Daftar Dataset

| Fitur | Cara |
|-------|------|
| Kartu dataset | Nama, jumlah foto, thumbnail terakhir, timestamp |
| Tambah dataset | Tombol "+" → modal input nama → submit |
| Edit dataset | Ikon pensil di kartu → modal edit nama |
| Hapus dataset | Ikon sampah → konfirmasi → hapus + semua fotonya |
| Klik kartu | Masuk halaman detail dataset |
| Download ZIP | Ikon download di kartu (download dataset itu aja) |
| Download All ZIP | Tombol di header |

### 3.2 Modal Form — Tambah / Edit Dataset

```
┌─────────────────────┐
│ Tambah Dataset      │ ← atau "Edit Dataset"
│                     │
│ Nama Produk         │
│ [________________]  │
│ Contoh: indomie     │
│                     │
│ [Batal]  [Simpan]   │
└─────────────────────┘
```

### 3.3 Halaman Detail Dataset — Foto Produk

| Fitur | Cara |
|-------|------|
| Header | Nama dataset + tombol kembali |
| Kamera Preview | `getUserMedia()` kamera belakang |
| Tombol Capture | Ambil foto → resize → upload → tampil |
| Grid Thumbnail | Semua foto + status (uploading ✅ ❌) |
| Hapus foto | Klik thumbnail → tombol hapus |
| Download ZIP | Tombol download semua foto dataset ini |
| Info | Jumlah foto, total ukuran |

### 3.4 Download ZIP

**Opsi A: Client-side (JSZip)** — buat < 100 foto, langsung di browser.
**Opsi B: Supabase Edge Function** — buat foto banyak, generate di server.

Mulai pake Opsi A.

---

## 4. Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Storage | Supabase Storage (bucket: `dataset-photos`) |
| DB | Supabase PostgreSQL |
| Camera | `navigator.mediaDevices.getUserMedia()` |
| ZIP | JSZip (CDN) |
| Env | `.env` file + `config.js` |
| Hosting | Vercel / Netlify / Cloudflare Pages |
| UI | CSS native — mobile-first |

---

## 5. Env & Config

### `.env`

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### `config.js` (auto-generated dari build / manual)

```js
const SUPABASE_URL = 'https://xxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJxxx...'
```

---

## 6. Tabel Supabase

### `datasets`

```sql
CREATE TABLE datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `photos`

```sql
CREATE TABLE photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Storage Bucket

```
Name: dataset-photos
Policy: public (biar thumbnail bisa tampil)
Structure: {slug}/{nama_dataset}_{nomor_urut}.jpg
```

### Nama File Foto

Format: `{NamaDataset}_{nomor3digit}.jpg`

Contoh:
```
indomie_001.jpg
indomie_002.jpg
indomie_003.jpg
...
aqua_001.jpg
minyak-bimoli_001.jpg
```

Nomor urut auto-increment per dataset — cek foto terakhir di storage/db, kasih +1. Kalo dataset baru, mulai dari `_001`.

---

## 7. Kompresi Foto (Frontend)

| Langkah | Detail |
|---------|--------|
| Resize | Max 800px sisi terpanjang |
| Quality | JPEG 0.70 |
| Output | ~100-200KB per foto |
| Tujuan | Hemat storage + upload cepet |

Preprocessing beneran (224x224, augmentasi) nanti di Colab.

---

## 8. File Structure

```
web-dataset-collector/
├── index.html              # Daftar dataset (CRUD)
├── dataset.html            # Halaman detail + kamera
├── css/
│   └── style.css           # Mobile-first, responsive
├── js/
│   ├── config.js           # Supabase credentials (dari env)
│   ├── supabase.js         # Init + query functions
│   ├── camera.js           # Camera capture + resize
│   ├── upload.js           # Upload + hapus foto
│   └── download.js         # ZIP download
├── .env                    # CONTOH — jangan commit asli
└── README.md
```

---

## 9. Navigation Bar

Navbar ada di setiap halaman — navigasi utama.

### Desktop

```
┌────────────────────────────────────────┐
│  📸 Dataset Collector    [Home] [All↓] │
└────────────────────────────────────────┘
```

### Mobile

```
┌────────────────────┐
│ 📸 Dataset Col.. [↓] │  ← top bar
├────────────────────┤
│                    │
│     (content)      │
│                    │
├────────────────────┤
│ [🏠]  [+ Tambah]  │  ← bottom nav bar
└────────────────────┘
```

### Elemen Navbar

| Platform | Posisi | Isi |
|----------|--------|-----|
| Desktop | Top | Logo/kembali, Download All, jumlah dataset |
| Mobile | Bottom | Home (daftar dataset), Tambah dataset |
| Mobile | Top | Nama halaman, Download All |

### Bottom Nav Mobile

```
┌─────────────────────┐
│  🏠 Home     ＋ Tambah │
└─────────────────────┘
```

- Fixed bottom
- 2 item: Home (daftar dataset), Tambah dataset (buka modal)
- Active state highlight

---

## 10. Mobile Friendly — Desain (Mobile-First)

### Pendekatan: Mobile-first

```css
/* Base: mobile (320px-767px) */
.container { padding: 16px; }
.card { width: 100%; margin-bottom: 12px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.camera-preview { width: 100%; height: auto; }
button { width: 100%; padding: 14px; font-size: 16px; }

/* Tablet (768px-1023px) */
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .container { padding: 24px; }
}

/* Desktop (>1024px) */
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .container { max-width: 960px; margin: auto; }
  button { width: auto; }
}
```

### Komponen UI

| Komponen | Mobile | Desktop |
|----------|--------|---------|
| Tombol | Full width, padding besar | Auto width |
| Grid foto | 2 kolom | 4 kolom |
| Modal | Full screen overlay | Centered modal |
| Kamera | Full width | Max 640px |
| Navbar | Bottom bar / hamburger | Top bar |

### UX touch targets

- Semua tombol minimal 44x44px (standar aksesibilitas touch)
- Jarak antar item 8-12px biar gak ke-salah-tap

---

## 11. API Supabase — Function List

```js
// DATASET CRUD
supabase.from('datasets').select('*').order('created_at', { ascending: false })
supabase.from('datasets').insert({ name, slug })
supabase.from('datasets').update({ name, slug }).eq('id', id)
supabase.from('datasets').delete().eq('id', id) // ON CASCADE hapus foto juga

// PHOTOS
supabase.from('photos').select('*').eq('dataset_id', id).order('created_at')
supabase.from('photos').insert({ dataset_id, file_name, storage_path, file_size, width, height })
supabase.from('photos').delete().eq('id', id)

// STORAGE
supabase.storage.from('dataset-photos').upload(path, file)
supabase.storage.from('dataset-photos').getPublicUrl(path)
supabase.storage.from('dataset-photos').remove([paths]) // hapus foto
supabase.storage.from('dataset-photos').list(slug) // list foto
```

---

## 12. Halaman Detail — Wireframe Mobile

```
┌────────────────────┐
│ ← Dataset          │
│ indomie-goreng     │
│                    │
│ ┌────────────────┐ │
│ │  Kamera        │ │
│ │  Preview       │ │
│ │                │ │
│ │  [📸 CAPTURE]  │ │
│ └────────────────┘ │
│                    │
│ 📷 5 foto          │
│ ┌──┐ ┌──┐ ┌──┐   │
│ │1 │ │2 │ │3 │   │
│ └──┘ └──┘ └──┘   │
│ ┌──┐ ┌──┐        │
│ │4 │ │5 │        │
│ └──┘ └──┘        │
│                    │
│ [⬇ Download ZIP]  │
└────────────────────┘
```

---

## 13. Todo List

| # | Item | Prioritas |
|---|------|-----------|
| 1 | Setup Supabase project + bucket + tabel | Tinggi |
| 2 | .env + config.js | Tinggi |
| 3 | Halaman utama — list dataset + CRUD | Tinggi |
| 4 | Modal tambah/edit dataset | Tinggi |
| 5 | Hapus dataset (cascade ke foto + storage) | Tinggi |
| 6 | Kamera: getUserMedia + capture + resize | Tinggi |
| 7 | Upload foto ke Supabase + insert DB | Tinggi |
| 8 | Halaman detail: preview + thumbnail grid | Tinggi |
| 9 | Hapus foto (storage + db) | Tinggi |
| 10 | Mobile responsive CSS | Tinggi |
| 11 | Navbar (top bar + bottom nav mobile) | Tinggi |
| 12 | Mobile responsive CSS | Tinggi |
| 13 | Touch-friendly UI (tombol 44px+) | Tinggi |
| 14 | Download ZIP per dataset (JSZip) | Sedang |
| 15 | Download All ZIP | Sedang |
| 16 | Upload progress indicator | Rendah |
| 17 | Ganti kamera depan/belakang | Rendah |
| 18 | PWA manifest (biar bisa install di HP) | Rendah |
| 19 | Konfirmasi hapus dataset (jangan langsung ilang) | Rendah |

---

## 14. Catatan

- **Camera API** cuma jalan di HTTPS. Hosting pake Vercel / Cloudflare Pages.
- **Supabase free tier**: 1GB storage, 10k rows — cukup prototype.
- **Blob URL**: pas capture, tampilin preview dari blob URL dulu, baru upload async.
- **Izin kamera**: browser minta izin otomatis pas `getUserMedia()`.
- **Env jangan di-commit**: `.env` di `.gitignore`.
