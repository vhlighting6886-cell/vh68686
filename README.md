# VHLIGHTING Sales

## 1. Tạo database Supabase
Mở Supabase > SQL Editor > New Query, dán toàn bộ nội dung file `supabase.sql`, rồi bấm Run.

## 2. Lấy khóa kết nối
Supabase > Project Settings > API:
- Project URL
- anon public key

## 3. Cấu hình Vercel Environment Variables
Trong Vercel Project > Settings > Environment Variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## 4. Deploy
Upload project này lên GitHub, sau đó Import Project trong Vercel.
Framework: Vite
Build command: npm run build
Output directory: dist

## 5. Chạy local nếu cần
npm install
npm run dev
