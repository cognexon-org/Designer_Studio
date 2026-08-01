import type { DesignModel } from './types';

export const sampleDesignModel: DesignModel = {
  units: 'meters',
  rooms: [
    {
      id: 'living-room',
      name: 'Living Room',
      heightM: 2.8,
      floorPolygon: [[0, 0], [4.5, 0], [4.5, 3.6], [0, 3.6]],
      walls: [
        {
          id: 'wall-1',
          start: [0, 0],
          end: [4.5, 0],
          thicknessM: 0.12,
          material: 'Warm White',
          structuralStatus: 'UNKNOWN',
          openings: [{ id: 'door-1', type: 'DOOR', offsetM: 0.45, widthM: 0.9, heightM: 2.1, bottomM: 0 }]
        },
        {
          id: 'wall-2',
          start: [4.5, 0],
          end: [4.5, 3.6],
          thicknessM: 0.12,
          material: 'Warm White',
          structuralStatus: 'UNKNOWN',
          openings: [{ id: 'window-1', type: 'WINDOW', offsetM: 0.9, widthM: 1.4, heightM: 1.2, bottomM: 0.85 }]
        },
        {
          id: 'wall-3',
          start: [4.5, 3.6],
          end: [0, 3.6],
          thicknessM: 0.12,
          material: 'Sage Accent',
          structuralStatus: 'UNKNOWN',
          openings: []
        },
        {
          id: 'wall-4',
          start: [0, 3.6],
          end: [0, 0],
          thicknessM: 0.12,
          material: 'Warm White',
          structuralStatus: 'UNKNOWN',
          openings: []
        }
      ],
      objects: [
        {
          id: 'sofa-1', type: 'SOFA', name: 'Three-seat sofa', position: [2.2, 3.0], size: [2.2, 0.85, 0.82], rotationY: 0, material: 'Sand Fabric'
        },
        {
          id: 'table-1', type: 'TABLE', name: 'Coffee table', position: [2.2, 1.8], size: [1.1, 0.6, 0.42], rotationY: 0, material: 'Natural Oak'
        }
      ]
    }
  ],
  metadata: {
    scaleConfirmed: true,
    scaleSource: 'laser_measurement',
    structuralVerificationRequired: true,
    conceptName: 'Calm contemporary'
  }
};
