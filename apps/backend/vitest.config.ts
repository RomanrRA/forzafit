import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    root: '.',
  },
  plugins: [
    // Транспилируем декораторы NestJS + emitDecoratorMetadata через SWC,
    // иначе esbuild не сохранит метаданные DI.
    swc.vite({
      // Не читаем .swcrc: его exclude (нужный только для prod-сборки, чтобы
      // спеки не попадали в dist) иначе заставит SWC игнорировать сами
      // *.spec.ts. Конфиг декораторов дублируем здесь явно.
      swcrc: false,
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
          dynamicImport: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
      module: { type: 'es6' },
    }),
  ],
});
