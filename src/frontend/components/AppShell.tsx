import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "../lib/format";
import { useBuildMeta } from "../lib/staticDataClient";
import { BottomNav } from "./BottomNav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const buildMetaQuery = useBuildMeta();
  const generatedAt = buildMetaQuery.data?.generated_at;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#content">
        本文へ
      </a>
      <main id="content" className="app-main">
        {children}
      </main>
      <footer className="site-footer" aria-label="サイト情報">
        <div className="site-footer__inner">
          <p className="site-footer__notice">
            <strong>非公式サイトです。</strong>
            正確な情報は
            <a href="https://www.city.koriyama.lg.jp/" target="_blank" rel="noreferrer">
              郡山市公式サイト
            </a>
            で確認してください。
          </p>
          <div className="site-footer__links">
            {generatedAt ? <span>最終更新 {formatDate(generatedAt)}</span> : null}
            <Link to="/about">このサイトについて</Link>
          </div>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
