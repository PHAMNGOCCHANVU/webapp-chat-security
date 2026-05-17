/**
 * In-memory rate limiter dành riêng cho Socket.IO.
 * Express rate-limit middleware không áp dụng được cho Socket.IO events,
 * nên cần implement riêng dùng Map.
 *
 * Mặc định: tối đa 10 tin nhắn / 1 phút / userId
 */
export class SocketRateLimiter {
  private limits = new Map<string, { count: number; resetAt: number }>();

  /**
   * Kiểm tra xem userId có được phép thực hiện action không.
   * @param userId   ID của người dùng
   * @param maxCount Số lần tối đa trong cửa sổ thời gian (default: 10)
   * @param windowMs Cửa sổ thời gian tính bằng milliseconds (default: 60,000ms = 1 phút)
   * @returns true nếu được phép, false nếu vượt giới hạn
   */
  isAllowed(userId: string, maxCount = 10, windowMs = 60_000): boolean {
    const now = Date.now();
    const entry = this.limits.get(userId);

    // Tạo entry mới hoặc reset nếu đã hết cửa sổ thời gian
    if (!entry || now > entry.resetAt) {
      this.limits.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    // Vượt giới hạn
    if (entry.count >= maxCount) {
      return false;
    }

    // Tăng counter
    entry.count++;
    return true;
  }

  /**
   * Xóa các entries đã hết hạn để tránh memory leak.
   * Gọi định kỳ (ví dụ: mỗi 5 phút).
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Trả về số lần còn lại trong cửa sổ hiện tại của userId.
   */
  getRemainingCount(userId: string, maxCount = 10): number {
    const entry = this.limits.get(userId);
    if (!entry || Date.now() > entry.resetAt) return maxCount;
    return Math.max(0, maxCount - entry.count);
  }
}
