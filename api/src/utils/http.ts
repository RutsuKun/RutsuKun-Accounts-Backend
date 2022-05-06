import { Logger, Req, Res } from "@tsed/common";
import e, { Request, Response } from "express";

import { LoggerService } from "@services/LoggerService";

class HTTP {
  public static NotImplemented(
    req: Req,
    res: Response,
  ) {
    try {
      return res.status(HTTPCodes.NotImplemented).json({
        status: "error",
        error: `Method ${req.method} on route ${req.baseUrl} not implemented yet`,
      });
    } catch (_) {
      // shall do nothing
    }
  }

  public static ResourceNotFound(
    id: Number | String,
    req: Request,
    res: Response,
    logger: Logger,
    supressLog = false
  ) {
    if (!supressLog) {
      logger.warn("System failed to find resource " + id + ".", {
        body: req.body,
        parameters: req.params,
        query: req.query,
        route: req.route,
      });
    }
    try {
      return res.status(HTTPCodes.NotFound).json({
        status: "error",
        error: "Failed to find resource " + id,
      });
    } catch (_) {
      // shall do nothing
    }
  }

  public static BadRequest(message: string | object, req: Request, res: Response, logger: Logger) {
    logger.warn(`System received a bad request (${message})`, {
      body: req.body,
      parameters: req.params,
      query: req.query,
      route: req.route,
    });
    try {
      let response: any = {
        status: "error",
        message
      };

      const isString = typeof message === "string";
      if (!isString) {
        response = {
          status: "error",
          ...message
        };
      }
      return res.status(HTTPCodes.BadRequest).json(response);
    } catch (_) {
      // shall do nothing
    }
  }

  public static Unauthorized(
    req: Request,
    res: Response,
    logger: Logger,
    user?: string
  ) {
    logger.warn(
      (user ? "User " + user + " " : "Someone ") +
        "Tried to make a request with a unauthorized access.",
      {
        body: req.body,
        parameters: req.params,
        query: req.query,
        route: req.route,
      }
    );
    try {
      return res.status(HTTPCodes.Unauthorized).json({
        status: "error",
        error: "Account is unauthorized",
      });
    } catch (_) {
      // shall do nothing
    }
  }

  public static Forbidden(
    id: number | string,
    req: Request,
    res: Response,
  ) {
    try {
      return res.status(HTTPCodes.Forbidden).json({
        status: "error",
        error: `You cannot access the resource ${id}`
      });
    } catch (_) {
      // shall do nothing
    }
  }

  public static InternalServerError(
    req: Request,
    res: Response,
    logger: LoggerService
  ) {
    return (error: Error, supressDB = false) => {
      logger.warn(
        "An error ocurred trying to process: " + error.message,
        error,
        supressDB
      );
      try {
        res.status(HTTPCodes.InternalServerError).json({
          status: "error",
          error: "Internal Server error: " + error.message,
        });
      } catch (_) {
        // shall do nothing
      }
    };
  }

  public static OAuth2InvalidRequest(req: Req, res: Res, description) {
    return res.status(HTTPCodes.BadRequest).json({
      error: "invalid_request",
      description: description,
    });
  }
}

enum HTTPCodes {
  Continue = 100,
  SwitchingProtocols = 101,
  OK = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  IMUsed = 226,
  MultipleChoices = 300,
  MovedPermanently = 301,
  Found = 302,
  SeeOther = 303,
  NotModified = 304,
  UseProxy = 305,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  RequestEntityTooLarge = 413,
  RequestURITooLong = 414,
  UnsupportedMediaType = 415,
  RequestedRangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  NoResponse = 444,
  UnavailableForLegalReasons = 451,
  ClientClosedRequest = 499,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HTTPVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511,
  NetworkReadTimeoutError = 598,
  NetworkConnectTimeoutError = 599,
}

export { HTTP, HTTPCodes };
