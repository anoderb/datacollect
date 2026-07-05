import JSZip from 'jszip';
import { supabase, getPhotos } from './supabase.js';

/**
 * Mengunduh file dari Supabase Storage sebagai Blob
 */
async function downloadPhotoBlob(storagePath) {
  const { data, error } = await supabase.storage
    .from('dataset-photos')
    .download(storagePath);

  if (error) {
    throw new Error(`Gagal mengunduh file ${storagePath}: ${error.message}`);
  }
  return data;
}

/**
 * Membantu mendownload file zip ke browser pengguna
 */
function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Mendownload seluruh foto dari suatu dataset tertentu ke dalam satu file ZIP
 */
export async function downloadDatasetZip(dataset, onProgress) {
  const photos = await getPhotos(dataset.id);
  
  if (!photos || photos.length === 0) {
    throw new Error('Dataset ini tidak memiliki foto untuk diunduh.');
  }

  const zip = new JSZip();
  const total = photos.length;
  
  for (let i = 0; i < total; i++) {
    const photo = photos[i];
    if (onProgress) {
      onProgress(i + 1, total, photo.file_name);
    }
    
    try {
      const blob = await downloadPhotoBlob(photo.storage_path);
      zip.file(photo.file_name, blob);
    } catch (err) {
      console.error(`Gagal mendownload foto ${photo.file_name}, melewati...`, err);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  triggerFileDownload(zipContent, `${dataset.slug}-dataset.zip`);
}

/**
 * Mendownload seluruh foto dari SEMUA dataset ke dalam satu file ZIP terstruktur folder
 */
export async function downloadAllDatasetsZip(datasets, onProgress) {
  if (!datasets || datasets.length === 0) {
    throw new Error('Tidak ada dataset yang ditemukan.');
  }

  const zip = new JSZip();
  let totalPhotosCount = datasets.reduce((sum, d) => sum + (d.photo_count || 0), 0);
  
  if (totalPhotosCount === 0) {
    throw new Error('Tidak ada foto yang tersedia di seluruh dataset.');
  }

  let processedCount = 0;

  for (const dataset of datasets) {
    const photos = await getPhotos(dataset.id);
    if (!photos || photos.length === 0) continue;

    // Buat subfolder berdasarkan slug dataset
    const folder = zip.folder(dataset.slug);

    for (const photo of photos) {
      processedCount++;
      if (onProgress) {
        onProgress(processedCount, totalPhotosCount, `${dataset.slug}/${photo.file_name}`);
      }

      try {
        const blob = await downloadPhotoBlob(photo.storage_path);
        folder.file(photo.file_name, blob);
      } catch (err) {
        console.error(`Gagal mendownload foto ${photo.file_name} di dataset ${dataset.slug}, melewati...`, err);
      }
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  triggerFileDownload(zipContent, 'all-datasets.zip');
}
