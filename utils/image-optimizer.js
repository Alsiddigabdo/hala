/**
 * تحسين أداء الصور وتحويلها إلى WebP
 * 
 * هذا الملف يحتوي على وظائف لتحويل الصور إلى تنسيق WebP
 * وتطبيق تقنية Progressive Images لتحسين أداء الموقع
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const glob = require('glob');

// المجلدات التي تحتوي على الصور
const imageFolders = [
  path.join(__dirname, '../public/images'),
  path.join(__dirname, '../uploads/images'),
  path.join(__dirname, '../uploads/avatars'),
  path.join(__dirname, '../uploads/picjobs')
];

// تنسيقات الصور المدعومة للتحويل
const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif'];

/**
 * تحويل جميع الصور في المجلدات المحددة إلى تنسيق WebP
 */
async function convertImagesToWebP() {
  try {
    console.log('بدء تحويل الصور إلى تنسيق WebP...');
    
    // تثبيت حزمة sharp إذا لم تكن موجودة
    try {
      require('sharp');
    } catch (err) {
      console.log('تثبيت حزمة sharp...');
      require('child_process').execSync('npm install sharp glob --save');
    }
    
    // معالجة كل مجلد
    for (const folder of imageFolders) {
      if (!fs.existsSync(folder)) {
        console.log(`المجلد ${folder} غير موجود، جاري تخطيه...`);
        continue;
      }
      
      console.log(`معالجة الصور في المجلد: ${folder}`);
      
      // البحث عن جميع الصور في المجلد
      const imageFiles = [];
      
      for (const format of supportedFormats) {
        const files = glob.sync(`${folder}/**/*${format}`);
        imageFiles.push(...files);
      }
      
      console.log(`تم العثور على ${imageFiles.length} صورة للتحويل.`);
      
      // تحويل كل صورة
      for (const imageFile of imageFiles) {
        const webpFile = imageFile.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
        
        // تخطي الصور التي تم تحويلها بالفعل
        if (fs.existsSync(webpFile)) {
          console.log(`الصورة ${path.basename(webpFile)} موجودة بالفعل، جاري تخطيها...`);
          continue;
        }
        
        try {
          // إنشاء نسخة WebP
          await sharp(imageFile)
            .webp({ quality: 80, effort: 6 })
            .toFile(webpFile);
          
          // إنشاء نسخة مصغرة للتحميل التدريجي
          const thumbnailFile = webpFile.replace('.webp', '-thumbnail.webp');
          await sharp(imageFile)
            .resize({ width: 20 })
            .blur(5)
            .webp({ quality: 30 })
            .toFile(thumbnailFile);
          
          console.log(`تم تحويل ${path.basename(imageFile)} إلى WebP بنجاح.`);
        } catch (err) {
          console.error(`خطأ في تحويل ${path.basename(imageFile)}: ${err.message}`);
        }
      }
    }
    
    console.log('تم الانتهاء من تحويل الصور إلى تنسيق WebP.');
    return { success: true, message: 'تم تحويل الصور بنجاح' };
  } catch (err) {
    console.error('حدث خطأ أثناء تحويل الصور:', err);
    return { success: false, error: err.message };
  }
}

/**
 * إنشاء ملف CSS لدعم تحميل الصور التدريجي
 */
function createProgressiveImagesCSS() {
  const cssContent = `
/**
 * أنماط CSS لدعم تحميل الصور التدريجي
 */

/* حاوية الصورة التدريجية */
.progressive-image-container {
  position: relative;
  overflow: hidden;
  background-color: #f0f0f0;
}

/* الصورة المصغرة (الضبابية) */
.progressive-image-thumbnail {
  filter: blur(10px);
  transform: scale(1.1);
  transition: visibility 0ms ease 400ms;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* الصورة الكاملة */
.progressive-image-full {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 400ms ease 0ms;
  object-fit: cover;
}

/* عند تحميل الصورة الكاملة */
.progressive-image-loaded .progressive-image-full {
  opacity: 1;
}

.progressive-image-loaded .progressive-image-thumbnail {
  visibility: hidden;
}

/* تأثير التحميل */
.progressive-image-loading::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, #6B48FF, transparent);
  animation: loading 1.5s infinite;
  z-index: 1;
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
`;

  const cssFilePath = path.join(__dirname, '../public/css/progressive-images.css');
  
  try {
    fs.writeFileSync(cssFilePath, cssContent);
    console.log('تم إنشاء ملف CSS لدعم تحميل الصور التدريجي بنجاح.');
    return { success: true, filePath: cssFilePath };
  } catch (err) {
    console.error('حدث خطأ أثناء إنشاء ملف CSS:', err);
    return { success: false, error: err.message };
  }
}

/**
 * إنشاء ملف JavaScript لدعم تحميل الصور التدريجي
 */
function createProgressiveImagesJS() {
  const jsContent = `
/**
 * دعم تحميل الصور التدريجي
 * 
 * هذا الملف يضيف دعم تحميل الصور التدريجي لتحسين تجربة المستخدم وأداء الموقع
 */

document.addEventListener('DOMContentLoaded', function() {
  // تحويل جميع الصور إلى صور تدريجية
  convertImagesToProgressiveImages();
  
  // إضافة مراقب للصور الجديدة التي تضاف للصفحة
  observeNewImages();
});

/**
 * تحويل جميع الصور في الصفحة إلى صور تدريجية
 */
function convertImagesToProgressiveImages() {
  // البحث عن جميع الصور في الصفحة
  const images = document.querySelectorAll('img:not(.progressive-image-thumbnail):not(.progressive-image-full)');
  
  images.forEach(function(img) {
    // تخطي الصور التي تم تحويلها بالفعل
    if (img.closest('.progressive-image-container')) {
      return;
    }
    
    // تخطي الصور الصغيرة جداً أو الأيقونات
    if (img.width < 50 || img.height < 50) {
      return;
    }
    
    // تخطي الصور التي ليس لها مصدر
    if (!img.src) {
      return;
    }
    
    // تحويل الصورة إلى صورة تدريجية
    convertImageToProgressiveImage(img);
  });
}

/**
 * تحويل صورة واحدة إلى صورة تدريجية
 * @param {HTMLImageElement} img - عنصر الصورة
 */
function convertImageToProgressiveImage(img) {
  // الحصول على مصدر الصورة الأصلي
  const originalSrc = img.src;
  
  // إنشاء مصدر الصورة المصغرة
  const thumbnailSrc = originalSrc.replace(/\\.(webp|jpg|jpeg|png|gif)$/i, '-thumbnail.webp');
  
  // إنشاء مصدر الصورة بتنسيق WebP
  const webpSrc = originalSrc.replace(/\\.(jpg|jpeg|png|gif)$/i, '.webp');
  
  // إنشاء حاوية للصورة التدريجية
  const container = document.createElement('div');
  container.className = 'progressive-image-container progressive-image-loading';
  container.style.width = img.width + 'px';
  container.style.height = img.height + 'px';
  
  // نسخ خصائص الصورة الأصلية
  if (img.alt) container.setAttribute('aria-label', img.alt);
  if (img.id) container.id = 'container-' + img.id;
  if (img.className) container.className += ' ' + img.className;
  
  // إنشاء الصورة المصغرة
  const thumbnail = document.createElement('img');
  thumbnail.className = 'progressive-image-thumbnail';
  thumbnail.src = thumbnailSrc;
  thumbnail.alt = '';
  thumbnail.setAttribute('aria-hidden', 'true');
  
  // إنشاء الصورة الكاملة
  const fullImage = document.createElement('img');
  fullImage.className = 'progressive-image-full';
  fullImage.alt = img.alt || '';
  
  // استخدام تنسيق WebP مع fallback للصورة الأصلية
  const picture = document.createElement('picture');
  
  // إضافة مصدر WebP
  const sourceWebp = document.createElement('source');
  sourceWebp.srcset = webpSrc;
  sourceWebp.type = 'image/webp';
  picture.appendChild(sourceWebp);
  
  // إضافة مصدر الصورة الأصلية كـ fallback
  const sourceOriginal = document.createElement('source');
  sourceOriginal.srcset = originalSrc;
  picture.appendChild(sourceOriginal);
  
  // إضافة الصورة الكاملة إلى العنصر picture
  picture.appendChild(fullImage);
  
  // إضافة الصورة المصغرة والصورة الكاملة إلى الحاوية
  container.appendChild(thumbnail);
  container.appendChild(picture);
  
  // استبدال الصورة الأصلية بالحاوية
  img.parentNode.replaceChild(container, img);
  
  // تحميل الصورة الكاملة
  fullImage.src = originalSrc;
  
  // عند اكتمال تحميل الصورة الكاملة
  fullImage.onload = function() {
    container.classList.remove('progressive-image-loading');
    container.classList.add('progressive-image-loaded');
  };
  
  // في حالة فشل تحميل الصورة المصغرة
  thumbnail.onerror = function() {
    thumbnail.style.display = 'none';
  };
  
  // في حالة فشل تحميل الصورة الكاملة
  fullImage.onerror = function() {
    container.classList.remove('progressive-image-loading');
  };
}

/**
 * مراقبة إضافة صور جديدة للصفحة
 */
function observeNewImages() {
  // إنشاء مراقب للتغييرات في DOM
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // البحث عن الصور الجديدة
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // البحث عن الصور داخل العنصر المضاف
          const images = node.querySelectorAll('img:not(.progressive-image-thumbnail):not(.progressive-image-full)');
          images.forEach(convertImageToProgressiveImage);
          
          // التحقق مما إذا كان العنصر المضاف هو صورة
          if (node.tagName === 'IMG' && !node.classList.contains('progressive-image-thumbnail') && !node.classList.contains('progressive-image-full')) {
            convertImageToProgressiveImage(node);
          }
        }
      });
    });
  });
  
  // بدء المراقبة
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
`;

  const jsFilePath = path.join(__dirname, '../public/js/progressive-images.js');
  
  try {
    fs.writeFileSync(jsFilePath, jsContent);
    console.log('تم إنشاء ملف JavaScript لدعم تحميل الصور التدريجي بنجاح.');
    return { success: true, filePath: jsFilePath };
  } catch (err) {
    console.error('حدث خطأ أثناء إنشاء ملف JavaScript:', err);
    return { success: false, error: err.message };
  }
}

// تصدير الوظائف
module.exports = {
  convertImagesToWebP,
  createProgressiveImagesCSS,
  createProgressiveImagesJS
};

// تنفيذ التحويل إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  console.log('بدء تحسين أداء الصور...');
  
  // تحويل الصور إلى WebP
  convertImagesToWebP()
    .then(() => {
      // إنشاء ملفات CSS و JavaScript
      createProgressiveImagesCSS();
      createProgressiveImagesJS();
      
      console.log('تم الانتهاء من تحسين أداء الصور بنجاح.');
    })
    .catch(err => {
      console.error('حدث خطأ:', err);
    });
}
