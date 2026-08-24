import { describe, expect, test } from "bun:test";

import { SourceChanged } from "../../errors.ts";
import { createDartSourceTextResponse } from "../../source-response.ts";
import { parseReportShell } from "./parse-shell.ts";

const sourceResponse = (html: string, receiptNumber: string) =>
  createDartSourceTextResponse(
    html,
    `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNumber}`,
  );

const shellHtml = `
<html>
<head><title>sample</title></head>
<body>
<script>
var treeData = [];
var node1 = {};
node1['text'] = "I. 회사의 개요";
node1['id'] = "3";
node1['rcpNo'] = "20260331004166";
node1['dcmNo'] = "11213016";
node1['eleId'] = "3";
node1['offset'] = "6106";
node1['length'] = "63439";
node1['dtd'] = "dart4.xsd";
node1['tocNo'] =  "3";
node1['children'] = [];
var node2 = {};
node2['text'] = "1. 회사의 개요";
node2['id'] = "4";
node2['rcpNo'] = "20260331004166";
node2['dcmNo'] = "11213016";
node2['eleId'] = "4";
node2['offset'] = "6233";
node2['length'] = "10257";
node2['dtd'] = "dart4.xsd";
node2['tocNo'] =  "4";
node1['children'].push(node2);
treeData.push(node1);
viewDoc("20260331004166", "11213016", "3", "6106", "63439", "dart4.xsd", "");
</script>
<select id="family">
  <option value="null">+본문선택+</option>
  <option value="rcpNo=20260331004166" selected title="사업보고서">2026.03.31 사업보고서</option>
</select>
<select id="att">
  <option value="null">+첨부선택+</option>
  <option value="rcpNo=20260331004166&amp;dcmNo=11213015">2026.03.31 감사보고서</option>
</select>
</body>
</html>
`;

const noTocShellHtml = `
<html>
<body>
<script>
var treeData = [];
viewDoc("20260331904807", "11216440", "0", "0", "0", "HTML", "");
</script>
<select id="family">
  <option value="rcpNo=20260331904807" selected title="정기주주총회결과">2026.03.31 정기주주총회결과</option>
</select>
<select id="att"><option value="null">+첨부선택+</option></select>
</body>
</html>
`;

describe("parseReportShell", () => {
  test("parses documents, TOC, and the initial viewer locator", () => {
    const shell = parseReportShell(sourceResponse(shellHtml, "20260331004166"));

    expect(shell.selectedDocument).toMatchObject({
      id: "document:body:1",
      title: "사업보고서",
      kind: "body",
      selected: true,
      query: "rcpNo=20260331004166",
    });
    expect(shell.documents).toHaveLength(2);
    expect(shell.documents[1]).toMatchObject({
      id: "document:attachment:1",
      title: "2026.03.31 감사보고서",
      query: "rcpNo=20260331004166&dcmNo=11213015",
    });
    expect(shell.toc).toEqual([
      {
        id: "section:1",
        title: "I. 회사의 개요",
        locator: {
          rcpNo: "20260331004166",
          dcmNo: "11213016",
          eleId: "3",
          offset: "6106",
          length: "63439",
          dtd: "dart4.xsd",
          tocNo: "3",
        },
        children: [
          {
            id: "section:1.1",
            title: "1. 회사의 개요",
            locator: {
              rcpNo: "20260331004166",
              dcmNo: "11213016",
              eleId: "4",
              offset: "6233",
              length: "10257",
              dtd: "dart4.xsd",
              tocNo: "4",
            },
            children: [],
          },
        ],
      },
    ]);
    expect(shell.initialViewLocator).toMatchObject({
      rcpNo: "20260331004166",
      dcmNo: "11213016",
      eleId: "3",
      offset: "6106",
      length: "63439",
      dtd: "dart4.xsd",
    });
  });

  test("keeps no-TOC documents addressable through their initial locator", () => {
    const shell = parseReportShell(
      sourceResponse(noTocShellHtml, "20260331904807"),
    );

    expect(shell.toc).toEqual([]);
    expect(shell.initialViewLocator).toEqual({
      rcpNo: "20260331904807",
      dcmNo: "11216440",
      eleId: "0",
      offset: "0",
      length: "0",
      dtd: "HTML",
      tocNo: "",
    });
  });

  test("parses minified, reordered statements while ignoring comments and strings", () => {
    const html = `
      <select id="family"><option value="rcpNo=20260331004166" selected>사업보고서</option></select>
      <select id="att"><option value="null">첨부</option></select>
      <script>
        const fake = "treeData.push(node99); viewDoc('99999999999999','bad','0','0','0','bad')";
        /* node99['text'] = "comment"; treeData.push(node99); */
        var treeData=[]; node1["children"].push(node2);
        node1['dtd']="dart4.xsd"; node1['offset']="100"; var node1={}; var node2={};
        node2['dcmNo']="11213016"; node2['rcpNo']="20260331004166"; node2['text']="Child";
        node1['length']="900"; node1['eleId']="1"; node1['dcmNo']="11213016";
        node1['rcpNo']="20260331004166"; node1['text']="Root"; node1['eleId']="0";
        node2['eleId']="2"; node2['offset']="150"; node2['length']="300"; node2['dtd']="dart4.xsd";
        treeData.push(node1); viewDoc("99999999999999","stale","0","0","0","bad");
        viewDoc("20260331004166","11213016","0","100","900","dart4.xsd");
      </script>
    `;

    const shell = parseReportShell(sourceResponse(html, "20260331004166"));

    expect(shell.toc).toHaveLength(1);
    expect(shell.toc[0]?.children[0]?.title).toBe("Child");
    expect(shell.initialViewLocator).toMatchObject({
      rcpNo: "20260331004166",
      dcmNo: "11213016",
      offset: "100",
    });
  });

  test("ignores fake viewer calls inside regex literals", () => {
    const html = `
      <select id="family"><option value="rcpNo=20260331004166" selected>사업보고서</option></select>
      <script>
        const fake = /viewDoc\\("99999999999999","bad"\\)[/] treeData\\.push\\(node99\\)/g;
        var treeData=[]; var node1={};
        node1['text']="Root"; node1['rcpNo']="20260331004166"; node1['dcmNo']="11213016";
        node1['eleId']="1"; node1['offset']="1"; node1['length']="1"; node1['dtd']="dart4.xsd";
        treeData.push(node1); viewDoc("20260331004166","11213016","1","1","1","dart4.xsd");
      </script>
    `;

    const shell = parseReportShell(sourceResponse(html, "20260331004166"));

    expect(shell.toc).toHaveLength(1);
    expect(shell.initialViewLocator?.dcmNo).toBe("11213016");
  });

  test("ignores regex literals after control-flow parentheses", () => {
    const html = `
      <select id="family"><option value="rcpNo=20260331004166" selected>사업보고서</option></select>
      <script>
        var treeData=[]; var node1={};
        node1['text']="Root"; node1['rcpNo']="20260331004166"; node1['dcmNo']="11213016";
        node1['eleId']="1"; node1['offset']="1"; node1['length']="1"; node1['dtd']="dart4.xsd";
        treeData.push(node1);
        if (ok) /viewDoc("20260331004166","11213016","9","9","9","dart4.xsd")/.test(value);
        viewDoc("20260331004166","11213016","1","1","1","dart4.xsd");
      </script>
    `;

    const shell = parseReportShell(sourceResponse(html, "20260331004166"));

    expect(shell.initialViewLocator).toMatchObject({
      rcpNo: "20260331004166",
      dcmNo: "11213016",
      offset: "1",
    });
  });

  test("keeps division after an ordinary closing parenthesis tokenized", () => {
    const html = `
      <select id="family"><option value="rcpNo=20260331004166" selected>사업보고서</option></select>
      <script>
        var treeData=[]; var node1={};
        node1['text']="Root"; node1['rcpNo']="20260331004166"; node1['dcmNo']="11213016";
        node1['eleId']="1"; node1['offset']="1"; node1['length']="1"; node1['dtd']="dart4.xsd";
        treeData.push(node1);
        const ratio = (total) / divisor;
        const propertyRatio = helper.if() / divisor;
        viewDoc("20260331004166","11213016","1","1","1","dart4.xsd");
      </script>
    `;

    const shell = parseReportShell(sourceResponse(html, "20260331004166"));

    expect(shell.initialViewLocator).toMatchObject({
      rcpNo: "20260331004166",
      dcmNo: "11213016",
      offset: "1",
    });
  });

  test("rejects a declared TOC whose roots are not usable sections", () => {
    const html = `
      <select id="family"><option value="rcpNo=20260331004166" selected>사업보고서</option></select>
      <script>var treeData=[]; var node1={}; node1['text']="incomplete"; treeData.push(node1);</script>
    `;

    expect(() => parseReportShell(sourceResponse(html, "20260331004166"))).toThrow(
      SourceChanged,
    );
  });

  test.each([
    `node1['children'].push(node2); var node1={};`,
    `node1['children'].push(node1); var node1={};`,
    `var node1={}; var node2={}; treeData.push(node1);`,
    `node1['children'].push(notANode); var node1={};`,
    `node1['children'] = [node2]; var node1={};`,
    `treeData.push(notANode); var node1={};`,
  ])("rejects the partial, cyclic, or orphan TOC graph %p", (graph) => {
    const html = `
        <select id="family"><option value="rcpNo=20260331004166" selected>사업보고서</option></select>
        <script>
          var treeData=[]; ${graph}
          node1['text']="Root"; node1['rcpNo']="20260331004166"; node1['dcmNo']="11213016";
          node1['eleId']="1"; node1['offset']="1"; node1['length']="1"; node1['dtd']="dart4.xsd";
          treeData.push(node1);
        </script>
      `;

    expect(() => parseReportShell(sourceResponse(html, "20260331004166"))).toThrow(
      SourceChanged,
    );
  });

  test("rejects mixed document locators in a bare receipt shell", () => {
    const html = `
      <select id="family"><option value="rcpNo=20260331004166" selected>사업보고서</option></select>
      <script>
        var treeData=[]; var node1={}; var node2={};
        node1['text']="Root"; node1['rcpNo']="20260331004166"; node1['dcmNo']="11213016";
        node1['eleId']="1"; node1['offset']="1"; node1['length']="1"; node1['dtd']="dart4.xsd";
        node2['text']="Other"; node2['rcpNo']="20260331004166"; node2['dcmNo']="11213015";
        node2['eleId']="2"; node2['offset']="2"; node2['length']="1"; node2['dtd']="dart4.xsd";
        treeData.push(node1); treeData.push(node2);
        viewDoc("20260331004166","11213016","1","1","1","dart4.xsd");
      </script>
    `;

    expect(() => parseReportShell(sourceResponse(html, "20260331004166"))).toThrow(
      SourceChanged,
    );
  });

  test("does not return stale locators or selector queries for another receipt", () => {
    const html = `
      <select id="family">
        <option value="rcpNo=20260331004166" selected>사업보고서</option>
        <option value="rcpNo=19990101000000&amp;dcmNo=stale">오래된 보고서</option>
      </select>
      <script>
        var treeData=[]; var node1={};
        node1['text']="stale"; node1['rcpNo']="19990101000000"; node1['dcmNo']="stale";
        node1['eleId']="1"; node1['offset']="1"; node1['length']="1"; node1['dtd']="dart4.xsd";
        treeData.push(node1); viewDoc("19990101000000","stale","1","1","1","dart4.xsd");
      </script>
    `;

    expect(() => parseReportShell(sourceResponse(html, "20260331004166"))).toThrow(
      SourceChanged,
    );
  });

  test("binds attachment shells to the requested dcmNo", () => {
    const html = `
      <select id="family"><option value="rcpNo=20260331004166">사업보고서</option></select>
      <select id="att">
        <option value="rcpNo=20260331004166&amp;dcmNo=11213015" selected>감사보고서</option>
      </select>
      <script>
        var treeData=[]; var node1={};
        node1['text']="Attachment"; node1['rcpNo']="20260331004166"; node1['dcmNo']="11213015";
        node1['eleId']="1"; node1['offset']="1"; node1['length']="1"; node1['dtd']="dart4.xsd";
        treeData.push(node1); viewDoc("20260331004166","11213015","1","1","1","dart4.xsd");
      </script>
    `;

    const shell = parseReportShell(
      createDartSourceTextResponse(
        html,
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166&dcmNo=11213015",
      ),
    );

    expect(shell.selectedDocument.id).toBe("document:attachment:1");
    expect(shell.toc[0]?.locator.dcmNo).toBe("11213015");
  });
});
