Cold development startup could leave Foldkit examples blank when parallel browser pages requested modules invalidated by late dependency discovery. Some pages missed the optimizer reload after receiving outdated modules.

Declare all five hidden third-party dependencies through a shared development plugin in all 34 source-aliased example configs. Apply the declarations only to browser consumers, add resolved-config regressions, and register shared changes with the E2E planner.

Permanent cold-cache browser coverage and CI integration will follow separately.

Refs #1628
