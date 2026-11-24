import { Alert } from "@/components/ui/Alert";

export function FirebaseNotConfigured() {
  return (
    <Alert tone="warning" title="ยังไม่ได้ตั้งค่า Firebase">
      ผู้ดูแลต้องใส่ค่า <code>NEXT_PUBLIC_FIREBASE_*</code> ในไฟล์ <code>.env.local</code> หรือใน
      Vercel ก่อน จึงจะสมัคร/เข้าสู่ระบบได้ (ดู README)
    </Alert>
  );
}
