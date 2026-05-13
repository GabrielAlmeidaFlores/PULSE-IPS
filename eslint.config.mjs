import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import importPlugin from "eslint-plugin-import"
import sonarjs from "eslint-plugin-sonarjs"
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "node_modules/**",
    "prisma/**",
    "src/cli/**",
  ]),

  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      sonarjs,
      "no-relative-import-paths": noRelativeImportPaths,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": "error",
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "no-implicit-coercion": "error",
      "no-throw-literal": "error",
      "no-return-await": "error",
      "require-await": "error",
      "no-nested-ternary": "error",
      "no-unneeded-ternary": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "no-useless-concat": "error",
      "no-duplicate-imports": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use const maps or union types instead of enums.",
        },
      ],
      "spaced-comment": ["error", "never"],

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", disallowTypeAnnotations: false },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-redundant-type-constituents": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/array-type": ["error", { default: "array" }],

      "import/first": "error",
      "import/no-duplicates": "error",
      "import/no-cycle": ["error", { maxDepth: 3 }],
      "import/no-self-import": "error",

      "no-relative-import-paths/no-relative-import-paths": [
        "error",
        { allowSameFolder: false, rootDir: "src", prefix: "@" },
      ],

      "sonarjs/no-duplicate-string": ["error", { threshold: 4 }],
      "sonarjs/no-identical-functions": "error",
      "sonarjs/cognitive-complexity": ["error", 20],
      "sonarjs/no-redundant-boolean": "error",
      "sonarjs/prefer-immediate-return": "error",
    },
  },

  {
    files: ["src/app/**/*.ts", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/libs/db", "@prisma/client"],
              importNames: ["prisma"],
              message:
                "App layer must not import prisma directly. Use a service or repository function.",
            },
            {
              group: ["@/modules/*/*.repository"],
              message:
                "App layer must not import repositories directly. Use a service function.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["src/modules/**/*.service.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/libs/db"],
              importNames: ["prisma"],
              message:
                "Services must not import prisma. Use repository functions instead.",
            },
          ],
        },
      ],
    },
  },

])

export default eslintConfig

