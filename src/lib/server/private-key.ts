/**
 * ทำให้ private key ใช้ได้ไม่ว่าจะวางมาแบบไหน:
 * - มี "\n" เป็นตัวอักษร (แบบในไฟล์ JSON) → แปลงเป็นขึ้นบรรทัดใหม่
 * - เผลอวางเครื่องหมายคำพูดครอบมาด้วย (แบบใน .env) → ตัดออก
 */
export function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}
