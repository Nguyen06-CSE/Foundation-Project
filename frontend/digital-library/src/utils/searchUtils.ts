// frontend/digital-library/src/utils/searchUtils.ts

/**
 * Bỏ dấu tiếng Việt, chuyển về chữ thường và chuẩn hóa khoảng trắng
 */
export function removeVietnameseTones(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Tính khoảng cách Levenshtein giữa 2 chuỗi
 */
export function getLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Thay thế
          matrix[i][j - 1] + 1,     // Chèn
          matrix[i - 1][j] + 1      // Xóa
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Kiểm tra 2 token có khớp fuzzy / contain / typo hay không
 */
export function isTokenMatch(
  qToken: string,
  tToken: string
): { matched: boolean; score: number } {
  if (qToken === tToken) return { matched: true, score: 1.0 };

  // Khớp chuỗi con (contain)
  if (tToken.includes(qToken)) return { matched: true, score: 0.85 };
  if (qToken.includes(tToken) && tToken.length >= 3) {
    return { matched: true, score: 0.75 };
  }

  // Khớp typo Levenshtein
  const maxLen = Math.max(qToken.length, tToken.length);
  const dist = getLevenshteinDistance(qToken, tToken);

  // Cho phép sai số dựa theo độ dài từ:
  // Từ <= 3 ký tự: dist <= 1
  // Từ 4 - 6 ký tự: dist <= 2 (ví dụ csss vs csdl: len=4, dist=2)
  // Từ > 6 ký tự: dist <= 3
  const maxAllowedDist = maxLen <= 3 ? 1 : maxLen <= 6 ? 2 : 3;

  if (dist <= maxAllowedDist) {
    const similarity = 1 - dist / maxLen;
    if (similarity >= 0.45) {
      return { matched: true, score: 0.65 * similarity };
    }
  }

  return { matched: false, score: 0 };
}

/**
 * Trích xuất từ viết tắt của một chuỗi tiếng Việt (ví dụ "Co So Du Lieu" -> "csdl")
 */
export function getAcronym(str?: string | null): string {
  const norm = removeVietnameseTones(str);
  if (!norm) return "";
  return norm
    .split(/[\s,./\-_()]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("");
}

export interface FuzzyMatchResult {
  isMatch: boolean;
  score: number;
}

/**
 * So khớp chuỗi query với target (tiêu đề, tên khoa, môn, mô tả v.v.)
 * Trả về isMatch: true và score tương ứng để xếp hạng độ liên quan.
 */
export function matchFuzzyContain(
  query: string,
  ...targets: (string | null | undefined)[]
): FuzzyMatchResult {
  const cleanQuery = removeVietnameseTones(query);
  if (!cleanQuery) return { isMatch: true, score: 1.0 };

  const fullTarget = targets.filter(Boolean).join(" ");
  const cleanTarget = removeVietnameseTones(fullTarget);
  if (!cleanTarget) return { isMatch: false, score: 0 };

  // 1. Chứa nguyên văn query (contain trực tiếp sau khi bỏ dấu) -> Độ ưu tiên cao nhất
  if (cleanTarget.includes(cleanQuery)) {
    return {
      isMatch: true,
      score: 10.0 + cleanQuery.length / Math.max(cleanTarget.length, 1),
    };
  }

  // 2. Kiểm tra từ viết tắt (acronym: ví dụ gõ csdl khớp Cơ Sở Dữ Liệu)
  const targetAcronym = getAcronym(fullTarget);
  if (targetAcronym && (targetAcronym.includes(cleanQuery) || cleanQuery.includes(targetAcronym))) {
    return { isMatch: true, score: 8.0 };
  }

  // 3. Tách từ khóa (tokens)
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);
  const targetTokens = cleanTarget.split(/[\s,./\-_()]+/).filter(Boolean);

  if (queryTokens.length === 0) return { isMatch: true, score: 1.0 };

  let totalMatchedScore = 0;
  let matchedTokensCount = 0;

  for (const qToken of queryTokens) {
    let bestTokenScore = 0;

    for (const tToken of targetTokens) {
      const match = isTokenMatch(qToken, tToken);
      if (match.matched && match.score > bestTokenScore) {
        bestTokenScore = match.score;
      }
    }

    // Kiểm tra qToken có match với acronym của target không
    if (bestTokenScore === 0 && targetAcronym.length >= 2) {
      const acroMatch = isTokenMatch(qToken, targetAcronym);
      if (acroMatch.matched) {
        bestTokenScore = 0.7 * acroMatch.score;
      }
    }

    if (bestTokenScore > 0) {
      matchedTokensCount += 1;
      totalMatchedScore += bestTokenScore;
    }
  }

  // Điều kiện khớp:
  // - Nếu query 1 từ: từ đó phải match
  // - Nếu query 2-3 từ: cho phép tối đa 1 từ lệch hoặc typo (ví dụ "giao trinh csss" 3 từ thì 3 từ đều match hoặc ít nhất 2 từ match)
  // - Nếu query > 3 từ: ít nhất 50% số từ match
  const matchRatio = matchedTokensCount / queryTokens.length;
  const isMatch =
    queryTokens.length === 1
      ? matchedTokensCount >= 1
      : queryTokens.length <= 3
        ? matchedTokensCount >= queryTokens.length - 1
        : matchRatio >= 0.5;

  return {
    isMatch,
    score: isMatch ? totalMatchedScore : 0,
  };
}
