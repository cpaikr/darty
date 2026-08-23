export interface NativeDartyClient {
  registerOperation(operationId: string): void;
  cancelOperation(operationId: string): boolean;
  executeOperation(operationId: string, operation: string, inputJson: string): Promise<string>;
}

export interface NativeModule {
  NativeDartyClient: new () => NativeDartyClient;
  version: () => string;
}

export function loadNative(): NativeModule;
