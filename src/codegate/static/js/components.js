/**
 * Toast 和 Modal 组件
 * 
 * Copyright 2026 pfeak
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Toast 通知组件
 */
class Toast {
    /**
     * 显示 Toast 通知
     * 
     * @param {string} message - 消息内容
     * @param {string} type - 类型：success, error, warning, info
     * @param {number} duration - 显示时长（毫秒），默认 3000
     */
    static show(message, type = 'info', duration = 3000) {
        // 创建 Toast 容器（如果不存在）
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }

        // 创建 Toast 元素
        const toast = document.createElement('div');
        
        // 根据类型设置样式
        const typeStyles = {
            success: 'border-green-200 bg-green-50 text-green-800',
            error: 'border-red-200 bg-red-50 text-red-800',
            warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
            info: 'border-blue-200 bg-blue-50 text-blue-800'
        };
        
        const typeIcons = {
            success: 'fa-check-circle text-green-600',
            error: 'fa-exclamation-circle text-red-600',
            warning: 'fa-exclamation-triangle text-yellow-600',
            info: 'fa-info-circle text-blue-600'
        };
        
        const typeCloseColors = {
            success: 'text-green-600 hover:text-green-800',
            error: 'text-red-600 hover:text-red-800',
            warning: 'text-yellow-600 hover:text-yellow-800',
            info: 'text-blue-600 hover:text-blue-800'
        };

        toast.className = `toast-item border rounded-lg shadow-lg px-4 py-3 flex items-center min-w-[300px] max-w-[500px] ${typeStyles[type] || typeStyles.info}`;

        // 添加图标
        const icon = document.createElement('i');
        icon.className = `fas ${typeIcons[type] || typeIcons.info} mr-2`;
        toast.appendChild(icon);

        // 添加消息
        const messageEl = document.createElement('span');
        messageEl.className = 'flex-1';
        messageEl.textContent = message;
        toast.appendChild(messageEl);

        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = `ml-3 ${typeCloseColors[type] || typeCloseColors.info}`;
        closeBtn.innerHTML = '<i class="fas fa-times text-sm"></i>';
        closeBtn.onclick = () => Toast.remove(toast);
        toast.appendChild(closeBtn);

        // 添加到容器
        container.appendChild(toast);

        // 触发显示动画（滑入）
        setTimeout(() => {
            toast.classList.add('animate-slide-in-right');
        }, 10);

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                Toast.remove(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * 移除 Toast
     */
    static remove(toast) {
        // 移除滑入动画，添加淡出动画
        toast.classList.remove('animate-slide-in-right');
        toast.classList.add('animate-fade-out-right');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * 成功提示
     */
    static success(message, duration = 3000) {
        return Toast.show(message, 'success', duration);
    }

    /**
     * 错误提示
     */
    static error(message, duration = 5000) {
        return Toast.show(message, 'error', duration);
    }

    /**
     * 警告提示
     */
    static warning(message, duration = 4000) {
        return Toast.show(message, 'warning', duration);
    }

    /**
     * 信息提示
     */
    static info(message, duration = 3000) {
        return Toast.show(message, 'info', duration);
    }
}

/**
 * Modal 模态框组件
 */
class Modal {
    /**
     * 显示确认对话框
     * 
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {Function} onConfirm - 确认回调
     * @param {Function} onCancel - 取消回调（可选）
     */
    static confirm(title, message, onConfirm, onCancel = null) {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center';
        overlay.id = 'modal-overlay';

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-lg shadow-xl max-w-md w-full mx-4';
        modal.id = 'modal-content';

        // 标题
        const titleEl = document.createElement('div');
        titleEl.className = 'px-6 py-4 border-b border-gray-200';
        titleEl.innerHTML = `<h3 class="text-lg font-semibold text-gray-900">${title}</h3>`;
        modal.appendChild(titleEl);

        // 内容
        const contentEl = document.createElement('div');
        contentEl.className = 'px-6 py-4';
        contentEl.innerHTML = `<p class="text-gray-700">${message}</p>`;
        modal.appendChild(contentEl);

        // 按钮组
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'px-6 py-4 border-t border-gray-200 flex justify-end space-x-3';

        // 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors';
        cancelBtn.textContent = '取消';
        cancelBtn.onclick = () => {
            if (onCancel) onCancel();
            Modal.close(overlay);
        };
        buttonGroup.appendChild(cancelBtn);

        // 确认按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors';
        confirmBtn.textContent = '确认';
        confirmBtn.onclick = () => {
            if (onConfirm) onConfirm();
            Modal.close(overlay);
        };
        buttonGroup.appendChild(confirmBtn);

        modal.appendChild(buttonGroup);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                if (onCancel) onCancel();
                Modal.close(overlay);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // 点击遮罩层关闭
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                if (onCancel) onCancel();
                Modal.close(overlay);
            }
        };

        // 禁止背景滚动
        document.body.style.overflow = 'hidden';

        return overlay;
    }

    /**
     * 关闭模态框
     */
    static close(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        document.body.style.overflow = '';
    }

    /**
     * 显示自定义模态框
     * 
     * @param {string} title - 标题
     * @param {HTMLElement|string} content - 内容（HTML 元素或字符串）
     * @param {Object} options - 选项
     */
    static show(title, content, options = {}) {
        const {
            onClose = null,
            showCloseButton = true,
            width = 'max-w-md',
            closeOnOverlayClick = true
        } = options;

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center';
        overlay.id = 'modal-overlay';

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = `bg-white rounded-lg shadow-xl ${width} w-full mx-4`;
        modal.id = 'modal-content';

        // 标题栏
        const titleBar = document.createElement('div');
        titleBar.className = 'px-6 py-4 border-b border-gray-200 flex items-center justify-between';
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'text-lg font-semibold text-gray-900';
        titleEl.textContent = title;
        titleBar.appendChild(titleEl);

        if (showCloseButton) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'text-gray-400 hover:text-gray-600';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.onclick = () => {
                if (onClose) onClose();
                Modal.close(overlay);
            };
            titleBar.appendChild(closeBtn);
        }

        modal.appendChild(titleBar);

        // 内容
        const contentEl = document.createElement('div');
        contentEl.className = 'px-6 py-4';
        if (typeof content === 'string') {
            contentEl.innerHTML = content;
        } else {
            contentEl.appendChild(content);
        }
        modal.appendChild(contentEl);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                if (onClose) onClose();
                Modal.close(overlay);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // 点击遮罩层关闭
        if (closeOnOverlayClick) {
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    if (onClose) onClose();
                    Modal.close(overlay);
                }
            };
        }

        // 禁止背景滚动
        document.body.style.overflow = 'hidden';

        return { overlay, modal };
    }
}

// 便捷函数
function showToast(message, type = 'info', duration = 3000) {
    return Toast.show(message, type, duration);
}

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        Modal.confirm(
            title,
            message,
            () => resolve(true),
            () => resolve(false)
        );
    });
}

// 导出到全局
window.Toast = Toast;
window.Modal = Modal;
window.showToast = showToast;
window.showConfirmDialog = showConfirmDialog;
