import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __filename and __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define the CloudinaryStorage with logic for videos and images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'uploads';
    let resourceType = 'image'; // Default to 'image'

    // Set folder and resource type based on fieldname
    if (file.fieldname === 'thumbnail') {
      folder = 'thumbnails';
    } else if (file.fieldname === 'images') {
      folder = 'Images';
    } else if (file.fieldname === 'video') {
      folder = 'Videos';
      resourceType = 'video'; // Handle video uploads
    }

    // Generate file format for images or videos
    const fileFormat = file.mimetype.split('/')[1];

    return {
      folder: folder,
      resource_type: resourceType,
      public_id: file.fieldname + "_" + Date.now(),
      format: resourceType === 'image' ? 'webp' : undefined, // Convert images to webp
      transformation: resourceType === 'image' ? [{ quality: 'auto' }] : undefined, // Apply transformations only to images
    };
  },
});

// Configure multer with storage and validation
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Limit file size to 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/mov',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
    cb(null, true);
  },
});

// Define the multer middleware for different fields
export const uploadMiddleware = upload.fields([
  { name: 'thumbnail', maxCount: 1 }, // Single thumbnail
  { name: 'images', maxCount: 10 }, // Up to 10 images
  { name: 'video', maxCount: 1 }, // Single video
]);

export default uploadMiddleware;
