/**
 * 项目详情页面
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
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { projectsApi, codesApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { timestampToLocal, dateTimeLocalToTimestamp, formatNumber, timestampToDateTimeLocalValue, shortUuid } from '@/lib/utils';
import { ArrowLeft, Plus, Edit, Trash2, Power, PowerOff, RotateCcw, Ban, Copy, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [isDisabled, setIsDisabled] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteCodeDialog, setShowDeleteCodeDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [showBatchDisableDialog, setShowBatchDisableDialog] = useState(false);
  const [batchDisableCount, setBatchDisableCount] = useState<number | null>(null);
  const [batchDisableCountLoading, setBatchDisableCountLoading] = useState(false);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);

  const pageSize = 50;

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadCodes();
    }
  }, [projectId, page, status, isDisabled, search]);

  useEffect(() => {
    if (!showBatchDisableDialog) return;
    let cancelled = false;
    setBatchDisableCount(null);
    setBatchDisableCountLoading(true);

    codesApi
      .batchDisableUnusedCount(projectId, { search: search || undefined })
      .then((res) => {
        if (cancelled) return;
        setBatchDisableCount(res.count);
      })
      .catch(() => {
        if (cancelled) return;
        setBatchDisableCount(null);
      })
      .finally(() => {
        if (cancelled) return;
        setBatchDisableCountLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showBatchDisableDialog, projectId, search]);

  const loadProject = async () => {
    try {
      const data = await projectsApi.get(projectId);
      setProject(data);
    } catch (error: any) {
      toast.error(error.message || '加载项目信息失败');
      router.push('/projects');
    } finally {
      setLoading(false);
    }
  };

  const loadCodes = async () => {
    setCodesLoading(true);
    try {
      const data = await codesApi.list(projectId, {
        page,
        page_size: pageSize,
        status: status ? status === 'true' : undefined,
        is_disabled: isDisabled ? isDisabled === 'true' : undefined,
        search: search || undefined,
      });
      setCodes(data.items);
      setTotal(data.total);
    } catch (error: any) {
      toast.error(error.message || '加载激活码列表失败');
    } finally {
      setCodesLoading(false);
    }
  };

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const count = parseInt(formData.get('count') as string);
    const expiresAt = formData.get('expires_at') as string;

    try {
      await codesApi.generate(projectId, {
        count,
        expires_at: expiresAt ? dateTimeLocalToTimestamp(expiresAt) : null,
      });
      toast.success(`成功生成 ${count} 个激活码`);
      setShowGenerateDialog(false);
      loadCodes();
    } catch (error: any) {
      toast.error(error.message || '生成激活码失败');
    }
  };

  const handleToggleCodeStatus = async (codeId: string, currentDisabled: boolean) => {
    try {
      await codesApi.update(codeId, { is_disabled: !currentDisabled });
      toast.success('操作成功');
      loadCodes();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const handleReactivate = async (codeId: string) => {
    try {
      await codesApi.reactivate(codeId);
      toast.success('重新激活成功');
      loadCodes();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const handleDeleteCode = async () => {
    if (!selectedCodeId) return;
    try {
      await codesApi.delete(projectId, selectedCodeId);
      toast.success('删除成功');
      setShowDeleteCodeDialog(false);
      setSelectedCodeId(null);
      loadCodes();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const handleBatchDisableUnused = async () => {
    try {
      const res = await codesApi.batchDisableUnused(projectId, { search: search || undefined });
      toast.success(res.message || '批量禁用成功');
      loadCodes();
    } catch (error: any) {
      toast.error(error.message || '批量禁用失败');
    }
  };

  const handleToggleProjectStatus = async () => {
    if (!project) return;
    try {
      await projectsApi.update(project.id, { status: !project.status });
      toast.success('项目状态已更新');
      loadProject();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await projectsApi.delete(project.id);
      toast.success('项目已删除');
      router.push('/projects');
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const handleEditProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project) return;
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string) || '';
    const description = (formData.get('description') as string) || '';
    const expiresAt = (formData.get('expires_at') as string) || '';
    const statusChecked = (formData.get('status') as string) === 'on';

    try {
      await projectsApi.update(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        expires_at: expiresAt ? dateTimeLocalToTimestamp(expiresAt) : null,
        status: statusChecked,
      });
      toast.success('项目已更新');
      setShowEditProjectDialog(false);
      loadProject();
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    }
  };

  const getCodeStatusBadge = (code: any) => {
    // 优先级：已过期 > 已禁用 > 已使用 > 未使用
    if (code.is_expired) {
      return <Badge variant="destructive">已过期</Badge>;
    }
    if (code.is_disabled) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-transparent">
          已禁用
        </Badge>
      );
    }
    if (code.status) {
      return (
        <Badge className="bg-green-100 text-green-800 border-transparent">
          已使用
        </Badge>
      );
    }
    return <Badge variant="secondary">未使用</Badge>;
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">项目不存在</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* 面包屑 + 返回 */}
      <div className="mb-6 space-y-2">
        <div className="text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">
            首页
          </Link>{' '}
          /{' '}
          <Link href="/projects" className="hover:text-gray-700">
            项目管理
          </Link>{' '}
          / <span className="text-gray-700">项目详情</span>
        </div>
        <Link href="/projects" className="inline-flex items-center text-indigo-600 hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回项目列表
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
      </div>

      {/* 项目信息卡片 */}
      <Card className="mb-6">
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl">项目基本信息</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditProjectDialog(true)}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Edit className="h-4 w-4" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleProjectStatus}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              {project.status ? (
                <>
                  <PowerOff className="h-4 w-4" />
                  禁用
                </>
              ) : (
                <>
                  <Power className="h-4 w-4" />
                  启用
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteProjectDialog(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">项目ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{project.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">创建时间</dt>
              <dd className="mt-1 text-sm text-gray-900">{timestampToLocal(project.created_at)}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">项目描述</dt>
              <dd className="mt-1 text-sm text-gray-900">{project.description || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">有效期</dt>
              <dd className={`mt-1 text-sm ${project.is_expired ? 'text-red-600' : 'text-gray-900'}`}>
                {project.expires_at ? timestampToLocal(project.expires_at) : '永久有效'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">状态</dt>
              <dd className="mt-1">
                {project.status ? (
                  <Badge className="bg-green-100 text-green-800 border-transparent">启用</Badge>
                ) : (
                  <Badge variant="secondary">禁用</Badge>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 统计信息卡片（4个） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总激活码</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(project.code_count || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已核销</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(project.verified_count || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">未核销</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(project.unverified_count || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已过期</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(project.expired_count || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 激活码管理区域 */}
      <Card>
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl">激活码管理</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              批量生成
            </Button>
            <Button
              onClick={() => setShowBatchDisableDialog(true)}
              variant="outline"
              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
            >
              <Ban className="h-4 w-4" />
              批量禁用未使用
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* 筛选栏 */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="搜索激活码..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">全部状态</option>
                <option value="true">已使用</option>
                <option value="false">未使用</option>
              </select>
            </div>
            <div className="sm:w-48">
              <select
                value={isDisabled}
                onChange={(e) => {
                  setIsDisabled(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">全部</option>
                <option value="true">已禁用</option>
                <option value="false">未禁用</option>
              </select>
            </div>
          </div>

          {/* 激活码表格 */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">ID</TableHead>
                  <TableHead className="w-[240px]">激活码</TableHead>
                  <TableHead className="w-[120px]">状态</TableHead>
                  <TableHead className="w-[180px]">核销时间</TableHead>
                  <TableHead className="w-[160px]">核销用户</TableHead>
                  <TableHead className="w-[180px]">创建时间</TableHead>
                  <TableHead className="w-[240px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      暂无激活码
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono">{shortUuid(code.id)}</TableCell>
                      <TableCell className="font-mono">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(code.code);
                              toast.success('已复制');
                            } catch {
                              toast.error('复制失败，请手动复制');
                            }
                          }}
                          title="点击复制"
                        >
                          {code.code}
                          <Copy className="h-4 w-4" />
                        </button>
                      </TableCell>
                      <TableCell>{getCodeStatusBadge(code)}</TableCell>
                      <TableCell className="text-gray-700">
                        {code.verified_at ? timestampToLocal(code.verified_at) : '-'}
                      </TableCell>
                      <TableCell className="text-gray-700">{code.verified_by || '-'}</TableCell>
                      <TableCell className="text-gray-700">{timestampToLocal(code.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleCodeStatus(code.id, code.is_disabled)}
                            className="text-indigo-600 hover:text-indigo-700"
                            title={code.is_disabled ? '启用' : '禁用'}
                          >
                            {code.is_disabled ? (
                              <>
                                <Power className="h-4 w-4" />
                                启用
                              </>
                            ) : (
                              <>
                                <PowerOff className="h-4 w-4" />
                                禁用
                              </>
                            )}
                          </Button>
                          {code.status && !code.is_disabled && !code.is_expired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCodeId(code.id);
                                setShowReactivateDialog(true);
                              }}
                              className="text-green-600 hover:text-green-700"
                              title="重新激活"
                            >
                              <RotateCcw className="h-4 w-4" />
                              重新激活
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCodeId(code.id);
                              setShowDeleteCodeDialog(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页组件 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">共 {total} 个激活码</div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 mr-2">
                  第 {page} 页，共 {totalPages} 页
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  上一页
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, page - 2);
                  const pageNum = startPage + i;
                  if (pageNum > totalPages) return null;
                  const isCurrent = pageNum === page;
                  return (
                    <Button
                      key={pageNum}
                      variant={isCurrent ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={isCurrent ? 'bg-indigo-600 hover:bg-indigo-700' : undefined}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                  下一页
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 批量生成弹框 */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>批量生成激活码</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gen_count">
                生成数量 <span className="text-red-500">*</span>
              </Label>
              <Input id="gen_count" type="number" name="count" required min="1" max="10000" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen_expires_at">过期时间（可选）</Label>
              <Input id="gen_expires_at" type="datetime-local" name="expires_at" />
              <p className="text-sm text-gray-500">为空则使用项目有效期（如有）。</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowGenerateDialog(false)}>
                取消
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                生成
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 批量禁用确认 */}
      <AlertDialog open={showBatchDisableDialog} onOpenChange={setShowBatchDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量禁用</AlertDialogTitle>
            <AlertDialogDescription>
              将批量禁用当前筛选条件下“未使用且未过期”的激活码。
              {batchDisableCountLoading ? (
                <span> 正在统计数量...</span>
              ) : typeof batchDisableCount === 'number' ? (
                <span> 预计影响 {batchDisableCount} 个激活码。</span>
              ) : (
                <span>（数量统计失败，仍可继续操作）</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={handleBatchDisableUnused}
            >
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重新激活确认 */}
      <AlertDialog
        open={showReactivateDialog}
        onOpenChange={(open) => {
          setShowReactivateDialog(open);
          if (!open) setSelectedCodeId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重新激活</AlertDialogTitle>
            <AlertDialogDescription>
              该激活码将从“已使用”恢复为“未使用”，核销时间与核销用户会被清空。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                if (!selectedCodeId) return;
                handleReactivate(selectedCodeId);
              }}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除激活码确认 */}
      <AlertDialog
        open={showDeleteCodeDialog}
        onOpenChange={(open) => {
          setShowDeleteCodeDialog(open);
          if (!open) setSelectedCodeId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个激活码吗？此操作不可恢复！
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteCode}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除项目确认 */}
      <AlertDialog open={showDeleteProjectDialog} onOpenChange={setShowDeleteProjectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个项目吗？这将删除所有关联的激活码！
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteProject}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑项目弹框 */}
      <Dialog open={showEditProjectDialog} onOpenChange={setShowEditProjectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proj_name">
                项目名称 <span className="text-red-500">*</span>
              </Label>
              <Input id="proj_name" name="name" required maxLength={100} defaultValue={project.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj_desc">项目描述</Label>
              <Textarea id="proj_desc" name="description" rows={4} maxLength={500} defaultValue={project.description || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj_expires">有效期</Label>
              <Input id="proj_expires" type="datetime-local" name="expires_at" defaultValue={timestampToDateTimeLocalValue(project.expires_at)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="proj_status"
                type="checkbox"
                name="status"
                defaultChecked={project.status}
                className="h-4 w-4 rounded border-input text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Label htmlFor="proj_status">启用项目</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowEditProjectDialog(false)}>
                取消
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
