---
'foldkit': minor
---

`Block.make` accepts a declaration without `InitArgs` for a Block whose init takes no arguments. It behaves as `InitArgs: Schema.Tuple([])`. A declaration that still uses the removed `Init` key throws with a message that names `InitArgs`.
