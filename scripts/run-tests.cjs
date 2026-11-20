// `npm test`: runs the unit tests in tests/ with Node's built-in test runner.
//
// The code under test is TypeScript, so the small pure files the tests load are
// compiled first with the `typescript` package the project already has (no new
// dependency, no test framework to install). Which files? Whatever the tests
// ask for: any `require(path.join(build, "name.js"))` in tests/*.test.cjs makes
// this compile lib/name.ts, so there is no list to keep up to date.
//
// Some tests (tests/parent-hardening-db.test.cjs) run the real SQL against an
// in-memory Postgres and need PGlite, which is not a project dependency; they
// skip themselves, saying so, unless it is installed (see that file).
const ts = require("typescript");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const testsDir = path.join(root, "tests");
const files = fs
  .readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.cjs"))
  .map((f) => path.join(testsDir, f));

const wanted = new Set();
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const m of source.matchAll(/path\.join\(build,\s*"([\w-]+)\.js"\)/g)) wanted.add(m[1]);
}

const out = fs.mkdtempSync(path.join(os.tmpdir(), "xf-tests-"));
// A compiled file may import another lib file (e.g. quick-start-prompt imports
// quick-start), so follow relative imports too.
const compiled = new Set();
const compile = (name) => {
  if (compiled.has(name)) return;
  compiled.add(name);
  const source = fs.readFileSync(path.join(root, "lib", `${name}.ts`), "utf8");
  fs.writeFileSync(
    path.join(out, `${name}.js`),
    ts.transpileModule(source, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText
  );
  for (const m of source.matchAll(/from\s+"\.\/([\w-]+)"/g)) compile(m[1]);
};
wanted.forEach(compile);

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  env: { ...process.env, XF_TEST_BUILD: out },
});

fs.rmSync(out, { recursive: true, force: true });
process.exit(result.status ?? 1);
