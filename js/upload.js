import { supabase, addPhotoRecord, deletePhotoRecord, getPhotos } from './supabase.js';

/**
 * Menghitung nomor urut foto berikutnya untuk penamaan teratur
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
 * Mengunggah gambar ke Supabase Storage dan menambahkan datanya ke database
 */
export async function uploadPhoto({ datasetId, datasetSlug, imageBlob, width, height }) {
  const { fileName } = await getNextFileName(datasetId, datasetSlug);
  const storagePath = `${datasetSlug}/${fileName}`;

  // 1. Upload ke Supabase Storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from('dataset-photos')
    .upload(storagePath, imageBlob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (storageError) throw storageError;

  // 2. Simpan metadata foto ke database PostgreSQL
  try {
    const dbRecord = await addPhotoRecord({
      datasetId,
      fileName,
      storagePath,
      fileSize: imageBlob.size,
      width,
      height
    });

    // Ambil Public URL untuk ditampulkan
    const { data: publicUrlData } = supabase.storage
      .from('dataset-photos')
      .getPublicUrl(storagePath);

    return {
      ...dbRecord,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (dbError) {
    // Rollback storage upload jika penyimpanan database gagal
    await supabase.storage.from('dataset-photos').remove([storagePath]);
    throw dbError;
  }
}

/**
 * Menghapus foto dari Supabase Storage dan database PostgreSQL
 */
export async function deletePhoto(photoId, storagePath) {
  // 1. Hapus catatan di database terlebih dahulu (agar UI segera merespons)
  await deletePhotoRecord(photoId);

  // 2. Hapus file fisik dari Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('dataset-photos')
    .remove([storagePath]);

  if (storageError) {
    // Logging saja jika file storage gagal dihapus tetapi DB sudah hilang
    console.error(`Gagal menghapus file storage: ${storagePath}`, storageError);
  }

  return true;
}
