const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dyftlowtv',
  api_key: '611352352948995',
  api_secret: '9rEZK2K5yAafu9hqq4LlmGhMuF8'
});

module.exports = cloudinary;


