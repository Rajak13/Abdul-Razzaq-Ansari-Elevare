import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const resourcesDir = path.join(uploadDir, 'resources');
const filesDir = path.join(uploadDir, 'files');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

// Configure multer for resource uploads
const resourceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, resourcesDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter for resources
const resourceFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow most common file types for educational resources
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    
    // Code files
    'text/javascript',
    'text/html',
    'text/css',
    'application/json',
    'application/xml',
    
    // Audio/Video (for educational content)
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, filesDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter for general files (more permissive than resources)
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow most file types for personal file management
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    
    // Code files
    'text/javascript',
    'text/html',
    'text/css',
    'application/json',
    'application/xml',
    'text/markdown',
    'text/x-python',
    'text/x-java-source',
    'text/x-c',
    'text/x-c++',
    
    // Audio/Video
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    
    // Other common types
    'application/octet-stream' // For unknown binary files
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Resource upload middleware
export const uploadResource = multer({
  storage: resourceStorage,
  fileFilter: resourceFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only one file per upload
  }
}).single('file');

// File upload middleware
export const uploadFile = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for personal files
    files: 1 // Only one file per upload
  }
}).single('file');

// Error handling middleware for multer
export const handleUploadError = (error: any, _req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB for files, 50MB for resources.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Only one file allowed per upload.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name. Use "file" as the field name.' });
    }
  }
  
  if (error.message && error.message.includes('File type')) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
};