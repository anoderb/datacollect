import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Inisialisasi klien Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Mengambil semua dataset dari database
 */
export async function getDatasets() {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Membuat dataset baru
 */
export async function createDataset(name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const { data, error } = await supabase
    .from('datasets')
    .insert([{ name, slug }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Memperbarui nama dan slug dataset
 */
export async function updateDataset(id, name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const { data, error } = await supabase
    .from('datasets')
    .update({ name, slug, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Menghapus dataset berdasarkan ID
 * Database cascade deletion akan otomatis menghapus catatan foto terkait.
 */
export async function deleteDataset(id) {
  const { error } = await supabase
    .from('datasets')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Mengambil semua foto dari dataset tertentu
 */
export async function getPhotos(datasetId) {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Mengambil foto terakhir dari dataset tertentu (untuk thumbnail)
 */
export async function getLatestPhoto(datasetId) {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Menyimpan data metadata foto baru ke database
 */
export async function addPhotoRecord({ datasetId, fileName, storagePath, fileSize, width, height }) {
  const { data, error } = await supabase
    .from('photos')
    .insert([
      {
        dataset_id: datasetId,
        file_name: fileName,
        storage_path: storagePath,
        file_size: fileSize,
        width,
        height
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Menghapus data metadata foto berdasarkan ID
 */
export async function deletePhotoRecord(id) {
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Update photo count dataset secara manual jika diperlukan di DB (opsional)
 */
export async function updateDatasetPhotoCount(datasetId, count) {
  const { data, error } = await supabase
    .from('datasets')
    .update({ photo_count: count, updated_at: new Date().toISOString() })
    .eq('id', datasetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
