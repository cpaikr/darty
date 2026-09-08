use std::{collections::BTreeMap, sync::LazyLock};

use serde::{Deserialize, Serialize};

use crate::{DartyClient, DartyError, Warning};

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DisclosureTypesRequest {
    #[serde(
        default,
        deserialize_with = "crate::models::present_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub category: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::models::present_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub query: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReportGuideRequest {}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisclosureCategory {
    pub category: String,
    pub category_label: String,
    pub category_description: String,
    pub items: Vec<DisclosureCode>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DisclosureCode {
    pub code: String,
    pub label: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisclosureTypesPayload {
    pub request: DisclosureTypesRequest,
    pub total_count: usize,
    pub categories: Vec<DisclosureCategory>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CatalogSource {
    pub system: String,
    pub repository: String,
    pub commit: String,
    pub path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryLabelSource {
    pub system: String,
    pub url: String,
    pub code_set: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DescriptionProvenance {
    pub status: String,
    pub basis: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSourceBehavior {
    pub code_set: String,
    pub category_code_set: String,
    pub observation_status: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisclosureTypesMetadata {
    pub source: CatalogSource,
    pub category_label_source: CategoryLabelSource,
    pub category_description_provenance: DescriptionProvenance,
    pub source_behavior: CatalogSourceBehavior,
    pub completeness: crate::Completeness,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogReferences {
    pub source_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DisclosureTypesResponse {
    pub result: DisclosureTypesPayload,
    pub metadata: DisclosureTypesMetadata,
    pub references: CatalogReferences,
    pub warnings: Vec<Warning>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportGuidePayload {
    pub request: ReportGuideRequest,
    pub title: String,
    pub content_markdown: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BundledGuideSource {
    pub status: String,
    pub path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReportGuideMetadata {
    pub source: BundledGuideSource,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportGuideReferences {
    pub guide_path: String,
    pub source_urls: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReportGuideResponse {
    pub result: ReportGuidePayload,
    pub metadata: ReportGuideMetadata,
    pub references: ReportGuideReferences,
    pub warnings: Vec<Warning>,
}

static CATALOG: LazyLock<DisclosureTypesResponse> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../resources/disclosure-types.json"))
        .expect("bundled catalog is validated by static consumer tests")
});
static GUIDE: LazyLock<ReportGuideResponse> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../resources/report-guide.json"))
        .expect("bundled guide is validated by static consumer tests")
});

impl DartyClient {
    /// Filters the bundled disclosure catalog without a provider request.
    ///
    /// # Errors
    /// Returns an invalid-request error for an unknown category or empty query.
    pub fn disclosure_types(
        &self,
        mut request: DisclosureTypesRequest,
    ) -> Result<DisclosureTypesResponse, DartyError> {
        if let Some(category) = &mut request.category {
            *category = category.trim().to_ascii_uppercase();
            if category.len() != 1 || !(b'A'..=b'J').contains(&category.as_bytes()[0]) {
                return Err(DartyError::invalid(
                    "category must be one of A, B, C, D, E, F, G, H, I, J.",
                    "category",
                    "Use a category from A through J.",
                ));
            }
        }
        if let Some(query) = &mut request.query {
            *query = query.trim().to_owned();
            if query.is_empty() {
                return Err(DartyError::invalid(
                    "query cannot be empty.",
                    "query",
                    "Use a non-empty code or Korean label.",
                ));
            }
        }
        let mut response = CATALOG.clone();
        response.result.categories.retain(|group| {
            request
                .category
                .as_ref()
                .is_none_or(|category| *category == group.category)
        });
        if let Some(query) = &request.query {
            let query = query.to_lowercase();
            for group in &mut response.result.categories {
                group.items.retain(|item| {
                    item.code.to_lowercase().contains(&query)
                        || item.label.to_lowercase().contains(&query)
                });
            }
            response
                .result
                .categories
                .retain(|group| !group.items.is_empty());
        }
        response.result.total_count = response
            .result
            .categories
            .iter()
            .map(|group| group.items.len())
            .sum();
        if let Some(query) = &request.query {
            let mut labels: BTreeMap<&str, Vec<String>> = BTreeMap::new();
            let mut order = Vec::new();
            for group in &response.result.categories {
                for item in &group.items {
                    if !labels.contains_key(item.label.as_str()) {
                        order.push(item.label.as_str());
                    }
                    labels.entry(&item.label).or_default().push(format!(
                        "{}({}={})",
                        item.code, group.category, group.category_label
                    ));
                }
            }
            for label in order {
                let matches = &labels[label];
                if matches.len() > 1 {
                    response.warnings.push(Warning { code: "ambiguous_label_match".to_owned(), message: format!("Query \"{query}\" returned detailed codes with the same label (\"{label}\") in multiple categories: {}. Inspect categoryLabel or narrow with category/--category.", matches.join(", ")), dropped_item_count: None });
                }
            }
        }
        response.result.request = request;
        Ok(response)
    }

    /// Returns the compiled guide; no runtime file or network access is needed.
    pub fn report_guide(&self, _request: ReportGuideRequest) -> ReportGuideResponse {
        GUIDE.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_filters_preserve_provenance_and_ambiguity() {
        let client = DartyClient::new().unwrap();
        let full = client
            .disclosure_types(DisclosureTypesRequest::default())
            .unwrap();
        assert_eq!(full.result.categories.len(), 10);
        let filtered = client
            .disclosure_types(DisclosureTypesRequest {
                category: Some(" a ".into()),
                query: Some("a001".into()),
            })
            .unwrap();
        assert_eq!(filtered.result.total_count, 1);
        assert_eq!(filtered.result.categories[0].items[0].label, "사업보고서");
        assert_eq!(filtered.metadata, full.metadata);
        let ambiguous = client
            .disclosure_types(DisclosureTypesRequest {
                query: Some("주요사항보고서".into()),
                ..Default::default()
            })
            .unwrap();
        assert!(
            ambiguous
                .warnings
                .iter()
                .any(|warning| warning.code == "ambiguous_label_match")
        );
        assert!(
            client
                .disclosure_types(DisclosureTypesRequest {
                    query: Some(" ".into()),
                    ..Default::default()
                })
                .is_err()
        );
    }

    #[test]
    fn guide_is_bundled_and_unknown_inputs_fail() {
        let guide = DartyClient::new()
            .unwrap()
            .report_guide(ReportGuideRequest {});
        assert!(
            guide
                .result
                .content_markdown
                .starts_with("# DART report information guide")
        );
        assert_eq!(guide.references.guide_path, guide.metadata.source.path);
        assert!(serde_json::from_str::<ReportGuideRequest>(r#"{"extra":true}"#).is_err());
    }
}
