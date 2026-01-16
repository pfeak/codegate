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
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import { timestampToLocal, truncateText, dateTimeLocalToTimestamp } from '@/lib/utils';
import { Search, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';

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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">项目管理</h1>

      {/* 搜索和筛选栏 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索项目名称..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">全部状态</option>
                <option value="true">启用</option>
                <option value="false">禁用</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center"
            >
              <Search className="h-4 w-4 mr-2" />
              搜索
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建项目
            </button>
          </form>
        </div>
      </div>

      {/* 项目表格 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  描述
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  有效期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    暂无项目
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {truncateText(project.description, 50)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timestampToLocal(project.created_at)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm ${project.is_expired ? 'text-red-600' : 'text-gray-500'
                        }`}
                    >
                      {project.expires_at ? timestampToLocal(project.expires_at) : '永久有效'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.status ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          启用
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          禁用
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openEditModal(project.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="h-4 w-4 inline mr-1" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleToggleStatus(project.id, project.status)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        {project.status ? (
                          <>
                            <PowerOff className="h-4 w-4 inline mr-1" />
                            禁用
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 inline mr-1" />
                            启用
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setDeletingProjectId(project.id);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4 inline mr-1" />
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页组件 */}
        <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            共 {total} 个项目
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 mr-4">
                第 {page} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const startPage = Math.max(1, page - 2);
                const pageNum = startPage + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm border border-gray-300 rounded-md transition-colors ${pageNum === page
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-gray-50'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 创建项目弹框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建项目"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
            <textarea
              name="description"
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">有效期</label>
            <input
              type="datetime-local"
              name="expires_at"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              创建
            </button>
          </div>
        </form>
      </Modal>

      {/* 编辑项目弹框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProject(null);
        }}
        title="编辑项目"
      >
        {editingProject && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                defaultValue={editingProject.name}
                required
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
              <textarea
                name="description"
                rows={4}
                maxLength={500}
                defaultValue={editingProject.description || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">有效期</label>
              <input
                type="datetime-local"
                name="expires_at"
                defaultValue={
                  editingProject.expires_at
                    ? new Date(editingProject.expires_at * 1000).toISOString().slice(0, 16)
                    : ''
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="status"
                  defaultChecked={editingProject.status}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">启用项目</span>
              </label>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
              >
                保存
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 删除确认弹框 */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingProjectId(null);
        }}
        onConfirm={handleDelete}
        title="确认删除"
        message="确定要删除这个项目吗？这将删除所有关联的激活码！"
      />
    </MainLayout>
  );
}
