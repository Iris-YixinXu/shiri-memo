"use strict";

const ShiriPhotos = (() => {
  let database;

  function open() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open("shiri-private-photos-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("photos");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      database = undefined;
      throw error;
    });
    return database;
  }

  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", mode);
      const request = action(tx.objectStore("photos"));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function validatedPhoto(file) {
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("每张照片最多 10 MB。");
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const signature = String.fromCharCode(...bytes);
    let type;
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) type = "image/jpeg";
    else if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) type = "image/png";
    else if (signature.startsWith("GIF87a") || signature.startsWith("GIF89a")) type = "image/gif";
    else if (signature.startsWith("RIFF") && signature.slice(8, 12) === "WEBP") type = "image/webp";
    else throw new Error("请选择 JPG、PNG、WebP 或 GIF 图片。");
    return new Blob([file], { type });
  }

  return {
    validatedPhoto,
    save: (key, blob) => transaction("readwrite", (store) => store.put(blob, key)),
    read: (key) => transaction("readonly", (store) => store.get(key)),
    remove: (key) => transaction("readwrite", (store) => store.delete(key)),
  };
})();
