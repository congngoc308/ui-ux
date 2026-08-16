

## 🛠️ Hướng Dẫn Cài Đặt và Khởi Chạy

### Yêu Cầu Hệ Thống
- **Node.js**: Phiên bản 18.0 trở lên (khuyến nghị v20/v22 LTS).
- **npm** hoặc **Bun**.

### Bước 1: Cài đặt Dependencies
Mở terminal tại thư mục gốc của dự án và chạy:
```bash
npm install
```
### Bước 2: Chạy ứng dụng

#### Chạy trong môi trường Phát Triển (Development)
Khởi động Express backend tích hợp Vite frontend server:
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: **`http://localhost:3000`**

#### Biên dịch và chạy trong môi trường Production
1. Build dự án:
   ```bash
   npm run build
   ```
2. Khởi chạy server production:
   ```bash
   npm start
   ```
   Ứng dụng sẽ sẵn sàng tại địa chỉ: **`http://localhost:3000`**

