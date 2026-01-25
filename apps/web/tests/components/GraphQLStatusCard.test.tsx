import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import GraphQLStatusCard from '@/components/GraphQLStatusCard'

// Mock the useGraphQLStatus hook
jest.mock('@/hooks/useGraphQLStatus', () => ({
  useGraphQLStatus: jest.fn()
}))

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'title': 'GraphQL API Status',
      'subtitle': 'Monitor connection to backend services',
      'refresh': 'Refresh',
      'status.checking': 'Checking...',
      'status.healthy': 'Healthy',
      'status.degraded': 'Degraded',
      'status.error': 'Error',
      'status.unknown': 'Unknown',
      'endpoint': 'Endpoint',
      'lastChecked': 'Last checked',
      'serviceStatus': 'Service Status',
      'api': 'API',
      'database.label': 'Database',
      'database.connected': 'Connected',
      'database.disconnected': 'Disconnected',
      'dbDetails': 'Details',
      'serverTime': 'Server Time',
      'allOperational': '✓ All systems operational',
      'someIssues': '⚠ Some services may be experiencing issues',
      'PostgreSQL connected': 'PostgreSQL connected'
    }
    return translations[key] || key
  }
}))

const mockUseGraphQLStatus = require('@/hooks/useGraphQLStatus').useGraphQLStatus

describe('GraphQLStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state', () => {
    mockUseGraphQLStatus.mockReturnValue({
      isLoading: true,
      error: null,
      lastChecked: null,
      apiUrl: 'http://localhost:8000/graphql',
      healthData: null,
      refetch: jest.fn()
    })

    render(<GraphQLStatusCard />)

    expect(screen.getByText('GraphQL API Status')).toBeInTheDocument()
    expect(screen.getAllByText('Checking...').length).toBeGreaterThan(0)
  })

  it('renders healthy status', () => {
    const mockHealthData = {
      status: 'ok',
      timestamp: '2024-01-01T00:00:00Z',
      api: { status: 'ok' },
      database: { status: 'ok', connection: true, details: 'PostgreSQL connected' }
    }

    mockUseGraphQLStatus.mockReturnValue({
      isLoading: false,
      error: null,
      lastChecked: new Date('2024-01-01T00:00:00Z'),
      apiUrl: 'http://localhost:8000/graphql',
      healthData: mockHealthData,
      refetch: jest.fn()
    })

    render(<GraphQLStatusCard />)

    expect(screen.getByText('Healthy')).toBeInTheDocument()
    expect(screen.getByText('✓ All systems operational')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('renders error status', () => {
    mockUseGraphQLStatus.mockReturnValue({
      isLoading: false,
      error: 'API connection failed',
      lastChecked: null,
      apiUrl: 'http://localhost:8000/graphql',
      healthData: null,
      refetch: jest.fn()
    })

    render(<GraphQLStatusCard />)

    expect(screen.getByText('Error:')).toBeInTheDocument()
    expect(screen.getByText('API connection failed')).toBeInTheDocument()
  })

  it('calls refetch when refresh button is clicked', () => {
    const mockRefetch = jest.fn()

    mockUseGraphQLStatus.mockReturnValue({
      isLoading: false,
      error: null,
      lastChecked: null,
      apiUrl: 'http://localhost:8000/graphql',
      healthData: null,
      refetch: mockRefetch
    })

    render(<GraphQLStatusCard />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('renders degraded status', () => {
    const mockHealthData = {
      status: 'degraded',
      timestamp: '2024-01-01T00:00:00Z',
      api: { status: 'ok' },
      database: { status: 'error', connection: false }
    }

    mockUseGraphQLStatus.mockReturnValue({
      isLoading: false,
      error: null,
      lastChecked: new Date('2024-01-01T00:00:00Z'),
      apiUrl: 'http://localhost:8000/graphql',
      healthData: mockHealthData,
      refetch: jest.fn()
    })

    render(<GraphQLStatusCard />)

    expect(screen.getByText('Degraded')).toBeInTheDocument()
    expect(screen.getByText('⚠ Some services may be experiencing issues')).toBeInTheDocument()
  })

  it('displays API endpoint URL', () => {
    mockUseGraphQLStatus.mockReturnValue({
      isLoading: false,
      error: null,
      lastChecked: null,
      apiUrl: 'http://localhost:8000/graphql',
      healthData: null,
      refetch: jest.fn()
    })

    render(<GraphQLStatusCard />)

    expect(screen.getByText('http://localhost:8000/graphql')).toBeInTheDocument()
  })
})
