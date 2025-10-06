/**
 * MoveSizes Component Test Suite
 * Tests CRUD operations for move sizes and room sizes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MoveSizes from '../src/app/components/settings/estimates/MoveSizes';

describe('MoveSizes Component', () => {
  describe('Initial Rendering', () => {
    it('should render both Move Sizes and Room Sizes tables', () => {
      render(<MoveSizes />);

      expect(screen.getByText('Move Sizes')).toBeInTheDocument();
      expect(screen.getByText('Room Sizes')).toBeInTheDocument();
      expect(
        screen.getByText('Configure move size presets for estimates'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Configure room size presets for inventory'),
      ).toBeInTheDocument();
    });

    it('should display initial move size data', () => {
      render(<MoveSizes />);

      expect(screen.getByText('Studio or Less')).toBeInTheDocument();
      expect(screen.getByText('2 Bedroom Apartment')).toBeInTheDocument();
      expect(screen.getByText('Under 400 Sq Ft')).toBeInTheDocument();
    });

    it('should display initial room size data', () => {
      render(<MoveSizes />);

      expect(screen.getByText('Kitchen')).toBeInTheDocument();
      expect(screen.getByText('Living Room')).toBeInTheDocument();
      expect(screen.getByText('Basement')).toBeInTheDocument();
    });

    it('should render "Add" buttons for both tables', () => {
      render(<MoveSizes />);

      const addButtons = screen.getAllByText(/Add Move Size|Add Room Size/);
      expect(addButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Move Size - Add Operation', () => {
    it('should open add modal when "Add Move Size" button is clicked', () => {
      render(<MoveSizes />);

      const addButton = screen.getByText('+ Add Move Size');
      fireEvent.click(addButton);

      expect(screen.getByText('Add Move Size')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('e.g., 1 Bedroom Apartment'),
      ).toBeInTheDocument();
    });

    it('should add a new move size with valid data', async () => {
      render(<MoveSizes />);

      // Open modal
      const addButton = screen.getByText('+ Add Move Size');
      fireEvent.click(addButton);

      // Fill form
      fireEvent.change(
        screen.getByPlaceholderText('e.g., 1 Bedroom Apartment'),
        {
          target: { value: 'Test Move Size' },
        },
      );
      fireEvent.change(screen.getByPlaceholderText('e.g., 500 - 800 Sq Ft'), {
        target: { value: '600 - 900 Sq Ft' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 432'), {
        target: { value: '500' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 3888'), {
        target: { value: '4000' },
      });

      // Submit
      const submitButton = screen.getByText('Add Move Size');
      fireEvent.click(submitButton);

      // Verify new item appears in table
      await waitFor(() => {
        expect(screen.getByText('Test Move Size')).toBeInTheDocument();
      });
    });

    it('should close modal when cancel is clicked', () => {
      render(<MoveSizes />);

      // Open modal
      fireEvent.click(screen.getByText('+ Add Move Size'));
      expect(screen.getByText('Add Move Size')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Modal should be closed (button text should not be in modal context)
      expect(
        screen.queryByPlaceholderText('e.g., 1 Bedroom Apartment'),
      ).not.toBeInTheDocument();
    });

    it('should close modal when X button is clicked', () => {
      render(<MoveSizes />);

      // Open modal
      fireEvent.click(screen.getByText('+ Add Move Size'));

      // Click X button
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      // Modal should be closed
      expect(
        screen.queryByPlaceholderText('e.g., 1 Bedroom Apartment'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Move Size - Edit Operation', () => {
    it('should enable inline editing when Edit button is clicked', () => {
      render(<MoveSizes />);

      // Get all Edit buttons (there should be multiple)
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      // Should show Save button instead of Edit
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should update move size when edited and saved', async () => {
      render(<MoveSizes />);

      // Click first Edit button
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      // Find input fields and change values
      const inputs = screen.getAllByRole('textbox');
      const nameInput = inputs.find(
        (input) => (input as HTMLInputElement).value === 'Studio or Less',
      );

      if (nameInput) {
        fireEvent.change(nameInput, { target: { value: 'Updated Studio' } });
      }

      // Click Save
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      // Verify update
      await waitFor(() => {
        expect(screen.getByText('Updated Studio')).toBeInTheDocument();
      });
    });

    it('should update numeric fields correctly', async () => {
      render(<MoveSizes />);

      // Click Edit
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      // Find number inputs
      const numberInputs = screen.getAllByRole('spinbutton');
      const weightInput = numberInputs.find(
        (input) => (input as HTMLInputElement).value === '675',
      );

      if (weightInput) {
        fireEvent.change(weightInput, { target: { value: '700' } });
      }

      // Save
      fireEvent.click(screen.getByText('Save'));

      // Verify the value is updated in the table
      await waitFor(() => {
        const cells = screen.getAllByText('700');
        expect(cells.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Move Size - Delete Operation', () => {
    it('should show confirmation dialog when delete is clicked', () => {
      render(<MoveSizes />);

      // Mock window.confirm
      window.confirm = jest.fn(() => false);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this move size?',
      );
    });

    it('should delete move size when confirmed', async () => {
      render(<MoveSizes />);

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);

      // Get initial count
      const initialStudioElements = screen.getAllByText(/Studio or Less/);

      // Delete first item
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify deletion
      await waitFor(() => {
        const afterStudioElements = screen.queryAllByText(/Studio or Less/);
        expect(afterStudioElements.length).toBe(
          initialStudioElements.length - 1,
        );
      });
    });

    it('should not delete move size when cancelled', () => {
      render(<MoveSizes />);

      // Mock window.confirm to return false
      window.confirm = jest.fn(() => false);

      const deleteButtons = screen.getAllByText('Delete');
      const beforeCount = deleteButtons.length;

      fireEvent.click(deleteButtons[0]);

      // Verify no deletion
      const afterButtons = screen.getAllByText('Delete');
      expect(afterButtons.length).toBe(beforeCount);
    });
  });

  describe('Room Size - Add Operation', () => {
    it('should open add modal when "Add Room Size" button is clicked', () => {
      render(<MoveSizes />);

      const addButton = screen.getByText('+ Add Room Size');
      fireEvent.click(addButton);

      expect(screen.getByText('Add Room Size')).toBeInTheDocument();
    });

    it('should add a new room size with valid data', async () => {
      render(<MoveSizes />);

      // Open modal
      fireEvent.click(screen.getByText('+ Add Room Size'));

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('e.g., Living Room'), {
        target: { value: 'Master Bedroom' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 400'), {
        target: { value: '450' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 500'), {
        target: { value: '550' },
      });

      // Submit
      fireEvent.click(screen.getByText('Add Room Size'));

      // Verify
      await waitFor(() => {
        expect(screen.getByText('Master Bedroom')).toBeInTheDocument();
      });
    });
  });

  describe('Room Size - Edit Operation', () => {
    it('should enable inline editing for room sizes', () => {
      render(<MoveSizes />);

      const editButtons = screen.getAllByText('Edit');
      // Click an edit button from the room sizes table (later in the list)
      fireEvent.click(editButtons[editButtons.length - 1]);

      expect(screen.getAllByText('Save').length).toBeGreaterThan(0);
    });
  });

  describe('Room Size - Delete Operation', () => {
    it('should show confirmation for room size deletion', () => {
      render(<MoveSizes />);

      window.confirm = jest.fn(() => false);

      const deleteButtons = screen.getAllByText('Delete');
      // Click delete from room sizes table
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this room size?',
      );
    });
  });

  describe('Data Validation', () => {
    it('should handle empty name field', async () => {
      render(<MoveSizes />);

      // Open add modal
      fireEvent.click(screen.getByText('+ Add Move Size'));

      // Try to submit with empty name
      fireEvent.click(screen.getByText('Add Move Size'));

      // Modal should still be open (validation failed)
      expect(
        screen.getByPlaceholderText('e.g., 1 Bedroom Apartment'),
      ).toBeInTheDocument();
    });

    it('should handle zero values for cubic feet', async () => {
      render(<MoveSizes />);

      fireEvent.click(screen.getByText('+ Add Move Size'));

      // Fill with zero cubic feet
      fireEvent.change(
        screen.getByPlaceholderText('e.g., 1 Bedroom Apartment'),
        {
          target: { value: 'Test' },
        },
      );
      fireEvent.change(screen.getByPlaceholderText('e.g., 432'), {
        target: { value: '0' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 3888'), {
        target: { value: '100' },
      });

      // Submit
      fireEvent.click(screen.getByText('Add Move Size'));

      // Should remain open (zero is not valid)
      expect(
        screen.getByPlaceholderText('e.g., 1 Bedroom Apartment'),
      ).toBeInTheDocument();
    });

    it('should parse numeric values correctly', async () => {
      render(<MoveSizes />);

      fireEvent.click(screen.getByText('+ Add Move Size'));

      // Fill with string numbers
      fireEvent.change(
        screen.getByPlaceholderText('e.g., 1 Bedroom Apartment'),
        {
          target: { value: 'Numeric Test' },
        },
      );
      fireEvent.change(screen.getByPlaceholderText('e.g., 432'), {
        target: { value: '123.45' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 3888'), {
        target: { value: '456.78' },
      });

      fireEvent.click(screen.getByText('Add Move Size'));

      await waitFor(() => {
        expect(screen.getByText('Numeric Test')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render table structure correctly', () => {
      render(<MoveSizes />);

      // Check for table headers
      expect(screen.getAllByText('NAME').length).toBeGreaterThan(0);
      expect(screen.getAllByText('DESCRIPTION').length).toBeGreaterThan(0);
      expect(screen.getAllByText('CUBIC FEET').length).toBeGreaterThan(0);
      expect(screen.getAllByText('WEIGHT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ACTIONS').length).toBeGreaterThan(0);
    });

    it('should display description with dash for empty values', () => {
      render(<MoveSizes />);

      // Some room sizes have empty descriptions shown as '-'
      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });
});
