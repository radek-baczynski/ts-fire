export class FireError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
    this.name = "FireError";
  }
}

export class CommandNotFoundError extends FireError {
  constructor(message: string) {
    super(message, 1);
    this.name = "CommandNotFoundError";
  }
}

export class FlagNotFoundError extends FireError {
  constructor(message: string) {
    super(message, 1);
    this.name = "FlagNotFoundError";
  }
}

export class InvariantViolationError extends FireError {
  constructor(message = "fire() requires a function or plain object") {
    super(message, 1);
    this.name = "InvariantViolationError";
  }
}
