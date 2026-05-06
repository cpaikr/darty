import { describe, expect, test } from "bun:test";

import { sanitizeFetchedReportHtml, sanitizeReportHtml } from "./sanitize-html.ts";

describe("sanitizeReportHtml", () => {
  test("removes executable HTML and dangerous URL attributes", () => {
    expect(
      sanitizeFetchedReportHtml(
        '<html><head><title>ignore me</title></head><body><p onclick="evil()">본문<script>alert(1)</script><iframe>leak</iframe><a href="javascript:evil()">위험</a><img src="data:text/html,evil" alt="로고"></p></body></html>',
      ),
    ).toBe('<p>본문위험<img alt="로고"></p>');
  });

  test("keeps safe links and image sources while resolving DART-relative URLs", () => {
    expect(
      sanitizeReportHtml(
        '<p><a href="/dsaf001/main.do?rcpNo=1">보고서</a><img src="/images/logo.png" alt="logo" onerror="evil()"></p>',
        { baseUrl: "https://dart.fss.or.kr" },
      ),
    ).toBe(
      '<p><a href="https://dart.fss.or.kr/dsaf001/main.do?rcpNo=1">보고서</a><img src="https://dart.fss.or.kr/images/logo.png" alt="logo"></p>',
    );
  });

  test("rejects protocol-relative URLs instead of absolutizing them", () => {
    expect(
      sanitizeReportHtml(
        '<p><a href="//evil.example/report">link</a><img src="//evil.example/logo.png" alt="logo"></p>',
        { baseUrl: "https://dart.fss.or.kr" },
      ),
    ).toBe('<p>link<img alt="logo"></p>');
  });

  test("allows link-specific schemes without allowing them for image sources", () => {
    expect(
      sanitizeReportHtml(
        '<p><a href="mailto:ir@example.com">mail</a><a href="tel:123">call</a><img src="mailto:ir@example.com" alt="mail"><img src="ftp://dart.fss.or.kr/logo.png" alt="ftp"><img src="https://dart.fss.or.kr/logo.png" alt="ok"></p>',
      ),
    ).toBe(
      '<p><a href="mailto:ir@example.com">mail</a><a href="tel:123">call</a><img alt="mail"><img alt="ftp"><img src="https://dart.fss.or.kr/logo.png" alt="ok"></p>',
    );
  });

  test("removes DART presentation-only table markup", () => {
    expect(
      sanitizeReportHtml(
        '<table class="nb" border="1" width="601"><colgroup><col width="123"></colgroup><tr height="30"><td width="114" height="24" align="RIGHT" valign="BOTTOM" style="font-size:12pt;" colspan="2">소 &nbsp;<span style="color:red">계</span><br></td></tr></table>',
      ),
    ).toBe('<table><tbody><tr><td colspan="2">소 계</td></tr></tbody></table>');
  });
});
