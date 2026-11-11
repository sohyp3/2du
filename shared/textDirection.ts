// Hebrew, Arabic, Syriac, Thaana, NKo and their presentation forms.
const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const STRONG = /[A-Za-zÀ-ɏͰ-ԯ֐-ࣿיִ-﷿ﹰ-﻿]/;

/** True when the first letter with a strong direction is right-to-left (Unicode "first strong"). */
export function isRtlText(text: string | null | undefined): boolean {
  const first = text?.match(STRONG)?.[0];
  return !!first && RTL.test(first);
}
