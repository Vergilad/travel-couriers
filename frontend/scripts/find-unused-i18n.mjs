/**
 * Reports i18n dictionary keys that no component asks for, and can delete them
 * with `--write`.
 *
 * Run from `frontend`:
 *   node scripts/find-unused-i18n.mjs          report only
 *   node scripts/find-unused-i18n.mjs --write  rewrite both dictionaries
 *
 * The dictionary is a plain JSON tree and `t("a.b.c")` is a plain string, so a
 * scan of the sources is enough. A handful of keys are built at runtime with a
 * template literal (`kinds.${kind}`, `errors.${code}_title`), and a literal scan
 * cannot see those. DYNAMIC_PREFIXES lists the shapes they take; a key matching
 * one of them is always reported as used. Keep that list in step with the code:
 * a key added to a runtime shape and not added here is a string the next
 * cleanup would silently delete.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "src";
const LOCALES = ["en", "ru"];

/** Shapes assembled at runtime, e.g. t(`kinds.${kind}`) and t(`errors.${c}_title`). */
const DYNAMIC_PREFIXES = [
  "kinds.",
  "marketing.nav.mode_",
  /^errors\.\w+_(title|body)$/,
];

const isDynamic = (key) =>
  DYNAMIC_PREFIXES.some((prefix) =>
    prefix instanceof RegExp ? prefix.test(key) : key.startsWith(prefix),
  );

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const used = new Set();
for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]/g)) {
    used.add(match[1]);
  }
}

const flatten = (node, prefix = "") =>
  Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

/** Visits every leaf with its dotted path, plus the parent object and own key. */
function walkTree(node, visit, path = []) {
  for (const [key, value] of Object.entries(node)) {
    const next = [...path, key];
    if (value && typeof value === "object") {
      walkTree(value, visit, next);
    } else {
      visit(next.join("."), value, node, key);
    }
  }
}

const write = process.argv.includes("--write");
const dictionaryPath = (locale) => join(SRC, "i18n", "locales", `${locale}.json`);

for (const locale of LOCALES) {
  const file = dictionaryPath(locale);
  const tree = JSON.parse(readFileSync(file, "utf8"));
  const keys = flatten(tree);
  const unused = keys.filter((key) => !used.has(key) && !isDynamic(key));

  console.log(`\n${locale}: ${keys.length} keys, ${unused.length} unused`);
  for (const key of unused) console.log(`  ${key}`);

  if (write && unused.length) {
    const drop = new Set(unused);
    walkTree(tree, (key, _value, parent, ownKey) => {
      if (drop.has(key)) delete parent[ownKey];
    });
    // A branch can survive with one child and still read as a category that
    // only ever had the deleted strings, so empty branches go too.
    const stripEmpty = (node) => {
      for (const [key, value] of Object.entries(node)) {
        if (value && typeof value === "object") {
          stripEmpty(value);
          if (!Object.keys(value).length) delete node[key];
        }
      }
      return node;
    };
    writeFileSync(file, `${JSON.stringify(stripEmpty(tree), null, 2)}\n`);
    console.log(`  written: ${file}`);
  }
}

