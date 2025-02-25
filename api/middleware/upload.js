import multer from 'multer';

// Use memory storage to store the uploaded files in memory
const storage = multer.memoryStorage();

const upload = multer({ storage });

export default upload;
