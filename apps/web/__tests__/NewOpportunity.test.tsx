/**
 * NewOpportunity Component Integration Test Suite
 * Tests complete workflow from customer creation to estimate generation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewOpportunity from '../src/app/components/NewOpportunity';
import { AuthProvider } from '../src/app/contexts/AuthContext';

// Mock AuthContext
jest.mock('../src/app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', username: 'testuser', role: 'admin' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('NewOpportunity Component - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [], customer: { id: 'new-customer-123' } }),
    });
  });

  describe('Initial Rendering and Navigation', () => {
    it('should render with initial step (Customer Information)', () => {
      render(<NewOpportunity />);

      expect(screen.getByText('Create New Opportunity')).toBeInTheDocument();
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
    });

    it('should display all 4 steps in progress indicator', () => {
      render(<NewOpportunity />);

      expect(screen.getByText('Customer Info')).toBeInTheDocument();
      expect(screen.getByText('Move Details')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('should show step 1 as active initially', () => {
      const { container } = render(<NewOpportunity />);

      const steps = container.querySelectorAll('[class*="step"]');
      expect(steps[0]).toHaveClass('active');
    });

    it('should display Next button on step 1', () => {
      render(<NewOpportunity />);

      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    });
  });

  describe('Step 1: Customer Information', () => {
    it('should validate required fields', async () => {
      render(<NewOpportunity />);

      // Try to proceed without filling required fields
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText(/Please correct the highlighted errors/)).toBeInTheDocument();
      });
    });

    it('should fill customer information correctly', () => {
      render(<NewOpportunity />);

      fireEvent.change(screen.getByLabelText('First Name *'), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), {
        target: { value: 'Doe' },
      });
      fireEvent.change(screen.getByLabelText('Email *'), {
        target: { value: 'john.doe@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Phone *'), {
        target: { value: '(555) 123-4567' },
      });

      const firstNameInput = screen.getByLabelText('First Name *') as HTMLInputElement;
      expect(firstNameInput.value).toBe('John');
    });

    it('should validate email format', async () => {
      render(<NewOpportunity />);

      fireEvent.change(screen.getByLabelText('Email *'), {
        target: { value: 'invalid-email' },
      });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('should show company name field for commercial customers', () => {
      render(<NewOpportunity />);

      const customerTypeSelect = screen.getByLabelText('Customer Type *');
      fireEvent.change(customerTypeSelect, { target: { value: 'commercial' } });

      expect(screen.getByLabelText('Company Name *')).toBeInTheDocument();
    });

    it('should check for duplicate customers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customers: [{ id: '123', email: 'john.doe@example.com' }],
        }),
      });

      render(<NewOpportunity />);

      fireEvent.change(screen.getByLabelText('Email *'), {
        target: { value: 'john.doe@example.com' },
      });

      fireEvent.blur(screen.getByLabelText('Email *'));

      await waitFor(() => {
        expect(screen.getByText(/customer with this email already exists/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should proceed to step 2 with valid data', async () => {
      render(<NewOpportunity />);

      // Fill all required fields
      fireEvent.change(screen.getByLabelText('First Name *'), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), {
        target: { value: 'Doe' },
      });
      fireEvent.change(screen.getByLabelText('Email *'), {
        target: { value: 'john.doe@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Phone *'), {
        target: { value: '5551234567' },
      });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Details')).toBeInTheDocument();
        expect(screen.getByLabelText('Service Type *')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Move Details', () => {
    beforeEach(async () => {
      render(<NewOpportunity />);

      // Fill step 1 and proceed
      fireEvent.change(screen.getByLabelText('First Name *'), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), {
        target: { value: 'Doe' },
      });
      fireEvent.change(screen.getByLabelText('Email *'), {
        target: { value: 'john.doe@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Phone *'), {
        target: { value: '5551234567' },
      });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Details')).toBeInTheDocument();
      });
    });

    it('should display move details form', () => {
      expect(screen.getByLabelText('Service Type *')).toBeInTheDocument();
      expect(screen.getByLabelText('Move Date *')).toBeInTheDocument();
      expect(screen.getByText('Pickup Address')).toBeInTheDocument();
      expect(screen.getByText('Delivery Address')).toBeInTheDocument();
    });

    it('should validate pickup address', async () => {
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Pickup address is required')).toBeInTheDocument();
      });
    });

    it('should validate delivery address', async () => {
      const pickupAddressInput = screen.getByPlaceholderText('123 Main St, City, State ZIP');
      fireEvent.change(pickupAddressInput, {
        target: { value: '123 Main St' },
      });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Delivery address is required')).toBeInTheDocument();
      });
    });

    it('should fill move details correctly', () => {
      const pickupInputs = screen.getAllByPlaceholderText('123 Main St, City, State ZIP');
      const deliveryInputs = screen.getAllByPlaceholderText('456 Oak Ave, City, State ZIP');

      fireEvent.change(pickupInputs[0], {
        target: { value: '123 Main St, Boston, MA 02101' },
      });

      fireEvent.change(deliveryInputs[0], {
        target: { value: '456 Oak Ave, Cambridge, MA 02138' },
      });

      const pickupInput = pickupInputs[0] as HTMLInputElement;
      expect(pickupInput.value).toBe('123 Main St, Boston, MA 02101');
    });

    it('should allow access difficulty selection', () => {
      const accessSelect = screen.getByLabelText('Access Difficulty');

      fireEvent.change(accessSelect, { target: { value: 'difficult' } });

      expect((accessSelect as HTMLSelectElement).value).toBe('difficult');
    });

    it('should allow elevator access checkbox', () => {
      const elevatorCheckbox = screen.getAllByText('Elevator Access')[0]
        .closest('label')
        ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      fireEvent.click(elevatorCheckbox);

      expect(elevatorCheckbox.checked).toBe(true);
    });

    it('should proceed to step 3 with valid data', async () => {
      const pickupInputs = screen.getAllByPlaceholderText('123 Main St, City, State ZIP');
      const deliveryInputs = screen.getAllByPlaceholderText('456 Oak Ave, City, State ZIP');

      fireEvent.change(pickupInputs[0], {
        target: { value: '123 Main St' },
      });
      fireEvent.change(deliveryInputs[0], {
        target: { value: '456 Oak Ave' },
      });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Size & Inventory')).toBeInTheDocument();
      });
    });

    it('should allow Previous button to go back', async () => {
      fireEvent.click(screen.getByText('Previous'));

      await waitFor(() => {
        expect(screen.getByText('Customer Information')).toBeInTheDocument();
        expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Inventory', () => {
    beforeEach(async () => {
      render(<NewOpportunity />);

      // Navigate to step 3
      // Step 1
      fireEvent.change(screen.getByLabelText('First Name *'), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), {
        target: { value: 'Doe' },
      });
      fireEvent.change(screen.getByLabelText('Email *'), {
        target: { value: 'john.doe@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Phone *'), {
        target: { value: '5551234567' },
      });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Details')).toBeInTheDocument();
      });

      // Step 2
      const pickupInputs = screen.getAllByPlaceholderText('123 Main St, City, State ZIP');
      const deliveryInputs = screen.getAllByPlaceholderText('456 Oak Ave, City, State ZIP');
      fireEvent.change(pickupInputs[0], {
        target: { value: '123 Main St' },
      });
      fireEvent.change(deliveryInputs[0], {
        target: { value: '456 Oak Ave' },
      });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Size & Inventory')).toBeInTheDocument();
      });
    });

    it('should display move size dropdown', () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      expect(moveSizeSelect).toBeInTheDocument();
    });

    it('should display predefined move sizes', () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      const options = moveSizeSelect.querySelectorAll('option');

      expect(options.length).toBeGreaterThan(15); // Should have multiple move sizes
      expect(Array.from(options).some(opt => opt.textContent?.includes('2 Bedroom Apartment'))).toBe(true);
    });

    it('should auto-populate weight and volume when move size is selected', () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');

      // Select "2 Bedroom Apartment"
      fireEvent.change(moveSizeSelect, { target: { value: '4' } }); // ID 4 is 2BR Apt

      const weightInput = screen.getByLabelText('Total Weight (lbs) *') as HTMLInputElement;
      const volumeInput = screen.getByLabelText('Total Volume (cu ft) *') as HTMLInputElement;

      expect(weightInput.value).toBe('5886'); // Weight for 2BR Apt
      expect(volumeInput.value).toBe('654'); // Volume for 2BR Apt
    });

    it('should disable weight/volume inputs when move size is selected', () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      fireEvent.change(moveSizeSelect, { target: { value: '4' } });

      const weightInput = screen.getByLabelText('Total Weight (lbs) *') as HTMLInputElement;
      const volumeInput = screen.getByLabelText('Total Volume (cu ft) *') as HTMLInputElement;

      expect(weightInput).toBeDisabled();
      expect(volumeInput).toBeDisabled();
    });

    it('should enable manual entry when selected', () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      fireEvent.change(moveSizeSelect, { target: { value: 'manual' } });

      const weightInput = screen.getByLabelText('Total Weight (lbs) *') as HTMLInputElement;
      const volumeInput = screen.getByLabelText('Total Volume (cu ft) *') as HTMLInputElement;

      expect(weightInput).not.toBeDisabled();
      expect(volumeInput).not.toBeDisabled();
    });

    it('should display special items checkboxes', () => {
      expect(screen.getByText('Piano')).toBeInTheDocument();
      expect(screen.getByText('Antiques')).toBeInTheDocument();
      expect(screen.getByText('Artwork')).toBeInTheDocument();
    });

    it('should display additional services checkboxes', () => {
      expect(screen.getByText('Packing')).toBeInTheDocument();
      expect(screen.getByText('Unpacking')).toBeInTheDocument();
      expect(screen.getByText('Assembly/Disassembly')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });

    it('should validate weight is greater than 0', async () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      fireEvent.change(moveSizeSelect, { target: { value: 'manual' } });

      const weightInput = screen.getByLabelText('Total Weight (lbs) *');
      fireEvent.change(weightInput, { target: { value: '0' } });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Total weight must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should proceed to step 4 with valid data', async () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      fireEvent.change(moveSizeSelect, { target: { value: '4' } }); // Select 2BR Apt

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      });
    });
  });

  describe('Step 4: Review & Submit', () => {
    beforeEach(async () => {
      render(<NewOpportunity />);

      // Navigate through all steps
      // Step 1
      fireEvent.change(screen.getByLabelText('First Name *'), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), {
        target: { value: 'Doe' },
      });
      fireEvent.change(screen.getByLabelText('Email *'), {
        target: { value: 'john.doe@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Phone *'), {
        target: { value: '5551234567' },
      });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Details')).toBeInTheDocument();
      });

      // Step 2
      const pickupInputs = screen.getAllByPlaceholderText('123 Main St, City, State ZIP');
      const deliveryInputs = screen.getAllByPlaceholderText('456 Oak Ave, City, State ZIP');
      fireEvent.change(pickupInputs[0], {
        target: { value: '123 Main St, Boston, MA' },
      });
      fireEvent.change(deliveryInputs[0], {
        target: { value: '456 Oak Ave, Cambridge, MA' },
      });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Size & Inventory')).toBeInTheDocument();
      });

      // Step 3
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      fireEvent.change(moveSizeSelect, { target: { value: '4' } });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      });
    });

    it('should display customer information summary', () => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('residential')).toBeInTheDocument();
    });

    it('should display move details summary', () => {
      expect(screen.getByText('123 Main St, Boston, MA')).toBeInTheDocument();
      expect(screen.getByText('456 Oak Ave, Cambridge, MA')).toBeInTheDocument();
    });

    it('should display inventory summary', () => {
      expect(screen.getByText(/5886/)).toBeInTheDocument(); // Weight
      expect(screen.getByText(/654/)).toBeInTheDocument(); // Volume
    });

    it('should show Create Opportunity button', () => {
      expect(screen.getByText('Create Opportunity')).toBeInTheDocument();
    });

    it('should submit successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customer: { id: 'new-customer-123' } }),
      });

      fireEvent.click(screen.getByText('Create Opportunity'));

      await waitFor(() => {
        expect(screen.getByText(/Opportunity created successfully/)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to create customer' }),
      });

      fireEvent.click(screen.getByText('Create Opportunity'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to create customer/)).toBeInTheDocument();
      });
    });
  });

  describe('Price Summary Panel', () => {
    beforeEach(async () => {
      render(<NewOpportunity />);

      // Navigate to step 3 where estimate calculation happens
      fireEvent.change(screen.getByLabelText('First Name *'), {
        target: { value: 'John' },
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), {
        target: { value: 'Doe' },
      });
      fireEvent.change(screen.getByLabelText('Email *'), {
        target: { value: 'john.doe@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Phone *'), {
        target: { value: '5551234567' },
      });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Details')).toBeInTheDocument();
      });

      const pickupInputs = screen.getAllByPlaceholderText('123 Main St, City, State ZIP');
      const deliveryInputs = screen.getAllByPlaceholderText('456 Oak Ave, City, State ZIP');
      fireEvent.change(pickupInputs[0], {
        target: { value: '123 Main St' },
      });
      fireEvent.change(deliveryInputs[0], {
        target: { value: '456 Oak Ave' },
      });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Move Size & Inventory')).toBeInTheDocument();
      });
    });

    it('should display estimate summary panel', () => {
      expect(screen.getByText('Estimate Summary')).toBeInTheDocument();
    });

    it('should show calculating message before estimate is ready', () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      fireEvent.change(moveSizeSelect, { target: { value: '4' } });

      // Should briefly show calculating
      expect(screen.getByText(/complete the form|calculating/i)).toBeInTheDocument();
    });

    it('should display estimated total when available', async () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      fireEvent.change(moveSizeSelect, { target: { value: '4' } });

      await waitFor(() => {
        expect(screen.getByText('Estimated Total')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should display price breakdown', async () => {
      const moveSizeSelect = screen.getByLabelText('Select Move Size (or choose manual entry)');
      fireEvent.change(moveSizeSelect, { target: { value: '4' } });

      await waitFor(() => {
        expect(screen.getByText('Price Breakdown')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Form Persistence (Auto-save)', () => {
    it('should save draft to localStorage', async () => {
      render(<NewOpportunity />);

      fireEvent.change(screen.getByLabelText('First Name *'), {
        target: { value: 'Jane' },
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), {
        target: { value: 'Smith' },
      });

      await waitFor(() => {
        const draft = localStorage.getItem('newOpportunityDraft');
        expect(draft).toBeTruthy();

        if (draft) {
          const parsedDraft = JSON.parse(draft);
          expect(parsedDraft.customer.firstName).toBe('Jane');
          expect(parsedDraft.customer.lastName).toBe('Smith');
        }
      }, { timeout: 500 });
    });

    it('should load draft from localStorage on mount', () => {
      const draftData = {
        customer: {
          firstName: 'Saved',
          lastName: 'User',
          email: 'saved@example.com',
          phone: '1234567890',
          address: { street: '', city: '', state: '', zipCode: '' },
          type: 'residential',
          source: 'website',
          preferredContactMethod: 'email',
          communicationPreferences: {
            allowMarketing: true,
            allowSms: true,
            allowEmail: true,
          },
        },
        moveDetails: {},
        status: 'draft',
      };

      localStorage.setItem('newOpportunityDraft', JSON.stringify(draftData));

      render(<NewOpportunity />);

      const firstNameInput = screen.getByLabelText('First Name *') as HTMLInputElement;
      expect(firstNameInput.value).toBe('Saved');
    });
  });
});