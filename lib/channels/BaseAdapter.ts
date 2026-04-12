// ════════════════════════════════════════════════════════════
// BASE CHANNEL ADAPTER
// Shared functionality across all platform adapters
// ════════════════════════════════════════════════════════════

import { Platform } from "@/types";
import {
  IChannelAdapter,
  RateLimitConfig,
  RateLimitStatus,
  ChannelAdapterError,
  AdapterErrorContext,
} from "./types";

/**
 * Base class for all channel adapters
 * Provides shared rate limiting, retry logic, and error handling
 */
export abstract class BaseChannelAdapter implements IChannelAdapter {
  abstract platform: Platform;

  // Rate limiting configuration
  protected rateLimitConfig: RateLimitConfig = {
    requestsPerSecond: 1,
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    retryAttempts: 3,
    initialBackoffMs: 1000,
  };

  // Request tracking for rate limiting
  protected requestTimestamps: number[] = [];
  protected rateLimitReset: Map<string, Date> = new Map();

  /**
   * Check if rate limit is exceeded
   */
  protected checkRateLimit(key: string = 'default'): RateLimitStatus {
    const now = Date.now();
    const resetAt = this.rateLimitReset.get(key);

    if (resetAt && now < resetAt.getTime()) {
      return {
        isLimited: true,
        resetAt,
        retryAfterMs: resetAt.getTime() - now,
      };
    }

    // Clean up old timestamps (older than 1 hour)
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < 3600000
    );

    const { requestsPerSecond, requestsPerMinute, requestsPerHour } =
      this.rateLimitConfig;

    const lastSecond = this.requestTimestamps.filter((ts) => now - ts < 1000).length;
    const lastMinute = this.requestTimestamps.filter((ts) => now - ts < 60000).length;

    if (lastSecond >= requestsPerSecond) {
      const resetTime = new Date(now + 1100);
      this.rateLimitReset.set(key, resetTime);
      return {
        isLimited: true,
        resetAt: resetTime,
        retryAfterMs: 1100,
      };
    }

    if (lastMinute >= requestsPerMinute) {
      const resetTime = new Date(now + 61000);
      this.rateLimitReset.set(key, resetTime);
      return {
        isLimited: true,
        resetAt: resetTime,
        retryAfterMs: 61000,
      };
    }

    if (this.requestTimestamps.length >= requestsPerHour) {
      const resetTime = new Date(now + 3600000);
      this.rateLimitReset.set(key, resetTime);
      return {
        isLimited: true,
        resetAt: resetTime,
        retryAfterMs: 3600000,
      };
    }

    return {
      isLimited: false,
      resetAt: new Date(),
      retryAfterMs: 0,
    };
  }

  /**
   * Record a request for rate limiting
   */
  protected recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Exponential backoff helper
   */
  protected async sleep(attempt: number): Promise<void> {
    const delay =
      this.rateLimitConfig.initialBackoffMs * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Wrap any operation with retry logic and error handling
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: Omit<AdapterErrorContext, 'error' | 'lastRetryAt'>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (
      let attempt = 0;
      attempt <= this.rateLimitConfig.retryAttempts;
      attempt++
    ) {
      try {
        // Check rate limit
        const rateLimit = this.checkRateLimit(context.operation);
        if (rateLimit.isLimited) {
          await new Promise((resolve) =>
            setTimeout(resolve, rateLimit.retryAfterMs)
          );
        }

        const result = await operation();
        this.recordRequest();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Determine if retryable
        const isRetryable =
          error instanceof ChannelAdapterError
            ? error.retryable
            : false;

        if (!isRetryable || attempt === this.rateLimitConfig.retryAttempts) {
          throw this.normalizeError(error, context);
        }

        // Log retry attempt
        console.warn(
          `[${context.platform}] ${context.operation} failed (attempt ${attempt + 1}/${this.rateLimitConfig.retryAttempts}), retrying...`,
          lastError.message
        );

        await this.sleep(attempt);
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Normalize errors to ChannelAdapterError
   */
  protected normalizeError(
    error: unknown,
    context: Omit<AdapterErrorContext, 'lastRetryAt'> & { retryCount?: number }
  ): ChannelAdapterError {
    if (error instanceof ChannelAdapterError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);

    // Check for common error patterns
    if (message.includes('401') || message.includes('Unauthorized')) {
      return new ChannelAdapterError(
        context.platform,
        'INVALID_TOKEN',
        'Access token expired or invalid',
        401,
        true
      );
    }

    if (message.includes('429') || message.includes('rate')) {
      return new ChannelAdapterError(
        context.platform,
        'RATE_LIMITED',
        'Rate limit exceeded',
        429,
        true
      );
    }

    if (message.includes('404') || message.includes('not found')) {
      return new ChannelAdapterError(
        context.platform,
        'NOT_FOUND',
        'Resource not found',
        404,
        false
      );
    }

    return new ChannelAdapterError(
      context.platform,
      'UNKNOWN_ERROR',
      message,
      undefined,
      false
    );
  }

  /**
   * Validate base requirements for all adapters
   */
  protected validateParams(params: Record<string, unknown>): void {
    const required = ['accessToken', 'pageAccessToken'];
    const hasRequired = required.some((key) => params[key]);

    if (!hasRequired) {
      throw new ChannelAdapterError(
        this.platform,
        'MISSING_TOKEN',
        'Access token or page access token is required'
      );
    }
  }

  // Abstract methods that each adapter must implement
  abstract fetchComments(params: any): Promise<any[]>;
  abstract fetchDirectMessages(params: any): Promise<any[]>;
  abstract sendReply(params: any): Promise<{ externalId: string }>;
}
