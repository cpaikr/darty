import type { ViewReportNavigation } from "../../../../capabilities/view-report/contract.ts";
import type {
  SourceReportSection,
  SourceReportShell,
} from "./source-model.ts";

export type FlattenedSection = {
  readonly section: SourceReportSection;
  readonly parent?: SourceReportSection;
};

export const flattenSections = (
  sections: readonly SourceReportSection[],
  parent?: SourceReportSection,
): readonly FlattenedSection[] =>
  sections.flatMap((section) => {
    const entry: FlattenedSection =
      parent === undefined ? { section } : { section, parent };

    return [entry, ...flattenSections(section.children, section)];
  });

const toNavigationEntry = (section: SourceReportSection) => ({
  id: section.id,
  title: section.title,
});

export const buildReportNavigation = (
  shell: SourceReportShell,
  selectedSection: SourceReportSection | undefined,
): ViewReportNavigation | undefined => {
  if (selectedSection === undefined) {
    return undefined;
  }

  const flattened = flattenSections(shell.toc);
  const selectedIndex = flattened.findIndex(
    (entry) => entry.section.id === selectedSection.id,
  );
  const selectedEntry = flattened[selectedIndex];

  if (selectedEntry === undefined) {
    return undefined;
  }

  const previous = selectedIndex > 0 ? flattened[selectedIndex - 1] : undefined;
  const next =
    selectedIndex < flattened.length - 1
      ? flattened[selectedIndex + 1]
      : undefined;

  return {
    ...(selectedEntry.parent === undefined
      ? {}
      : { parent: toNavigationEntry(selectedEntry.parent) }),
    ...(previous === undefined
      ? {}
      : { previous: toNavigationEntry(previous.section) }),
    ...(next === undefined ? {} : { next: toNavigationEntry(next.section) }),
    children: selectedSection.children.map(toNavigationEntry),
  };
};
