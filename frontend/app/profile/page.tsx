/**
 * 个人管理页面
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
import MainLayout from '@/components/layout/MainLayout';
import { authApi } from '@/lib/api';
import { getErrorMessage, timestampToLocal } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const toast = useToast();
  const [adminInfo, setAdminInfo] = useState<{
    username: string;
    created_at: number;
    last_login_at: number | null;
  } | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    loadAdminInfo();
  }, []);

  const loadAdminInfo = async () => {
    try {
      const data = await authApi.me();
      setAdminInfo(data);
    } catch (error) {
      console.error('加载管理员信息错误:', error);
      // 与 PRD 对齐：加载失败时给出 Toast 提示
      toast.error(getErrorMessage(error as any, '加载个人信息失败，请稍后重试'));
    } finally {
      setInfoLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 前端验证
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('请填写所有字段');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('新密码长度至少8位');
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword)) {
      toast.error('新密码必须包含字母');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast.error('新密码必须包含数字');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('确认密码与新密码不一致');
      return;
    }

    setLoading(true);

    try {
      await authApi.changePassword(oldPassword, newPassword, confirmPassword);
      toast.success('密码修改成功');
      // 清空表单
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = getErrorMessage(err, '修改失败：请稍后重试');
      // 与 PRD 约定对齐：失败文案统一使用“修改失败：{detail}”
      if (msg.startsWith('修改失败：')) {
        toast.error(msg);
      } else {
        toast.error(`修改失败：${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">个人管理</h1>

        {/* 个人信息卡片 */}
        <Card className="mb-6">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground/80">个人信息</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {infoLoading ? (
              <div className="text-muted-foreground">加载中...</div>
            ) : adminInfo ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">用户名</dt>
                  <dd className="mt-1 text-sm text-foreground">{adminInfo.username}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">创建时间</dt>
                  <dd className="mt-1 text-sm text-foreground">{timestampToLocal(adminInfo.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">最后登录时间</dt>
                  <dd className="mt-1 text-sm text-foreground">{adminInfo.last_login_at ? timestampToLocal(adminInfo.last_login_at) : '-'}</dd>
                </div>
              </dl>
            ) : (
              <div className="text-muted-foreground">加载失败</div>
            )}
          </CardContent>
        </Card>

        {/* 修改密码卡片 */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground/80">修改密码</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password" className="text-sm text-muted-foreground">
                  当前密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  id="old_password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  placeholder="请输入当前密码"
                  autoComplete="current-password"
                  className="placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-sm text-muted-foreground">
                  新密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  id="new_password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="至少8位，包含字母和数字"
                  autoComplete="new-password"
                  className="placeholder:text-muted-foreground/60"
                />
                <p className="text-sm text-muted-foreground">至少8位，包含字母和数字</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-sm text-muted-foreground">
                  确认新密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  id="confirm_password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="请再次输入新密码"
                  autoComplete="new-password"
                  className="placeholder:text-muted-foreground/60"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    修改中...
                  </>
                ) : (
                  '修改密码'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
