import { optimize } from 'svgo'

export function optimizeSvg(svgContent: string, prefixName: string): string {
  const result = optimize(svgContent, {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupIds: false,
            collapseGroups: false,
          },
        },
      },
      {
        name: 'prefixIds',
        params: { prefix: prefixName },
      },
      'removeDimensions',
      {
        name: 'addAttributesToSVGElement',
        params: {
          attributes: [{ width: '32' }, { height: '32' }],
        },
      },
      {
        name: 'sortAttrs',
        params: { xmlnsOrder: 'alphabetical' },
      },
    ],
  })
  return result.data
}
