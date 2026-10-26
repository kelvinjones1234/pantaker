export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}

export class StorageOperationError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageOperationError";
  }
}

export class ObjectKeyError extends Error {
  constructor(message = "That image reference is invalid.") {
    super(message);
    this.name = "ObjectKeyError";
  }
}

export class ImageValidationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 = 400,
  ) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof StorageConfigError) return error.message;
  if (error instanceof StorageOperationError) return error.message;
  if (error instanceof ObjectKeyError) return error.message;
  if (error instanceof ImageValidationError) return error.message;
  return fallback;
}
