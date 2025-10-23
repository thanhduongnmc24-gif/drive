const express = require('express');
const { google } = require('googleapis');
const fs = require('fs'); // <--- THÊM DÒNG NÀY
const app = express();
const port = process.env.PORT || 10000; // Sửa thành 10000 như log của Render

// Thiết lập EJS làm công cụ tạo mẫu (template engine)
app.set('view engine', 'ejs');
app.use(express.static('public'));

// --- BIẾN MÔI TRƯỜNG CẦN THIẾT ---
// Đây là ĐƯỜNG DẪN đến file bí mật (do Render cung cấp)
const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS;
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Hàm xác thực với Google (ĐÃ CẬP NHẬT)
async function getGoogleAuth() {
  if (!GOOGLE_CREDENTIALS_PATH) {
    console.error('LỖI: Biến môi trường GOOGLE_CREDENTIALS (chỉ đường dẫn) chưa được thiết lập.');
    return null;
  }

  // Kiểm tra xem file bí mật có tồn tại tại đường dẫn đó không
  if (!fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
    console.error(`LỖI: Không tìm thấy file credentials tại: ${GOOGLE_CREDENTIALS_PATH}`);
    return null;
  }

  try {
    const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
    
    // Sử dụng 'keyFile' thay vì 'credentials'
    // Thư viện Google sẽ tự động đọc và phân tích file JSON tại đường dẫn này
    const auth = new google.auth.GoogleAuth({
      keyFile: GOOGLE_CREDENTIALS_PATH,
      scopes,
    });
    
    return auth;
  } catch (err) {
    console.error('LỖI: Không thể xác thực bằng keyFile:', err.message);
    return null;
  }
}

// Trang chủ
app.get('/', async (req, res) => {
  const auth = await getGoogleAuth();
  if (!auth || !FOLDER_ID) {
    return res.status(500).send('Lỗi cấu hình máy chủ. Vui lòng kiểm tra biến môi trường.');
  }

  const drive = google.drive({ version: 'v3', auth });

  try {
    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });

    const files = response.data.files;
    res.render('index', { files: files });

  } catch (error) {
    console.error('Không thể lấy danh sách file:', error.message);
    res.status(500).send('Lỗi khi truy xuất Google Drive.');
  }
});

// Khởi động máy chủ
app.listen(port, () => {
  console.log(`Ứng dụng đang chạy tại http://localhost:${port}`);
});
