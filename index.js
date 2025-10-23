const express = require('express');
const { google } = require('googleapis');
const fs = require('fs'); // Thư viện kiểm tra file
const app = express();
const port = process.env.PORT || 10000;

// --- ĐÂY LÀ THAY ĐỔI QUAN TRỌNG ---
// Render luôn đặt "Secret Files" tại đường dẫn /etc/secrets/<tên_file>
// Chúng ta sẽ tham chiếu trực tiếp đến nó.
const GOOGLE_CREDENTIALS_PATH = '/etc/secrets/GOOGLE_CREDENTIALS';
// ------------------------------------

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Thiết lập EJS
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Hàm xác thực với Google
async function getGoogleAuth() {
  // Kiểm tra xem file bí mật có tồn tại tại đường dẫn Render cung cấp không
  if (!fs.existsSync(GOOGLE_CREDENTIALS_PATH)) {
    console.error(`LỖI: Không tìm thấy file credentials tại: ${GOOGLE_CREDENTIALS_PATH}`);
    console.error('Hãy đảm bảo bạn đã tạo "Secret File" trên Render với FILENAME là "GOOGLE_CREDENTIALS".');
    return null;
  }

  try {
    const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
    
    // Sử dụng 'keyFile' với đường dẫn cố định
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
  // Kiểm tra xem FOLDER_ID có tồn tại không
  if (!FOLDER_ID) {
     return res.status(500).send('Lỗi cấu hình: Biến môi trường DRIVE_FOLDER_ID chưa được thiết lập.');
  }

  const auth = await getGoogleAuth();
  if (!auth) {
    return res.status(500).send('Lỗi cấu hình máy chủ: Không thể xác thực với Google.');
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
