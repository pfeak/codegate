/**
 * 个人管理页面
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
import MainLayout from '@/components/layout/MainLayout';
import { authApi } from '@/lib/api';
import { timestampToLocal } from '@/lib/utils';

export default function ProfilePage() {
  const [adminInfo, setAdminInfo] = useState<{
    username: string;
    created_at: number;
    last_login_at: number | null;
  } | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    loadAdminInfo();
  }, []);

  const loadAdminInfo = async () => {
    try {
      const data = await authApi.me();
      setAdminInfo(data);
    } catch (error) {
      console.error('加载管理员信息错误:', error);
    } finally {
      setInfoLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      setSuccess('密码修改成功');
      // 清空表单
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">个人管理</h1>

        {/* 个人信息卡片 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">个人信息</h2>
          {infoLoading ? (
            <div className="text-gray-500">加载中...</div>
          ) : adminInfo ? (
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 w-24">用户名：</span>
                <span className="text-sm text-gray-900">{adminInfo.username}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 w-24">创建时间：</span>
                <span className="text-sm text-gray-900">
                  {timestampToLocal(adminInfo.created_at)}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 w-24">最后登录：</span>
                <span className="text-sm text-gray-900">
                  {timestampToLocal(adminInfo.last_login_at)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">加载失败</div>
          )}
        </div>

        {/* 修改密码卡片 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">修改密码</h2>
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
              <p className="mt-1 text-sm text-gray-500">至少8位，包含字母和数字</p>
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

            {/* 成功提示 */}
            {success && (
              <div className="text-green-600 text-sm">{success}</div>
            )}

            {/* 修改密码按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '修改中...' : '修改密码'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
