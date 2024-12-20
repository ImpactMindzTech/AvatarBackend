import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let folder = 'uploads';
    if (file.fieldname === 'thumbnail') {
      folder = 'thumbnails';
    } else if (file.fieldname === 'images') {
      folder = 'Images';
    }
 const fileFormat = file.mimetype.split('/')[1];
    return {
      format: 'webp',
       folder: folder,
      public_id: file.fieldname + "_" + Date.now(),
transformation: [{ quality: 'auto' }]
    };
  },
});
export const upload = multer({
  storage: storage,
});
export const uploadMiddleware = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);