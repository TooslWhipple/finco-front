import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // TanStack Table v8 devuelve funciones no memoizables; el componente ya se
    // excluye del React Compiler con "use no memo", así que el aviso es ruido.
    files: ["src/components/shared/data-table.tsx"],
    rules: { "react-hooks/incompatible-library": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "graphify-out/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
