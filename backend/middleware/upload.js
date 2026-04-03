/**
 * 文件上传中间件
 * 使用 multer 库处理文件上传，配置了存储路径、文件命名规则、文件类型过滤和大小限制
 * 目前仅用于场馆图片上传
 */

const multer = require('multer'); // multer：处理 multipart/form-data 格式的文件上传
const path = require('path');     // path：处理文件路径
const fs = require('fs');         // fs：文件系统操作

// 确保上传目录存在，如果不存在则递归创建
const uploadDir = 'uploads/venues';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // recursive: true 表示会自动创建父目录
}

// 配置文件存储方式（存到磁盘）
const storage = multer.diskStorage({
  // 设置文件保存的目标目录
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  // 设置文件名：使用 "时间戳-随机数.扩展名" 的格式，避免文件名重复
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // 保留原始文件的扩展名
  }
});

// 文件类型过滤器：只允许上传图片文件
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/; // 允许的图片格式
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase()); // 检查文件扩展名
  const mimetype = allowedTypes.test(file.mimetype); // 检查文件的 MIME 类型

  if (mimetype && extname) {
    return cb(null, true);  // 扩展名和 MIME 类型都符合，允许上传
  } else {
    cb(new Error('只允许上传图片文件')); // 不符合要求，拒绝上传
  }
};

// 创建 multer 上传实例，整合存储、大小限制和文件过滤配置
const upload = multer({
  storage: storage,                         // 存储配置
  limits: { fileSize: 5 * 1024 * 1024 },   // 文件大小限制：最大 5MB
  fileFilter: fileFilter                    // 文件类型过滤
});

module.exports = upload;
