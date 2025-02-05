/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import dts from "vite-plugin-dts"
import viteTsconfigPaths from "vite-tsconfig-paths"

import path from "path"

// We do not explicitly set the DEV_BUILD in any of our processes
// This is a convenience for developers for debugging purposes
const DEV_BUILD = Boolean(process.env.DEV_BUILD)

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
      plugins: [["@swc/plugin-emotion", {}]],
    }),
    viteTsconfigPaths(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: DEV_BUILD,
    lib: {
      // Specify the entry point of your library
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "@streamlit/lib", // Replace with your library's name
      fileName: format => `streamlit-lib.${format}.js`,
      formats: ["es", "umd", "cjs"], // Output formats
    },
    rollupOptions: {
      input: "src/index.ts",
      // Externalize dependencies that shouldn't be bundled into your library
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
  resolve: {
    alias: {
      "~lib": path.resolve(__dirname, "../lib/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    css: true,
    reporters: ["verbose"],
    setupFiles: ["../vitest.setup.ts"],
    deps: {
      optimizer: {
        web: {
          include: ["vitest-canvas-mock"],
        },
      },
    },
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**/*"],
      exclude: [],
    },
  },
})
