# Comparing Vue and Svelte css processing in Component

## Vue

playground: https://play.vuejs.org/#eNqFVMlu2zAQ/RVWFzuoI9dtT67ibgjQFuiCJr3pIksjmQlNEiTl2A38730kLXmBkx4MizNv9pn3mHzUOl21lEyTzJaGa8csuVbPcsmXWhnHPqulnrDaqCUbpOPw8gaDHvDIDNVsu4NEVS5LJa1j5YKLil15xFC2Qlx0CqeaRtBOUxfCElS5rFtZOq4kU/Kz4OX98II95pJFP+mqEC29TwtBxt0qV4ghjKCERyUoFaoZDpyX+yyVJOksKxzblTgYHbs5QcLVNpfZOHYB9ePhaKlF4QgvxrLFhJWisPYqTxolKpJGVXky+0JCKPagjKiy8WISsfPWOZThNpoAj688YR9KXxUku/pgHiTZOEKisT4bxy24ZZnVhezVhryCW2QN8Qwj4CSrU1RjiBB8pgvjNi922GzsZ4xgXOoW84iJlgsq7+dqjVRXl0tVkYAwzgqi8aybGwumcTVWl7w+RGGiwRNajaAeCGjFV30+VigHjf/LxlDEPOJq4TsbH7QdT+s2iGhLpamCZNoINcfoY8PCfuSuVEKZKevb9S4Mc1oR6WEa6u8WaQf0ogjSrPOYop3H/iCIoLT3/GS83NVKusu6WHKxmbIByuEluymkZd9v/O61xvIV7ZGW/6Upe03LGAJz8YXOklHiUKyseZPeWSVxmSFztBQN4tj9n9qfiM2TaazJ6wrs4MO3IHOmpVEnDwM9I7+zmPEUH78MWTIrDK7XucI0hAl59fXND1rju1diKVo/5meUvwnn2PocI+xTKyukfYAL2X4N9MFlc2uv146k7YryiXrkNuDzBLfrd+Op0vfpvknfBjv0E13sqeqU25goZOM3Fn72PBdobATi+aMr7F51wmgdbR2zS+CvTLbLOZnZ8NUxhx3yVLd9B0zlxznBYpz4jPR0EfbkrApBz8tfsknYpFxWVHNJ12utLA1D5BOL0Nl9fjALqffFD5Hx1exM0vv2hPYOPGvi9xxtdheOT3/yYJF471H+v2v3Jj4hoI9PON7m87eUy2T7Dwb2ZSU=

### case: `:global(xxx)`

Before:

```css
:global(button) {
  color: goldenrod;
}
```

After:

```css
button {
  color: goldenrod;
}
```

### case: `xxx :global(yyy)`

Before:

```css
p :global(.red) {
  color: red;
}
```

After:

```css
.red {
  color: red;
}
```

### case: `:deep(xxx)`

Before:

```css
:deep(.green) {
  color: green;
}
```

After:

```css
[data-v-7ba5bd90] .green {
  color: green;
}
```

### case: `:slot(xxx)`

Before:

```css
:slotted(div) {
  color: red;
  font-size: 2em;
}
```

After:

```css
div[data-v-7a123dd9-s] {
  color: red;
  font-size: 2em;
}
```

### case: scoped

Before:

```css
.goldenrod {
  color: goldenrod;
  font-family: 'Comic Sans MS', cursive;
  font-size: 2em;
}
```

After:

```css
.goldenrod[data-v-7ba5bd90] {
  color: goldenrod;
  font-family: 'Comic Sans MS', cursive;
  font-size: 2em;
}
```

## Svelte

playground: https://svelte.dev/playground/hello-world?version=4.2.19#H4sIAAAAAAAAE41UTW_bMAz9K6w2ICnqxeuOnm1gKAbsslN3mwZEtulEqCwZEtMkM_zfB_krjpsNu9gQ-Ug9PopsmBYVsoh9Q6UMHI1VBayxkITFPQtYKRU6Fv1sGJ1rj_MGFoxRX-p6415RkbdlwuEte240oSbHIha73MqaUq45yao2luDJVPVjAA0ZEsofjPbgAIRCSz-8FVooralgtQk79JB65bOUB52TNBqMflIyf1nfQ-PtnC7x6_vekhvtjMKNMrv1anEfCIIL61UAC3-XovUfhQRkdjuFkEAplEOu4_BSmI73j5Ar4VzC2c6oArU1BWdpL3HjJWrv4nD_mHIdZwcio8Grm3DWnzgDo6Pcl5M0Q11t2v3isIf40PrmLbSXDmJXCz25LXqHdHHozSmUVqIulqidRdScpbWwdL4bsHFY-6ukrg80ksz3mL9k5sQZZFIXUXfGIml6VVoI00EgX5_18V3bUq6bd7IcfJ2WsxqcMsRZepuTd14xakJZtr6nXvsxO9exo7PC7nlFO2Uyoda9XtOryI0yNoJJsc9TX2sYQzYWi2WA13BC_i_QE56wXS1veHQFjvjNROufdDmVRtOHUlRSnSNYPZlK5vAstIPvz6sA8oN18hXnWCd_YwSfsBrrjcNeKhYwwhOxiOwB2-Avcz4fu-tJX3jezjp0phMlnFWmOCjkrOsPnrrx76fpehQT-Ohpak5hCLRHGLAveD4aW4BQyhwddC99mn8ykCH0SwULOEraA252myHNdlg3X0-iqhUG0NxeMIN_3APbGdXpqvlmuTRqtltyL8qNHTJ0ZGF-eLj0ZLZFZqtyKdBDAo9drvmt2w4F-lBlaMGUQLLCQaV8jIW9cJAhasgtCsIigvfL1dtuPdFrMoV8TbkGiP0kQuhnOuxt1w_oV_sHKlEDcFIGAAA=

### case: `:global(xxx)`

Before:

```css
:global(button) {
  color: goldenrod;
}
```

After:

```css
button {
  color: goldenrod;
}
```

### case: `xxx :global(yyy)`

Before:

```css
p :global(.red) {
  /**
   * this will apply to all elements which has class="red", in any component,
   * that are inside <p> elements belonging to this component
   */
  color: red;
}
```

After:

```css
p.svelte-103fnwk .red {
  color: red;
}
```

### case: `xxx:global(yyy)`

Before:

```css
span:global(.green) {
  /**
   * this will apply to all <span> elements belonging to this
   * component with a class of red, even if class="green" does
   * not initially appear in the markup, and is instead added at runtime.
   * This is useful when the class of the element is dynamically applied,
   * for instance when updating the element's classList property directly.
   */
  color: green;
}
```

After:

```css
span.svelte-103fnwk.green {
  color: green;
}
```

### case: scoped

Before:

```css
.goldenrod {
  color: goldenrod;
  font-family: 'Comic Sans MS', cursive;
  font-size: 2em;
}
```

After:

```css
.goldenrod.svelte-103fnwk {
  color: goldenrod;
  font-family: 'Comic Sans MS', cursive;
  font-size: 2em;
}
```
