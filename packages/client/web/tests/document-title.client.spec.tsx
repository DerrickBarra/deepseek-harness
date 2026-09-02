// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DocumentTitle } from '../src/DocumentTitle.tsx'

afterEach(() => {
  cleanup()
  document.title = ''
})

describe('DocumentTitle', () => {
  it('preserves the product title without a durable title and restores it on unmount', () => {
    document.title = 'DeepSeek Harness'
    const mounted = render(<DocumentTitle productTitle="DeepSeek Harness" />)
    expect(document.title).toBe('DeepSeek Harness')

    mounted.rerender(<DocumentTitle title="First title" productTitle="DeepSeek Harness" />)
    expect(document.title).toBe('First title — DeepSeek Harness')

    mounted.rerender(<DocumentTitle title="Revised title" productTitle="DeepSeek Harness" />)
    expect(document.title).toBe('Revised title — DeepSeek Harness')

    mounted.rerender(<DocumentTitle productTitle="DeepSeek Harness" />)
    expect(document.title).toBe('DeepSeek Harness')
    mounted.rerender(<DocumentTitle productTitle="Byte" />)
    expect(document.title).toBe('Byte')
    mounted.unmount()
    expect(document.title).toBe('DeepSeek Harness')
  })
})
