/**
 * 首页（Dashboard）
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

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { dashboardApi } from '@/lib/api';
import { timestampToLocal, formatNumber } from '@/lib/utils';

export default function HomePage() {
  const [stats, setStats] = useState({
    project_count: 0,
    code_count: 0,
    verified_count: 0,
    unverified_count: 0,
  });
  const [recentVerifications, setRecentVerifications] = useState<
    Array<{
      code: string;
      project_name: string;
      verified_at: number;
      verified_by: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await dashboardApi.overview();
      setStats({
        project_count: data.project_count,
        code_count: data.code_count,
        verified_count: data.verified_count,
        unverified_count: data.unverified_count,
      });
      setRecentVerifications(data.recent_verifications || []);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">项目概览</h1>
        <p className="mt-2 text-gray-600">查看系统整体状态和统计数据</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/projects"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="text-sm font-medium text-gray-500">项目总数</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {loading ? '-' : formatNumber(stats.project_count)}
          </div>
        </Link>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">激活码总数</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {loading ? '-' : formatNumber(stats.code_count)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">已使用数量</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {loading ? '-' : formatNumber(stats.verified_count)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">未使用数量</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {loading ? '-' : formatNumber(stats.unverified_count)}
          </div>
        </div>
      </div>

      {/* 最近核销记录 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">最近核销记录</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  激活码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  项目
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  核销时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  核销用户
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : recentVerifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    暂无记录
                  </td>
                </tr>
              ) : (
                recentVerifications.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {log.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.project_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timestampToLocal(log.verified_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.verified_by || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
