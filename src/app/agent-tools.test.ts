import { describe, expect, test } from "bun:test";

import {
  dartyAgentToolDefinitions,
  dartyAgentToolNames,
  dartyAgentTools,
  getDartyAgentTool,
  isDartyAgentToolName,
} from "./agent-tools.ts";

describe("agent-native darty tool definitions", () => {
  test("exposes namespaced tool names over stable internal operations", () => {
    expect(dartyAgentToolNames).toEqual([
      "darty_search_body",
      "darty_search_company",
      "darty_search_company_reports",
      "darty_get_company_detail",
      "darty_get_company_rss",
      "darty_view_report",
    ]);

    expect(dartyAgentTools.map((tool) => tool.operationName)).toEqual([
      "search-body",
      "search-company",
      "search-company-reports",
      "company-detail",
      "company-rss",
      "view-report",
    ]);
  });

  test("uses capability schemas as typed tool parameters and result contracts", () => {
    const searchBody = getDartyAgentTool("darty_search_body").definition.function;
    const searchCompany = getDartyAgentTool("darty_search_company").definition.function;
    const searchCompanyReports = getDartyAgentTool(
      "darty_search_company_reports",
    ).definition.function;
    const companyDetail = getDartyAgentTool(
      "darty_get_company_detail",
    ).definition.function;
    const companyRss = getDartyAgentTool("darty_get_company_rss").definition.function;
    const viewReport = getDartyAgentTool("darty_view_report").definition.function;

    expect(searchBody.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["keyword", "startDate", "endDate"],
    });
    expect(searchCompany.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["companyName"],
    });
    expect(searchCompanyReports.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["companyCode", "startDate", "endDate"],
    });
    expect(companyDetail.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["companyCode"],
    });
    expect(companyRss.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["companyCode"],
    });
    expect(viewReport.parameters).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["receipt"],
    });

    for (const tool of [
      searchBody,
      searchCompany,
      searchCompanyReports,
      companyDetail,
      companyRss,
      viewReport,
    ]) {
      expect(
        ((tool.parameters as { examples?: readonly unknown[] }).examples ?? [])
          .length,
      ).toBeGreaterThan(0);
    }

    expect(getDartyAgentTool("darty_search_body").resultJsonSchema).toMatchObject({
      type: "object",
      required: ["result", "metadata", "references", "warnings"],
    });
  });

  test("publishes OpenAI-compatible function tool definitions", () => {
    expect(dartyAgentToolDefinitions).toHaveLength(6);
    expect(dartyAgentToolDefinitions.map((tool) => tool.type)).toEqual([
      "function",
      "function",
      "function",
      "function",
      "function",
      "function",
    ]);
    expect(dartyAgentToolDefinitions.map((tool) => tool.function.name)).toEqual(
      [...dartyAgentToolNames],
    );
    expect(dartyAgentToolDefinitions.every((tool) => tool.function.description.length > 0)).toBe(
      true,
    );
  });

  test("recognizes only the exposed darty tool namespace", () => {
    expect(isDartyAgentToolName("darty_search_body")).toBe(true);
    expect(isDartyAgentToolName("search-body")).toBe(false);
    expect(isDartyAgentToolName("dart_search_body")).toBe(false);
  });
});
