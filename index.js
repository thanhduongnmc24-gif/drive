const express = require('express');
const { google } = require('googleapis');
const app = express();
const port = process.env.PORT || 3000;

// Thiết lập EJS làm công cụ tạo mẫu (template engine)
app.set('view engine', 'ejs');
app.use(express.static('public'));

// --- BIẾN MÔI TRƯỜNG CẦN THIẾT ---
// Chúng ta sẽ thiết lập chúng trong Render, không viết code cứng ở đây
const GOOGLE_CREDENTIALS_JSON = process.env.GOOGLE_CREDENTIALS;
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Hàm xác thực với Google
async function getGoogleAuth() {
  if (!GOOGLE_CREDENTIALS_JSON) {
    console.error('LỖI: Biến môi trường GOOGLE_CREDENTIALS chưa được thiết lập.');
    return null;
  }
  
  try {
    // Phân tích chuỗi JSON từ Biến Môi trường
    const credentials = JSON.parse(GOOGLE_CREDENTIALS_JSON);
    
    // Yêu cầu quyền chỉ đọc (readonly)
    const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes,
    });
    
    return auth;
  } catch (err) {
    console.error('LỖI: Không thể phân tích GOOGLE_CREDENTIALS:', err.message);
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
      // Tìm các file nằm trong thư mục FOLDER_ID
      q: `'${FOLDER_ID}' in parents`,
      // Chỉ lấy các trường (fields) chúng ta cần
      fields: 'files(id, name)',
      orderBy: 'name', // Sắp xếp theo tên
    });

    const files = response.data.files;
    
    // Gửi mảng 'files' đến file 'index.ejs' để hiển thị
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
