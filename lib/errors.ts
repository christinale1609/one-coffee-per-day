/** An error whose message is safe to show the user, with the HTTP status to send. */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
