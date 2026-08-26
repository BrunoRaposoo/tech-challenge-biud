import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody: Record<string, unknown> = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };
    if (exception instanceof HttpException) {
      const resp = exception.getResponse() as Record<string, unknown>;
      responseBody.message = exception.message;
      if (resp?.errors) responseBody.errors = resp.errors;
    } else {
      responseBody.message = 'Internal server error';
    }
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
