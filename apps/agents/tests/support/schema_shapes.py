"""Flattens a JSON Schema into `path -> (required, nullable)` so two schemas can be compared."""

from typing import Any, Final

Schema = dict[str, Any]
Shapes = dict[str, tuple[bool, bool]]

MAX_DEPTH: Final = 12


def resolve(node: Schema, root: Schema) -> Schema:
    ref = node.get("$ref")
    if not isinstance(ref, str):
        return node
    target: Any = root
    for part in ref.removeprefix("#/").split("/"):
        target = target[part]
    return resolve(target, root)


def variants_of(node: Schema, root: Schema) -> tuple[list[Schema], bool]:
    """Non-null alternatives of a node, and whether null is one of them."""
    node = resolve(node, root)
    kind = node.get("type")
    nullable = kind == "null" or (isinstance(kind, list) and "null" in kind)
    found: list[Schema] = []
    for key in ("anyOf", "oneOf"):
        for option in node.get(key, []):
            inner, inner_null = variants_of(option, root)
            found += inner
            nullable = nullable or inner_null
    if not found and kind != "null":
        found = [node]
    return found, nullable


def variant_key(node: Schema) -> str:
    if "const" in node:
        return f"const:{node['const']}"
    if "properties" in node:
        return "obj:" + ",".join(sorted(node["properties"]))
    return str(node.get("type", "any"))


def collect(node: Schema, root: Schema, path: str, out: Shapes, depth: int = 0) -> None:
    if depth > MAX_DEPTH:
        return
    options, _ = variants_of(node, root)
    for option in options:
        scope = path if len(options) == 1 else f"{path}|{variant_key(option)}"
        required = set(option.get("required", []))
        for name, prop in option.get("properties", {}).items():
            _, nullable = variants_of(prop, root)
            out[f"{scope}.{name}"] = (name in required, nullable)
            collect(prop, root, f"{scope}.{name}", out, depth + 1)
        if isinstance(option.get("items"), dict):
            collect(option["items"], root, f"{scope}[]", out, depth + 1)


def shapes_of(schema: Schema) -> Shapes:
    out: Shapes = {}
    collect(schema, schema, "", out)
    return out
