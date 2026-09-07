import esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const nativeModulePlugin = {
    name: 'native-module-plugin',
    setup(build) {
        build.onLoad({ filter: /\.node$/ }, (args) => {
            return {
                contents: `
                    import { createRequire } from 'module';
                    const require = createRequire(import.meta.url);
                    module.exports = require(${JSON.stringify(args.path)});
                `,
                loader: 'js',
            };
        });
    },
};

const isWatch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const buildOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'esnext',
    format: 'esm',
    outdir: 'dist',
    external: ['node:*'],
    banner: {
        js: 'import { createRequire } from "module"; import { fileURLToPath } from "url"; import { dirname } from "path"; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);',
    },
    plugins: [nativeModulePlugin],
    minify: true,
    sourcemap: true,
    keepNames: true,
    sourcesContent: true,
    loader: {
        '.node': 'copy',
    },
};

// Copy better-sqlite3 native bindings after build. The destination is the path
// the bundled output probes at runtime — <bundle dir>/../build/Release — since
// better-sqlite3's loader resolves relative to its own __dirname, which esbuild
// collapses into the bundle's directory.
function copyNativeBindings() {
    const sqlitePath = `node_modules/better-sqlite3/prebuilds/${bindingTarget()}.node`;
    const destDir = 'build/Release';

    if (!existsSync(sqlitePath)) {
        throw new Error(`Native binding not found: ${sqlitePath}`);
    }

    try {
        if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
        }

        copyFileSync(sqlitePath, join(destDir, 'better_sqlite3.node'));
        console.log(`✓ Copied native SQLite binding from ${sqlitePath}`);
    } catch (error) {
        throw new Error(`Error copying native bindings: ${error.message}`);
    }
}

// better-sqlite3 v13 dropped prebuild-install and ships prebuilt binaries in the
// package itself, keyed by platform and arch.
function bindingTarget() {
    const isLinuxMusl = process.platform === 'linux' && !process.report.getReport().header.glibcVersionRuntime;

    return `${isLinuxMusl ? 'linuxmusl' : process.platform}-${process.arch}`;
}

if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
} else {
    await esbuild.build(buildOptions);
    copyNativeBindings();
    console.log('Build complete!');
}
