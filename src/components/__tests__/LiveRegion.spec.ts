import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LiveRegion from '../LiveRegion.vue'

describe('LiveRegion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with correct ARIA attributes', () => {
    const wrapper = mount(LiveRegion, {
      props: {
        message: 'Test message',
        politeness: 'assertive',
        atomic: false,
        relevant: 'additions'
      }
    })

    const liveRegion = wrapper.find('[aria-live]')
    expect(liveRegion.exists()).toBe(true)
    expect(liveRegion.attributes('aria-live')).toBe('assertive')
    expect(liveRegion.attributes('aria-atomic')).toBe('false')
    expect(liveRegion.attributes('aria-relevant')).toBe('additions')
    expect(liveRegion.attributes('role')).toBe('status')
  })

  it('displays the message when provided', () => {
    const message = 'Important announcement'
    const wrapper = mount(LiveRegion, {
      props: { message }
    })

    expect(wrapper.text()).toContain(message)
  })

  it('uses default props when not specified', () => {
    const wrapper = mount(LiveRegion)

    const liveRegion = wrapper.find('[aria-live]')
    expect(liveRegion.attributes('aria-live')).toBe('polite')
    expect(liveRegion.attributes('aria-atomic')).toBe('true')
    expect(liveRegion.attributes('aria-relevant')).toBe('additions text')
  })

  it('auto-clears message after delay', async () => {
    const wrapper = mount(LiveRegion, {
      props: {
        message: 'Temporary message',
        clearDelay: 1000
      }
    })

    expect(wrapper.text()).toContain('Temporary message')

    // Fast-forward time and wait for Vue to update
    vi.advanceTimersByTime(1000)
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toBe('')
  })

  it('does not auto-clear when clearDelay is 0', async () => {
    const wrapper = mount(LiveRegion, {
      props: {
        message: 'Persistent message',
        clearDelay: 0
      }
    })

    expect(wrapper.text()).toContain('Persistent message')

    vi.advanceTimersByTime(10000)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Persistent message')
  })

  it('can manually clear message', async () => {
    const wrapper = mount(LiveRegion, {
      props: {
        message: 'Message to clear'
      }
    })

    expect(wrapper.text()).toContain('Message to clear')

    wrapper.vm.clearMessage()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toBe('')
  })

  it('updates message when prop changes', async () => {
    const wrapper = mount(LiveRegion, {
      props: {
        message: 'Initial message'
      }
    })

    expect(wrapper.text()).toContain('Initial message')

    await wrapper.setProps({ message: 'Updated message' })

    expect(wrapper.text()).toContain('Updated message')
  })

  it('has proper CSS classes for screen reader only content', () => {
    const wrapper = mount(LiveRegion)

    const liveRegion = wrapper.find('.live-region')
    expect(liveRegion.exists()).toBe(true)
    
    // Check that it has the live-region class (CSS styles are applied in browser)
    expect(liveRegion.classes()).toContain('live-region')
  })
})