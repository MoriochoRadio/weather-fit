/**
 * 한국어 조사는 앞말의 받침에 따라 갈린다. 템플릿에 "으로"를 고정해 두면
 * "숄더 니트 프레피으로"처럼 받침 없는 말 뒤에서 틀린다.
 * (대안 코디 후보 154개 중 95개가 "로"를 써야 하는 말이었다.)
 */

const PAIRS = {
  을: ["을", "를"],
  으로: ["으로", "로"],
  이에요: ["이에요", "예요"],
} as const;

export type JosaForm = keyof typeof PAIRS;

/** 숫자는 읽는 소리로 판단한다 — 영·일·삼·육·칠·팔은 받침이 있다. */
const DIGIT_FINAL: Record<string, boolean> = {
  "0": true, "1": true, "2": false, "3": true, "4": false,
  "5": false, "6": true, "7": true, "8": true, "9": false,
};
/** 일·칠·팔은 ㄹ 받침이다. */
const DIGIT_RIEUL = new Set(["1", "7", "8"]);

/** 알파벳은 글자 이름으로 읽는다 — 엘·엠·엔·알만 받침이 있고, 엘·알은 ㄹ 받침이다. */
const LETTER_FINAL = new Set(["l", "m", "n", "r"]);
const LETTER_RIEUL = new Set(["l", "r"]);

type Final = "none" | "rieul" | "other";

/**
 * 조사를 붙일 마지막 소리. 끝의 괄호 보충("광주(경기)")은 읽지 않으므로 떼어 내고,
 * 문장부호처럼 소리 없는 꼬리는 건너뛴다. 판단할 글자가 없으면 null.
 */
function finalOf(word: string): Final | null {
  const spoken = word.trim().replace(/\s*\([^()]*\)$/, "");
  for (let index = spoken.length - 1; index >= 0; index--) {
    const character = spoken[index];
    const code = character.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const jong = (code - 0xac00) % 28;
      return jong === 0 ? "none" : jong === 8 ? "rieul" : "other";
    }
    if (character >= "0" && character <= "9") {
      return !DIGIT_FINAL[character] ? "none" : DIGIT_RIEUL.has(character) ? "rieul" : "other";
    }
    const letter = character.toLowerCase();
    if (letter >= "a" && letter <= "z") {
      return !LETTER_FINAL.has(letter) ? "none" : LETTER_RIEUL.has(letter) ? "rieul" : "other";
    }
  }
  return null;
}

/** 앞말에 맞는 조사만 돌려준다. 판단할 글자가 없으면 받침 있는 쪽을 쓴다. */
export function josa(word: string, form: JosaForm): string {
  const [withFinal, withoutFinal] = PAIRS[form];
  const final = finalOf(word);
  if (final === null) return withFinal;
  if (final === "none") return withoutFinal;
  // "으로/로"만 ㄹ 받침을 받침 없는 말처럼 다룬다 — "샌들로", "7로".
  if (final === "rieul" && form === "으로") return withoutFinal;
  return withFinal;
}

/** 앞말과 조사를 붙인 문자열. */
export function withJosa(word: string, form: JosaForm): string {
  return `${word}${josa(word, form)}`;
}
