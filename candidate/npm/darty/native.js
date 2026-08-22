import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const loadNative = () => {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    throw new Error(
      `The Darty vertical candidate has no native artifact for ${process.platform}-${process.arch}.`,
    );
  }

  return require("@sjunepark/darty-darwin-arm64/darty.node");
};
