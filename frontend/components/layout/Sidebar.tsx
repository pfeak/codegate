/**
 * 侧边栏组件
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

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Folder, CheckCircle, Book, User, Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { authApi, API_BASE_URL } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string>('-');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasRequestedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // 防止重复请求
    if (hasRequestedRef.current || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    // 加载用户信息
    authApi.me()
      .then((data) => {
        setUsername(data.username);
        hasRequestedRef.current = true;
      })
      .catch(() => {
        // 未登录，忽略错误
        hasRequestedRef.current = true;
      })
      .finally(() => {
        isLoadingRef.current = false;
      });
  }, []);

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/projects', label: '项目管理', icon: Folder },
    { path: '/verify', label: '核销验证', icon: CheckCircle },
    { path: '/docs', label: 'API 文档', icon: Book, external: true },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={[
          'fixed lg:sticky top-0 left-0 w-64 h-screen bg-white border-r border-gray-200 flex flex-col z-40',
          'transition-transform duration-200',
          // 移动端抽屉效果
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo/标题区域 */}
        <div className="h-16 px-4 py-4 flex items-center border-b border-gray-200">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            CodeGate
          </Link>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.external ? false : isActive(item.path);
            const className = `flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors ${active
              ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600'
              : ''
              }`;

            if (item.external) {
              return (
                <a
                  key={item.path}
                  href={`${API_BASE_URL}${item.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              );
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                className={className}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部用户信息 */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">{username}</span>
            <Link
              href="/profile"
              className="text-sm text-indigo-600 hover:text-indigo-700"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
          <button
            onClick={async () => {
              try {
                await authApi.logout();
                window.location.href = '/login';
              } catch (error) {
                console.error('登出失败:', error);
              }
            }}
            className="w-full text-left text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>登出</span>
          </button>
        </div>
      </aside>

      {/* 移动端顶部导航栏 */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          CodeGate
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
