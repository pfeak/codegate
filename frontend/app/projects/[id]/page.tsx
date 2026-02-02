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
import MainLayout from '@/components/layout/MainLayout';
import { projectsApi, codesApi, apiKeysApi, DEFAULT_PAGE_SIZE } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage, timestampToLocal, dateTimeLocalToTimestamp, formatNumber, timestampToDateTimeLocalValue, shortUuid } from '@/lib/utils';
import { ArrowLeft, Plus, Edit, Trash2, Power, PowerOff, RotateCcw, Ban, Copy, Search, Loader2, Check, Calendar, KeyRound, RefreshCcw, Shield, ShieldOff, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
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
  const [activeTab, setActiveTab] = useState<'codes' | 'api_keys'>('codes');

  // API Key 状态
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showGenerateKeyDialog, setShowGenerateKeyDialog] = useState(false);
  const [generateKeyLoading, setGenerateKeyLoading] = useState(false);
  const [generateKeyName, setGenerateKeyName] = useState<string>('');
  const [showKeySecretDialog, setShowKeySecretDialog] = useState(false);
  const [generatedKeyData, setGeneratedKeyData] = useState<any | null>(null);
  const [showDeleteKeyDialog, setShowDeleteKeyDialog] = useState(false);
  const [showRefreshKeyConfirmDialog, setShowRefreshKeyConfirmDialog] = useState(false);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  const [lastKeyAction, setLastKeyAction] = useState<'generate' | 'refresh'>('generate');

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

  const loadApiKeys = useCallback(async () => {
    if (!projectId) return;
    setApiKeysLoading(true);
    try {
      const data = await apiKeysApi.list(projectId);
      setApiKeys(data.items);
    } catch (error: any) {
      toast.error(getErrorMessage(error, '加载 API Key 列表失败，请稍后重试'));
    } finally {
      setApiKeysLoading(false);
    }
  }, [projectId, toast]);

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
    if (projectId) {
      loadApiKeys();
    }
  }, [projectId, loadApiKeys]);

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

  const handleGenerateApiKey = async (name?: string | null, mode: 'generate' | 'refresh' = 'generate') => {
    setGenerateKeyLoading(true);
    try {
      const data = await apiKeysApi.generateOrRefresh(projectId, { name: name ?? null });
      setLastKeyAction(mode);
      toast.success(mode === 'refresh' ? 'API Key 刷新成功' : 'API Key 生成成功');
      setGeneratedKeyData(data);
      setShowKeySecretDialog(true);
      setShowGenerateKeyDialog(false);
      setGenerateKeyName('');
      await loadApiKeys();
    } catch (error: any) {
      const prefix = mode === 'refresh' ? '刷新 API Key 失败：' : '生成 API Key 失败：';
      toast.error(`${prefix}${getErrorMessage(error, '请稍后重试')}`);
    } finally {
      setGenerateKeyLoading(false);
    }
  };

  const handleToggleApiKey = async (apiKeyId: string, isActive: boolean) => {
    try {
      await apiKeysApi.toggle(apiKeyId, !isActive);
      toast.success(!isActive ? 'API Key 已启用' : 'API Key 已禁用');
      await loadApiKeys();
    } catch (error: any) {
      toast.error(`操作失败：${getErrorMessage(error, '请稍后重试')}`);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!selectedApiKeyId) return;
    try {
      await apiKeysApi.delete(selectedApiKeyId);
      toast.success('删除 API Key 成功');
      setShowDeleteKeyDialog(false);
      setSelectedApiKeyId(null);
      await loadApiKeys();
    } catch (error: any) {
      toast.error(`删除 API Key 失败：${getErrorMessage(error, '请稍后重试')}`);
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

  const csvEscape = (value: string) => {
    const v = value ?? '';
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };

  const handleExportCodes = async () => {
    setExportLoading(true);
    try {
      // PRD：导出当前项目全部激活码（不受筛选与分页影响）
      // 优先走后端导出端点（PRD 推荐）
      const endpoint = `/api/projects/${projectId}/codes/export?format=csv`;
      const res = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'text/csv',
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const contentDisposition = res.headers.get('content-disposition') || '';
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)(?:"|;|$)/i);
        const sanitizedProjectId = (project?.id || projectId).replace(/-/g, '');
        const ts = Math.floor(Date.now() / 1000);
        const fallbackFilename = `codegate-codes-${sanitizedProjectId}-${ts}.csv`;
        const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : fallbackFilename;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('导出成功');
        setShowExportDialog(false);
        return;
      }

      // 如果后端未提供导出端点，则前端兜底：分页拉取全部激活码并本地生成 CSV
      const items: any[] = [];
      let curPage = 1;
      while (true) {
        const pageData = await codesApi.list(projectId, {
          page: curPage,
          page_size: DEFAULT_PAGE_SIZE,
        });
        for (const item of pageData.items) items.push(item);
        const fetched = pageData.items.length;
        const totalCount = pageData.total ?? 0;
        if (fetched === 0 || items.length >= totalCount) break;
        curPage += 1;
      }

      const getStatusText = (code: any) => {
        if (code.is_expired) return '已过期';
        if (code.is_disabled) return '已禁用';
        if (code.status) return '已使用';
        return '未使用';
      };

      const header = ['id', 'code', 'status', 'created_at'].join(',');
      const rows = items.map((it) => {
        const cols = [
          csvEscape(String(it.id ?? '')),
          csvEscape(String(it.code ?? '')),
          csvEscape(getStatusText(it)),
          csvEscape(it.created_at ? timestampToLocal(it.created_at) : ''),
        ];
        return cols.join(',');
      });
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedProjectId = (project?.id || projectId).replace(/-/g, '');
      const ts = Math.floor(Date.now() / 1000);
      a.download = `codegate-codes-${sanitizedProjectId}-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
      setShowExportDialog(false);
    } catch (error: any) {
      const msg = getErrorMessage(error, '请稍后重试');
      toast.error(`导出失败：${msg}`);
    } finally {
      setExportLoading(false);
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

    try {
      const updated = await projectsApi.update(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        expires_at: !expiresAt ? null : dateTimeLocalToTimestamp(expiresAt),
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
        <div className="flex items-center justify-center min-h-[400px]" style={{ scrollbarGutter: 'stable' }}>
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]" style={{ scrollbarGutter: 'stable' }}>
          <div className="text-muted-foreground">项目不存在</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6" style={{ scrollbarGutter: 'stable' }}>
        {/* 顶部区域：标题 + 返回 */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/projects')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'codes' | 'api_keys')} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="codes">激活码管理</TabsTrigger>
            <TabsTrigger value="api_keys">API 密钥</TabsTrigger>
          </TabsList>

          <TabsContent value="codes">
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
                <Button
                  onClick={() => setShowExportDialog(true)}
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  导出激活码
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
              <div className="rounded-md border overflow-x-auto" style={{ scrollbarGutter: 'stable' }}>
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
                                <Check className="h-4 w-4 text-green-600 scale-110 transition-all duration-200" />
                              ) : (
                                <Copy className="h-4 w-4 transition-all duration-200" />
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
          </TabsContent>

          <TabsContent value="api_keys">
            <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground/80">API 密钥</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {!apiKeys.length ? (
                  <Button
                    onClick={() => {
                      setShowGenerateKeyDialog(true);
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                    生成密钥
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRefreshKeyConfirmDialog(true);
                      }}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      刷新密钥
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const target = apiKeys[0];
                        setSelectedApiKeyId(target.id);
                        handleToggleApiKey(target.id, target.is_active);
                      }}
                    >
                      {apiKeys[0]?.is_active ? (
                        <>
                          <ShieldOff className="h-4 w-4" />
                          禁用
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4" />
                          启用
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const target = apiKeys[0];
                        setSelectedApiKeyId(target.id);
                        setShowDeleteKeyDialog(true);
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4" style={{ scrollbarGutter: 'stable' }}>
              {apiKeysLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
                </div>
              ) : !apiKeys.length ? (
                <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                  暂无 API Key，请点击上方“生成密钥”按钮创建。
                </div>
              ) : (
                apiKeys[0] && (
                  <div className="rounded-md border bg-card p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <span className="w-24 text-sm font-medium text-muted-foreground flex-shrink-0">API Key</span>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="font-mono text-sm truncate text-foreground" title={apiKeys[0].api_key}>
                          {apiKeys[0].api_key}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(apiKeys[0].api_key);
                              toast.success('已复制');
                            } catch {
                              toast.error('复制失败，请手动复制');
                            }
                          }}
                          title="复制 API Key"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="w-24 text-sm font-medium text-muted-foreground flex-shrink-0">名称</span>
                      <span className="text-sm text-foreground">{apiKeys[0].name || '-'}</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="w-24 text-sm font-medium text-muted-foreground flex-shrink-0">状态</span>
                      <span>
                        {apiKeys[0].is_active ? (
                          <Badge variant="default">启用</Badge>
                        ) : (
                          <Badge variant="secondary">禁用</Badge>
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="w-24 text-sm font-medium text-muted-foreground flex-shrink-0">最后使用</span>
                      <span className="text-sm text-foreground">
                        {apiKeys[0].last_used_at ? timestampToLocal(apiKeys[0].last_used_at) : '-'}
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="w-24 text-sm font-medium text-muted-foreground flex-shrink-0">创建时间</span>
                      <span className="text-sm text-foreground">
                        {timestampToLocal(apiKeys[0].created_at)}
                      </span>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>

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
                <Input
                  id="gen_count"
                  type="number"
                  name="count"
                  required
                  min="1"
                  max="10000"
                  defaultValue="10"
                  className="placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen_expires_at">过期时间（可选）</Label>
                <div className="relative inline-flex w-full max-w-sm">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="gen_expires_at"
                    type="datetime-local"
                    name="expires_at"
                    min={new Date().toISOString().slice(0, 16)}
                    className="pl-10 pr-3 w-auto min-w-[240px] placeholder:text-muted-foreground/60"
                  />
                </div>
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

        {/* 生成/刷新 API Key 弹框 */}
        <Dialog
          open={showGenerateKeyDialog}
          onOpenChange={(open) => {
            setShowGenerateKeyDialog(open);
          }}
        >
          <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>生成 API Key</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerateApiKey(generateKeyName, 'generate');
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="api_key_name">名称（可选）</Label>
                <Input
                  id="api_key_name"
                  value={generateKeyName}
                  onChange={(e) => setGenerateKeyName(e.target.value)}
                  maxLength={100}
                  placeholder="例如：生产环境 API Key"
                  className="placeholder:text-muted-foreground/60"
                />
                <p className="text-sm text-muted-foreground">
                  生成后将显示一次 Secret，请立即保存；再次生成会使旧凭证失效。
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowGenerateKeyDialog(false)}
                  disabled={generateKeyLoading}
                >
                  取消
                </Button>
                <Button type="submit" disabled={generateKeyLoading}>
                  {generateKeyLoading ? (
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

        {/* API Key 重要提示弹框（展示 secret） */}
        <AlertDialog open={showKeySecretDialog} onOpenChange={setShowKeySecretDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{lastKeyAction === 'refresh' ? 'API Key 刷新成功' : 'API Key 生成成功'}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <span className="text-yellow-600 dark:text-yellow-500 font-medium">⚠️</span>
              <span className="text-yellow-800 dark:text-yellow-200 text-sm">
                请立即保存以下信息，Secret 将无法再次查看！
                {lastKeyAction === 'refresh' && ' 旧的 API Key 和 Secret 已立即失效。'}
              </span>
            </div>
            {generatedKeyData ? (
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-4">
                  <span className="w-24 text-sm font-medium text-muted-foreground flex-shrink-0">API Key</span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm break-all text-foreground bg-muted/50 px-2 py-1.5 rounded border">
                      {generatedKeyData.api_key}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(generatedKeyData.api_key);
                          toast.success('已复制 API Key');
                        } catch {
                          toast.error('复制失败，请手动复制');
                        }
                      }}
                      title="复制 API Key"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="w-24 text-sm font-medium text-muted-foreground flex-shrink-0">Secret</span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm break-all text-foreground bg-muted/50 px-2 py-1.5 rounded border">
                      {generatedKeyData.secret}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(generatedKeyData.secret);
                          toast.success('已复制 Secret');
                        } catch {
                          toast.error('复制失败，请手动复制');
                        }
                      }}
                      title="复制 Secret"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="w-24 text-sm font-medium text-muted-foreground flex-shrink-0">Project ID</span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm break-all text-foreground bg-muted/50 px-2 py-1.5 rounded border">
                      {generatedKeyData.project_id}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(generatedKeyData.project_id);
                          toast.success('已复制 Project ID');
                        } catch {
                          toast.error('复制失败，请手动复制');
                        }
                      }}
                      title="复制 Project ID"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground py-4">暂无数据</div>
            )}
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              {generatedKeyData && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const allText = `API Key: ${generatedKeyData.api_key}\nSecret: ${generatedKeyData.secret}\nProject ID: ${generatedKeyData.project_id}`;
                      await navigator.clipboard.writeText(allText);
                      toast.success('已复制全部信息');
                    } catch {
                      toast.error('复制失败，请手动复制');
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制全部
                </Button>
              )}
              <AlertDialogAction onClick={() => setShowKeySecretDialog(false)} className="w-full sm:w-auto">
                关闭
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 删除 API Key 确认 */}
        <AlertDialog
          open={showDeleteKeyDialog}
          onOpenChange={(open) => {
            setShowDeleteKeyDialog(open);
            if (!open) setSelectedApiKeyId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除 API Key</AlertDialogTitle>
              <AlertDialogDescription>
                删除后，该 API Key 将立即失效，使用该凭证的请求将返回 401 错误。确定要继续吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteApiKey}>
                确定
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 刷新 API Key 确认 */}
        <AlertDialog
          open={showRefreshKeyConfirmDialog}
          onOpenChange={(open) => setShowRefreshKeyConfirmDialog(open)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>刷新 API Key</AlertDialogTitle>
              <AlertDialogDescription>
                刷新后，旧的 API Key 和 Secret 将立即失效。确定要继续吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowRefreshKeyConfirmDialog(false);
                  handleGenerateApiKey(null, 'refresh');
                }}
              >
                确定
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 批量禁用确认 */}
        <AlertDialog open={showBatchDisableDialog} onOpenChange={setShowBatchDisableDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>批量禁用未使用激活码</AlertDialogTitle>
              <AlertDialogDescription>
                {batchDisableCountLoading ? (
                  <span>正在统计数量...</span>
                ) : typeof batchDisableCount === 'number' ? (
                  <span>确定要禁用 {batchDisableCount} 个未使用的激活码吗？</span>
                ) : (
                  <span>确定要禁用当前筛选条件下的所有未使用激活码吗？</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBatchDisableUnused}
              >
                确定
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 导出激活码确认 */}
        <AlertDialog
          open={showExportDialog}
          onOpenChange={(open) => {
            setShowExportDialog(open);
            if (!open) setExportLoading(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>导出激活码</AlertDialogTitle>
              <AlertDialogDescription>
                将导出当前项目全部激活码（CSV）。确定要继续吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={exportLoading}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExportCodes}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    导出中...
                  </>
                ) : (
                  '确认导出'
                )}
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
                      min={new Date().toISOString().slice(0, 16)}
                      className="pl-10 pr-3 w-auto min-w-[240px]"
                    />
                  </div>
                  <div className="space-y-1">
                    {project.is_expired && (
                      <p className="text-sm text-destructive">
                        该项目已过期
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowEditProjectDialog(false);
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
                        <Check className="h-4 w-4 text-green-600 scale-110 transition-all duration-200" />
                      ) : (
                        <Copy className="h-4 w-4 transition-all duration-200" />
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
                        <Check className="h-4 w-4 text-green-600 scale-110 transition-all duration-200" />
                      ) : (
                        <Copy className="h-4 w-4 transition-all duration-200" />
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
      </div>
    </MainLayout>
  );
}
