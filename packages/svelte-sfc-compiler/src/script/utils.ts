export const cssVarNameEscapeSymbolsRE: RegExp = /[ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g

export function getEscapedCssVarName(key: string, doubleEscape: boolean): string {
  // eslint-disable-next-line unicorn/prefer-string-replace-all
  return key.replace(cssVarNameEscapeSymbolsRE, s => (doubleEscape ? `\\\\${s}` : `\\${s}`))
}
