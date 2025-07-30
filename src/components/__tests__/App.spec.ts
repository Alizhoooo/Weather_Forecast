import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'
import { locationService } from '@/services/LocationService'

// Mock the location service
vi.mock('@/services/LocationService', () => ({
  locationService: {
    searchLocations: vi.fn()
  }
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the main application structure', async () => {
    const wrapper = mount(App)
    
    // Check that app container is present
    expect(wrapper.find('.app').exists()).toBe(true)
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 600))
    await wrapper.vm.$nextTick()
    
    // Check that main elements are present after initialization
    expect(wrapper.find('.app-header').exists()).toBe(true)
    expect(wrapper.find('.app-main').exists()).toBe(true)
    expect(wrapper.find('.app-footer').exists()).toBe(true)
  })

  it('displays the welcome section initially', async () => {
    const wrapper = mount(App)
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 600))
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.welcome-section').exists()).toBe(true)
    expect(wrapper.find('.welcome-title').text()).toContain('Welcome to Weather Forecast')
  })

  it('shows loading spinner during initialization', () => {
    const wrapper = mount(App)
    
    expect(wrapper.find('.app-initializing').exists()).toBe(true)
  })

  it('has proper accessibility attributes', async () => {
    const wrapper = mount(App)
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 600))
    await wrapper.vm.$nextTick()
    
    // Check for proper ARIA labels
    expect(wrapper.find('[role="main"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Location search"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Welcome message"]').exists()).toBe(true)
  })
})