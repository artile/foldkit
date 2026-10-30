import re, sys, pathlib

def strip_view(src: str) -> str:
    out = src
    for pattern in (r'\n\s*view: \(model, h\) =>', r'\nconst view = '):
        while True:
            m = re.search(pattern, out)
            if not m:
                break
            i, depth, seen = m.end(), 0, False
            while i < len(out):
                c = out[i]
                if c in '([{':
                    depth += 1; seen = True
                elif c in ')]}':
                    depth -= 1
                    if depth < 0:
                        break
                elif depth == 0 and seen and c in ',\n':
                    i += 1
                    break
                i += 1
            out = out[: m.start()] + '\n' + out[i:]
    return out

def code_lines(src: str) -> list[str]:
    lines, in_import = [], False
    for line in src.splitlines():
        s = line.strip()
        if s.startswith('import '):
            in_import = not (s.endswith("'") or s.endswith('"'))
            continue
        if in_import:
            in_import = not (s.endswith("'") or s.endswith('"'))
            continue
        if s and not s.startswith('//'):
            lines.append(s)
    return lines

API = {
    'a': ['makeDefinition', 'makeComposition', 'makeInit', 'makeUpdate', 'makeView', 'prepareBlock', 'Block.assemble',
          'FromAssemblyWithView', 'FromAssemblyWithOutMessage', 'FromAssemblyWithViewAndOutMessage', 'makeCommand', '.layer',
          'EffectsLayer', 'makeSubscriptions', 'entry(', 'makeBinding', 'withOutMessagePolicy', 'makeOutMessageFold',
          'makeOutMessageStep', 'makeFieldsStep', 'makeStep', 'Update.combineSteps', 'initAndAppend',
          'embedView', 'h.block', 'operations', 'ChildInitContext', 'contextToArgs', 'instances:',
          'toItem', 'Program.makeElement', 'Runtime.embed', '.provide(', 'Layer.mergeAll'],
    'b': ['Block<', '.make(', '.instance(', '.each(', '.on(', '.send(', '.view()', '.Ref', '.model', 'Output.map',
          'Command.make', 'commands:', 'stream:', 'Layer.provide', 'Runtime.run', 'Block.deliver', 'Layer.mergeAll'],
    'c': ['Block<', '.make(', 'yield* new ', '.each(', '.on(', '.send(', '.view()', '.model.', 'Command.define',
          'commands:', 'stream:', 'Layer.provide', 'Program.make', 'deliver(', 'Layer.mergeAll'],
}

def measure(variant: str, files: list[pathlib.Path]):
    total_glue, used = 0, set()
    for f in files:
        src = f.read_text()
        glue = code_lines(strip_view(src))
        total_glue += len(glue)
        body = '\n'.join(code_lines(src))
        used |= {name for name in API[variant] if re.search(re.escape(name) + (r'\b' if name[-1].isalnum() else ''), body)}
        print(f'  {f.name:28} all={len(code_lines(src)):4} glue={len(glue):4}')
    print(f'  TOTAL glue={total_glue} distinct framework names={len(used)}: {sorted(used)}')

root = pathlib.Path(sys.argv[1])
for variant, folder in (('a', 'a-preview/app'), ('b', 'b-sam/app'), ('c', 'c-1860/app')):
    files = sorted(p for p in (root / folder).glob('*.ts') if not p.name.endswith('.test.ts') and p.name not in ('shared.ts', 'blocks.ts'))
    print(variant, folder, f'(name list: {len(API[variant])} entries)')
    measure(variant, files)
    tests = sorted((root / folder).glob('story.test.ts'))
    for t in tests:
        print(f'  {t.name:28} code lines={len(code_lines(t.read_text()))}')
