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
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import { timestampToLocal, dateTimeLocalToTimestamp, formatNumber } from '@/lib/utils';
import { ArrowLeft, Plus, Edit, Trash2, Power, PowerOff, RotateCcw, Download, Upload, Ban } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDeleteCodeModal, setShowDeleteCodeModal] = useState(false);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);

  const pageSize = 50;

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadCodes();
    }
  }, [projectId, page, status, isDisabled]);

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
      setShowGenerateModal(false);
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
    if (!deletingCodeId) return;

    try {
      // 注意：根据 API，删除激活码需要使用项目ID和激活码ID
      // 但 API 中似乎没有直接的删除方法，需要检查
      toast.error('删除功能暂未实现');
      setShowDeleteCodeModal(false);
      setDeletingCodeId(null);
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const handleBatchDisableUnused = async () => {
    try {
      await codesApi.batchDisableUnused(projectId);
      toast.success('批量禁用成功');
      loadCodes();
    } catch (error: any) {
      toast.error(error.message || '批量禁用失败');
    }
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
      {/* 返回按钮和页面标题 */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回项目列表
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
      </div>

      {/* 项目信息卡片 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">项目信息</h2>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">项目ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{project.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">项目名称</dt>
              <dd className="mt-1 text-sm text-gray-900">{project.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">项目描述</dt>
              <dd className="mt-1 text-sm text-gray-900">{project.description || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">创建时间</dt>
              <dd className="mt-1 text-sm text-gray-900">{timestampToLocal(project.created_at)}</dd>
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
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    启用
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    禁用
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">激活码总数</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatNumber(project.code_count || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">已使用数量</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatNumber(project.verified_count || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">未使用数量</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatNumber(project.unverified_count || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">已过期数量</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatNumber(project.expired_count || 0)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 激活码管理区域 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">激活码管理</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              生成激活码
            </button>
            <button
              onClick={handleBatchDisableUnused}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors flex items-center"
            >
              <Ban className="h-4 w-4 mr-2" />
              批量禁用未使用
            </button>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">全部</option>
                <option value="true">已禁用</option>
                <option value="false">未禁用</option>
              </select>
            </div>
          </div>
        </div>

        {/* 激活码表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  激活码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  过期时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  核销时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  核销用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codesLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    暂无激活码
                  </td>
                </tr>
              ) : (
                codes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {code.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {code.status ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 w-fit">
                            已使用
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 w-fit">
                            未使用
                          </span>
                        )}
                        {code.is_disabled && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 w-fit">
                            已禁用
                          </span>
                        )}
                        {code.is_expired && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 w-fit">
                            已过期
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.expires_at ? timestampToLocal(code.expires_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.verified_at ? timestampToLocal(code.verified_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.verified_by || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleCodeStatus(code.id, code.is_disabled)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title={code.is_disabled ? '启用' : '禁用'}
                        >
                          {code.is_disabled ? (
                            <Power className="h-4 w-4" />
                          ) : (
                            <PowerOff className="h-4 w-4" />
                          )}
                        </button>
                        {code.status && !code.is_disabled && !code.is_expired && (
                          <button
                            onClick={() => handleReactivate(code.id)}
                            className="text-green-600 hover:text-green-900"
                            title="重新激活"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
            共 {total} 个激活码
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

      {/* 生成激活码弹框 */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="生成激活码"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              生成数量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="count"
              required
              min="1"
              max="1000"
              defaultValue="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">过期时间</label>
            <input
              type="datetime-local"
              name="expires_at"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              生成
            </button>
          </div>
        </form>
      </Modal>

      {/* 删除激活码确认弹框 */}
      <ConfirmModal
        isOpen={showDeleteCodeModal}
        onClose={() => {
          setShowDeleteCodeModal(false);
          setDeletingCodeId(null);
        }}
        onConfirm={handleDeleteCode}
        title="确认删除"
        message="确定要删除这个激活码吗？此操作不可恢复！"
      />
    </MainLayout>
  );
}
