# The code graph (graphify)

`graphify-out/` holds a knowledge graph of the game's code, built with [graphify](https://github.com/Graphify-Labs/graphify)
(PyPI `graphifyy`, installed with the owner's approval on 20 October 2026). It maps every module, function and call
in `src/` and the top-level `tools/` (the asset builders under `tools/creatures/` are left out by `.graphifyignore`)
into named communities, so a session can find where something lives, what calls it and what a change touches,
without reading the whole tree. The extraction is local (tree-sitter, `--code-only`, nothing sent anywhere); only the
community names were written by the Claude CLI.

- `graphify-out/GRAPH_REPORT.md`: the communities (Monster AI & Bonds, Tide System, Sea & Sky Rendering, ...), the
  hub nodes and the commit the graph was built from.
- `graphify-out/graph.json`: the graph the CLI queries. `graph.html` (an interactive view) and `cache/` are
  regenerated locally and not committed.

## Use

```bash
uv venv -p 3.12 /tmp/claude-0/graphifyenv && VIRTUAL_ENV=/tmp/claude-0/graphifyenv uv pip install graphifyy==0.9.92
G=/tmp/claude-0/graphifyenv/bin/graphify
cd skotos
$G query "how does the tide close cells under the hero" --budget 2000   # BFS over the graph for a question
$G explain "tickTide()"                                                  # a node and its neighbours
$G path "tickTide()" "heroHit()"                                         # how two things connect
$G affected "lightAt()"                                                  # what a change to it can touch
$G god-nodes --top 15                                                    # the hubs
```

## Keep it fresh

After code changes, `$G update .` re-extracts the changed files (local, no API cost); `$G label . --backend=claude-cli
--missing-only` names any new communities. Commit `graphify-out/` (minus `cache/` and `graph.html`) with the change.
The report records the commit it was built from: compare it with `git rev-parse HEAD`.
