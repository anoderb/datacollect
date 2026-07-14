import { supabase, addPhotoRecord, deletePhotoRecord, getPhotos, updateDatasetPhotoCount } from './supabase.js';

/**
 * Menghitung nama file dan nomor urut foto berikutnya untuk penamaan teratur
 * Format: {slug}_{3-digit-seq}.jpg (Contoh: indomie-goreng_001.jpg)
 */
export async function getNextFileName(datasetId, datasetSlug) {
  try {
    const photos = await getPhotos(datasetId);
    
    if (!photos || photos.length === 0) {
      return {
        fileName: `${datasetSlug}_001.jpg`,
        nextIndex: 1
      };
    }

    let maxIndex = 0;
    const regex = new RegExp(`${datasetSlug}_(\\d+)\\.jpg$`, 'i');

    photos.forEach(photo => {
      const match = photo.file_name.match(regex);
      if (match) {
        const index = parseInt(match[1], 10);
        if (index > maxIndex) {
          maxIndex = index;
        }
      }
    });

    const nextIndex = maxIndex + 1;
    const paddedIndex = String(nextIndex).padStart(3, '0');
    return {
      fileName: `${datasetSlug}_${paddedIndex}.jpg`,
      nextIndex
    };
  } catch (error) {
    console.error('Gagal mendapatkan nomor urut file berikutnya:', error);
    // Fallback menggunakan timestamp jika query gagal
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return {
      fileName: `${datasetSlug}_err_${Date.now()}_${randomSuffix}.jpg`,
      nextIndex: null
    };
  }
}

/**
 * Mengunggah satu foto terproses dan thumbnail terkait ke Supabase Storage,
 * serta menambahkan catatan metadatanya ke database PostgreSQL.
 */
export async function uploadSinglePhoto({ datasetId, datasetSlug, processedBlob, thumbnail, width, height, fileName }) {
  // Jika fileName belum dispesifikasi, generate otomatis secara urut
  let finalFileName = fileName;
  if (!finalFileName) {
    const fileInfo = await getNextFileName(datasetId, datasetSlug);
    finalFileName = fileInfo.fileName;
  }

  const storagePath = `${datasetSlug}/${finalFileName}`;
  const thumbnailPath = `${datasetSlug}/thumbnails/${finalFileName}`;

  // 1. Upload foto utama ke Storage
  const { error: storageError } = await supabase.storage
    .from('dataset-photos')
    .upload(storagePath, processedBlob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (storageError) throw storageError;

  // 2. Upload thumbnail ke Storage (opsional, jika ada)
  if (thumbnail) {
    try {
      await supabase.storage
        .from('dataset-photos')
        .upload(thumbnailPath, thumbnail, {
          contentType: 'image/jpeg',
          upsert: true
        });
    } catch (thumbErr) {
      console.warn('Gagal upload thumbnail, melanjutkan penyimpanan gambar utama.', thumbErr);
    }
  }

  // 3. Simpan metadata foto ke PostgreSQL
  try {
    const dbRecord = await addPhotoRecord({
      datasetId,
      fileName: finalFileName,
      storagePath,
      fileSize: processedBlob.size,
      width,
      height
    });

    // 4. Update photo_count di tabel datasets secara sinkron
    const photos = await getPhotos(datasetId);
    await updateDatasetPhotoCount(datasetId, photos.length);

    // Ambil Public URL untuk dikembalikan
    const { data: publicUrlData } = supabase.storage
      .from('dataset-photos')
      .getPublicUrl(storagePath);

    const { data: thumbUrlData } = supabase.storage
      .from('dataset-photos')
      .getPublicUrl(thumbnailPath);

    return {
      ...dbRecord,
      publicUrl: publicUrlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl
    };
  } catch (dbError) {
    // Rollback file storage jika database insert gagal
    await supabase.storage.from('dataset-photos').remove([storagePath, thumbnailPath]);
    throw dbError;
  }
}

/**
 * Menghapus foto dari Supabase Storage (utama & thumbnail) dan database PostgreSQL
 */
export async function deletePhoto(photoId, storagePath) {
  // Parsing datasetId dari path atau query record
  // Dapatkan detail record foto terlebih dahulu untuk mengetahui dataset_id
  let datasetId = null;
  try {
    const { data } = await supabase
      .from('photos')
      .select('dataset_id')
      .eq('id', photoId)
      .single();
    if (data) {
      datasetId = data.dataset_id;
    }
  } catch (e) {
    console.warn('Gagal mendapatkan dataset_id dari photo record.', e);
  }

  // 1. Hapus catatan di database
  await deletePhotoRecord(photoId);

  // 2. Hapus file fisik dan thumbnail dari Supabase Storage
  const thumbnailPath = storagePath.replace(/([^/]+)$/, 'thumbnails/$1');
  
  const { error: storageError } = await supabase.storage
    .from('dataset-photos')
    .remove([storagePath, thumbnailPath]);

  if (storageError) {
    console.error(`Gagal menghapus file storage: ${storagePath}`, storageError);
  }

  // 3. Update jumlah foto di tabel datasets agar tersinkronisasi
  if (datasetId) {
    try {
      const photos = await getPhotos(datasetId);
      await updateDatasetPhotoCount(datasetId, photos.length);
    } catch (e) {
      console.warn('Gagal sinkronisasi photo_count setelah hapus foto.', e);
    }
  }

  return true;
}
