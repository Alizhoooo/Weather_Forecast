import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchBar from '../SearchBar.vue'

// Mock timers for debounce testing
vi.useFakeTimers()

describe('SearchBar.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(SearchBar)
  })

  afterEach(() => {
    wrapper.unmount()
    vi.clearAllTimers()
  })

  describe('Component Rendering', () => {
    it('renders the search input with correct attributes', () => {
      const input = wrapper.find('.search-input')
      
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('text')
      expect(input.attributes('placeholder')).toBe('Search for a location...')
      expect(input.attributes('aria-label')).toBe('Location search')
      expect(input.attributes('aria-describedby')).toBe('search-help')
    })

    it('renders the help text', () => {
      const helpText = wrapper.find('#search-help')
      
      expect(helpText.exists()).toBe(true)
      expect(helpText.text()).toBe('Enter at least 2 characters to search for locations')
    })

    it('accepts custom placeholder prop', () => {
      wrapper = mount(SearchBar, {
        props: {
          placeholder: 'Custom placeholder'
        }
      })
      
      const input = wrapper.find('.search-input')
      expect(input.attributes('placeholder')).toBe('Custom placeholder')
    })
  })

  describe('User Input Handling', () => {
    it('updates search query when user types', async () => {
      const input = wrapper.find('.search-input')
      
      await input.setValue('New York')
      
      expect((input.element as HTMLInputElement).value).toBe('New York')
    })

    it('shows clear button when there is text', async () => {
      const input = wrapper.find('.search-input')
      
      // Initially no clear button
      expect(wrapper.find('.clear-button').exists()).toBe(false)
      
      // Type some text
      await input.setValue('London')
      
      // Clear button should appear
      expect(wrapper.find('.clear-button').exists()).toBe(true)
    })

    it('clears search when clear button is clicked', async () => {
      const input = wrapper.find('.search-input')
      
      // Type some text
      await input.setValue('Paris')
      
      // Click clear button
      const clearButton = wrapper.find('.clear-button')
      await clearButton.trigger('click')
      
      // Input should be cleared
      expect((input.element as HTMLInputElement).value).toBe('')
      expect(wrapper.emitted('clear')).toBeTruthy()
    })
  })

  describe('Debounced Search', () => {
    it('emits search event after debounce delay for valid query', async () => {
      const input = wrapper.find('.search-input')
      
      // Type a valid query
      await input.setValue('London')
      await input.trigger('input')
      
      // Should not emit immediately
      expect(wrapper.emitted('search')).toBeFalsy()
      
      // Fast-forward time past debounce delay
      vi.advanceTimersByTime(300)
      
      // Should emit search event
      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search')?.[0]).toEqual(['London'])
    })

    it('does not emit search for queries shorter than 2 characters', async () => {
      const input = wrapper.find('.search-input')
      
      // Type a short query
      await input.setValue('L')
      await input.trigger('input')
      
      // Fast-forward time
      vi.advanceTimersByTime(300)
      
      // Should emit clear instead of search
      expect(wrapper.emitted('search')).toBeFalsy()
      expect(wrapper.emitted('clear')).toBeTruthy()
    })

    it('cancels previous debounce when user continues typing', async () => {
      const input = wrapper.find('.search-input')
      
      // Type first query
      await input.setValue('Lon')
      await input.trigger('input')
      
      // Wait partially through debounce
      vi.advanceTimersByTime(150)
      
      // Type more characters
      await input.setValue('London')
      await input.trigger('input')
      
      // Wait for original debounce time
      vi.advanceTimersByTime(150)
      
      // Should not have emitted yet (original timer was cancelled)
      expect(wrapper.emitted('search')).toBeFalsy()
      
      // Wait for new debounce to complete
      vi.advanceTimersByTime(150)
      
      // Should emit with final query
      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search')?.[0]).toEqual(['London'])
    })
  })

  describe('Enter Key Handling', () => {
    it('triggers immediate search on Enter key for valid query', async () => {
      const input = wrapper.find('.search-input')
      
      // Type a valid query
      await input.setValue('Tokyo')
      
      // Press Enter
      await input.trigger('keydown.enter')
      
      // Should emit search immediately without waiting for debounce
      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search')?.[0]).toEqual(['Tokyo'])
    })

    it('does not search on Enter for invalid query', async () => {
      const input = wrapper.find('.search-input')
      
      // Type an invalid query
      await input.setValue('T')
      
      // Press Enter
      await input.trigger('keydown.enter')
      
      // Should not emit search
      expect(wrapper.emitted('search')).toBeFalsy()
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when loading', async () => {
      // Initially no spinner
      expect(wrapper.find('.search-loading').exists()).toBe(false)
      
      // Set loading state using exposed method
      ;(wrapper.vm as any).setLoading(true)
      await wrapper.vm.$nextTick()
      
      // Should show spinner
      expect(wrapper.find('.search-loading').exists()).toBe(true)
      expect(wrapper.find('.spinner').exists()).toBe(true)
    })

    it('hides clear button when loading', async () => {
      const input = wrapper.find('.search-input')
      
      // Type some text to show clear button
      await input.setValue('Berlin')
      expect(wrapper.find('.clear-button').exists()).toBe(true)
      
      // Set loading state
      ;(wrapper.vm as any).setLoading(true)
      await wrapper.vm.$nextTick()
      
      // Clear button should be hidden, spinner should be shown
      expect(wrapper.find('.clear-button').exists()).toBe(false)
      expect(wrapper.find('.search-loading').exists()).toBe(true)
    })

    it('disables input when loading', async () => {
      const input = wrapper.find('.search-input')
      
      // Set loading state
      ;(wrapper.vm as any).setLoading(true)
      await wrapper.vm.$nextTick()
      
      // Input should be disabled
      expect(input.attributes('disabled')).toBeDefined()
    })
  })

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      wrapper = mount(SearchBar, {
        props: {
          disabled: true
        }
      })
      
      const input = wrapper.find('.search-input')
      expect(input.attributes('disabled')).toBeDefined()
    })

    it('does not emit search when disabled', async () => {
      wrapper = mount(SearchBar, {
        props: {
          disabled: true
        }
      })
      
      const input = wrapper.find('.search-input')
      
      // Try to type and trigger search
      await input.setValue('Madrid')
      await input.trigger('keydown.enter')
      
      // Should not emit search
      expect(wrapper.emitted('search')).toBeFalsy()
    })
  })

  describe('Focus and Blur Events', () => {
    it('emits focus event when input is focused', async () => {
      const input = wrapper.find('.search-input')
      
      await input.trigger('focus')
      
      expect(wrapper.emitted('focus')).toBeTruthy()
    })

    it('emits blur event when input loses focus', async () => {
      const input = wrapper.find('.search-input')
      
      await input.trigger('blur')
      
      expect(wrapper.emitted('blur')).toBeTruthy()
    })
  })

  describe('Exposed Methods', () => {
    it('exposes setLoading method', () => {
      expect(typeof (wrapper.vm as any).setLoading).toBe('function')
    })

    it('exposes focus method', () => {
      expect(typeof (wrapper.vm as any).focus).toBe('function')
    })

    it('exposes setValue method', async () => {
      expect(typeof (wrapper.vm as any).setValue).toBe('function')
      
      ;(wrapper.vm as any).setValue('Test Value')
      await wrapper.vm.$nextTick()
      
      const input = wrapper.find('.search-input')
      expect((input.element as HTMLInputElement).value).toBe('Test Value')
    })

    it('exposes clearSearch method', async () => {
      expect(typeof (wrapper.vm as any).clearSearch).toBe('function')
      
      const input = wrapper.find('.search-input')
      await input.setValue('Test')
      
      ;(wrapper.vm as any).clearSearch()
      await wrapper.vm.$nextTick()
      
      expect((input.element as HTMLInputElement).value).toBe('')
      expect(wrapper.emitted('clear')).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const input = wrapper.find('.search-input')
      
      expect(input.attributes('aria-label')).toBe('Location search')
      expect(input.attributes('aria-describedby')).toBe('search-help')
    })

    it('has proper ARIA label for loading spinner', async () => {
      ;(wrapper.vm as any).setLoading(true)
      await wrapper.vm.$nextTick()
      
      const loadingDiv = wrapper.find('.search-loading')
      expect(loadingDiv.attributes('aria-label')).toBe('Searching for locations')
    })

    it('has proper ARIA label for clear button', async () => {
      const input = wrapper.find('.search-input')
      await input.setValue('Test')
      
      const clearButton = wrapper.find('.clear-button')
      expect(clearButton.attributes('aria-label')).toBe('Clear search')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty string input gracefully', async () => {
      const input = wrapper.find('.search-input')
      
      await input.setValue('')
      await input.trigger('input')
      
      vi.advanceTimersByTime(300)
      
      expect(wrapper.emitted('search')).toBeFalsy()
      expect(wrapper.emitted('clear')).toBeTruthy()
    })

    it('handles whitespace-only input', async () => {
      const input = wrapper.find('.search-input')
      
      await input.setValue('   ')
      await input.trigger('input')
      
      vi.advanceTimersByTime(300)
      
      expect(wrapper.emitted('search')).toBeFalsy()
      expect(wrapper.emitted('clear')).toBeTruthy()
    })

    it('trims whitespace from search queries', async () => {
      const input = wrapper.find('.search-input')
      
      await input.setValue('  London  ')
      await input.trigger('keydown.enter')
      
      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search')?.[0]).toEqual(['London'])
    })
  })
})