import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Mock the API module
vi.mock('../utils/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn()
  }
}))

import { authApi } from '../utils/api'

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should start with no user', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should login successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com', plan: 'free' }
    authApi.login.mockResolvedValue({ token: 'test-token', user: mockUser })

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const response = await result.current.login('test@example.com', 'password')
      expect(response.success).toBe(true)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
    expect(localStorage.getItem('token')).toBe('test-token')
  })

  it('should handle login failure', async () => {
    authApi.login.mockRejectedValue(new Error('Invalid credentials'))

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const response = await result.current.login('test@example.com', 'wrong')
      expect(response.success).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.error).toBe('Invalid credentials')
  })

  it('should logout', async () => {
    const mockUser = { id: '1', email: 'test@example.com', plan: 'free' }
    authApi.login.mockResolvedValue({ token: 'test-token', user: mockUser })

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Login first
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })

    // Then logout
    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
  })
})
