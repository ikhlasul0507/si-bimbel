# KelasKu · Langkah 1: Halaman Login

Next.js 14 (TypeScript) + Supabase Auth. Siap deploy ke Vercel.

## A. Siapkan Supabase (sekitar 5 menit)
1. Buka supabase.com, daftar, lalu klik **New project**. Isi nama proyek dan kata sandi database, pilih region **Singapore**.
2. Tunggu proyek selesai dibuat (1 sampai 2 menit).
3. Buka **Project Settings > API**. Salin dua nilai ini:
   - **Project URL**
   - **anon public key**
4. Buka **Authentication > Sign In / Providers > Email**. Matikan **Confirm email** supaya kamu bisa langsung masuk saat uji coba. Klik **Save**.

## B. Upload ke GitHub
1. Buka github.com, buat repository baru bernama `kelasku`.
2. Klik **uploading an existing file**, tarik semua isi folder ini (bukan ZIP-nya), lalu **Commit changes**.

## C. Deploy di Vercel
1. Buka vercel.com, login pakai GitHub, klik **Add New > Project**, pilih repo `kelasku`.
2. Buka bagian **Environment Variables**, tambahkan dua variabel:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL tadi
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key tadi
3. Klik **Deploy**. Setelah selesai, kamu dapat alamat seperti `kelasku.vercel.app`.

## D. Hubungkan alamat Vercel ke Supabase
Di Supabase buka **Authentication > URL Configuration**, isi **Site URL** dengan alamat Vercel kamu, lalu **Save**.

## E. Coba
Buka alamat Vercel, klik **Belum punya akun? Daftar**, isi email dan kata sandi (minimal 6 karakter), lalu masuk.

## Opsional: login Google
Aktifkan di **Authentication > Sign In / Providers > Google**. Perlu Client ID dari Google Cloud Console. Boleh dilewati dulu.

## Jalankan di komputer sendiri
```
cp .env.example .env.local   # isi nilainya
npm install
npm run dev
```
