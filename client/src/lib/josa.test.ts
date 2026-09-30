import { describe, expect, it } from "vitest";
import { josa, withJosa } from "./josa";

describe("josa — 받침에 따라 조사 고르기", () => {
  it("받침 없는 말 뒤에는 '로'를 쓴다 (대안 코디 '숄더 니트 프레피으로' 재현)", () => {
    expect(withJosa("숄더 니트 프레피", "으로")).toBe("숄더 니트 프레피로");
    expect(withJosa("편한 러닝 스니커", "으로")).toBe("편한 러닝 스니커로");
  });

  it("받침 있는 말 뒤에는 '으로'를, ㄹ 받침 뒤에는 '로'를 쓴다", () => {
    expect(withJosa("라이트 재킷", "으로")).toBe("라이트 재킷으로");
    expect(withJosa("단정한 셔츠 재킷", "으로")).toBe("단정한 셔츠 재킷으로");
    expect(withJosa("블랙 레더 샌들", "으로")).toBe("블랙 레더 샌들로");
  });

  it("을/를 — 지역 이름, 끝의 괄호 보충은 읽지 않는다", () => {
    expect(withJosa("서울", "을")).toBe("서울을");
    expect(withJosa("현재 위치", "을")).toBe("현재 위치를");
    expect(withJosa("광주(경기)", "을")).toBe("광주(경기)를");
    expect(withJosa("고성(강원)", "을")).toBe("고성(강원)을");
  });

  it("이에요/예요 — 숫자는 읽는 소리로 판단한다 (UV 지수 '8예요' 재현)", () => {
    expect(withJosa("8", "이에요")).toBe("8이에요");
    expect(withJosa("9", "이에요")).toBe("9예요");
    expect(withJosa("10", "이에요")).toBe("10이에요");
    expect(withJosa("11", "이에요")).toBe("11이에요");
    expect(withJosa("12", "이에요")).toBe("12예요");
  });

  it("알파벳은 글자 이름으로 읽는다", () => {
    expect(josa("RDL", "으로")).toBe("로");
    expect(josa("MA-1", "을")).toBe("을");
    expect(josa("UV", "이에요")).toBe("예요");
  });

  it("판단할 글자가 없으면 받침 있는 쪽을 쓴다", () => {
    expect(josa("", "을")).toBe("을");
    expect(josa("—", "으로")).toBe("으로");
  });
});
