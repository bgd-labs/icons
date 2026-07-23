import { describe, expect, it } from 'vitest'
import { styleStringToObject, toReactAttributeName } from '../svg-attributes'

describe('toReactAttributeName', () => {
  it('maps class to className', () => {
    expect(toReactAttributeName('class')).toBe('className')
  })

  it('camelises hyphenated SVG attributes', () => {
    expect(toReactAttributeName('fill-opacity')).toBe('fillOpacity')
    expect(toReactAttributeName('stroke-width')).toBe('strokeWidth')
    expect(toReactAttributeName('stop-color')).toBe('stopColor')
    expect(toReactAttributeName('color-interpolation-filters')).toBe(
      'colorInterpolationFilters',
    )
  })

  it('camelises namespaced attributes', () => {
    expect(toReactAttributeName('xlink:href')).toBe('xlinkHref')
    expect(toReactAttributeName('xml:space')).toBe('xmlSpace')
    expect(toReactAttributeName('xmlns:xlink')).toBe('xmlnsXlink')
  })

  it('preserves aria- and data- attributes verbatim', () => {
    expect(toReactAttributeName('aria-label')).toBe('aria-label')
    expect(toReactAttributeName('data-testid')).toBe('data-testid')
  })

  it('leaves undashed attributes untouched', () => {
    expect(toReactAttributeName('viewBox')).toBe('viewBox')
    expect(toReactAttributeName('d')).toBe('d')
    expect(toReactAttributeName('xmlns')).toBe('xmlns')
    expect(toReactAttributeName('style')).toBe('style')
  })
})

describe('styleStringToObject', () => {
  it('camelises properties and keeps values', () => {
    expect(styleStringToObject('stop-color: #fff; fill-opacity: 0.5')).toEqual({
      stopColor: '#fff',
      fillOpacity: '0.5',
    })
  })

  it('keeps colons inside values intact', () => {
    expect(styleStringToObject('background: url(data:image/png)')).toEqual({
      background: 'url(data:image/png)',
    })
  })

  it('skips empty rules', () => {
    expect(styleStringToObject('; fill: red ;;')).toEqual({ fill: 'red' })
    expect(styleStringToObject('')).toEqual({})
  })
})
