---
'@foldkit/ui': minor
---

Add the Popover InMessage `RequestedCloseWithoutFocus`. It closes the Popover like `RequestedClose` but does not return focus to the trigger button, for a parent that moves focus elsewhere, such as a combobox that closes on Tab or on an outside press. A modal Popover still unlocks scroll and restores inert siblings.
