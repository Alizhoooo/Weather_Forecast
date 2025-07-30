import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import LocationResults from '../LocationResults.vue'
import type { Location } from '@/types'

// Mock locations for testing
const mockLocations: Location[] = [
  {
    id: 1,
    name: 'New York',
    country: 'United States',
    admin1: 'New York',
    latitude: 40.7128,
    longitude: -74.0060
  },
  {
    id: 2,
    name: 'London',
    country: 'United Kingdom',
    admin1: 'England',
    latitude: 51.5074,
    longitude: -0.1278
  },
  {
    id: 3,
    name: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503
  }
]

describe('LocationResults', () => {
  let wrapper: VueWrapper<any>

  const createWrapper = (props = {}) => {
    return mount(LocationResults, {
      props: {
        locations: [],
        loading: false,
        hasSearched: false,
        ...props
      }
    })
  }

  beforeEach(() => {
    wrapper?.unmount()
  })

  describe('Component Rendering', () => {
    it('should not render when no search has been performed and no loading', () => {
      wrapper = createWrapper({
        locations: [],
        loading: false,
        hasSearched: false
      })

      expect(wrapper.find('.location-results').exists()).toBe(false)
    })

    it('should render loading state when loading is true', () => {
      wrapper = createWrapper({
        locations: [],
        loading: true,
        hasSearched: true
      })

      expect(wrapper.find('.results-loading').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.find('.loading-text').text()).toBe('Searching for locations...')
    })

    it('should render no results state when search performed but no locations found', () => {
      wrapper = createWrapper({
        locations: [],
        loading: false,
        hasSearched: true
      })

      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.find('.no-results-text').text()).toBe('No locations found')
      expect(wrapper.find('.no-results-help').text()).toBe('Try searching with a different location name')
    })

    it('should render location results when locations are provided', () => {
      wrapper = createWrapper({
        locations: mockLocations,
        loading: false,
        hasSearched: true
      })

      expect(wrapper.find('.results-list').exists()).toBe(true)
      expect(wrapper.findAll('.location-item')).toHaveLength(3)
    })
  })

  describe('Location Display', () => {
    beforeEach(() => {
      wrapper = createWrapper({
        locations: mockLocations,
        loading: false,
        hasSearched: true
      })
    })

    it('should display location name and country correctly', () => {
      const firstLocation = wrapper.findAll('.location-item')[0]
      
      expect(firstLocation.find('.location-name').text()).toBe('New York')
      expect(firstLocation.find('.location-country').text()).toBe('United States')
    })

    it('should display admin1 (region) when available', () => {
      const firstLocation = wrapper.findAll('.location-item')[0]
      
      expect(firstLocation.find('.location-region').text()).toBe(', New York')
    })

    it('should not display admin1 when not available', () => {
      const tokyoLocation = wrapper.findAll('.location-item')[2]
      
      expect(tokyoLocation.find('.location-region').exists()).toBe(false)
    })

    it('should have proper accessibility attributes', () => {
      const resultsList = wrapper.find('.results-list')
      
      expect(resultsList.attributes('role')).toBe('listbox')
      expect(resultsList.attributes('aria-label')).toBe('Location search results')
      
      const locationItems = wrapper.findAll('.location-item')
      locationItems.forEach(item => {
        expect(item.attributes('role')).toBe('option')
        expect(item.attributes('aria-selected')).toBeDefined()
      })
    })
  })

  describe('Location Selection', () => {
    beforeEach(() => {
      wrapper = createWrapper({
        locations: mockLocations,
        loading: false,
        hasSearched: true
      })
    })

    it('should emit select-location event when location is clicked', async () => {
      const firstLocation = wrapper.findAll('.location-item')[0]
      
      await firstLocation.trigger('click')
      
      expect(wrapper.emitted('select-location')).toBeTruthy()
      expect(wrapper.emitted('select-location')![0]).toEqual([mockLocations[0]])
    })

    it('should emit select-location event when Enter key is pressed', async () => {
      const firstLocation = wrapper.findAll('.location-item')[0]
      
      await firstLocation.trigger('keydown.enter')
      
      expect(wrapper.emitted('select-location')).toBeTruthy()
      expect(wrapper.emitted('select-location')![0]).toEqual([mockLocations[0]])
    })

    it('should emit select-location event when Space key is pressed', async () => {
      const firstLocation = wrapper.findAll('.location-item')[0]
      
      await firstLocation.trigger('keydown.space')
      
      expect(wrapper.emitted('select-location')).toBeTruthy()
      expect(wrapper.emitted('select-location')![0]).toEqual([mockLocations[0]])
    })

    it('should prevent default behavior on space key press', async () => {
      const firstLocation = wrapper.findAll('.location-item')[0]
      const event = new KeyboardEvent('keydown', { key: ' ' })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      
      await firstLocation.element.dispatchEvent(event)
      
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      wrapper = createWrapper({
        locations: mockLocations,
        loading: false,
        hasSearched: true
      })
    })

    it('should highlight location on mouse enter', async () => {
      const secondLocation = wrapper.findAll('.location-item')[1]
      
      await secondLocation.trigger('mouseenter')
      
      expect(secondLocation.classes()).toContain('location-item--highlighted')
      expect(secondLocation.attributes('aria-selected')).toBe('true')
    })

    it('should remove highlight on mouse leave', async () => {
      const secondLocation = wrapper.findAll('.location-item')[1]
      
      await secondLocation.trigger('mouseenter')
      expect(secondLocation.classes()).toContain('location-item--highlighted')
      
      await secondLocation.trigger('mouseleave')
      expect(secondLocation.classes()).not.toContain('location-item--highlighted')
      expect(secondLocation.attributes('aria-selected')).toBe('false')
    })

    it('should handle arrow key navigation', async () => {
      // Simulate arrow down key press on document
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      document.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      
      const firstLocation = wrapper.findAll('.location-item')[0]
      expect(firstLocation.classes()).toContain('location-item--highlighted')
      expect(firstLocation.attributes('aria-selected')).toBe('true')
    })

    it('should wrap around when navigating past the last item', async () => {
      // Navigate to last item
      const component = wrapper.vm
      component.highlightedIndex = mockLocations.length - 1
      await wrapper.vm.$nextTick()
      
      // Press arrow down to wrap to first item
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      document.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      
      const firstLocation = wrapper.findAll('.location-item')[0]
      expect(firstLocation.classes()).toContain('location-item--highlighted')
    })

    it('should wrap around when navigating before the first item', async () => {
      // Start at first item
      const component = wrapper.vm
      component.highlightedIndex = 0
      await wrapper.vm.$nextTick()
      
      // Press arrow up to wrap to last item
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      document.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      
      const lastLocation = wrapper.findAll('.location-item')[mockLocations.length - 1]
      expect(lastLocation.classes()).toContain('location-item--highlighted')
    })

    it('should emit close event when Escape key is pressed', async () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should select highlighted location when Enter is pressed globally', async () => {
      // Highlight first location
      const component = wrapper.vm
      component.highlightedIndex = 0
      await wrapper.vm.$nextTick()
      
      // Press Enter globally
      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.emitted('select-location')).toBeTruthy()
      expect(wrapper.emitted('select-location')![0]).toEqual([mockLocations[0]])
    })
  })

  describe('State Management', () => {
    it('should reset highlighted index when locations change', async () => {
      wrapper = createWrapper({
        locations: mockLocations,
        loading: false,
        hasSearched: true
      })
      
      // Highlight a location
      const component = wrapper.vm
      component.highlightedIndex = 1
      await wrapper.vm.$nextTick()
      
      // Change locations
      await wrapper.setProps({ locations: [mockLocations[0]] })
      
      expect(component.highlightedIndex).toBe(-1)
    })

    it('should reset highlighted index when loading starts', async () => {
      wrapper = createWrapper({
        locations: mockLocations,
        loading: false,
        hasSearched: true
      })
      
      // Highlight a location
      const component = wrapper.vm
      component.highlightedIndex = 1
      await wrapper.vm.$nextTick()
      
      // Start loading
      await wrapper.setProps({ loading: true })
      
      expect(component.highlightedIndex).toBe(-1)
    })

    it('should not handle keyboard events when loading', async () => {
      wrapper = createWrapper({
        locations: mockLocations,
        loading: true,
        hasSearched: true
      })
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      document.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      
      const component = wrapper.vm
      expect(component.highlightedIndex).toBe(-1)
    })

    it('should not handle keyboard events when no results are shown', async () => {
      wrapper = createWrapper({
        locations: [],
        loading: false,
        hasSearched: false
      })
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      document.dispatchEvent(event)
      await wrapper.vm.$nextTick()
      
      const component = wrapper.vm
      expect(component.highlightedIndex).toBe(-1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA live regions for loading state', () => {
      wrapper = createWrapper({
        locations: [],
        loading: true,
        hasSearched: true
      })
      
      const loadingElement = wrapper.find('.results-loading')
      expect(loadingElement.attributes('aria-live')).toBe('polite')
    })

    it('should have proper ARIA live regions for no results state', () => {
      wrapper = createWrapper({
        locations: [],
        loading: false,
        hasSearched: true
      })
      
      const noResultsElement = wrapper.find('.no-results')
      expect(noResultsElement.attributes('role')).toBe('status')
      expect(noResultsElement.attributes('aria-live')).toBe('polite')
    })

    it('should update aria-selected attributes correctly', async () => {
      wrapper = createWrapper({
        locations: mockLocations,
        loading: false,
        hasSearched: true
      })
      
      const locations = wrapper.findAll('.location-item')
      
      // Initially no location should be selected
      locations.forEach(location => {
        expect(location.attributes('aria-selected')).toBe('false')
      })
      
      // Highlight first location
      await locations[0].trigger('mouseenter')
      
      expect(locations[0].attributes('aria-selected')).toBe('true')
      expect(locations[1].attributes('aria-selected')).toBe('false')
      expect(locations[2].attributes('aria-selected')).toBe('false')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty locations array gracefully', () => {
      wrapper = createWrapper({
        locations: [],
        loading: false,
        hasSearched: true
      })
      
      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.find('.results-list').exists()).toBe(false)
    })

    it('should handle locations without admin1 field', () => {
      const locationsWithoutAdmin1: Location[] = [
        {
          id: 1,
          name: 'Paris',
          country: 'France',
          latitude: 48.8566,
          longitude: 2.3522
        }
      ]
      
      wrapper = createWrapper({
        locations: locationsWithoutAdmin1,
        loading: false,
        hasSearched: true
      })
      
      const locationItem = wrapper.find('.location-item')
      expect(locationItem.find('.location-name').text()).toBe('Paris')
      expect(locationItem.find('.location-country').text()).toBe('France')
      expect(locationItem.find('.location-region').exists()).toBe(false)
    })

    it('should handle rapid prop changes', async () => {
      wrapper = createWrapper({
        locations: [],
        loading: true,
        hasSearched: true
      })
      
      // Rapidly change props
      await wrapper.setProps({ loading: false, locations: mockLocations })
      await wrapper.setProps({ loading: true, locations: [] })
      await wrapper.setProps({ loading: false, locations: mockLocations })
      
      expect(wrapper.find('.results-list').exists()).toBe(true)
      expect(wrapper.findAll('.location-item')).toHaveLength(3)
    })
  })
})