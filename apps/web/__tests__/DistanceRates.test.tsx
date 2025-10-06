/**
 * DistanceRates Component Test Suite
 * Tests CRUD operations for distance rate configurations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DistanceRates from '../src/app/components/settings/tariffs/DistanceRates';

describe('DistanceRates Component', () => {
  describe('Initial Rendering', () => {
    it('should render component with header and description', () => {
      render(<DistanceRates />);

      expect(screen.getByText('Distance Rates')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Configure distance-based pricing rates for long-distance moves',
        ),
      ).toBeInTheDocument();
    });

    it('should display "New Distance Rate" button', () => {
      render(<DistanceRates />);

      expect(screen.getByText('+ New Distance Rate')).toBeInTheDocument();
    });

    it('should display initial distance rate data', () => {
      render(<DistanceRates />);

      expect(screen.getByText('Distance Rates')).toBeInTheDocument();
      expect(screen.getByText('By Weight')).toBeInTheDocument();
    });

    it('should display rate type information section', () => {
      render(<DistanceRates />);

      expect(screen.getByText('Distance Rate Types')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Pricing based on total shipment weight and distance traveled. Common for long-distance moves.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Flat rate per mile regardless of weight. Suitable for standardized pricing structures.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Add Distance Rate Operation', () => {
    it('should show form when "New Distance Rate" button is clicked', () => {
      render(<DistanceRates />);

      const addButton = screen.getByText('+ New Distance Rate');
      fireEvent.click(addButton);

      expect(screen.getByText('New Distance Rate')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
    });

    it('should disable "New Distance Rate" button when form is open', () => {
      render(<DistanceRates />);

      const addButton = screen.getByText('+ New Distance Rate');
      fireEvent.click(addButton);

      expect(addButton).toBeDisabled();
    });

    it('should create new distance rate with valid data', async () => {
      render(<DistanceRates />);

      // Open form
      fireEvent.click(screen.getByText('+ New Distance Rate'));

      // Fill form
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Test Rate' },
      });

      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'by_distance' },
      });

      fireEvent.change(screen.getByLabelText('Description (Optional)'), {
        target: { value: 'Test description' },
      });

      // Submit
      fireEvent.click(screen.getByText('Create Rate'));

      // Verify
      await waitFor(() => {
        expect(screen.getByText('Test Rate')).toBeInTheDocument();
        expect(screen.getByText('By Distance')).toBeInTheDocument();
      });
    });

    it('should show all rate type options in dropdown', () => {
      render(<DistanceRates />);

      fireEvent.click(screen.getByText('+ New Distance Rate'));

      const typeSelect = screen.getByLabelText('Type');
      const options = typeSelect.querySelectorAll('option');

      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('By Weight');
      expect(options[1]).toHaveTextContent('By Distance');
      expect(options[2]).toHaveTextContent('Flat Rate');
    });

    it('should close form when Cancel is clicked', () => {
      render(<DistanceRates />);

      // Open form
      fireEvent.click(screen.getByText('+ New Distance Rate'));
      expect(screen.getByText('New Distance Rate')).toBeInTheDocument();

      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Form should be closed
      expect(screen.queryByText('New Distance Rate')).not.toBeInTheDocument();
    });

    it('should clear form data after successful creation', async () => {
      render(<DistanceRates />);

      // Create first rate
      fireEvent.click(screen.getByText('+ New Distance Rate'));
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'First Rate' },
      });
      fireEvent.click(screen.getByText('Create Rate'));

      await waitFor(() => {
        expect(screen.getByText('First Rate')).toBeInTheDocument();
      });

      // Open form again
      fireEvent.click(screen.getByText('+ New Distance Rate'));

      // Form should be empty
      const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });
  });

  describe('Edit Distance Rate Operation', () => {
    it('should populate form with existing data when Edit is clicked', () => {
      render(<DistanceRates />);

      // Click Edit button
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // Form should show with existing data
      expect(screen.getByText('Edit Distance Rate')).toBeInTheDocument();

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
      expect(nameInput.value).toBe('Distance Rates');
    });

    it('should update rate when changes are saved', async () => {
      render(<DistanceRates />);

      // Click Edit
      fireEvent.click(screen.getByText('Edit'));

      // Change name
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Updated Rate Name' },
      });

      // Change type
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'flat_rate' },
      });

      // Submit
      fireEvent.click(screen.getByText('Update Rate'));

      // Verify update
      await waitFor(() => {
        expect(screen.getByText('Updated Rate Name')).toBeInTheDocument();
        expect(screen.getByText('Flat Rate')).toBeInTheDocument();
      });
    });

    it('should show "Update Rate" button text in edit mode', () => {
      render(<DistanceRates />);

      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByText('Update Rate')).toBeInTheDocument();
      expect(screen.queryByText('Create Rate')).not.toBeInTheDocument();
    });

    it('should cancel edit without saving changes', async () => {
      render(<DistanceRates />);

      // Original name
      const originalName = 'Distance Rates';

      // Click Edit
      fireEvent.click(screen.getByText('Edit'));

      // Change name
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Changed Name' },
      });

      // Cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Original name should still be there
      await waitFor(() => {
        expect(screen.getByText(originalName)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Distance Rate Operation', () => {
    it('should show confirmation dialog when Delete is clicked', () => {
      render(<DistanceRates />);

      // Mock window.confirm
      window.confirm = jest.fn(() => false);

      fireEvent.click(screen.getByText('Delete'));

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Distance Rates"?',
      );
    });

    it('should delete rate when confirmed', async () => {
      render(<DistanceRates />);

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);

      // Get initial text
      expect(screen.getByText('Distance Rates')).toBeInTheDocument();

      // Delete
      fireEvent.click(screen.getByText('Delete'));

      // Verify deletion - should show empty state
      await waitFor(() => {
        expect(
          screen.getByText('No distance rates configured yet.'),
        ).toBeInTheDocument();
      });
    });

    it('should not delete rate when cancelled', () => {
      render(<DistanceRates />);

      // Mock window.confirm to return false
      window.confirm = jest.fn(() => false);

      fireEvent.click(screen.getByText('Delete'));

      // Rate should still exist
      expect(screen.getByText('Distance Rates')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no rates exist', async () => {
      render(<DistanceRates />);

      // Delete the initial rate
      window.confirm = jest.fn(() => true);
      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(
          screen.getByText('No distance rates configured yet.'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('+ Create Your First Distance Rate'),
        ).toBeInTheDocument();
      });
    });

    it('should open form from empty state button', async () => {
      render(<DistanceRates />);

      // Delete to get to empty state
      window.confirm = jest.fn(() => true);
      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(
          screen.getByText('+ Create Your First Distance Rate'),
        ).toBeInTheDocument();
      });

      // Click empty state button
      fireEvent.click(screen.getByText('+ Create Your First Distance Rate'));

      // Form should open
      expect(screen.getByText('New Distance Rate')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require name field', async () => {
      render(<DistanceRates />);

      fireEvent.click(screen.getByText('+ New Distance Rate'));

      // Try to submit without name
      const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
      expect(nameInput).toHaveAttribute('required');
    });

    it('should require type field', () => {
      render(<DistanceRates />);

      fireEvent.click(screen.getByText('+ New Distance Rate'));

      const typeSelect = screen.getByLabelText('Type') as HTMLSelectElement;
      expect(typeSelect).toHaveAttribute('required');
    });

    it('should allow description to be optional', () => {
      render(<DistanceRates />);

      fireEvent.click(screen.getByText('+ New Distance Rate'));

      const descriptionField = screen.getByLabelText('Description (Optional)');
      expect(descriptionField).not.toHaveAttribute('required');
    });
  });

  describe('Rate Type Display', () => {
    it('should format rate type correctly in table', () => {
      render(<DistanceRates />);

      // Initial rate is 'by_weight' which should display as 'By Weight'
      expect(screen.getByText('By Weight')).toBeInTheDocument();
    });

    it('should show description when available', async () => {
      render(<DistanceRates />);

      // Add rate with description
      fireEvent.click(screen.getByText('+ New Distance Rate'));
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Test Rate' },
      });
      fireEvent.change(screen.getByLabelText('Description (Optional)'), {
        target: { value: 'Test Description' },
      });
      fireEvent.click(screen.getByText('Create Rate'));

      await waitFor(() => {
        expect(screen.getByText('Test Description')).toBeInTheDocument();
      });
    });
  });

  describe('Table Structure', () => {
    it('should render table with correct headers', () => {
      render(<DistanceRates />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should have Edit and Delete buttons for each rate', () => {
      render(<DistanceRates />);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should have title attributes on action buttons', () => {
      render(<DistanceRates />);

      const editButton = screen.getByTitle('Edit rate');
      const deleteButton = screen.getByTitle('Delete rate');

      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('Multiple Rates Handling', () => {
    it('should handle multiple rates correctly', async () => {
      render(<DistanceRates />);

      // Add first rate
      fireEvent.click(screen.getByText('+ New Distance Rate'));
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Rate 1' },
      });
      fireEvent.click(screen.getByText('Create Rate'));

      await waitFor(() => {
        expect(screen.getByText('Rate 1')).toBeInTheDocument();
      });

      // Add second rate
      fireEvent.click(screen.getByText('+ New Distance Rate'));
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Rate 2' },
      });
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'by_distance' },
      });
      fireEvent.click(screen.getByText('Create Rate'));

      await waitFor(() => {
        expect(screen.getByText('Rate 2')).toBeInTheDocument();
      });

      // Both should be visible
      expect(screen.getByText('Rate 1')).toBeInTheDocument();
      expect(screen.getByText('Rate 2')).toBeInTheDocument();
    });

    it('should edit correct rate when multiple exist', async () => {
      render(<DistanceRates />);

      // Add multiple rates
      fireEvent.click(screen.getByText('+ New Distance Rate'));
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Rate A' },
      });
      fireEvent.click(screen.getByText('Create Rate'));

      await waitFor(() => {
        expect(screen.getByText('Rate A')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ New Distance Rate'));
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Rate B' },
      });
      fireEvent.click(screen.getByText('Create Rate'));

      await waitFor(() => {
        expect(screen.getByText('Rate B')).toBeInTheDocument();
      });

      // Edit second rate
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[editButtons.length - 1]);

      // Should load Rate B data
      const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
      expect(nameInput.value).toBe('Rate B');
    });
  });
});
