/**
 * Mengakses aliran kamera perangkat (navigator.mediaDevices.getUserMedia)
 */
export async function startCamera(videoElement, facingMode = 'environment') {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API tidak didukung di browser ini. Pastikan Anda menggunakan HTTPS.');
  }

  const constraints = {
    video: {
      facingMode: facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.srcObject = stream;
  await videoElement.play();
  
  // Mirroring untuk kamera depan
  if (facingMode === 'user') {
    videoElement.style.transform = 'scaleX(-1)';
  } else {
    videoElement.style.transform = 'scaleX(1)';
  }
  
  return stream;
}

/**
 * Menghentikan semua trek video dari elemen kamera
 */
export function stopCamera(videoElement) {
  if (videoElement && videoElement.srcObject) {
    const stream = videoElement.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    videoElement.srcObject = null;
  }
}

/**
 * Mengambil tangkapan gambar dari video, mengubah ukuran dan mengompresinya ke format JPEG
 */
export function captureAndCompress(videoElement, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    try {
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;
      
      if (!videoWidth || !videoHeight) {
        return reject(new Error('Kamera tidak aktif atau frame belum siap.'));
      }

      // Hitung dimensi baru dengan mempertahankan rasio aspek
      let targetWidth = videoWidth;
      let targetHeight = videoHeight;

      if (videoWidth > videoHeight) {
        if (videoWidth > maxWidth) {
          targetHeight = Math.round((videoHeight * maxWidth) / videoWidth);
          targetWidth = maxWidth;
        }
      } else {
        if (videoHeight > maxWidth) {
          targetWidth = Math.round((videoWidth * maxWidth) / videoHeight);
          targetHeight = maxWidth;
        }
      }

      // Inisialisasi canvas untuk rendering
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      // Pindahkan transformasi mirroring ke canvas jika menggunakan kamera depan
      const isMirrored = videoElement.style.transform.includes('scaleX(-1)');
      if (isMirrored) {
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
      }

      // Gambar frame video ke canvas
      ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

      // Konversi ke Blob JPEG dengan kualitas kompresi
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Gagal melakukan kompresi gambar.'));
          }
          resolve({
            blob,
            width: targetWidth,
            height: targetHeight,
            sizeBytes: blob.size
          });
        },
        'image/jpeg',
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}
