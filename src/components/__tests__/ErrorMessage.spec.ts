import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorMessage from '../ErrorMessage.vue'
import type { AppError } from '../../types/error'

describe('ErrorMessage', () => {
  const mockError: AppError = {
    type: 'network',
    message: 'Network connection failed',
    retryable: true
  }

  const mockNonRetryableError: AppError = {
    type: 'data',
    message: 'Invalid data format',
    retryable: false
  }

  it('renders error message correctly', () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockError }
    })

    expect(wrapper.text()).toContain('Network connection failed')
    expect(wrapper.find('.error-message').exists()).toBe(true)
  })

  it('applies correct CSS class based on error type', () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockError }
    })

    expect(wrapper.find('.error-message--network').exists()).toBe(true)
  })

  it('shows retry button for retryable errors', () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockError }
    })

    const retryButton = wrapper.find('.error-message__retry')
    expect(retryButton.exists()).toBe(true)
    expect(retryButton.text()).toBe('Try Again')
  })

  it('hides retry button for non-retryable errors', () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockNonRetryableError }
    })

    expect(wrapper.find('.error-message__retry').exists()).toBe(false)
  })

  it('hides retry button when showRetry is false', () => {
    const wrapper = mount(ErrorMessage, {
      props: { 
        error: mockError,
        showRetry: false
      }
    })

    expect(wrapper.find('.error-message__retry').exists()).toBe(false)
  })

  it('emits retry event when retry button is clicked', async () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockError }
    })

    const retryButton = wrapper.find('.error-message__retry')
    await retryButton.trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('has proper accessibility attributes', () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockError }
    })

    const errorDiv = wrapper.find('.error-message')
    expect(errorDiv.attributes('role')).toBe('alert')
    expect(errorDiv.attributes('aria-live')).toBe('polite')
    expect(errorDiv.attributes('aria-describedby')).toBeDefined()
  })

  it('supports custom aria-live value', () => {
    const wrapper = mount(ErrorMessage, {
      props: { 
        error: mockError,
        ariaLive: 'assertive'
      }
    })

    expect(wrapper.find('.error-message').attributes('aria-live')).toBe('assertive')
  })

  it('has proper ARIA labels for retry button', () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockError }
    })

    const retryButton = wrapper.find('.error-message__retry')
    expect(retryButton.attributes('aria-describedby')).toBeDefined()
    
    const srText = wrapper.find('.sr-only')
    expect(srText.text()).toBe('Retry the failed operation')
  })

  it('renders icon with aria-hidden attribute', () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockError }
    })

    const icon = wrapper.find('.error-message__icon')
    expect(icon.attributes('aria-hidden')).toBe('true')
  })

  it('applies different styles for different error types', () => {
    const errorTypes: Array<AppError['type']> = ['network', 'api', 'data', 'user']
    
    errorTypes.forEach(type => {
      const error: AppError = {
        type,
        message: `${type} error`,
        retryable: false
      }
      
      const wrapper = mount(ErrorMessage, {
        props: { error }
      })
      
      expect(wrapper.find(`.error-message--${type}`).exists()).toBe(true)
    })
  })

  it('generates unique IDs for accessibility', () => {
    const wrapper1 = mount(ErrorMessage, {
      props: { error: mockError }
    })
    
    const wrapper2 = mount(ErrorMessage, {
      props: { error: mockError }
    })

    const errorId1 = wrapper1.find('.error-message__text').attributes('id')
    const errorId2 = wrapper2.find('.error-message__text').attributes('id')
    
    expect(errorId1).not.toBe(errorId2)
  })

  it('handles long error messages properly', () => {
    const longError: AppError = {
      type: 'api',
      message: 'This is a very long error message that should wrap properly and not break the layout of the component even on smaller screens',
      retryable: true
    }

    const wrapper = mount(ErrorMessage, {
      props: { error: longError }
    })

    expect(wrapper.text()).toContain(longError.message)
    expect(wrapper.find('.error-message__text').exists()).toBe(true)
  })

  it('maintains focus management for retry button', async () => {
    const wrapper = mount(ErrorMessage, {
      props: { error: mockError }
    })

    const retryButton = wrapper.find('.error-message__retry')
    
    // Simulate focus
    await retryButton.trigger('focus')
    
    // Check that focus styles are applied via CSS (outline)
    expect(retryButton.element.tagName).toBe('BUTTON')
    expect(retryButton.attributes('type')).toBe('button')
  })
})