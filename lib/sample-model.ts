import type { DesignModel } from './types';

/**
 * Demo flat used when no project is loaded (`/studio/demo`).
 *
 * Rooms share exact wall lines, so every doorway leads into a real neighbouring
 * space. That matters for the walkthrough: a plan made of floating boxes looks
 * fine in orbit but traps the viewer the moment they try to walk. Verified for
 * polygon overlaps, doorway alignment and full room-to-room reachability.
 */
export const sampleDesignModel: DesignModel = {
  units: 'meters',
  rooms: [
    {
      id: 'living',
      name: 'Living & Dining',
      heightM: 3.0,
      roomType: 'LIVING',
      floorId: 'Engineered Oak',
      floorPolygon: [[0, 0], [5.8, 0], [5.8, 4.4], [3.2, 4.4], [3.2, 6.9], [0, 6.9]],
      walls: [
        { id: 'living-wall-0', start: [0, 0], end: [5.8, 0], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [{ id: 'living-w0-o0', type: 'WINDOW', offsetM: 1.8, widthM: 2.4, heightM: 1.9, bottomM: 0.85, sillM: 0.85 }] },
        { id: 'living-wall-1', start: [5.8, 0], end: [5.8, 4.4], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [{ id: 'living-w1-o0', type: 'OPENING', offsetM: 1.7, widthM: 1.0, heightM: 2.1, bottomM: 0 }] },
        { id: 'living-wall-2', start: [5.8, 4.4], end: [3.2, 4.4], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [{ id: 'living-w2-o0', type: 'DOOR', offsetM: 1.5, widthM: 0.9, heightM: 2.1, bottomM: 0 }] },
        { id: 'living-wall-3', start: [3.2, 4.4], end: [3.2, 6.9], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'living-wall-4', start: [3.2, 6.9], end: [0, 6.9], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'living-wall-5', start: [0, 6.9], end: [0, 0], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [{ id: 'living-w5-o0', type: 'WINDOW', offsetM: 5.0, widthM: 1.6, heightM: 2.2, bottomM: 0.5, sillM: 0.5 }, { id: 'living-w5-o1', type: 'DOOR', offsetM: 3.2, widthM: 1.0, heightM: 2.1, bottomM: 0 }] },
      ],
      objects: [
        { id: 'living-obj-0', type: 'SOFA', name: '3-seat sofa', position: [1.6, 4.95], size: [2.3, 0.85, 0.95], rotationY: 0, material: 'Sand Weave' },
        { id: 'living-obj-1', type: 'RUG', name: 'Wool rug', position: [1.6, 5.85], size: [2.4, 0.02, 1.4], rotationY: 0, material: 'Charcoal' },
        { id: 'living-obj-2', type: 'TABLE', name: 'Coffee table', position: [1.6, 5.85], size: [1.1, 0.4, 0.6], rotationY: 0, material: 'Walnut' },
        { id: 'living-obj-3', type: 'TV_UNIT', name: 'TV console', position: [1.6, 6.66], size: [2.0, 0.5, 0.42], rotationY: 3.1416, material: 'Walnut' },
        { id: 'living-obj-4', type: 'PLANT', name: 'Fiddle fig', position: [0.55, 0.65], size: [0.6, 1.5, 0.6], rotationY: 0, material: 'Sage Accent' },
        { id: 'living-obj-5', type: 'LAMP', name: 'Arc floor lamp', position: [5.4, 0.7], size: [0.42, 1.6, 0.42], rotationY: 0, material: 'Metal' },
        { id: 'living-obj-6', type: 'TABLE', name: 'Dining table', position: [3.0, 1.05], size: [1.5, 0.76, 0.9], rotationY: 0, material: 'Oak' },
        { id: 'living-obj-7', type: 'CHAIR', name: 'Dining chair', position: [2.4, 0.45], size: [0.46, 0.9, 0.5], rotationY: 3.1416, material: 'Oak' },
        { id: 'living-obj-8', type: 'CHAIR', name: 'Dining chair', position: [3.6, 0.45], size: [0.46, 0.9, 0.5], rotationY: 3.1416, material: 'Oak' },
        { id: 'living-obj-9', type: 'CHAIR', name: 'Dining chair', position: [2.4, 1.65], size: [0.46, 0.9, 0.5], rotationY: 0, material: 'Oak' },
        { id: 'living-obj-10', type: 'CHAIR', name: 'Dining chair', position: [3.6, 1.65], size: [0.46, 0.9, 0.5], rotationY: 0, material: 'Oak' },
      ]
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      heightM: 3.0,
      roomType: 'KITCHEN',
      floorId: 'Vitrified Tile',
      floorPolygon: [[3.2, 4.4], [5.8, 4.4], [5.8, 6.9], [3.2, 6.9]],
      walls: [
        { id: 'kitchen-wall-0', start: [3.2, 4.4], end: [5.8, 4.4], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [{ id: 'kitchen-w0-o0', type: 'OPENING', offsetM: 0.2, widthM: 0.9, heightM: 2.1, bottomM: 0 }] },
        { id: 'kitchen-wall-1', start: [5.8, 4.4], end: [5.8, 6.9], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'kitchen-wall-2', start: [5.8, 6.9], end: [3.2, 6.9], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [{ id: 'kitchen-w2-o0', type: 'WINDOW', offsetM: 0.8, widthM: 1.2, heightM: 1.2, bottomM: 1.2, sillM: 1.2 }] },
        { id: 'kitchen-wall-3', start: [3.2, 6.9], end: [3.2, 4.4], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [] },
      ],
      objects: [
        { id: 'kitchen-obj-0', type: 'CABINET', name: 'Base units + granite', position: [5.49, 5.8], size: [0.62, 0.9, 2.0], rotationY: 3.1416, material: 'Charcoal' },
        { id: 'kitchen-obj-1', type: 'CABINET', name: 'Return counter', position: [5.0, 4.72], size: [1.2, 0.9, 0.6], rotationY: 0, material: 'Charcoal' },
        { id: 'kitchen-obj-2', type: 'CABINET', name: 'Refrigerator', position: [3.68, 6.52], size: [0.7, 1.8, 0.68], rotationY: 0, material: 'Metal' },
      ]
    },
    {
      id: 'hall',
      name: 'Hall & Passage',
      heightM: 3.0,
      roomType: 'HALL',
      floorId: 'Engineered Oak',
      floorPolygon: [[5.8, 0], [6.9, 0], [6.9, 4.6], [11.6, 4.6], [11.6, 5.7], [5.8, 5.7]],
      walls: [
        { id: 'hall-wall-0', start: [5.8, 0], end: [6.9, 0], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'hall-wall-1', start: [6.9, 0], end: [6.9, 4.6], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [{ id: 'hall-w1-o0', type: 'DOOR', offsetM: 1.8, widthM: 0.95, heightM: 2.1, bottomM: 0 }] },
        { id: 'hall-wall-2', start: [6.9, 4.6], end: [11.6, 4.6], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'hall-wall-3', start: [11.6, 4.6], end: [11.6, 5.7], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'hall-wall-4', start: [11.6, 5.7], end: [5.8, 5.7], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [{ id: 'hall-w4-o0', type: 'DOOR', offsetM: 1.575, widthM: 0.75, heightM: 2.05, bottomM: 0 }, { id: 'hall-w4-o1', type: 'DOOR', offsetM: 3.95, widthM: 0.9, heightM: 2.1, bottomM: 0 }] },
        { id: 'hall-wall-5', start: [5.8, 5.7], end: [5.8, 0], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [{ id: 'hall-w5-o0', type: 'DOOR', offsetM: 3.0, widthM: 1.0, heightM: 2.1, bottomM: 0 }] },
      ],
      objects: [
        { id: 'hall-obj-0', type: 'PLANT', name: 'Areca palm', position: [11.2, 5.15], size: [0.5, 1.3, 0.5], rotationY: 0, material: 'Sage Accent' },
        { id: 'hall-obj-1', type: 'CABINET', name: 'Console table', position: [6.35, 0.36], size: [0.9, 0.75, 0.34], rotationY: 0, material: 'Walnut' },
      ]
    },
    {
      id: 'master',
      name: 'Master Bedroom',
      heightM: 3.0,
      roomType: 'MASTER',
      floorId: 'Engineered Oak',
      floorPolygon: [[6.9, 0], [11.6, 0], [11.6, 4.6], [6.9, 4.6]],
      walls: [
        { id: 'master-wall-0', start: [6.9, 0], end: [11.6, 0], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [{ id: 'master-w0-o0', type: 'WINDOW', offsetM: 1.5, widthM: 2.0, heightM: 2.2, bottomM: 0.6, sillM: 0.6 }] },
        { id: 'master-wall-1', start: [11.6, 0], end: [11.6, 4.6], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [{ id: 'master-w1-o0', type: 'WINDOW', offsetM: 1.4, widthM: 1.6, heightM: 2.2, bottomM: 0.6, sillM: 0.6 }] },
        { id: 'master-wall-2', start: [11.6, 4.6], end: [6.9, 4.6], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'master-wall-3', start: [6.9, 4.6], end: [6.9, 0], thicknessM: 0.1, material: 'Warm Linen', structuralStatus: 'UNKNOWN', openings: [{ id: 'master-w3-o0', type: 'OPENING', offsetM: 1.85, widthM: 0.95, heightM: 2.1, bottomM: 0 }] },
      ],
      objects: [
        { id: 'master-obj-0', type: 'BED', name: 'King bed + storage', position: [8.9, 1.6], size: [1.85, 0.95, 2.05], rotationY: 0, material: 'Sand Weave' },
        { id: 'master-obj-1', type: 'CABINET', name: 'Nightstand', position: [7.75, 0.6], size: [0.45, 0.55, 0.4], rotationY: 0, material: 'Walnut' },
        { id: 'master-obj-2', type: 'CABINET', name: 'Nightstand', position: [10.05, 0.6], size: [0.45, 0.55, 0.4], rotationY: 0, material: 'Walnut' },
        { id: 'master-obj-3', type: 'CABINET', name: '4-door wardrobe', position: [11.28, 2.9], size: [0.62, 2.4, 2.0], rotationY: 3.1416, material: 'Oak' },
        { id: 'master-obj-4', type: 'RUG', name: 'Bedside rug', position: [8.9, 3.55], size: [2.4, 0.02, 1.5], rotationY: 0, material: 'Charcoal' },
        { id: 'master-obj-5', type: 'PLANT', name: 'Snake plant', position: [7.35, 4.1], size: [0.5, 1.2, 0.5], rotationY: 0, material: 'Sage Accent' },
      ]
    },
    {
      id: 'bed2',
      name: 'Bedroom 2',
      heightM: 3.0,
      roomType: 'BED2',
      floorId: 'Engineered Oak',
      floorPolygon: [[5.8, 5.7], [8.7, 5.7], [8.7, 8.6], [5.8, 8.6]],
      walls: [
        { id: 'bed2-wall-0', start: [5.8, 5.7], end: [8.7, 5.7], thicknessM: 0.1, material: 'Sage Accent', structuralStatus: 'UNKNOWN', openings: [{ id: 'bed2-w0-o0', type: 'OPENING', offsetM: 0.95, widthM: 0.9, heightM: 2.1, bottomM: 0 }] },
        { id: 'bed2-wall-1', start: [8.7, 5.7], end: [8.7, 8.6], thicknessM: 0.1, material: 'Sage Accent', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'bed2-wall-2', start: [8.7, 8.6], end: [5.8, 8.6], thicknessM: 0.1, material: 'Sage Accent', structuralStatus: 'UNKNOWN', openings: [{ id: 'bed2-w2-o0', type: 'WINDOW', offsetM: 0.9, widthM: 1.4, heightM: 2.0, bottomM: 0.7, sillM: 0.7 }] },
        { id: 'bed2-wall-3', start: [5.8, 8.6], end: [5.8, 5.7], thicknessM: 0.1, material: 'Sage Accent', structuralStatus: 'UNKNOWN', openings: [] },
      ],
      objects: [
        { id: 'bed2-obj-0', type: 'BED', name: 'Queen bed', position: [7.3, 7.55], size: [1.55, 0.9, 2.0], rotationY: 3.1416, material: 'Sand Weave' },
        { id: 'bed2-obj-1', type: 'CABINET', name: 'Nightstand', position: [6.16, 8.2], size: [0.42, 0.52, 0.38], rotationY: 0, material: 'Walnut' },
        { id: 'bed2-obj-2', type: 'CABINET', name: '2-door wardrobe', position: [8.38, 6.6], size: [0.62, 2.2, 1.5], rotationY: 3.1416, material: 'Oak' },
        { id: 'bed2-obj-3', type: 'TABLE', name: 'Study desk', position: [6.1, 6.6], size: [0.55, 0.75, 1.1], rotationY: 0, material: 'Oak' },
        { id: 'bed2-obj-4', type: 'CHAIR', name: 'Task chair', position: [6.8, 6.25], size: [0.45, 0.9, 0.48], rotationY: -1.5708, material: 'Charcoal' },
      ]
    },
    {
      id: 'bath',
      name: 'Bathroom',
      heightM: 2.8,
      roomType: 'BATH',
      floorId: 'Italian Marble',
      floorPolygon: [[8.7, 5.7], [10.6, 5.7], [10.6, 8.0], [8.7, 8.0]],
      walls: [
        { id: 'bath-wall-0', start: [8.7, 5.7], end: [10.6, 5.7], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [{ id: 'bath-w0-o0', type: 'OPENING', offsetM: 0.575, widthM: 0.75, heightM: 2.05, bottomM: 0 }] },
        { id: 'bath-wall-1', start: [10.6, 5.7], end: [10.6, 8.0], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [{ id: 'bath-w1-o0', type: 'WINDOW', offsetM: 1.4, widthM: 0.6, heightM: 0.7, bottomM: 1.7, sillM: 1.7 }] },
        { id: 'bath-wall-2', start: [10.6, 8.0], end: [8.7, 8.0], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [] },
        { id: 'bath-wall-3', start: [8.7, 8.0], end: [8.7, 5.7], thicknessM: 0.1, material: 'Chalk White', structuralStatus: 'UNKNOWN', openings: [] },
      ],
      objects: [
        { id: 'bath-obj-0', type: 'CABINET', name: 'Vanity + basin', position: [10.33, 6.35], size: [0.5, 0.85, 1.2], rotationY: 0, material: 'Marble' },
        { id: 'bath-obj-1', type: 'CUSTOM', name: 'Wall-hung WC', position: [8.95, 7.42], size: [0.6, 0.78, 0.4], rotationY: 0, material: 'White' },
        { id: 'bath-obj-2', type: 'CUSTOM', name: 'Glass shower', position: [10.12, 7.5], size: [0.88, 2.05, 0.88], rotationY: 0, material: 'Glass' },
      ]
    },
  ]
};
