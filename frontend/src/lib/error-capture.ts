// Keeps track of the last uncaught error on the server so server.ts can
// surface a real error page instead of a generic swallowed 500 response.
let lastCapturedError: unknown;

function capture(error: unknown) {
  lastCapturedError = error;
}

if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("uncaughtException", capture);
  process.on("unhandledRejection", capture);
}

export function consumeLastCapturedError(): unknown {
  const error = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
