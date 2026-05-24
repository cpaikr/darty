export const companyRssMessages = {
  sourceUnavailable: "Could not fetch DART company disclosure RSS.",
  xmlDecodeFailure: "Could not read DART company disclosure RSS XML.",
  missingChannel: "Could not find the channel in DART company disclosure RSS.",
  missingChannelTitle: "Could not find the channel title in DART company disclosure RSS.",
  missingChannelLink: "Could not find the channel link in DART company disclosure RSS.",
  missingItemField: "Could not find a required field in a DART company disclosure RSS item.",
  sourceSchemaMismatch: "DART company disclosure RSS did not match the expected schema.",
  internalProvider: "Unexpected internal error while processing DART company disclosure RSS.",
} as const;
