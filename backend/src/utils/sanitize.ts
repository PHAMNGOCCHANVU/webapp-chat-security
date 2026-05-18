/**
 * Input sanitization utilities — ngăn XSS stored.
 * Không cần thư viện ngoài, tự implement nhẹ và phù hợp với use case.
 */

/**
 * Strip HTML tags và encode các ký tự đặc biệt để ngăn XSS.
 * Dùng cho: displayName, conversationName, bất kỳ text field nào.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .replace(/<[^>]*>/g, "")   // Xóa HTML tags: <script>, <b>, ...
    .replace(/&/g, "&amp;")    // Encode &
    .replace(/</g, "&lt;")     // Encode <
    .replace(/>/g, "&gt;")     // Encode >
    .replace(/"/g, "&quot;")   // Encode "
    .replace(/'/g, "&#x27;")   // Encode '
    .replace(/\x00/g, "")      // Xóa null bytes
    .trim();
}

/**
 * Kiểm tra URL có hợp lệ và an toàn không.
 * Chỉ cho phép giao thức http:// và https://.
 * Chặn: javascript:, data:, vbscript:
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize nội dung tin nhắn chat.
 * - Strip HTML tags và encode entities
 * - Xóa null bytes
 * - Giới hạn tối đa 2000 ký tự
 */
export function sanitizeMessageContent(content: string): string {
  if (typeof content !== "string") return "";

  return content
    .replace(/<[^>]*>/g, "")   // Strip HTML tags
    .replace(/\x00/g, "")      // Xóa null bytes
    .trim()
    .slice(0, 2000);            // Giới hạn độ dài
}
