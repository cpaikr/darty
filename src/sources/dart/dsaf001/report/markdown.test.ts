import { describe, expect, test } from "bun:test";

import { convertReportHtmlToMarkdown } from "./markdown.ts";

describe("convertReportHtmlToMarkdown", () => {
  test("converts common report HTML to readable markdown", () => {
    expect(
      convertReportHtmlToMarkdown(
        "<h1>사업보고서</h1><p><strong>배당</strong> 내용<br>다음 줄</p><ul><li>현금</li><li>주식</li></ul>",
      ),
    ).toBe("# 사업보고서\n\n**배당** 내용\n다음 줄\n\n- 현금\n- 주식");
  });

  test("preserves tables as HTML so complex cell structure is not flattened", () => {
    expect(
      convertReportHtmlToMarkdown(
        '<p>요약</p><table><tr><th rowspan="2">구분</th><td colspan="2">금액</td></tr></table><p>끝</p>',
      ),
    ).toBe(
      '요약\n\n<table><tbody><tr><th rowspan="2">구분</th><td colspan="2">금액</td></tr></tbody></table>\n\n끝',
    );
  });

  test("removes DART presentation-only table markup", () => {
    expect(
      convertReportHtmlToMarkdown(
        '<table class="nb" border="1" width="601"><colgroup><col width="123"></colgroup><tr height="30"><td width="114" height="24" align="RIGHT" valign="BOTTOM" style="font-size:12pt;">구분</td><td width="114" height="24" align="RIGHT" style="font-size:12pt;" colspan="2">34,466,803</td></tr></table>',
      ),
    ).toBe(
      '<table><tbody><tr><td>구분</td><td colspan="2">34,466,803</td></tr></tbody></table>',
    );
  });

  test("removes low-signal inline artifacts inside preserved table HTML", () => {
    expect(
      convertReportHtmlToMarkdown(
        '<table><tr><td>서비스수익</td><td>233,88<span style="color:#FF1418;">3</span><br></td><td>소 &nbsp;계</td><td><a name="note">주석</a></td></tr></table>',
      ),
    ).toBe(
      '<table><tbody><tr><td>서비스수익</td><td>233,883</td><td>소 계</td><td>주석</td></tr></tbody></table>',
    );
  });

  test("renders one-cell layout tables as text", () => {
    expect(
      convertReportHtmlToMarkdown(
        '<p>요약</p><table><tr><td>(단위 : 억원, %)&nbsp;</td></tr></table><p>끝</p>',
      ),
    ).toBe("요약\n\n(단위 : 억원, %)\n\n끝");
  });

  test("escapes raw angle-bracket labels in markdown text", () => {
    expect(convertReportHtmlToMarkdown("<p>&lt;주요 경영지표&gt;</p>")).toBe(
      "&lt;주요 경영지표&gt;",
    );
  });

  test("escapes Markdown controls in plain report text", () => {
    expect(
      convertReportHtmlToMarkdown(
        "<p>[악성 링크](https://evil.test) ![악성 이미지](https://evil.test/x) *강조* _강조_</p><p># 제목</p><p>``` 펜스 ```</p>",
      ),
    ).toBe(
      "\\[악성 링크\\](https\\://evil.test) !\\[악성 이미지\\](https\\://evil.test/x) \\*강조\\* \\_강조\\_\n\n\\# 제목\n\n\\`\\`\\` 펜스 \\`\\`\\`",
    );
  });

  test("does not autolink URL-like or setext-heading prose", () => {
    expect(
      convertReportHtmlToMarkdown("<p>www.example.com foo@example.com</p><p>Title<br>===</p>"),
    ).toBe("www\\.example.com foo\\@example.com\n\nTitle\n\\===");
  });

  test("keeps sanitizer-approved anchors while escaping their labels safely", () => {
    expect(
      convertReportHtmlToMarkdown(
        '<p><a href="https://dart.fss.or.kr/report/viewer.do?a=(b)">[보고서]</a></p>',
      ),
    ).toBe(
      "[\\[보고서\\]](https://dart.fss.or.kr/report/viewer.do?a=\\(b\\))",
    );
  });

  test("chooses code delimiters longer than embedded backtick runs", () => {
    expect(convertReportHtmlToMarkdown("<p><code>a`b``c</code></p><pre>x```y````z</pre>")).toBe(
      "```a`b``c```\n\n`````\nx```y````z\n`````",
    );
  });
});
