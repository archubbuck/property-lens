"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

type SearchResult = {
  query: string;
  topics: { slug: string; title: string; description: string }[];
  articles: { slug: string; title: string; summary: string; topic: { slug: string; title: string } }[];
};

/** Debounced live search over help topics/articles, used on the Help & Support landing page. */
export function HelpSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) return;
    let cancelled = false;
    fetch(`/api/v1/help/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data: SearchResult) => {
        if (!cancelled) setResults(data);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const trimmedQuery = query.trim();
  const showPanel = trimmedQuery.length > 0;
  const loading = showPanel && trimmedQuery !== debouncedQuery;

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for help articles, guides, or topics..."
          className="h-12 rounded-full pl-10"
          onKeyDown={(event) => {
            if (event.key === "Enter" && query.trim()) {
              router.push(`/help?q=${encodeURIComponent(query.trim())}`);
            }
          }}
        />
      </div>

      {showPanel && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-card p-2 shadow-lg">
          {loading && <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>}
          {!loading && results && results.topics.length === 0 && results.articles.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;.</p>
          )}
          {!loading && results && (results.topics.length > 0 || results.articles.length > 0) && (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {results.topics.map((topic) => (
                <li key={`topic-${topic.slug}`}>
                  <Link
                    href={`/help/topics/${topic.slug}`}
                    className="flex items-start gap-2 rounded-md p-2 hover:bg-muted"
                  >
                    <span className="mt-0.5 text-sm font-medium">{topic.title}</span>
                    <span className="text-xs text-muted-foreground">Topic</span>
                  </Link>
                </li>
              ))}
              {results.articles.map((article) => (
                <li key={`article-${article.slug}`}>
                  <Link
                    href={`/help/articles/${article.slug}`}
                    className="flex items-start gap-2 rounded-md p-2 hover:bg-muted"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-medium">{article.title}</span>
                      <span className="block text-xs text-muted-foreground">{article.summary}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
