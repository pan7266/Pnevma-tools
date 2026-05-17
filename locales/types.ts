import type { AXIS_TEXT, SPOT_INFO, SPOT_TEXT } from "@/lib/data/i18n";

export type TextDictionary = Record<string, string>;
type WidenText<T> = { [K in keyof T]: string } & TextDictionary;

export interface LocalePack {
  common: TextDictionary;
  spot: WidenText<typeof SPOT_TEXT.en>;
  spotInfo: WidenText<typeof SPOT_INFO.en>;
  axis: WidenText<typeof AXIS_TEXT.en>;
}
