/**
 * نظام معالجة الأخطاء الجديد عبر الواجهات
 * يوفر واجهة موحدة لعرض الأخطاء والتنبيهات للمستخدم
 */

class ErrorNotificationSystem {
    constructor() {
        this.notificationContainer = null;
        this.initializeContainer();
        this.notificationQueue = [];
        this.isProcessing = false;
    }

    /**
     * تهيئة حاوية التنبيهات إذا لم تكن موجودة
     */
    initializeContainer() {
        if (!document.getElementById('error-notification-container')) {
            const container = document.createElement('div');
            container.id = 'error-notification-container';
            document.body.appendChild(container);
            this.notificationContainer = container;
        } else {
            this.notificationContainer = document.getElementById('error-notification-container');
        }
    }

    /**
     * عرض رسالة خطأ للمستخدم
     * @param {string} message - نص رسالة الخطأ
     * @param {Object} options - خيارات إضافية
     */
    showError(message, options = {}) {
        const defaultOptions = {
            duration: 5000,
            dismissible: true,
            position: 'top-center',
            icon: 'error'
        };
        
        const settings = { ...defaultOptions, ...options };
        this.createNotification(message, 'error', settings);
    }

    /**
     * عرض رسالة نجاح للمستخدم
     * @param {string} message - نص رسالة النجاح
     * @param {Object} options - خيارات إضافية
     */
    showSuccess(message, options = {}) {
        const defaultOptions = {
            duration: 4000,
            dismissible: true,
            position: 'top-center',
            icon: 'success'
        };
        
        const settings = { ...defaultOptions, ...options };
        this.createNotification(message, 'success', settings);
    }

    /**
     * عرض رسالة تحذير للمستخدم
     * @param {string} message - نص رسالة التحذير
     * @param {Object} options - خيارات إضافية
     */
    showWarning(message, options = {}) {
        const defaultOptions = {
            duration: 5000,
            dismissible: true,
            position: 'top-center',
            icon: 'warning'
        };
        
        const settings = { ...defaultOptions, ...options };
        this.createNotification(message, 'warning', settings);
    }

    /**
     * عرض رسالة معلومات للمستخدم
     * @param {string} message - نص رسالة المعلومات
     * @param {Object} options - خيارات إضافية
     */
    showInfo(message, options = {}) {
        const defaultOptions = {
            duration: 4000,
            dismissible: true,
            position: 'top-center',
            icon: 'info'
        };
        
        const settings = { ...defaultOptions, ...options };
        this.createNotification(message, 'info', settings);
    }

    /**
     * إنشاء عنصر التنبيه وإضافته للحاوية
     * @param {string} message - نص الرسالة
     * @param {string} type - نوع التنبيه (error, success, warning, info)
     * @param {Object} settings - إعدادات التنبيه
     */
    createNotification(message, type, settings) {
        // إضافة التنبيه لقائمة الانتظار
        this.notificationQueue.push({ message, type, settings });
        
        // معالجة قائمة الانتظار إذا لم تكن هناك معالجة جارية
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * معالجة قائمة انتظار التنبيهات
     */
    async processQueue() {
        if (this.notificationQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const { message, type, settings } = this.notificationQueue.shift();

        // إنشاء عنصر التنبيه
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} notification-${settings.position}`;
        
        // إضافة الأيقونة المناسبة
        let iconHtml = '';
        switch (settings.icon) {
            case 'error':
                iconHtml = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'success':
                iconHtml = '<i class="fas fa-check-circle"></i>';
                break;
            case 'warning':
                iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            case 'info':
                iconHtml = '<i class="fas fa-info-circle"></i>';
                break;
            default:
                iconHtml = '';
        }

        // إضافة زر الإغلاق إذا كان التنبيه قابل للإغلاق
        const dismissButton = settings.dismissible ? 
            '<button class="notification-dismiss" aria-label="إغلاق"><i class="fas fa-times"></i></button>' : '';

        // تعيين محتوى التنبيه
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${iconHtml}</div>
                <div class="notification-message">${message}</div>
                ${dismissButton}
            </div>
        `;

        // إضافة التنبيه للحاوية
        this.notificationContainer.appendChild(notification);

        // تأخير قصير قبل إظهار التنبيه (للتأثير البصري)
        await new Promise(resolve => setTimeout(resolve, 10));
        notification.classList.add('show');

        // إضافة مستمع حدث لزر الإغلاق
        if (settings.dismissible) {
            const dismissBtn = notification.querySelector('.notification-dismiss');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => {
                    this.dismissNotification(notification);
                });
            }
        }

        // إغلاق التنبيه تلقائيًا بعد المدة المحددة
        if (settings.duration > 0) {
            setTimeout(() => {
                this.dismissNotification(notification);
            }, settings.duration);
        }

        // معالجة التنبيه التالي في قائمة الانتظار بعد تأخير قصير
        setTimeout(() => {
            this.processQueue();
        }, 300);
    }

    /**
     * إغلاق التنبيه بتأثير بصري
     * @param {HTMLElement} notification - عنصر التنبيه
     */
    dismissNotification(notification) {
        if (!notification || !notification.classList.contains('show')) return;
        
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        // إزالة التنبيه من DOM بعد انتهاء التأثير البصري
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * معالجة أخطاء الشبكة وعرضها للمستخدم
     * @param {Error} error - كائن الخطأ
     * @param {string} customMessage - رسالة مخصصة (اختياري)
     */
    handleNetworkError(error, customMessage = null) {
        console.error('Network Error:', error);
        
        let message = customMessage || 'حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.';
        
        if (error.response) {
            // الخادم استجاب برمز حالة خارج نطاق 2xx
            if (error.response.status === 404) {
                message = 'لم يتم العثور على المورد المطلوب.';
            } else if (error.response.status === 403) {
                message = 'ليس لديك صلاحية للوصول إلى هذا المورد.';
            } else if (error.response.status === 401) {
                message = 'يرجى تسجيل الدخول للوصول إلى هذا المورد.';
            } else if (error.response.status === 500) {
                message = 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقًا.';
            } else if (error.response.data && error.response.data.message) {
                message = error.response.data.message;
            }
        } else if (error.request) {
            // تم إرسال الطلب ولكن لم يتم استلام استجابة
            message = 'لم يتم استلام استجابة من الخادم. يرجى التحقق من اتصالك بالإنترنت.';
        }
        
        this.showError(message);
    }

    /**
     * معالجة أخطاء النماذج وعرضها للمستخدم
     * @param {Object} formErrors - كائن يحتوي على أخطاء النموذج
     * @param {HTMLFormElement} form - عنصر النموذج (اختياري)
     */
    handleFormErrors(formErrors, form = null) {
        // عرض رسالة خطأ عامة
        this.showError('يرجى تصحيح الأخطاء في النموذج للمتابعة.');
        
        // إذا تم تمرير النموذج، أضف رسائل الخطأ بجانب الحقول المعنية
        if (form && formErrors) {
            Object.keys(formErrors).forEach(fieldName => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    // إنشاء أو تحديث رسالة الخطأ
                    let errorElement = field.parentNode.querySelector('.field-error');
                    if (!errorElement) {
                        errorElement = document.createElement('div');
                        errorElement.className = 'field-error';
                        field.parentNode.appendChild(errorElement);
                    }
                    errorElement.textContent = formErrors[fieldName];
                    
                    // إضافة فئة الخطأ للحقل
                    field.classList.add('input-error');
                    
                    // إزالة رسالة الخطأ عند تغيير قيمة الحقل
                    field.addEventListener('input', function() {
                        this.classList.remove('input-error');
                        const errorMsg = this.parentNode.querySelector('.field-error');
                        if (errorMsg) {
                            errorMsg.textContent = '';
                        }
                    }, { once: true });
                }
            });
        }
    }

    /**
     * معالجة أخطاء التحقق من الصحة وعرضها للمستخدم
     * @param {Array} validationErrors - مصفوفة تحتوي على أخطاء التحقق
     */
    handleValidationErrors(validationErrors) {
        if (!validationErrors || validationErrors.length === 0) {
            this.showError('حدث خطأ غير معروف أثناء التحقق من البيانات.');
            return;
        }
        
        // عرض أول خطأ تحقق
        this.showError(validationErrors[0].message || 'يرجى التحقق من صحة البيانات المدخلة.');
        
        // تسجيل جميع أخطاء التحقق في وحدة التحكم للتصحيح
        console.error('Validation Errors:', validationErrors);
    }
}

// إنشاء نسخة عالمية من نظام التنبيهات
const errorNotifier = new ErrorNotificationSystem();

// تصدير النظام للاستخدام في الملفات الأخرى
window.errorNotifier = errorNotifier;
