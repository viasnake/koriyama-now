import { ExternalLink } from "lucide-react";
import { Section } from "../components/Section";
import { formatDate } from "../lib/format";
import { useBuildMeta } from "../lib/staticDataClient";

export default function About() {
  const buildMetaQuery = useBuildMeta();
  const generatedAt = buildMetaQuery.data?.generated_at;

  return (
    <div className="page">
      <header className="compact-head">
        <h1>このサイトについて</h1>
        <p>郡山市の公開情報を、スマートフォンで見やすくまとめた非公式サイトです。</p>
      </header>

      <Section title="非公式サイトです">
        <p>
          Civic Koriyama は郡山市が運営する公式サイトではありません。掲載内容は公開情報をもとにしていますが、
          最新の情報や手続きは郡山市公式サイトで確認してください。
        </p>
        <a className="primary-link" href="https://www.city.koriyama.lg.jp/" target="_blank" rel="noreferrer">
          郡山市公式サイト
          <ExternalLink aria-hidden="true" size={16} />
        </a>
      </Section>

      <Section title="情報の出どころ">
        <p>
          施設情報やお知らせは、郡山市の公開情報などをもとにしています。自動で取り込むため、反映が遅れたり、
          古い情報が残ったりすることがあります。
        </p>
        {generatedAt ? <p className="card-meta">最終更新日時 {formatDate(generatedAt)}</p> : null}
      </Section>

      <Section title="公式サイト検索について">
        <p>手続きや制度名から、郡山市公式サイトのページを探せます。</p>
      </Section>
    </div>
  );
}
