---
'foldkit': minor
---

Add `makeOutMessageFold.partial(ChildBlock, cases)` for a parent that reacts to only some child OutMessage variants. Every variant without a handler leaves the parent Model unchanged. `partial` type-checks each handler the same way `makeOutMessageFold` does, and throws for a handler whose variant the child does not declare.
