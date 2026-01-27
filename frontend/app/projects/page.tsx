/**
 * 项目列表页面
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

import { useState, useEffect, FormEvent, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { DEFAULT_PAGE_SIZE, projectsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage, timestampToLocal, truncateText, dateTimeLocalToTimestamp, timestampToDateTimeLocalValue, shortUuid } from '@/lib/utils';
import { Search, Plus, Edit, Trash2, Power, PowerOff, Calendar } from 'lucide-react';
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

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialPage = useMemo(() => {
    const p = Number(searchParams.get('page') || '1');
    return Number.isFinite(p) && p > 0 ? p : 1;
  }, [searchParams]);

  const initialSearch = useMemo(() => searchParams.get('search') || '', [searchParams]);
  const initialStatus = useMemo(() => searchParams.get('status') || '', [searchParams]);

  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<string>(initialStatus);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  // PRD：创建项目时默认勾选“永不过期”
  const [isNeverExpiresCreate, setIsNeverExpiresCreate] = useState(true);
  const [isNeverExpiresEdit, setIsNeverExpiresEdit] = useState(false);

  const pageSize = DEFAULT_PAGE_SIZE;

  const syncQuery = useCallback(
    (next: { page?: number; search?: string; status?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.page !== undefined) {
        params.set('page', String(next.page));
      }
      if (next.search !== undefined) {
        next.search ? params.set('search', next.search) : params.delete('search');
      }
      if (next.status !== undefined) {
        next.status ? params.set('status', next.status) : params.delete('status');
      }
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        status: status ? status === 'true' : undefined,
      });
      setProjects(data.items);
      setTotal(data.total);
    } catch (error: any) {
      toast.error(getErrorMessage(error, '加载项目列表失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, toast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    setPage(initialPage);
    setPageInput(String(initialPage));
    setSearch(initialSearch);
    setStatus(initialStatus);
  }, [initialPage, initialSearch, initialStatus]);

  const replaceProjectInList = (nextProject: any) => {
    setProjects((prev) => prev.map((item) => (item.id === nextProject.id ? { ...item, ...nextProject } : item)));
  };

  const removeProjectFromList = (projectId: string) => {
    setProjects((prev) => prev.filter((item) => item.id !== projectId));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    syncQuery({ page: 1, search, status });
  };

  const goToPage = (nextPage: number) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, nextPage), totalPages || 1);
    setPage(safePage);
    syncQuery({ page: safePage, search, status });
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const expiresAt = formData.get('expires_at') as string;

    // 日期验证：确保不为过去时间
    if (expiresAt && !isNeverExpiresCreate) {
      const selectedDate = new Date(expiresAt);
      const now = new Date();
      if (selectedDate < now) {
        toast.error('创建失败：不能选择过去的日期');
        return;
      }
    }

    try {
      const created = await projectsApi.create({
        name: name.trim(),
        description: description.trim() || null,
        expires_at: isNeverExpiresCreate || !expiresAt ? null : dateTimeLocalToTimestamp(expiresAt),
      });
      toast.success('创建成功');
      setShowCreateModal(false);
      // PRD：创建项目时默认勾选“永不过期”
      setIsNeverExpiresCreate(true);
      setPage(1);
      syncQuery({ page: 1, search, status });
      setProjects((prev) => [created, ...prev].slice(0, pageSize));
      setTotal((prev) => prev + 1);
    } catch (error: any) {
      const msg = getErrorMessage(error, '创建失败：项目名称已存在或不合法');
      // PRD：失败统一为“创建失败：{detail}”
      if (msg.startsWith('创建失败：')) {
        toast.error(msg);
      } else {
        toast.error(`创建失败：${msg}`);
      }
    }
  };

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProject) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const expiresAt = formData.get('expires_at') as string;

    // 日期验证：确保不为过去时间
    if (expiresAt && !isNeverExpiresEdit) {
      const selectedDate = new Date(expiresAt);
      const now = new Date();
      if (selectedDate < now) {
        toast.error('保存失败：不能选择过去的日期');
        return;
      }
    }

    try {
      const updated = await projectsApi.update(editingProject.id, {
        name: name.trim(),
        description: description.trim() || null,
        expires_at: isNeverExpiresEdit || !expiresAt ? null : dateTimeLocalToTimestamp(expiresAt),
      });
      // PRD：编辑成功统一为“保存成功”
      toast.success('保存成功');
      setShowEditModal(false);
      setEditingProject(null);
      setIsNeverExpiresEdit(false);
      replaceProjectInList(updated);
    } catch (error: any) {
      const msg = getErrorMessage(error, '保存失败：请稍后重试');
      // PRD：失败统一为“保存失败：{detail}”
      if (msg.startsWith('保存失败：')) {
        toast.error(msg);
      } else {
        toast.error(`保存失败：${msg}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingProjectId) return;

    try {
      await projectsApi.delete(deletingProjectId);
      toast.success('删除成功');
      setShowDeleteModal(false);
      setDeletingProjectId(null);
      const isLastItemOnPage = projects.length === 1 && page > 1;
      removeProjectFromList(deletingProjectId);
      if (isLastItemOnPage) {
        const nextPage = Math.max(1, page - 1);
        setPage(nextPage);
        syncQuery({ page: nextPage, search, status });
      }
    } catch (error: any) {
      const msg = getErrorMessage(error, '删除失败：请稍后重试');
      if (msg.startsWith('删除失败：')) {
        toast.error(msg);
      } else {
        toast.error(`删除失败：${msg}`);
      }
    }
  };

  const handleToggleStatus = async (projectId: string, currentStatus: boolean) => {
    try {
      const updated = await projectsApi.update(projectId, { status: !currentStatus });
      // PRD：启用/禁用的成功提示
      toast.success(!currentStatus ? '已启用项目' : '已禁用项目');
      replaceProjectInList(updated);
    } catch (error: any) {
      const msg = getErrorMessage(error, '状态更新失败：请稍后重试');
      if (msg.startsWith('状态更新失败：')) {
        toast.error(msg);
      } else {
        toast.error(`状态更新失败：${msg}`);
      }
    }
  };

  const openEditModal = async (projectId: string) => {
    try {
      const project = await projectsApi.get(projectId);
      setEditingProject(project);
      // 根据expires_at初始化"永不过期"开关状态
      setIsNeverExpiresEdit(!project.expires_at);
      setShowEditModal(true);
    } catch (error: any) {
      toast.error(getErrorMessage(error, '加载项目数据失败'));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">项目管理</h1>
      </div>

      {/* 搜索和筛选栏 */}
      <Card className="mb-6">
        <CardHeader className="py-4">
          <CardTitle className="text-lg">搜索与筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索项目名称..."
                className="placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                  syncQuery({ page: 1, search, status: e.target.value });
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">全部状态</option>
                <option value="true">启用</option>
                <option value="false">禁用</option>
              </select>
            </div>
            <Button type="submit">
              <Search className="h-4 w-4" />
              搜索
            </Button>
            <Button
              type="button"
              onClick={() => {
                // PRD：打开创建弹框时默认勾选“永不过期”
                setIsNeverExpiresCreate(true);
                setShowCreateModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              创建项目
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 项目表格 */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-lg">项目列表</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead className="w-[200px]">名称</TableHead>
                  <TableHead className="w-[300px]">描述</TableHead>
                  <TableHead className="w-[150px]">创建时间</TableHead>
                  <TableHead className="w-[150px]">有效期</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead className="w-[200px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      暂无项目
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-mono text-sm">
                        {shortUuid(project.id)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/projects/${project.id}`} className="text-primary hover:text-primary/80">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {truncateText(project.description, 50)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {timestampToLocal(project.created_at)}
                      </TableCell>
                      <TableCell className={project.is_expired ? 'text-destructive' : 'text-foreground'}>
                        {project.expires_at ? timestampToLocal(project.expires_at) : '永久有效'}
                      </TableCell>
                      <TableCell>
                        {project.status ? (
                          <Badge variant="default">
                            启用
                          </Badge>
                        ) : (
                          <Badge variant="secondary">禁用</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
                          <Button
                            variant="ghost"
                            onClick={() => openEditModal(project.id)}
                            className="h-8 px-2 gap-1 text-sm leading-none"
                          >
                            <Edit className="h-4 w-4" />
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleToggleStatus(project.id, project.status)}
                            className="h-8 px-2 gap-1 text-sm leading-none"
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
                            variant="ghost"
                            onClick={() => {
                              setDeletingProjectId(project.id);
                              setShowDeleteModal(true);
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
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-foreground">共 {total} 个项目</div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground mr-2">
                  第 {page} 页，共 {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                >
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
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, totalPages)}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    className="h-9 w-20"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = Number(pageInput);
                      if (Number.isNaN(target)) return;
                      goToPage(target);
                    }}
                  >
                    跳转
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 创建项目弹框 */}
      <Dialog 
        open={showCreateModal} 
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            // PRD：下次打开仍默认勾选“永不过期”
            setIsNeverExpiresCreate(true);
          } else {
            // 确保默认态下日期输入为空
            const input = document.getElementById('create_expires_at') as HTMLInputElement | null;
            if (input) input.value = '';
          }
        }}
      >
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>创建项目</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create_name">
                项目名称 <span className="text-destructive">*</span>
              </Label>
              <Input id="create_name" type="text" name="name" required maxLength={100} className="placeholder:text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_description">项目描述</Label>
              <Textarea id="create_description" name="description" rows={4} maxLength={500} className="placeholder:text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_expires_at">有效期</Label>
              <div className="relative inline-flex w-full max-w-sm">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <Input 
                  id="create_expires_at" 
                  type="datetime-local" 
                  name="expires_at" 
                  disabled={isNeverExpiresCreate}
                  min={new Date().toISOString().slice(0, 16)}
                  className="pl-10 pr-3 w-auto min-w-[240px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="create_never_expires"
                  checked={isNeverExpiresCreate}
                  onCheckedChange={(checked) => {
                    setIsNeverExpiresCreate(checked);
                    if (checked) {
                      const input = document.getElementById('create_expires_at') as HTMLInputElement;
                      if (input) input.value = '';
                    }
                  }}
                />
                <Label htmlFor="create_never_expires">永不过期</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                留空或选择未来日期，项目将在指定时间后过期
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => {
                setShowCreateModal(false);
                setIsNeverExpiresCreate(true);
              }}>
                取消
              </Button>
              <Button type="submit">
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 编辑项目弹框 */}
      <Dialog
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setEditingProject(null);
            setIsNeverExpiresEdit(false);
          }
        }}
      >
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">
                  项目名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit_name"
                  type="text"
                  name="name"
                  defaultValue={editingProject.name}
                  required
                  maxLength={100}
                  className="placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">项目描述</Label>
                <Textarea
                  id="edit_description"
                  name="description"
                  rows={4}
                  maxLength={500}
                  defaultValue={editingProject.description || ''}
                  className="placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_expires_at">有效期</Label>
                <div className="relative inline-flex w-full max-w-sm">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="edit_expires_at"
                    type="datetime-local"
                    name="expires_at"
                    defaultValue={timestampToDateTimeLocalValue(editingProject.expires_at)}
                    disabled={isNeverExpiresEdit}
                    min={new Date().toISOString().slice(0, 16)}
                    className="pl-10 pr-3 w-auto min-w-[240px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit_never_expires"
                    checked={isNeverExpiresEdit}
                    onCheckedChange={(checked) => {
                      setIsNeverExpiresEdit(checked);
                      const input = document.getElementById('edit_expires_at') as HTMLInputElement;
                      if (input) {
                        if (checked) {
                          input.value = '';
                        } else if (editingProject.expires_at) {
                          input.value = timestampToDateTimeLocalValue(editingProject.expires_at);
                        }
                      }
                    }}
                  />
                  <Label htmlFor="edit_never_expires">永不过期</Label>
                </div>
                <div className="space-y-1">
                  {editingProject.is_expired && (
                    <p className="text-sm text-destructive">
                      该项目已过期
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    留空或选择未来日期，项目将在指定时间后过期
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProject(null);
                    setIsNeverExpiresEdit(false);
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

      {/* 删除确认弹框 */}
      <AlertDialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          setShowDeleteModal(open);
          if (!open) setDeletingProjectId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
            确定要删除该项目及其所有关联的激活码吗？此操作无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
