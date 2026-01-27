/**
 * API 文档页面
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

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { docsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('sdk-api');
  const [sdkApiDoc, setSdkApiDoc] = useState<string>('');
  const [pythonSdkDoc, setPythonSdkDoc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const loadDocs = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'sdk-api') {
          if (!sdkApiDoc) {
            const content = await docsApi.getSdkApi();
            setSdkApiDoc(content);
          }
        } else if (activeTab === 'python-sdk') {
          if (!pythonSdkDoc) {
            const content = await docsApi.getPythonSdk();
            setPythonSdkDoc(content);
          }
        }
      } catch (err) {
        const errorMsg = getErrorMessage(err, '文档加载失败，请稍后重试');
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadDocs();
  }, [activeTab, sdkApiDoc, pythonSdkDoc, toast]);

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">API 文档</h1>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sdk-api">SDK API 文档</TabsTrigger>
          <TabsTrigger value="python-sdk">Python SDK</TabsTrigger>
        </TabsList>

        <TabsContent value="sdk-api" className="mt-6">
          <div className="max-w-5xl mx-auto p-6 bg-background rounded-lg border overflow-y-scroll">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">加载中...</div>
            ) : error ? (
              <div className="text-center text-destructive py-8">{error}</div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-strong:text-foreground prose-strong:font-semibold prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {sdkApiDoc}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="python-sdk" className="mt-6">
          <div className="max-w-5xl mx-auto p-6 bg-background rounded-lg border overflow-y-scroll">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">加载中...</div>
            ) : error ? (
              <div className="text-center text-destructive py-8">{error}</div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-strong:text-foreground prose-strong:font-semibold prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {pythonSdkDoc}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
