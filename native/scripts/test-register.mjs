/* Hooks the loader in before the tests import anything. */
import { register } from "node:module";
register("./test-loader.mjs", import.meta.url);
