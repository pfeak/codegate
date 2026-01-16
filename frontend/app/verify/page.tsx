/**
 * 核销验证页面
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

import { useState, FormEvent, useRef, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { verifyApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { timestampToLocal } from '@/lib/utils';

export default function VerifyPage() {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    project_name?: string;
    verified_at?: number;
  } | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 页面加载时聚焦到输入框
    codeInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const data = await verifyApi.verify(
        code.trim(),
        verifiedBy.trim() || null
      );
      
      setResult({
        success: data.success,
        message: data.message,
        project_name: data.project_name,
        verified_at: data.verified_at,
      });

      if (data.success) {
        toast.success(data.message || '核销成功');
        // 清空输入框
        setCode('');
        setVerifiedBy('');
        // 重新聚焦到输入框
        setTimeout(() => {
          codeInputRef.current?.focus();
        }, 100);
      } else {
        toast.error(data.message || '核销失败');
      }
    } catch (error: any) {
      const errorMessage = error.message || '核销失败，请重试';
      setResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCode('');
    setVerifiedBy('');
    setResult(null);
    codeInputRef.current?.focus();
  };

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">核销验证</h1>
        <p className="mt-2 text-gray-600">输入激活码进行核销验证</p>
      </div>

      {/* 核销表单 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">验证激活码</h2>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 激活码输入 */}
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                激活码 <span className="text-red-500">*</span>
              </label>
              <input
                ref={codeInputRef}
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                placeholder="请输入激活码"
                autoComplete="off"
              />
            </div>

            {/* 核销用户（可选） */}
            <div>
              <label
                htmlFor="verifiedBy"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                核销用户（可选）
              </label>
              <input
                type="text"
                id="verifiedBy"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                disabled={loading}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="请输入核销用户（可选）"
                autoComplete="off"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    验证
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                重置
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 验证结果 */}
      {result && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">验证结果</h2>
          </div>
          <div className="px-6 py-6">
            <div
              className={`flex items-start space-x-3 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.message}
                </p>
                {result.success && result.project_name && (
                  <p className="mt-2 text-sm text-green-700">
                    项目名称：{result.project_name}
                  </p>
                )}
                {result.success && result.verified_at && (
                  <p className="mt-1 text-sm text-green-700">
                    核销时间：{timestampToLocal(result.verified_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
