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
import { verifyApi, verificationLogsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { timestampToLocal } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  const [logs, setLogs] = useState<any[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const logsPageSize = 20;

  useEffect(() => {
    // 页面加载时聚焦到输入框
    codeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logsPage]);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await verificationLogsApi.list({
        page: logsPage,
        page_size: logsPageSize,
      });
      setLogs(data.items || []);
      setLogsTotal(data.total || 0);
    } catch (e: any) {
      // 后端不可用时不要阻断主流程
      setLogs([]);
      setLogsTotal(0);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const data = await verifyApi.verify(
        code.replace(/\s+/g, '').trim(),
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
        // 刷新历史记录
        setLogsPage(1);
        loadLogs();
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

  const logsTotalPages = Math.ceil(logsTotal / logsPageSize);

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">核销验证</h1>
        <p className="mt-2 text-gray-500">输入激活码进行核销验证</p>
      </div>

      {/* 核销表单 */}
      <Card className="mb-6">
        <CardHeader className="py-4">
          <CardTitle className="text-xl">验证激活码</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                激活码 <span className="text-red-500">*</span>
              </Label>
              <Input
                ref={codeInputRef}
                type="text"
                id="code"
                value={code}
                onChange={(e) => {
                  // 自动去除空格与换行（PRD 要求）
                  setCode(e.target.value.replace(/\s+/g, ''));
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (text) {
                    e.preventDefault();
                    setCode(text.replace(/\s+/g, ''));
                  }
                }}
                required
                disabled={loading}
                className="font-mono"
                placeholder="请输入激活码（支持粘贴）"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verifiedBy">核销用户（可选）</Label>
              <Input
                type="text"
                id="verifiedBy"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                disabled={loading}
                maxLength={100}
                placeholder="请输入核销用户（可选）"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="submit"
                disabled={loading || !code.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    验证中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    验证
                  </>
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={handleReset} disabled={loading}>
                重置
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 验证结果 */}
      {result && (
        <Card className="mb-6">
          <CardHeader className="py-4">
            <CardTitle className="text-xl">验证结果</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
                }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </p>
                {result.success && result.project_name && (
                  <p className="mt-2 text-sm text-green-700">项目名称：{result.project_name}</p>
                )}
                {result.success && result.verified_at && (
                  <p className="mt-1 text-sm text-green-700">核销时间：{timestampToLocal(result.verified_at)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 历史核销记录 */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-xl">历史核销记录</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
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
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      暂无记录
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
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

          {logsTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">共 {logsTotal} 条记录</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 mr-2">
                  第 {logsPage} 页，共 {logsTotalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogsPage((p) => Math.min(logsTotalPages, p + 1))}
                  disabled={logsPage === logsTotalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
