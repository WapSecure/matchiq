const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const nodeExternals = require('webpack-node-externals');
const { join } = require('node:path');

const WORKSPACE_PACKAGES = [/^@matchiq\//];

/** Webpack config for NestJS apps: workspace libs are bundled, npm dependencies stay external. */
module.exports = function createNestAppConfig(projectDir) {
  return {
    output: {
      path: join(projectDir, 'dist'),
      clean: true,
      ...(process.env.NODE_ENV !== 'production' && {
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
      }),
    },
    externals: [
      nodeExternals({
        modulesDir: join(projectDir, 'node_modules'),
        allowlist: WORKSPACE_PACKAGES,
      }),
      nodeExternals({
        modulesDir: join(projectDir, '..', '..', 'node_modules'),
        allowlist: WORKSPACE_PACKAGES,
      }),
    ],
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        externalDependencies: 'none',
        mergeExternals: true,
        optimization: false,
        outputHashing: 'none',
        generatePackageJson: false,
        sourceMap: true,
      }),
    ],
  };
};
