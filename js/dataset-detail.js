import { getPhotos, supabase } from './supabase.js';
import { startCamera, stopCamera, captureAndCompress } from './camera.js';
import { uploadPhoto, deletePhoto } from './upload.js';
import { downloadDatasetZip } from './download.js';
import { showToast } from './toast.js';

// Parameter URL
const urlParams = new URLSearchParams(window.location.search);
const datasetId = urlParams.get('id');
const datasetSlug = urlParams.get('slug');
const datasetName = urlParams.get('name');

// State global halaman detail
let currentStream = null;
let currentFacingMode = 'environment'; // 'environment' (belakang) atau 'user' (depan)
let datasetPhotos = [];

// DOM Elements
const datasetTitleDisplay = document.getElementById('dataset-title-display');
const datasetSubtitleDisplay = document.getElementById('dataset-subtitle-display');
const thumbnailGrid = document.getElementById('thumbnail-grid');
const galleryCount = document.getElementById('gallery-count');

// Camera Elements
const cameraVideo = document.getElementById('camera-video');
const cameraStatus = document.getElementById('camera-status');
const cameraStatusTitle = document.getElementById('camera-status-title');
const cameraStatusMessage = document.getElementById('camera-status-message');
const cameraRetryBtn = document.getElementById('camera-retry-btn');
const cameraShutterBtn = document.getElementById('camera-shutter-btn');
const cameraSwapBtn = document.getElementById('camera-swap-btn');

// Download Buttons
const downloadZipDesktopBtn = document.getElementById('download-zip-desktop-btn');
const downloadZipMobileBtn = document.getElementById('download-zip-mobile-btn');

/* ==========================================================================
   INITIALIZATION & DATA LOADING
   ========================================================================== */

async function initPage() {
  if (!datasetId || !datasetSlug) {
    showToast('Dataset ID atau Slug tidak valid. Mengalihkan ke Halaman Utama...', 'error');
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
    return;
  }

  // Tampilkan info dataset di header
  datasetTitleDisplay.textContent = datasetName ? decodeURIComponent(datasetName) : datasetSlug;
  datasetSubtitleDisplay.textContent = 'Memuat foto-foto produk...';

  // 1. Muat data foto yang ada
  await loadPhotos();

  // 2. Aktifkan kamera
  await initCamera();
}

async function loadPhotos() {
  try {
    datasetPhotos = await getPhotos(datasetId);
    renderGallery();
  } catch (error) {
    console.error('Error loading photos:', error);
    showToast('Gagal memuat galeri foto dari database.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPage();
  setupEventListeners();
});

// Bersihkan stream kamera saat tab ditutup / pindah halaman
window.addEventListener('beforeunload', () => {
  if (currentStream) {
    stopCamera(cameraVideo);
  }
});

/* ==========================================================================
   CAMERA CONTROL
   ========================================================================== */

async function initCamera() {
  showCameraStatus('loading', 'Memulai Kamera...', 'Silakan berikan izin akses kamera jika diminta browser.');
  
  if (currentStream) {
    stopCamera(cameraVideo);
  }

  try {
    currentStream = await startCamera(cameraVideo, currentFacingMode);
    hideCameraStatus();
  } catch (error) {
    console.error('Error starting camera:', error);
    showCameraStatus(
      'error',
      'Akses Kamera Gagal',
      error.message || 'Gagal terhubung dengan kamera. Pastikan browser diizinkan menggunakan kamera dan server berjalan di HTTPS/localhost.'
    );
    showToast('Gagal mengakses kamera.', 'error');
  }
}

function showCameraStatus(state, title, message) {
  cameraStatus.className = `camera-status-overlay ${state}`;
  cameraStatusTitle.textContent = title;
  cameraStatusMessage.textContent = message;
  cameraStatus.classList.remove('d-none');
  
  if (state === 'error') {
    cameraRetryBtn.classList.remove('d-none');
    // Sembunyikan kontrol kamera saat error
    cameraShutterBtn.style.opacity = '0.3';
    cameraShutterBtn.disabled = true;
  } else {
    cameraRetryBtn.classList.add('d-none');
    cameraShutterBtn.style.opacity = '1';
    cameraShutterBtn.disabled = false;
  }
}

function hideCameraStatus() {
  cameraStatus.classList.add('d-none');
  cameraShutterBtn.style.opacity = '1';
  cameraShutterBtn.disabled = false;
}

async function toggleCameraFacing() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  await initCamera();
  showToast(`Kamera beralih ke ${currentFacingMode === 'environment' ? 'belakang' : 'depan'}`, 'info');
}

/* ==========================================================================
   RENDERING GALLERY
   ========================================================================== */

function renderGallery() {
  // Update detail ukuran & info
  const totalPhotos = datasetPhotos.length;
  galleryCount.textContent = `${totalPhotos} Foto`;
  
  const totalBytes = datasetPhotos.reduce((sum, p) => sum + (p.file_size || 0), 0);
  const totalKB = (totalBytes / 1024).toFixed(1);
  datasetSubtitleDisplay.textContent = `Penyimpanan: ~${totalKB} KB | Jumlah: ${totalPhotos} foto`;

  if (totalPhotos === 0) {
    thumbnailGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <h3>Belum Ada Foto</h3>
        <p>Arahkan kamera ke produk dan klik tombol bulat putih untuk mulai mengambil dataset.</p>
      </div>
    `;
    return;
  }

  thumbnailGrid.innerHTML = '';
  datasetPhotos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'thumbnail-card';
    card.setAttribute('data-id', photo.id);

    // Ambil Public URL Supabase Storage
    const { data: publicUrlData } = supabase.storage
      .from('dataset-photos')
      .getPublicUrl(photo.storage_path);
      
    const sizeKB = photo.file_size ? `${(photo.file_size / 1024).toFixed(0)}KB` : '';

    card.innerHTML = `
      <img src="${publicUrlData.publicUrl}" alt="${photo.file_name}" loading="lazy">
      <button class="photo-delete-btn" title="Hapus foto" aria-label="Hapus foto">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
      <div class="thumbnail-info-overlay">
        <div class="thumbnail-filename">${escapeHTML(photo.file_name)}</div>
        <span class="thumbnail-status-badge success">
          ${sizeKB}
        </span>
      </div>
    `;

    // Aksi hapus foto
    card.querySelector('.photo-delete-btn').addEventListener('click', () => {
      handleDeletePhoto(photo.id, photo.storage_path);
    });

    thumbnailGrid.appendChild(card);
  });
}

/* ==========================================================================
   PHOTO CAPTURE & UPLOAD FLOW
   ========================================================================== */

async function triggerCapture() {
  if (!currentStream) {
    showToast('Kamera tidak aktif.', 'warning');
    return;
  }

  // Ambil tombol jepret untuk efek visual aktif
  cameraShutterBtn.disabled = true;

  // Efek Flash Shutter
  const originalBackground = cameraVideo.style.background;
  cameraVideo.style.opacity = '0.3';
  setTimeout(() => {
    cameraVideo.style.opacity = '1';
  }, 100);

  // Inisialisasi ID lokal sementara untuk rendering preview
  const tempId = `temp-${Date.now()}`;
  let tempObjectUrl = null;

  try {
    // 1. Ambil snapshot frame dan lakukan kompresi canvas
    const { blob, width, height, sizeBytes } = await captureAndCompress(cameraVideo, 800, 0.7);
    
    // Tampilkan preview foto langsung di grid (Visual Uploading Instan)
    tempObjectUrl = URL.createObjectURL(blob);
    createLocalPreviewCard(tempId, tempObjectUrl);

    // 2. Upload ke Supabase Storage + Database PostgreSQL
    const newRecord = await uploadPhoto({
      datasetId,
      datasetSlug,
      imageBlob: blob,
      width,
      height
    });

    // 3. Update status preview lokal menjadi berhasil, atau reload daftar foto
    updateLocalPreviewCardSuccess(tempId, newRecord);
    
    // Sinkronkan data lokal dengan record baru
    datasetPhotos.push(newRecord);
    
    // Update counter detail
    const totalPhotos = datasetPhotos.length;
    galleryCount.textContent = `${totalPhotos} Foto`;
    const totalBytes = datasetPhotos.reduce((sum, p) => sum + (p.file_size || 0), 0);
    const totalKB = (totalBytes / 1024).toFixed(1);
    datasetSubtitleDisplay.textContent = `Penyimpanan: ~${totalKB} KB | Jumlah: ${totalPhotos} foto`;

    showToast('Foto berhasil ditambahkan ke dataset.', 'success');
  } catch (error) {
    console.error('Error capturing / uploading:', error);
    showToast(`Gagal mengunggah foto: ${error.message}`, 'error');
    
    // Hapus preview lokal jika gagal
    removeLocalPreviewCard(tempId);
  } finally {
    cameraShutterBtn.disabled = false;
    if (tempObjectUrl) {
      // Bebaskan memori URL object lokal setelah beberapa detik
      setTimeout(() => URL.revokeObjectURL(tempObjectUrl), 5000);
    }
  }
}

// Preview card helper (Visual uploading instan)
function createLocalPreviewCard(id, localUrl) {
  // Pastikan empty-state terhapus jika ini foto pertama
  const emptyState = thumbnailGrid.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const card = document.createElement('div');
  card.className = 'thumbnail-card uploading-state';
  card.setAttribute('id', id);
  card.innerHTML = `
    <img src="${localUrl}" alt="Uploading Preview" style="filter: blur(2px) brightness(0.6)">
    <div class="thumbnail-info-overlay">
      <div class="thumbnail-filename">Mengunggah...</div>
      <span class="thumbnail-status-badge uploading">
        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="loading-spinner" style="margin-right:2px"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        Uploading
      </span>
    </div>
  `;
  thumbnailGrid.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function updateLocalPreviewCardSuccess(tempId, photoRecord) {
  const card = document.getElementById(tempId);
  if (!card) return;

  card.id = '';
  card.setAttribute('data-id', photoRecord.id);
  card.classList.remove('uploading-state');
  
  const img = card.querySelector('img');
  if (img) {
    img.style.filter = '';
    // Ambil public url aslinya
    const { data: publicUrlData } = supabase.storage
      .from('dataset-photos')
      .getPublicUrl(photoRecord.storage_path);
    img.src = publicUrlData.publicUrl;
  }

  const sizeKB = photoRecord.file_size ? `${(photoRecord.file_size / 1024).toFixed(0)}KB` : '';

  card.innerHTML = `
    <img src="${img?.src || ''}" alt="${photoRecord.file_name}" loading="lazy">
    <button class="photo-delete-btn" title="Hapus foto" aria-label="Hapus foto">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
    </button>
    <div class="thumbnail-info-overlay">
      <div class="thumbnail-filename">${escapeHTML(photoRecord.file_name)}</div>
      <span class="thumbnail-status-badge success">
        ${sizeKB}
      </span>
    </div>
  `;

  // Bind event delete
  card.querySelector('.photo-delete-btn').addEventListener('click', () => {
    handleDeletePhoto(photoRecord.id, photoRecord.storage_path);
  });
}

function removeLocalPreviewCard(id) {
  const card = document.getElementById(id);
  if (card) {
    card.remove();
  }
  if (datasetPhotos.length === 0) {
    renderGallery();
  }
}

/* ==========================================================================
   PHOTO DELETE ACTION
   ========================================================================== */

async function handleDeletePhoto(photoId, storagePath) {
  if (!confirm('Apakah Anda yakin ingin menghapus foto ini?')) return;

  const card = document.querySelector(`.thumbnail-card[data-id="${photoId}"]`);
  if (card) {
    card.style.opacity = '0.4';
  }

  try {
    await deletePhoto(photoId, storagePath);
    
    // Animate card removal
    if (card) {
      card.style.transition = 'all 0.3s';
      card.style.transform = 'scale(0.8)';
      card.style.opacity = '0';
      setTimeout(() => {
        card.remove();
        // Bersihkan array local
        datasetPhotos = datasetPhotos.filter(p => p.id !== photoId);
        // Refresh detail counters & layout jika kosong
        renderGallery();
      }, 300);
    }
    
    showToast('Foto berhasil dihapus.', 'success');
  } catch (error) {
    console.error('Error deleting photo:', error);
    showToast(`Gagal menghapus foto: ${error.message}`, 'error');
    if (card) card.style.opacity = '1';
  }
}

/* ==========================================================================
   ZIP DOWNLOAD ACTION
   ========================================================================== */

async function handleDownloadZip() {
  if (datasetPhotos.length === 0) {
    showToast('Dataset kosong. Tidak ada foto untuk diunduh.', 'warning');
    return;
  }

  const dataset = {
    id: datasetId,
    slug: datasetSlug,
    name: datasetName ? decodeURIComponent(datasetName) : datasetSlug
  };

  const toast = showToast(`Menyiapkan download ZIP untuk ${dataset.name}...`, 'info');

  try {
    await downloadDatasetZip(dataset, (current, total, filename) => {
      toast.update(`Mengunduh foto: ${current}/${total} (${filename})`);
    });
    toast.update('File ZIP berhasil dibuat dan diunduh!', 'success');
  } catch (error) {
    console.error('Error downloading dataset ZIP:', error);
    toast.update(`Gagal membuat ZIP: ${error.message}`, 'error');
  }
}

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */

function setupEventListeners() {
  // Capture
  cameraShutterBtn.addEventListener('click', triggerCapture);

  // Camera settings
  cameraSwapBtn.addEventListener('click', toggleCameraFacing);
  cameraRetryBtn.addEventListener('click', initCamera);

  // Downloads
  downloadZipDesktopBtn.addEventListener('click', handleDownloadZip);
  downloadZipMobileBtn.addEventListener('click', handleDownloadZip);
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
