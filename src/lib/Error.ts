export class InvalidArgumentError extends Error {
  constructor(argumentName: string, message: string) {
    super(`Invalid argument: ${argumentName}. ${message}`);
    this.name = "InvalidArgumentError";
  }
}
