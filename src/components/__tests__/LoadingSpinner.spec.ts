import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingSpinner from '../LoadingSpinner.vue'

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    const wrapper = mount(LoadingSpinner)

    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    expect(wrapper.find('.loading-spinner__icon').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading...')
  })

  it('applies correct size class', () => {
    const sizes = ['small', 'medium', 'large'] as const
    
    sizes.forEach(size => {
      const wrapper = mount(LoadingSpinner, {
        props: { size }
      })
      
      expect(wrapper.find(`.loading-spinner__icon--${size}`).exists()).toBe(true)
    })
  })

  it('displays custom message', () => {
    const customMessage = 'Fetching weather data...'
    const wrapper = mount(LoadingSpinner, {
      props: { message: customMessage }
    })

    expect(wrapper.text()).toContain(customMessage)
  })

  it('hides message when hideMessage is true', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { 
        message: 'Loading...',
        hideMessage: true
      }
    })

    const messageElement = wrapper.find('.loading-spinner__message')
    expect(messageElement.exists()).toBe(true)
    expect(messageElement.classes()).toContain('sr-only')
  })

  it('applies inline class when inline prop is true', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { inline: true }
    })

    expect(wrapper.find('.loading-spinner--inline').exists()).toBe(true)
  })

  it('has proper accessibility attributes', () => {
    const wrapper = mount(LoadingSpinner)

    const spinnerDiv = wrapper.find('.loading-spinner')
    expect(spinnerDiv.attributes('role')).toBe('status')
    expect(spinnerDiv.attributes('aria-label')).toBe('Loading content')
  })

  it('supports custom aria-label', () => {
    const customLabel = 'Loading weather forecast'
    const wrapper = mount(LoadingSpinner, {
      props: { ariaLabel: customLabel }
    })

    expect(wrapper.find('.loading-spinner').attributes('aria-label')).toBe(customLabel)
  })

  it('links message with aria-describedby when message exists', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { message: 'Loading data...' }
    })

    const spinnerDiv = wrapper.find('.loading-spinner')
    const messageElement = wrapper.find('.loading-spinner__message')
    
    const describedBy = spinnerDiv.attributes('aria-describedby')
    const messageId = messageElement.attributes('id')
    
    expect(describedBy).toBe(messageId)
    expect(messageId).toBeDefined()
  })

  it('does not set aria-describedby when no message', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { message: '' }
    })

    const spinnerDiv = wrapper.find('.loading-spinner')
    expect(spinnerDiv.attributes('aria-describedby')).toBeUndefined()
  })

  it('has aria-hidden on SVG icon', () => {
    const wrapper = mount(LoadingSpinner)

    const svgIcon = wrapper.find('.loading-spinner__icon')
    expect(svgIcon.attributes('aria-hidden')).toBe('true')
  })

  it('generates unique IDs for different instances', () => {
    const wrapper1 = mount(LoadingSpinner, {
      props: { message: 'Loading...' }
    })
    
    const wrapper2 = mount(LoadingSpinner, {
      props: { message: 'Loading...' }
    })

    const messageId1 = wrapper1.find('.loading-spinner__message').attributes('id')
    const messageId2 = wrapper2.find('.loading-spinner__message').attributes('id')
    
    expect(messageId1).not.toBe(messageId2)
  })

  it('renders without message element when message is empty', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { message: '' }
    })

    expect(wrapper.find('.loading-spinner__message').exists()).toBe(false)
  })

  it('maintains proper structure for inline layout', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { 
        inline: true,
        message: 'Loading...'
      }
    })

    const container = wrapper.find('.loading-spinner__container')
    expect(wrapper.find('.loading-spinner--inline').exists()).toBe(true)
    expect(container.exists()).toBe(true)
  })

  it('applies correct default size when not specified', () => {
    const wrapper = mount(LoadingSpinner)

    expect(wrapper.find('.loading-spinner__icon--medium').exists()).toBe(true)
  })

  it('has proper SVG structure for animation', () => {
    const wrapper = mount(LoadingSpinner)

    const svg = wrapper.find('.loading-spinner__icon')
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
    expect(svg.attributes('fill')).toBe('none')
    
    const trackCircle = wrapper.find('.loading-spinner__track')
    const progressCircle = wrapper.find('.loading-spinner__progress')
    
    expect(trackCircle.exists()).toBe(true)
    expect(progressCircle.exists()).toBe(true)
    expect(trackCircle.attributes('r')).toBe('10')
    expect(progressCircle.attributes('r')).toBe('10')
  })

  it('supports all size variants correctly', () => {
    const sizeTests = [
      { size: 'small' as const, expected: 'loading-spinner__icon--small' },
      { size: 'medium' as const, expected: 'loading-spinner__icon--medium' },
      { size: 'large' as const, expected: 'loading-spinner__icon--large' }
    ]

    sizeTests.forEach(({ size, expected }) => {
      const wrapper = mount(LoadingSpinner, {
        props: { size }
      })
      
      expect(wrapper.find(`.${expected}`).exists()).toBe(true)
    })
  })

  it('maintains accessibility when hideMessage is true', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { 
        message: 'Loading data...',
        hideMessage: true
      }
    })

    const spinnerDiv = wrapper.find('.loading-spinner')
    const messageElement = wrapper.find('.loading-spinner__message')
    
    // Message should still be linked for screen readers
    expect(spinnerDiv.attributes('aria-describedby')).toBe(messageElement.attributes('id'))
    // But visually hidden
    expect(messageElement.classes()).toContain('sr-only')
  })
})