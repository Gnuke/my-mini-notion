// Nook — 본문 글자 수 계산 (사용자 인지 글자/grapheme 단위)

const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

/** 사용자 인지 글자(grapheme cluster) 단위로 텍스트의 길이를 센다. */
export function countChars(text: string): number {
  let count = 0;
  for (const _ of segmenter.segment(text)) count++;
  return count;
}
