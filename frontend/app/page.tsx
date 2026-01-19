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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
        <p className="mt-2 text-gray-500">查看系统整体状态和统计数据</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/projects" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">项目总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? '-' : formatNumber(stats.project_count)}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">激活码总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '-' : formatNumber(stats.code_count)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已使用数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '-' : formatNumber(stats.verified_count)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">未使用数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '-' : formatNumber(stats.unverified_count)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近核销记录 */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-xl">最近核销记录</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">激活码</TableHead>
                  <TableHead className="w-[240px]">项目</TableHead>
                  <TableHead className="w-[180px]">核销时间</TableHead>
                  <TableHead className="w-[180px]">核销用户</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : recentVerifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      暂无记录
                    </TableCell>
                  </TableRow>
                ) : (
                  recentVerifications.map((log, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer"
                      onClick={() => {
                        if (log.project_id) {
                          window.location.href = `/projects/${log.project_id}`;
                        }
                      }}
                    >
                      <TableCell className="font-mono">{log.code}</TableCell>
                      <TableCell className="text-gray-700">{log.project_name || '-'}</TableCell>
                      <TableCell className="text-gray-700">{timestampToLocal(log.verified_at)}</TableCell>
                      <TableCell className="text-gray-700">{log.verified_by || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
