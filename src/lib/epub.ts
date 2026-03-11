import JSZip from "jszip";
import type { Article, EPUBOptions } from "./models";
import { generateId } from "./utils";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textToXhtmlParagraphs(text: string): string {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeXml(p)}</p>`)
    .join("\n    ");
}

function articleToXhtml(article: Article): string {
  const body = article.textContent
    ? textToXhtmlParagraphs(article.textContent)
    : `<p>${escapeXml(article.excerpt || "No content available.")}</p>`;

  const meta = [
    article.byline ? `By ${escapeXml(article.byline)}` : null,
    escapeXml(article.domain),
    new Date(article.savedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    article.estimatedReadTime ? `${article.estimatedReadTime} min read` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8"/>
  <title>${escapeXml(article.title)}</title>
</head>
<body>
  <h2>${escapeXml(article.title)}</h2>
  <p><small>${meta}</small></p>
  <hr/>
  ${body}
  <p><small><a href="${escapeXml(article.url)}">Read original →</a></small></p>
</body>
</html>`;
}

function buildContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function buildOpf(title: string, bookId: string, articles: Article[]): string {
  const manifestItems = articles
    .map((_, i) => {
      const id = `article-${String(i + 1).padStart(4, "0")}`;
      return `    <item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`;
    })
    .join("\n");

  const spineItems = articles
    .map((_, i) => {
      const id = `article-${String(i + 1).padStart(4, "0")}`;
      return `    <itemref idref="${id}"/>`;
    })
    .join("\n");

  const date = new Date().toISOString().split("T")[0];

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>StashRead</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">urn:uuid:${bookId}</dc:identifier>
    <dc:date>${date}</dc:date>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`;
}

function buildTocNcx(title: string, bookId: string, articles: Article[]): string {
  const navPoints = articles
    .map((article, i) => {
      const id = `article-${String(i + 1).padStart(4, "0")}`;
      return `    <navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(article.title)}</text></navLabel>
      <content src="${id}.xhtml"/>
    </navPoint>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
}

export async function generateEPUB(articles: Article[], options: EPUBOptions): Promise<Blob> {
  if (articles.length === 0) throw new Error("No articles to export");

  const bookId = generateId();
  const zip = new JSZip();

  // mimetype MUST be first and MUST be stored uncompressed
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.folder("META-INF")!.file("container.xml", buildContainerXml());

  const oebps = zip.folder("OEBPS")!;
  oebps.file("content.opf", buildOpf(options.title, bookId, articles));
  oebps.file("toc.ncx", buildTocNcx(options.title, bookId, articles));

  articles.forEach((article, i) => {
    const filename = `article-${String(i + 1).padStart(4, "0")}.xhtml`;
    oebps.file(filename, articleToXhtml(article));
  });

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}
