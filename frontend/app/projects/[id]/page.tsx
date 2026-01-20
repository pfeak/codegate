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

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { projectsApi, codesApi, DEFAULT_PAGE_SIZE } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage, timestampToLocal, dateTimeLocalToTimestamp, formatNumber, timestampToDateTimeLocalValue, shortUuid } from '@/lib/utils';
import { ArrowLeft, Plus, Edit, Trash2, Power, PowerOff, RotateCcw, Ban, Copy, Search, Loader2, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
  const [statusFilter, setStatusFilter] = useState<string>(''); // 统一的状态筛选：''=全部, 'unused'=未使用, 'used'=已使用, 'disabled'=已禁用, 'expired'=已过期
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
  const [showCodeDetailDialog, setShowCodeDetailDialog] = useState(false);
  const [codeDetailLoading, setCodeDetailLoading] = useState(false);
  const [codeDetail, setCodeDetail] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(new Set()); // 激活码列表中的复制状态
  const [sortBy, setSortBy] = useState<'created_at' | 'verified_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [isNeverExpiresEdit, setIsNeverExpiresEdit] = useState(false);
  const [editStatus, setEditStatus] = useState(false);

  const pageSize = DEFAULT_PAGE_SIZE;

  const filterParams = useCallback((filter: string) => {
    let status: boolean | undefined = undefined;
    let is_disabled: boolean | undefined = undefined;
    let is_expired: boolean | undefined = undefined;

    switch (filter) {
      case 'unused':
        status = false;
        is_disabled = false;
        is_expired = false;
        break;
      case 'used':
        status = true;
        is_disabled = false;
        is_expired = false;
        break;
      case 'disabled':
        is_disabled = true;
        is_expired = false;
        break;
      case 'expired':
        is_expired = true;
        break;
      default:
        break;
    }
    return { status, is_disabled, is_expired };
  }, []);

  const applySort = useCallback(
    (list: any[]) => {
      const sorted = [...list].sort((a, b) => {
        const key = sortBy;
        const av = a[key] ?? 0;
        const bv = b[key] ?? 0;
        if (av === bv) return 0;
        const diff = av > bv ? 1 : -1;
        return sortOrder === 'asc' ? diff : -diff;
      });
      return sorted;
    },
    [sortBy, sortOrder],
  );

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsApi.get(projectId);
      setProject(data);
    } catch (error: any) {
      toast.error(getErrorMessage(error, '加载项目信息失败，请稍后重试'));
      router.push('/projects');
    } finally {
      setLoading(false);
    }
  }, [projectId, router, toast]);

  const loadCodes = useCallback(async () => {
    setCodesLoading(true);
    try {
      const { status, is_disabled, is_expired } = filterParams(statusFilter);
      const data = await codesApi.list(projectId, {
        page,
        page_size: pageSize,
        status,
        is_disabled,
        is_expired,
        search: search || undefined,
      });
      setCodes(applySort(data.items));
      setTotal(data.total);
    } catch (error: any) {
      toast.error(getErrorMessage(error, '加载激活码列表失败，请稍后重试'));
    } finally {
      setCodesLoading(false);
    }
  }, [applySort, filterParams, page, pageSize, projectId, search, statusFilter, toast]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, loadProject]);

  useEffect(() => {
    if (projectId) {
      loadCodes();
    }
  }, [projectId, loadCodes]);

  useEffect(() => {
    setCodes((prev) => applySort(prev));
  }, [applySort]);

  useEffect(() => {
    if (!showBatchDisableDialog) return;
    let cancelled = false;
    setBatchDisableCount(null);
    setBatchDisableCountLoading(true);

    const { status, is_disabled, is_expired } = filterParams(statusFilter);
    codesApi
      .batchDisableUnusedCount(projectId, {
        search: search || undefined,
        status,
        is_disabled,
        is_expired,
      })
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
  }, [filterParams, projectId, search, showBatchDisableDialog, statusFilter]);

  const upsertCodeInList = (nextCode: any) => {
    setCodes((prev) => prev.map((item) => (item.id === nextCode.id ? { ...item, ...nextCode } : item)));
  };

  const removeCodeFromList = (codeId: string) => {
    setCodes((prev) => prev.filter((item) => item.id !== codeId));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const count = parseInt(formData.get('count') as string);
    const expiresAt = formData.get('expires_at') as string;

    setGenerateLoading(true);
    try {
      const generatedCodes = await codesApi.generate(projectId, {
        count,
        expires_at: expiresAt ? dateTimeLocalToTimestamp(expiresAt) : null,
      });
      // PRD：批量生成成功文案，使用实际生成的数量
      const actualCount = generatedCodes?.length || count;
      toast.success(`批量生成成功：共生成 ${actualCount} 个激活码`);
      setShowGenerateDialog(false);
      // 操作成功后，按 PRD 要求重新拉取激活码列表（局部刷新）
      await loadCodes();
    } catch (error: any) {
      const msg = getErrorMessage(error, '批量生成失败：请稍后重试');
      if (msg.startsWith('批量生成失败：')) {
        toast.error(msg);
      } else {
        toast.error(`批量生成失败：${msg}`);
      }
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleToggleCodeStatus = async (codeId: string, currentDisabled: boolean) => {
    try {
      await codesApi.update(codeId, { is_disabled: !currentDisabled });
      // PRD：单个激活码启用/禁用成功文案
      toast.success(!currentDisabled ? '禁用成功' : '启用成功');
      // 为保证筛选/统计等完全一致，操作后重新加载列表
      await loadCodes();
    } catch (error: any) {
      const msg = getErrorMessage(error, '操作失败：请稍后重试');
      if (msg.startsWith('操作失败：')) {
        toast.error(msg);
      } else {
        toast.error(`操作失败：${msg}`);
      }
    }
  };

  const handleReactivate = async (codeId: string) => {
    try {
      await codesApi.reactivate(codeId);
      // PRD：激活成功文案
      toast.success('激活成功');
      setShowReactivateDialog(false);
      setSelectedCodeId(null);
      // 重新拉取激活码列表，确保状态/统计同步
      await loadCodes();
    } catch (error: any) {
      const msg = getErrorMessage(error, '操作失败：请稍后重试');
      if (msg.startsWith('操作失败：')) {
        toast.error(msg);
      } else {
        toast.error(`操作失败：${msg}`);
      }
    }
  };

  const handleViewCodeDetail = async (codeId: string) => {
    setSelectedCodeId(codeId);
    setShowCodeDetailDialog(true);
    setCodeDetailLoading(true);
    try {
      const detail = await codesApi.get(projectId, codeId);
      setCodeDetail(detail);
    } catch (error: any) {
      // PRD 4.5.1：失败提示格式：加载激活码详情失败：{detail || "请稍后重试"}
      const msg = getErrorMessage(error, '请稍后重试');
      const errorMsg = msg.startsWith('加载激活码详情失败：') ? msg : `加载激活码详情失败：${msg}`;
      toast.error(errorMsg);
      setShowCodeDetailDialog(false);
    } finally {
      setCodeDetailLoading(false);
    }
  };

  const handleDeleteCode = async () => {
    if (!selectedCodeId) return;
    try {
      await codesApi.delete(projectId, selectedCodeId);
      toast.success('删除成功');
      setShowDeleteCodeDialog(false);
      setSelectedCodeId(null);
      // 简化为重新请求列表，避免本地分页/筛选逻辑出错
      await loadCodes();
    } catch (error: any) {
      const msg = getErrorMessage(error, '删除失败：请稍后重试');
      if (msg.startsWith('删除失败：')) {
        toast.error(msg);
      } else {
        toast.error(`删除失败：${msg}`);
      }
    }
  };

  const handleBatchDisableUnused = async () => {
    try {
      const { status, is_disabled, is_expired } = filterParams(statusFilter);
      const res = await codesApi.batchDisableUnused(projectId, {
        search: search || undefined,
        status,
        is_disabled,
        is_expired,
      });
      // PRD：批量禁用成功文案格式：批量禁用成功：已禁用 {disabled_count} 个激活码
      toast.success(`批量禁用成功：已禁用 ${res.disabled_count} 个激活码`);
      setShowBatchDisableDialog(false);
      // 批量操作后，直接按当前筛选条件重新拉取列表
      await loadCodes();
    } catch (error: any) {
      const msg = getErrorMessage(error, '批量禁用失败：请稍后重试');
      if (msg.startsWith('批量禁用失败：')) {
        toast.error(msg);
      } else {
        toast.error(`批量禁用失败：${msg}`);
      }
    }
  };

  const handleToggleProjectStatus = async () => {
    if (!project) return;
    try {
      const updated = await projectsApi.update(project.id, { status: !project.status });
      // PRD：启用/禁用项目成功文案
      toast.success(!project.status ? '已启用项目' : '已禁用项目');
      setProject(updated);
    } catch (error: any) {
      const msg = getErrorMessage(error, '操作失败：请稍后重试');
      if (msg.startsWith('操作失败：')) {
        toast.error(msg);
      } else {
        toast.error(`操作失败：${msg}`);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await projectsApi.delete(project.id);
      toast.success('删除成功');
      router.push('/projects');
    } catch (error: any) {
      const msg = getErrorMessage(error, '删除失败：请稍后重试');
      if (msg.startsWith('删除失败：')) {
        toast.error(msg);
      } else {
        toast.error(`删除失败：${msg}`);
      }
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
      const updated = await projectsApi.update(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        expires_at: expiresAt ? dateTimeLocalToTimestamp(expiresAt) : null,
        status: statusChecked,
      });
      // PRD：项目编辑成功统一为“保存成功”
      toast.success('保存成功');
      setShowEditProjectDialog(false);
      setProject(updated);
    } catch (error: any) {
      const msg = getErrorMessage(error, '保存失败：请稍后重试');
      if (msg.startsWith('保存失败：')) {
        toast.error(msg);
      } else {
        toast.error(`保存失败：${msg}`);
      }
    }
  };

  const getCodeStatusBadge = (code: any) => {
    // 优先级：已过期 > 已禁用 > 已使用 > 未使用
    if (code.is_expired) {
      return <Badge variant="destructive">已过期</Badge>;
    }
    if (code.is_disabled) {
      // 已禁用：中性灰调，避免与未使用同色
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">
          已禁用
        </Badge>
      );
    }
    if (code.status) {
      return (
        <Badge variant="default">
          已使用
        </Badge>
      );
    }
    // 未使用：浅色描边，和禁用区分
    return (
      <Badge variant="outline" className="border-primary/30 text-primary/80">
        未使用
      </Badge>
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">项目不存在</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* 顶部区域：标题 + 返回 */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
          <Link href="/projects" className="inline-flex items-center text-primary hover:text-primary/80">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目列表
          </Link>
        </div>
      </div>

      {/* 项目信息卡片 */}
      <Card className="mb-6">
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/80">基本信息</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (project) {
                  setIsNeverExpiresEdit(!project.expires_at);
                  setEditStatus(project.status);
                }
                setShowEditProjectDialog(true);
              }}
            >
              <Edit className="h-4 w-4" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleProjectStatus}
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
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">项目ID</dt>
              <dd className="mt-1 text-sm text-foreground font-mono">{project.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">创建时间</dt>
              <dd className="mt-1 text-sm text-foreground">{timestampToLocal(project.created_at)}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">项目描述</dt>
              <dd className="mt-1 text-sm text-foreground">{project.description || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">有效期</dt>
              <dd className={`mt-1 text-sm ${project.is_expired ? 'text-destructive' : 'text-foreground'}`}>
                {project.expires_at ? timestampToLocal(project.expires_at) : '永久有效'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">状态</dt>
              <dd className="mt-1">
                {project.status ? (
                  <Badge variant="default">启用</Badge>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">总激活码</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(project.code_count || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已核销</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(project.verified_count || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">未核销</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(project.unverified_count || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已过期</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(project.expired_count || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 激活码管理区域 */}
      <Card>
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/80">激活码管理</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowGenerateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              批量生成
            </Button>
            <Button
              onClick={() => setShowBatchDisableDialog(true)}
              variant="outline"
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
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="搜索激活码..."
                  className="pl-9 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">全部</option>
                <option value="unused">未使用</option>
                <option value="used">已使用</option>
                <option value="disabled">已禁用</option>
                <option value="expired">已过期</option>
              </select>
            </div>
          </div>

          {/* 激活码表格 */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead className="w-[200px]">激活码</TableHead>
                  <TableHead className="w-[120px]">状态</TableHead>
                  <TableHead className="w-[150px]">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-sm font-medium text-foreground"
                      onClick={() => {
                        setSortBy('verified_at');
                        setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                      }}
                    >
                      核销时间
                      {sortBy === 'verified_at' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </TableHead>
                  <TableHead className="w-[150px]">核销用户</TableHead>
                  <TableHead className="w-[150px]">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-sm font-medium text-foreground"
                      onClick={() => {
                        setSortBy('created_at');
                        setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                      }}
                    >
                      创建时间
                      {sortBy === 'created_at' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </TableHead>
                  <TableHead className="w-[200px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-all duration-200"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(code.code);
                              setCopiedCodes((prev) => new Set(prev).add(code.id));
                              toast.success('已复制');
                            } catch {
                              toast.error('复制失败，请手动复制');
                            }
                          }}
                          title="点击复制"
                        >
                          {code.code}
                          {copiedCodes.has(code.id) ? (
                            <Check className="h-4 w-4 text-green-600 scale-110" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>{getCodeStatusBadge(code)}</TableCell>
                      <TableCell className="text-foreground">
                        {code.verified_at ? timestampToLocal(code.verified_at) : '-'}
                      </TableCell>
                      <TableCell className="text-foreground">{code.verified_by || '-'}</TableCell>
                      <TableCell className="text-foreground">{timestampToLocal(code.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleViewCodeDetail(code.id)}
                            className="h-8 px-2 gap-1 text-sm leading-none"
                          >
                            查看详情
                          </Button>
                          {/* 禁用按钮：仅对"未使用且未禁用且未过期"的激活码显示 */}
                          {!code.status && !code.is_disabled && !code.is_expired && (
                            <Button
                              variant="ghost"
                              onClick={() => handleToggleCodeStatus(code.id, code.is_disabled)}
                              title="禁用"
                              className="h-8 px-2 gap-1 text-sm leading-none"
                            >
                              <PowerOff className="h-4 w-4" />
                              禁用
                            </Button>
                          )}
                          {/* 启用按钮：仅对"已禁用且未过期"的激活码显示 */}
                          {code.is_disabled && !code.is_expired && (
                            <Button
                              variant="ghost"
                              onClick={() => handleToggleCodeStatus(code.id, code.is_disabled)}
                              title="启用"
                              className="h-8 px-2 gap-1 text-sm leading-none"
                            >
                              <Power className="h-4 w-4" />
                              启用
                            </Button>
                          )}
                          {code.status && !code.is_disabled && !code.is_expired && (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setSelectedCodeId(code.id);
                                setShowReactivateDialog(true);
                              }}
                              title="激活"
                              className="h-8 px-2 gap-1 text-sm leading-none"
                            >
                              <RotateCcw className="h-4 w-4" />
                              激活
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedCodeId(code.id);
                              setShowDeleteCodeDialog(true);
                            }}
                            className="h-8 px-2 gap-1 text-sm leading-none text-destructive hover:text-destructive/80"
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
            <div className="text-sm text-foreground">共 {total} 个激活码</div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground mr-2">
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
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>批量生成激活码</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gen_count">
                生成数量 <span className="text-destructive">*</span>
              </Label>
              <Input id="gen_count" type="number" name="count" required min="1" max="10000" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen_expires_at">过期时间（可选）</Label>
              <Input id="gen_expires_at" type="datetime-local" name="expires_at" />
              <p className="text-sm text-muted-foreground">为空则使用项目有效期（如有）。</p>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setShowGenerateDialog(false)}
                disabled={generateLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={generateLoading}>
                {generateLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  '生成'
                )}
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
              确定要禁用当前筛选条件下的所有未使用激活码吗？
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
              onClick={handleBatchDisableUnused}
            >
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 激活确认 */}
      <AlertDialog
        open={showReactivateDialog}
        onOpenChange={(open) => {
          setShowReactivateDialog(open);
          if (!open) setSelectedCodeId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认激活</AlertDialogTitle>
            <AlertDialogDescription>
              该激活码将从“已使用”恢复为“未使用”，核销时间与核销用户会被清空。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
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
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteCode}>
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
              确定要删除该项目及其所有关联的激活码吗？此操作无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteProject}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑项目弹框 */}
      <Dialog 
        open={showEditProjectDialog} 
        onOpenChange={(open) => {
          setShowEditProjectDialog(open);
          if (!open) {
            setIsNeverExpiresEdit(false);
            setEditStatus(false);
          }
        }}
      >
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
          </DialogHeader>
          {project && (
            <form onSubmit={handleEditProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proj_name">
                  项目名称 <span className="text-destructive">*</span>
                </Label>
                <Input id="proj_name" name="name" required maxLength={100} defaultValue={project.name} className="placeholder:text-muted-foreground/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj_desc">项目描述</Label>
                <Textarea id="proj_desc" name="description" rows={4} maxLength={500} defaultValue={project.description || ''} className="placeholder:text-muted-foreground/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj_expires">有效期</Label>
                <div className="relative inline-flex w-full max-w-sm">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                  <Input 
                    id="proj_expires" 
                    type="datetime-local" 
                    name="expires_at" 
                    defaultValue={timestampToDateTimeLocalValue(project.expires_at)}
                    disabled={isNeverExpiresEdit}
                    min={new Date().toISOString().slice(0, 16)}
                    className="pl-10 pr-3 w-auto min-w-[240px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="proj_never_expires"
                    checked={isNeverExpiresEdit}
                    onCheckedChange={(checked) => {
                      setIsNeverExpiresEdit(checked);
                      const input = document.getElementById('proj_expires') as HTMLInputElement;
                      if (input) {
                        if (checked) {
                          input.value = '';
                        } else if (project.expires_at) {
                          input.value = timestampToDateTimeLocalValue(project.expires_at);
                        }
                      }
                    }}
                  />
                  <Label htmlFor="proj_never_expires">永不过期</Label>
                </div>
                <div className="space-y-1">
                  {project.is_expired && (
                    <p className="text-sm text-destructive">
                      该项目已过期
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    留空或选择未来日期，项目将在指定时间后过期
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="proj_status"
                  checked={editStatus}
                  onCheckedChange={setEditStatus}
                />
                <Label htmlFor="proj_status">启用项目</Label>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setShowEditProjectDialog(false);
                    setIsNeverExpiresEdit(false);
                    setEditStatus(false);
                  }}
                >
                  取消
                </Button>
                <Button type="submit">
                  保存
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 激活码详情弹框 */}
      <Dialog
        open={showCodeDetailDialog}
        onOpenChange={(open) => {
          setShowCodeDetailDialog(open);
          if (!open) {
            setSelectedCodeId(null);
            setCodeDetail(null);
            setCopiedId(false);
            setCopiedCode(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>激活码详情</DialogTitle>
          </DialogHeader>
          {codeDetailLoading ? (
            <div className="text-muted-foreground">加载中...</div>
          ) : codeDetail ? (
            <div className="space-y-4 text-sm text-foreground">
              {/* ID */}
              <div className="flex items-center gap-x-4">
                <span className="text-muted-foreground w-24 text-right flex-shrink-0">ID</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono truncate" title={codeDetail.id}>
                    {codeDetail.id}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(codeDetail.id);
                        setCopiedId(true);
                        toast.success('已复制');
                      } catch {
                        toast.error('复制失败，请手动复制');
                      }
                    }}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-all duration-200"
                    title="复制ID"
                  >
                    {copiedId ? (
                      <Check className="h-4 w-4 text-green-600 scale-110" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {/* 激活码 */}
              <div className="flex items-center gap-x-4">
                <span className="text-muted-foreground w-24 text-right flex-shrink-0">激活码</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono truncate" title={codeDetail.code}>
                    {codeDetail.code}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(codeDetail.code);
                        setCopiedCode(true);
                        toast.success('已复制');
                      } catch {
                        toast.error('复制失败，请手动复制');
                      }
                    }}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-all duration-200"
                    title="复制激活码"
                  >
                    {copiedCode ? (
                      <Check className="h-4 w-4 text-green-600 scale-110" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {/* 状态 */}
              <div className="flex items-center gap-x-4">
                <span className="text-muted-foreground w-24 text-right flex-shrink-0">状态</span>
                <span>{getCodeStatusBadge(codeDetail)}</span>
              </div>
              {/* 核销时间 */}
              <div className="flex items-center gap-x-4">
                <span className="text-muted-foreground w-24 text-right flex-shrink-0">核销时间</span>
                <span>{codeDetail.verified_at ? timestampToLocal(codeDetail.verified_at) : '-'}</span>
              </div>
              {/* 核销用户 */}
              <div className="flex items-center gap-x-4">
                <span className="text-muted-foreground w-24 text-right flex-shrink-0">核销用户</span>
                <span>{codeDetail.verified_by || '-'}</span>
              </div>
              {/* 创建时间 */}
              <div className="flex items-center gap-x-4">
                <span className="text-muted-foreground w-24 text-right flex-shrink-0">创建时间</span>
                <span>{timestampToLocal(codeDetail.created_at)}</span>
              </div>
              {/* 过期时间 */}
              <div className="flex items-center gap-x-4">
                <span className="text-muted-foreground w-24 text-right flex-shrink-0">过期时间</span>
                <span>{codeDetail.expires_at ? timestampToLocal(codeDetail.expires_at) : '未设置'}</span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">暂无数据</div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCodeDetailDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
