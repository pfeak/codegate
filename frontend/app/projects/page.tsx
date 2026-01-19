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

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { projectsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { timestampToLocal, truncateText, dateTimeLocalToTimestamp, timestampToDateTimeLocalValue, shortUuid } from '@/lib/utils';
import { Search, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
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

export default function ProjectsPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const pageSize = 20;

  useEffect(() => {
    loadProjects();
  }, [page, search, status]);

  const loadProjects = async () => {
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
      toast.error(error.message || '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProjects();
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const expiresAt = formData.get('expires_at') as string;

    try {
      await projectsApi.create({
        name: name.trim(),
        description: description.trim() || null,
        expires_at: expiresAt ? dateTimeLocalToTimestamp(expiresAt) : null,
      });
      toast.success('创建成功');
      setShowCreateModal(false);
      loadProjects();
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    }
  };

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProject) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const expiresAt = formData.get('expires_at') as string;
    const status = (formData.get('status') as string) === 'on';

    try {
      await projectsApi.update(editingProject.id, {
        name: name.trim(),
        description: description.trim() || null,
        expires_at: expiresAt ? dateTimeLocalToTimestamp(expiresAt) : null,
        status,
      });
      toast.success('更新成功');
      setShowEditModal(false);
      setEditingProject(null);
      loadProjects();
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    }
  };

  const handleDelete = async () => {
    if (!deletingProjectId) return;

    try {
      await projectsApi.delete(deletingProjectId);
      toast.success('删除成功');
      setShowDeleteModal(false);
      setDeletingProjectId(null);
      loadProjects();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const handleToggleStatus = async (projectId: string, currentStatus: boolean) => {
    try {
      await projectsApi.update(projectId, { status: !currentStatus });
      toast.success('状态更新成功');
      loadProjects();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  const openEditModal = async (projectId: string) => {
    try {
      const project = await projectsApi.get(projectId);
      setEditingProject(project);
      setShowEditModal(true);
    } catch (error: any) {
      toast.error(error.message || '加载项目数据失败');
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
              />
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
              onClick={() => setShowCreateModal(true)}
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
                  <TableHead className="w-[140px]">ID</TableHead>
                  <TableHead className="w-[220px]">名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[160px]">创建时间</TableHead>
                  <TableHead className="w-[160px]">有效期</TableHead>
                  <TableHead className="w-[110px]">状态</TableHead>
                  <TableHead className="w-[240px] text-right">操作</TableHead>
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
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(project.id)}
                          >
                            <Edit className="h-4 w-4" />
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(project.id, project.status)}
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
                            size="sm"
                            onClick={() => {
                              setDeletingProjectId(project.id);
                              setShowDeleteModal(true);
                            }}
                            className="text-destructive hover:text-destructive/80"
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
                  onClick={() => setPage(page - 1)}
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
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 创建项目弹框 */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>创建项目</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create_name">
                项目名称 <span className="text-destructive">*</span>
              </Label>
              <Input id="create_name" type="text" name="name" required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_description">项目描述</Label>
              <Textarea id="create_description" name="description" rows={4} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_expires_at">有效期</Label>
              <Input id="create_expires_at" type="datetime-local" name="expires_at" />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
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
          if (!open) setEditingProject(null);
        }}
      >
        <DialogContent className="max-w-md">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_expires_at">有效期</Label>
                <Input
                  id="edit_expires_at"
                  type="datetime-local"
                  name="expires_at"
                  defaultValue={timestampToDateTimeLocalValue(editingProject.expires_at)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit_status"
                  type="checkbox"
                  name="status"
                  defaultChecked={editingProject.status}
                  className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Label htmlFor="edit_status">启用项目</Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProject(null);
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
              确定要删除这个项目吗？这将删除所有关联的激活码！
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
