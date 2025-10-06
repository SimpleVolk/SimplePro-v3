'use client';

import { useState } from 'react';
import styles from './MoveSizes.module.css';

interface MoveSize {
  id: string;
  name: string;
  description: string;
  cubicFeet: number;
  weight: number;
}

interface RoomSize {
  id: string;
  name: string;
  description: string;
  cubicFeet: number;
  weight: number;
}

export default function MoveSizes() {
  // Initial move sizes data based on screenshots
  const [moveSizes, setMoveSizes] = useState<MoveSize[]>([
    {
      id: '1',
      name: 'Studio or Less',
      description: 'Under 400 Sq Ft',
      cubicFeet: 75,
      weight: 675,
    },
    {
      id: '2',
      name: 'Studio Apartment',
      description: '400 - 500 Sq Ft',
      cubicFeet: 250,
      weight: 2250,
    },
    {
      id: '3',
      name: '1 Bedroom Apartment',
      description: '500 - 800 Sq Ft',
      cubicFeet: 432,
      weight: 3888,
    },
    {
      id: '4',
      name: '2 Bedroom Apartment',
      description: '650 - 1000 Sq Ft',
      cubicFeet: 654,
      weight: 5886,
    },
    {
      id: '5',
      name: '3 Bedroom Apartment',
      description: '1000 - 2000 Sq Ft',
      cubicFeet: 1236,
      weight: 4074,
    },
    {
      id: '6',
      name: '1 Bedroom House',
      description: '800 - 1000 Sq Ft',
      cubicFeet: 576,
      weight: 4512,
    },
    {
      id: '7',
      name: '2 Bedroom House (Small)',
      description: '1000 - 1200 Sq Ft',
      cubicFeet: 1152,
      weight: 9108,
    },
    {
      id: '8',
      name: '2 Bedroom House',
      description: '1400 - 1600 Sq Ft',
      cubicFeet: 1458,
      weight: 7668,
    },
    {
      id: '9',
      name: '2 Bedroom House (Large)',
      description: '1600 - 1800 Sq Ft',
      cubicFeet: 1632,
      weight: 8064,
    },
    {
      id: '10',
      name: '3+ Br Storage Unit',
      description: '-',
      cubicFeet: 630,
      weight: 2860,
    },
    {
      id: '11',
      name: '3 Bedroom House',
      description: '2000 - 2200 Sq Ft',
      cubicFeet: 1840,
      weight: 10880,
    },
    {
      id: '12',
      name: '3 Bedroom House (Large)',
      description: '2200 - 2400 Sq Ft',
      cubicFeet: 1944,
      weight: 10488,
    },
    {
      id: '13',
      name: '4 Bedroom House',
      description: '2400 - 2800 Sq Ft',
      cubicFeet: 1872,
      weight: 11264,
    },
    {
      id: '14',
      name: '4 Bedroom House (Large)',
      description: '2800 - 3200 Sq Ft',
      cubicFeet: 2626,
      weight: 11832,
    },
    {
      id: '15',
      name: '5 Bedroom House',
      description: '3200 - 3800 Sq Ft',
      cubicFeet: 2568,
      weight: 12476,
    },
    {
      id: '16',
      name: '5 Bedroom House (Large)',
      description: '3800 - 4000 Sq Ft',
      cubicFeet: 3896,
      weight: 24732,
    },
    {
      id: '17',
      name: '5+ Br Storage Unit',
      description: '-',
      cubicFeet: 620,
      weight: 4260,
    },
    {
      id: '18',
      name: '6+ Br Storage Unit',
      description: '-',
      cubicFeet: 880,
      weight: 5400,
    },
    {
      id: '19',
      name: '6+ Br Storage Unit',
      description: '-',
      cubicFeet: 1000,
      weight: 6600,
    },
  ]);

  // Initial room sizes data based on screenshots
  const [roomSizes, setRoomSizes] = useState<RoomSize[]>([
    {
      id: '1',
      name: 'Additional Room',
      description: '-',
      cubicFeet: 350,
      weight: 550,
    },
    {
      id: '2',
      name: 'Basement',
      description: '-',
      cubicFeet: 350,
      weight: 550,
    },
    {
      id: '3',
      name: 'Dining Room',
      description: '-',
      cubicFeet: 250,
      weight: 450,
    },
    { id: '4', name: 'Kitchen', description: '-', cubicFeet: 500, weight: 350 },
    { id: '5', name: 'Garage', description: '-', cubicFeet: 350, weight: 550 },
    {
      id: '6',
      name: 'Living Room',
      description: '-',
      cubicFeet: 400,
      weight: 500,
    },
    { id: '7', name: 'Office', description: '-', cubicFeet: 75, weight: 125 },
    { id: '8', name: 'Patio', description: '-', cubicFeet: 300, weight: 350 },
  ]);

  const [editingMoveSize, setEditingMoveSize] = useState<string | null>(null);
  const [editingRoomSize, setEditingRoomSize] = useState<string | null>(null);
  const [showAddMoveModal, setShowAddMoveModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);

  // Form state for new entries
  const [newMoveSize, setNewMoveSize] = useState<Partial<MoveSize>>({
    name: '',
    description: '',
    cubicFeet: 0,
    weight: 0,
  });

  const [newRoomSize, setNewRoomSize] = useState<Partial<RoomSize>>({
    name: '',
    description: '',
    cubicFeet: 0,
    weight: 0,
  });

  const handleAddMoveSize = () => {
    if (newMoveSize.name && newMoveSize.cubicFeet && newMoveSize.weight) {
      const moveSize: MoveSize = {
        id: Date.now().toString(),
        name: newMoveSize.name,
        description: newMoveSize.description || '',
        cubicFeet: newMoveSize.cubicFeet,
        weight: newMoveSize.weight,
      };
      setMoveSizes([...moveSizes, moveSize]);
      setShowAddMoveModal(false);
      setNewMoveSize({ name: '', description: '', cubicFeet: 0, weight: 0 });
    }
  };

  const handleAddRoomSize = () => {
    if (newRoomSize.name && newRoomSize.cubicFeet && newRoomSize.weight) {
      const roomSize: RoomSize = {
        id: Date.now().toString(),
        name: newRoomSize.name,
        description: newRoomSize.description || '',
        cubicFeet: newRoomSize.cubicFeet,
        weight: newRoomSize.weight,
      };
      setRoomSizes([...roomSizes, roomSize]);
      setShowAddRoomModal(false);
      setNewRoomSize({ name: '', description: '', cubicFeet: 0, weight: 0 });
    }
  };

  const handleUpdateMoveSize = (
    id: string,
    field: keyof MoveSize,
    value: string | number,
  ) => {
    setMoveSizes(
      moveSizes.map((size) =>
        size.id === id ? { ...size, [field]: value } : size,
      ),
    );
  };

  const handleUpdateRoomSize = (
    id: string,
    field: keyof RoomSize,
    value: string | number,
  ) => {
    setRoomSizes(
      roomSizes.map((size) =>
        size.id === id ? { ...size, [field]: value } : size,
      ),
    );
  };

  const handleDeleteMoveSize = (id: string) => {
    if (confirm('Are you sure you want to delete this move size?')) {
      setMoveSizes(moveSizes.filter((size) => size.id !== id));
    }
  };

  const handleDeleteRoomSize = (id: string) => {
    if (confirm('Are you sure you want to delete this room size?')) {
      setRoomSizes(roomSizes.filter((size) => size.id !== id));
    }
  };

  return (
    <div className={styles.moveSizes}>
      {/* Move Sizes Section */}
      <div className={styles.section}>
        <div className={styles.header}>
          <div>
            <h3>Move Sizes</h3>
            <p>Configure move size presets for estimates</p>
          </div>
          <button
            className={styles.addButton}
            onClick={() => setShowAddMoveModal(true)}
          >
            + Add Move Size
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>NAME</th>
                <th>DESCRIPTION</th>
                <th>CUBIC FEET</th>
                <th>WEIGHT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {moveSizes.map((size) => (
                <tr key={size.id}>
                  <td>
                    {editingMoveSize === size.id ? (
                      <input
                        type="text"
                        value={size.name}
                        onChange={(e) =>
                          handleUpdateMoveSize(size.id, 'name', e.target.value)
                        }
                        className={styles.input}
                      />
                    ) : (
                      size.name
                    )}
                  </td>
                  <td>
                    {editingMoveSize === size.id ? (
                      <input
                        type="text"
                        value={size.description}
                        onChange={(e) =>
                          handleUpdateMoveSize(
                            size.id,
                            'description',
                            e.target.value,
                          )
                        }
                        className={styles.input}
                      />
                    ) : (
                      size.description || '-'
                    )}
                  </td>
                  <td>
                    {editingMoveSize === size.id ? (
                      <input
                        type="number"
                        value={size.cubicFeet}
                        onChange={(e) =>
                          handleUpdateMoveSize(
                            size.id,
                            'cubicFeet',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className={styles.input}
                      />
                    ) : (
                      size.cubicFeet
                    )}
                  </td>
                  <td>
                    {editingMoveSize === size.id ? (
                      <input
                        type="number"
                        value={size.weight}
                        onChange={(e) =>
                          handleUpdateMoveSize(
                            size.id,
                            'weight',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className={styles.input}
                      />
                    ) : (
                      size.weight
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {editingMoveSize === size.id ? (
                        <button
                          className={styles.saveButton}
                          onClick={() => setEditingMoveSize(null)}
                        >
                          Save
                        </button>
                      ) : (
                        <>
                          <button
                            className={styles.editButton}
                            onClick={() => setEditingMoveSize(size.id)}
                          >
                            Edit
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDeleteMoveSize(size.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room Sizes Section */}
      <div className={styles.section}>
        <div className={styles.header}>
          <div>
            <h3>Room Sizes</h3>
            <p>Configure room size presets for inventory</p>
          </div>
          <button
            className={styles.addButton}
            onClick={() => setShowAddRoomModal(true)}
          >
            + Add Room Size
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>NAME</th>
                <th>DESCRIPTION</th>
                <th>CUBIC FEET</th>
                <th>WEIGHT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {roomSizes.map((size) => (
                <tr key={size.id}>
                  <td>
                    {editingRoomSize === size.id ? (
                      <input
                        type="text"
                        value={size.name}
                        onChange={(e) =>
                          handleUpdateRoomSize(size.id, 'name', e.target.value)
                        }
                        className={styles.input}
                      />
                    ) : (
                      size.name
                    )}
                  </td>
                  <td>
                    {editingRoomSize === size.id ? (
                      <input
                        type="text"
                        value={size.description}
                        onChange={(e) =>
                          handleUpdateRoomSize(
                            size.id,
                            'description',
                            e.target.value,
                          )
                        }
                        className={styles.input}
                      />
                    ) : (
                      size.description || '-'
                    )}
                  </td>
                  <td>
                    {editingRoomSize === size.id ? (
                      <input
                        type="number"
                        value={size.cubicFeet}
                        onChange={(e) =>
                          handleUpdateRoomSize(
                            size.id,
                            'cubicFeet',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className={styles.input}
                      />
                    ) : (
                      size.cubicFeet
                    )}
                  </td>
                  <td>
                    {editingRoomSize === size.id ? (
                      <input
                        type="number"
                        value={size.weight}
                        onChange={(e) =>
                          handleUpdateRoomSize(
                            size.id,
                            'weight',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className={styles.input}
                      />
                    ) : (
                      size.weight
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {editingRoomSize === size.id ? (
                        <button
                          className={styles.saveButton}
                          onClick={() => setEditingRoomSize(null)}
                        >
                          Save
                        </button>
                      ) : (
                        <>
                          <button
                            className={styles.editButton}
                            onClick={() => setEditingRoomSize(size.id)}
                          >
                            Edit
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDeleteRoomSize(size.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Move Size Modal */}
      {showAddMoveModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>Add Move Size</h4>
              <button
                className={styles.closeButton}
                onClick={() => setShowAddMoveModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={newMoveSize.name}
                  onChange={(e) =>
                    setNewMoveSize({ ...newMoveSize, name: e.target.value })
                  }
                  className={styles.input}
                  placeholder="e.g., 1 Bedroom Apartment"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input
                  type="text"
                  value={newMoveSize.description}
                  onChange={(e) =>
                    setNewMoveSize({
                      ...newMoveSize,
                      description: e.target.value,
                    })
                  }
                  className={styles.input}
                  placeholder="e.g., 500 - 800 Sq Ft"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Cubic Feet</label>
                <input
                  type="number"
                  value={newMoveSize.cubicFeet}
                  onChange={(e) =>
                    setNewMoveSize({
                      ...newMoveSize,
                      cubicFeet: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={styles.input}
                  placeholder="e.g., 432"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Weight (lbs)</label>
                <input
                  type="number"
                  value={newMoveSize.weight}
                  onChange={(e) =>
                    setNewMoveSize({
                      ...newMoveSize,
                      weight: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={styles.input}
                  placeholder="e.g., 3888"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowAddMoveModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleAddMoveSize}
              >
                Add Move Size
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Room Size Modal */}
      {showAddRoomModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>Add Room Size</h4>
              <button
                className={styles.closeButton}
                onClick={() => setShowAddRoomModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={newRoomSize.name}
                  onChange={(e) =>
                    setNewRoomSize({ ...newRoomSize, name: e.target.value })
                  }
                  className={styles.input}
                  placeholder="e.g., Living Room"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input
                  type="text"
                  value={newRoomSize.description}
                  onChange={(e) =>
                    setNewRoomSize({
                      ...newRoomSize,
                      description: e.target.value,
                    })
                  }
                  className={styles.input}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Cubic Feet</label>
                <input
                  type="number"
                  value={newRoomSize.cubicFeet}
                  onChange={(e) =>
                    setNewRoomSize({
                      ...newRoomSize,
                      cubicFeet: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={styles.input}
                  placeholder="e.g., 400"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Weight (lbs)</label>
                <input
                  type="number"
                  value={newRoomSize.weight}
                  onChange={(e) =>
                    setNewRoomSize({
                      ...newRoomSize,
                      weight: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={styles.input}
                  placeholder="e.g., 500"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowAddRoomModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleAddRoomSize}
              >
                Add Room Size
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
