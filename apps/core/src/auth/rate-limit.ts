/**
 * Limitador de ventana deslizante en memoria. Suficiente mientras el core sea
 * un único proceso (ADR 003); si algún día hay varios, esto pasa a un almacén
 * compartido.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now: number = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const bucket = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    bucket.push(now);
    this.hits.set(key, bucket);
    // Poda ocasional para que las llaves frías no crezcan sin límite.
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => t <= cutoff)) this.hits.delete(k);
      }
    }
    return bucket.length <= this.max;
  }
}
