/**
 * 登录页面
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

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authApi.login(username.trim(), password.trim());

      // 根据是否使用初始密码决定跳转
      if (data.is_initial_password) {
        // 使用初始密码，跳转到修改密码页面
        router.push('/change-password');
      } else {
        // 已修改过密码，跳转到首页
        router.push('/');
      }
    } catch (err: any) {
      const msg = getErrorMessage(err, '用户名或密码错误');
      // 与 PRD 约定对齐：默认“用户名或密码错误”，有 detail 时前缀“登录失败：”
      if (msg === '用户名或密码错误') {
        toast.error(msg);
      } else {
        toast.error(`登录失败：${msg}`);
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
            <CardTitle className="text-2xl">CodeGate 管理员登录</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  用户名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="请输入密码"
                  autoComplete="current-password"
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
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 默认账户提示 */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>默认管理员账户：admin / 123456</p>
        </div>
      </div>
    </div>
  );
}
