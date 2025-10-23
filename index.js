const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 10000;

// Đường dẫn bí mật của Render
const GOOGLE_CREDENTIALS_PATH = '/etc/secrets/GOOGLE_CREDENTIALS';
// ID thư mục GỐC (Root) từ biến môi trường
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Thiết lập EJS
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Hàm xác thực (không đổi)
async function getGoogleAuth() {
  if (!fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
    console.error(`LỖI: Không tìm thấy file credentials tại: ${GOOGLE_CREDENTIALS_PATH}`);
    return null;
  }
  try {
    const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
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

// --- THAY ĐỔI LỚN BẮT ĐẦU TỪ ĐÂY ---

// Route này sẽ xử lý cả trang chủ ('/') và các thư mục con ('/:folderId')
app.get('/:folderId?', async (req, res) => {
  
  // Kiểm tra xem ID thư mục gốc có được thiết lập không
  if (!FOLDER_ID) {
     return res.status(500).send('Lỗi cấu hình: Biến môi trường DRIVE_FOLDER_ID chưa được thiết lập.');
  }

  // Xác định thư mục cần hiển thị:
  // 1. Lấy 'folderId' từ URL (ví dụ: /1a2b3c...)
  // 2. Nếu không có (người dùng ở trang chủ), thì dùng ID thư mục GỐC.
  const currentFolderId = req.params.folderId || FOLDER_ID;

  const auth = await getGoogleAuth();
  if (!auth) {
    return res.status(500).send('Lỗi cấu hình máy chủ: Không thể xác thực với Google.');
  }

  const drive = google.drive({ version: 'v3', auth });

  try {
    const response = await drive.files.list({
      // 1. Sửa 'q' để tìm file/thư mục trong 'currentFolderId'
      q: `'${currentFolderId}' in parents`,
      // 2. Sửa 'fields' để lấy thêm 'mimeType'
      fields: 'files(id, name, mimeType)',
      orderBy: 'folder, name', // Ưu tiên hiển thị thư mục trước
    });

    const items = response.data.files;
    
    // 3. Gửi thêm 'rootFolderId' và 'currentFolderId'
    res.render('index', { 
      items: items, 
      rootFolderId: FOLDER_ID,
      currentFolderId: currentFolderId 
    });

  } catch (error) {
    console.error('Không thể lấy danh sách file:', error.message);
    res.status(500).send('Lỗi khi truy xuất Google Drive.');
  }
});

// Khởi động máy chủ (không đổi)
app.listen(port, () => {
  console.log(`Ứng dụng đang chạy tại http://localhost:${port}`);
});
