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
import { usePathname, useRouter } from 'next/navigation';
import { Home, Folder, CheckCircle, Book, User, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toast = useToast();

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/projects', label: '项目管理', icon: Folder },
    { path: '/verify', label: '核销验证', icon: CheckCircle },
    { path: '/docs', label: 'API 文档', icon: Book },
    { path: '/profile', label: '个人管理', icon: User },
    { path: '/logout', label: '登出', icon: LogOut, action: true },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setIsMobileMenuOpen(false);
      // PRD：登出成功提示
      toast.success('已退出登录');
      router.replace('/login');
    } catch (error) {
      console.error('登出失败:', error);
      // PRD：登出失败提示
      toast.error('登出失败：请稍后重试');
    }
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={[
          'fixed lg:sticky top-0 left-0 w-64 h-screen bg-card border-r border-border flex flex-col z-40',
          'transition-transform duration-200',
          // 移动端抽屉效果
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo/标题区域 */}
        <div className="h-16 px-4 py-4 flex items-center border-b border-border">
          <Link href="/" className="text-xl font-bold text-primary">
            CodeGate
          </Link>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.action ? false : isActive(item.path);
            const className = [
              'flex items-center px-4 py-3 rounded-md text-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              active ? 'bg-accent text-primary border-r-2 border-primary' : '',
            ]
              .filter(Boolean)
              .join(' ');

            if (item.action) {
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={handleLogout}
                  className={className + ' w-full text-left'}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
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
      </aside>

      {/* 移动端顶部导航栏 */}
      <div className="lg:hidden bg-card shadow-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          CodeGate
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-muted-foreground hover:text-foreground focus:outline-none"
          aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
