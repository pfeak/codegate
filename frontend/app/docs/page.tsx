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

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/atom-one-light.css';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/Toast';
import { docsApi } from '@/lib/api';
import { cn, getErrorMessage } from '@/lib/utils';

type DocType = 'sdk-api' | 'python-sdk';

const NAV_ITEMS: { id: DocType; label: string; description: string }[] = [
  { id: 'sdk-api', label: 'API 文档', description: '如何调用后端 API 的使用指南' },
  { id: 'python-sdk', label: 'Python SDK', description: '安装、初始化与常见用法' },
];

export default function DocsPage() {
  const [activeDoc, setActiveDoc] = useState<DocType>('sdk-api');
  const [docsContent, setDocsContent] = useState<Record<DocType, string>>({
    'sdk-api': '',
    'python-sdk': '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toast = useToast();
  const contentRef = useRef<HTMLDivElement | null>(null);

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadDoc = async (doc: DocType, force?: boolean) => {
    if (!force && docsContent[doc]) {
      setError(null);
      setLoading(false);
      scrollToTop();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const content =
        doc === 'sdk-api' ? await docsApi.getSdkApi() : await docsApi.getPythonSdk();
      setDocsContent((prev) => ({ ...prev, [doc]: content }));
      scrollToTop();
    } catch (err) {
      const message = getErrorMessage(err, '文档加载失败，请稍后重试');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoc(activeDoc);
  }, [activeDoc, docsContent]);

  function PreWithCopy({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
    const ref = useRef<HTMLPreElement>(null);
    const handleCopy = () => {
      const el = ref.current;
      if (!el) return;
      const text = el.textContent || '';
      void navigator.clipboard.writeText(text).then(
        () => toast.success('已复制'),
        () => { },
      );
    };
    return (
      <div className="relative">
        <pre ref={ref} {...props}>
          {children}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 top-2 z-10 rounded p-1.5 text-muted-foreground/70 hover:bg-muted/60 hover:text-muted-foreground"
          aria-label="复制"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const markdownComponents: Components = useMemo(
    () => ({
      pre: PreWithCopy,
      a({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
        if (!href) return <a {...props}>{children}</a>;
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        if (isExternal) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          );
        }
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      },
      code({
        node,
        inline,
        className,
        children,
        ...props
      }: {
        node?: unknown;
        inline?: boolean;
        className?: string;
        children?: ReactNode;
      }) {
        // 围栏代码块：去掉首尾多余换行，避免 pre 内多出一行空白导致「下面太宽」
        const content =
          !inline && typeof children === 'string'
            ? children.replace(/^\n+/, '').replace(/\n+$/, '')
            : children;
        return (
          <code className={className} {...props}>
            {content}
          </code>
        );
      },
      table({ children, ...props }: ComponentPropsWithoutRef<'table'>) {
        return (
          <div className="overflow-x-auto">
            <table {...props}>{children}</table>
          </div>
        );
      },
    }),
    [toast],
  );

  const renderMarkdown = (content: string) => {
    try {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={markdownComponents as never}
        >
          {content}
        </ReactMarkdown>
      );
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Markdown 渲染失败，降级为原始文本：', err);
      }
      return <pre className="whitespace-pre-wrap break-words text-sm">{content}</pre>;
    }
  };

  const currentDoc = docsContent[activeDoc];

  return (
    <MainLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">API 文档</h1>
            <p className="text-sm text-muted-foreground">
              通过左侧导航切换查看 API 调用指南与 Python SDK 使用说明。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDoc(activeDoc, true)}
            className="w-fit"
          >
            刷新当前文档
          </Button>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* 左侧导航 - 桌面 */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-6 rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="mb-2 text-sm text-muted-foreground">文档类型</p>
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveDoc(item.id)}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                      activeDoc === item.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/90 hover:bg-muted/50',
                    )}
                  >
                    <span className="block font-medium">{item.label}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* 左侧导航 - 移动抽屉 */}
          <div className="lg:hidden">
            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  目录
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm p-0">
                <div className="p-4">
                  <p className="mb-2 text-sm text-muted-foreground">文档类型</p>
                  <div className="flex flex-col gap-1">
                    {NAV_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveDoc(item.id);
                          setMobileNavOpen(false);
                        }}
                        className={cn(
                          'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                          activeDoc === item.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground/90 hover:bg-muted/50',
                        )}
                      >
                        <span className="block font-medium">{item.label}</span>
                        <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* 文档内容区 */}
          <section className="flex-1">
            <div
              ref={contentRef}
              className="max-w-5xl rounded-lg border bg-background p-4 lg:mx-0 lg:p-6"
            >
              {loading ? (
                <div className="py-10 text-center text-muted-foreground">加载中...</div>
              ) : error ? (
                <div className="space-y-3 py-6 text-center">
                  <p className="text-destructive">{error}</p>
                  <Button size="sm" onClick={() => loadDoc(activeDoc, true)}>
                    重新加载
                  </Button>
                </div>
              ) : currentDoc ? (
                <div className="prose prose-slate prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-4 prose-headings:mb-1.5 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:my-2 prose-p:text-foreground prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-pre:my-2 prose-pre:py-1 prose-pre:px-3 prose-pre:pr-10 prose-pre:!bg-transparent prose-pre:[&>code]:py-0 prose-pre:[&>code]:leading-snug prose-hr:my-3 prose-blockquote:my-2 prose-table:my-3 prose-img:my-2 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:rounded-md prose-strong:text-foreground prose-strong:font-semibold prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2">
                  {renderMarkdown(currentDoc)}
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  暂无文档内容
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
