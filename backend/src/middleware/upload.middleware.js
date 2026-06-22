// ============================================================
// KALA IS ART - File Upload Middleware (Multer)
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = process.env.UPLOAD_PATH || './uploads';

    // Organize by entity type
    if (req.params.clientId) {
      uploadPath = path.join(uploadPath, 'clients', req.params.clientId);
    } else if (req.params.projectId) {
      uploadPath = path.join(uploadPath, 'projects', req.params.projectId);
    } else if (req.params.leadId) {
      uploadPath = path.join(uploadPath, 'leads', req.params.leadId);
    } else {
      uploadPath = path.join(uploadPath, 'general');
    }

    createUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed: Images, PDF, Word, Excel'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
});

module.exports = { upload };
