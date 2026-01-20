/**
 * 首次登录修改密码页面
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
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 检查是否使用初始密码
    authApi.checkInitialPassword()
      .then((data) => {
        if (!data.is_initial_password) {
          // 已修改过密码，跳转到首页
          router.push('/');
        }
      })
      .catch(() => {
        // 未登录，跳转到登录页
        router.push('/login');
      });
  }, [router]);

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
      // 修改成功，跳转到首页
      router.push('/');
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
    <div className="bg-background flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full mx-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">首次登录 - 请修改密码</CardTitle>
            <p className="text-muted-foreground text-sm">为了您的账户安全，请修改初始密码</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password">
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
                <Label htmlFor="new_password">
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
                <Label htmlFor="confirm_password">
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
                className="w-full"
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
    </div>
  );
}
