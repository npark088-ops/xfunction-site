// `npm test`: runs the unit tests in tests/ with Node's built-in test runner.
//
// The code under test is TypeScript, so it is compiled first with the
// `typescript` package the project already has (no new dependency, no test
// framework to install). Only the small pure files listed below are compiled;
// they have no imports from the app, which is what keeps them easy to test.
const ts = require("typescript");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const PURE_FILES = ["quick-start", "quick-start-prompt"];

const out = fs.mkdtempSync(path.join(os.tmpdir(), "xf-tests-"));
for (const name of PURE_FILES) {
  const source = fs.readFileSync(path.join(root, "lib", `${name}.ts`), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  fs.writeFileSync(path.join(out, `${name}.js`), js);
}

const testsDir = path.join(root, "tests");
const files = fs
  .readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.cjs"))
  .map((f) => path.join(testsDir, f));

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  env: { ...process.env, XF_TEST_BUILD: out },
});

fs.rmSync(out, { recursive: true, force: true });
process.exit(result.status ?? 1);
