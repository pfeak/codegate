/**
 * 首次登录修改密码页面
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

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 检查是否使用初始密码
    authApi.checkInitialPassword()
      .then((data) => {
        if (!data.is_initial_password) {
          // 已修改过密码，跳转到首页
          router.push('/');
        }
      })
      .catch(() => {
        // 未登录，跳转到登录页
        router.push('/login');
      });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // 前端验证
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword.length < 8) {
      setError('新密码长度至少8位');
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword)) {
      setError('新密码必须包含字母');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('新密码必须包含数字');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('确认密码与新密码不一致');
      return;
    }

    setLoading(true);

    try {
      await authApi.changePassword(oldPassword, newPassword, confirmPassword);
      // 修改成功，跳转到首页
      router.push('/');
    } catch (err: any) {
      setError(err.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full mx-4">
        {/* 修改密码表单卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              首次登录 - 请修改密码
            </h1>
            <p className="text-gray-600">为了您的账户安全，请修改初始密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 当前密码 */}
            <div>
              <label
                htmlFor="old_password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                当前密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="old_password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="请输入当前密码"
              />
            </div>

            {/* 新密码 */}
            <div>
              <label
                htmlFor="new_password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                新密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="new_password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="至少8位，包含字母和数字"
              />
              <p className="mt-1 text-sm text-gray-500">
                至少8位，包含字母和数字
              </p>
            </div>

            {/* 确认新密码 */}
            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                确认新密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirm_password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="请再次输入新密码"
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            {/* 修改密码按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '修改中...' : '修改密码'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
