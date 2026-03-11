class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRatePerMs: number, // tokens per millisecond
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    // Calculate wait time until we have enough tokens
    const needed = tokens - this.tokens;
    const waitMs = needed / this.refillRatePerMs;

    await new Promise<void>((resolve) => setTimeout(resolve, Math.ceil(waitMs)));

    this.refill();
    this.tokens = Math.max(0, this.tokens - tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;
  }
}

// 80 requests per minute = 80 / 60_000 tokens per ms
export const redditRateLimiter = new TokenBucket(80, 80 / 60_000);
