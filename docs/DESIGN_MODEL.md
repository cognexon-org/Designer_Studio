# Editable design model

The portal edits the same parametric JSON accepted by the Node backend.

```json
{
  "units": "meters",
  "rooms": [
    {
      "id": "living-room",
      "name": "Living Room",
      "heightM": 2.8,
      "floorPolygon": [[0, 0], [4.5, 0], [4.5, 3.6], [0, 3.6]],
      "walls": [
        {
          "id": "wall-1",
          "start": [0, 0],
          "end": [4.5, 0],
          "thicknessM": 0.12,
          "material": "Warm White",
          "structuralStatus": "UNKNOWN",
          "openings": [
            {
              "id": "door-1",
              "type": "DOOR",
              "offsetM": 0.5,
              "widthM": 0.9,
              "heightM": 2.1,
              "bottomM": 0
            }
          ]
        }
      ],
      "objects": [
        {
          "id": "sofa-1",
          "type": "SOFA",
          "name": "Three-seat sofa",
          "position": [2.2, 3.0],
          "size": [2.2, 0.85, 0.82],
          "rotationY": 0,
          "material": "Sand Fabric"
        }
      ]
    }
  ],
  "metadata": {
    "scaleConfirmed": true,
    "scaleSource": "laser_measurement",
    "structuralVerificationRequired": true
  }
}
```

## Coordinates

- Floor-plan coordinates use metres.
- `Point2[0]` is horizontal X.
- `Point2[1]` becomes Z in the Three.js scene.
- Vertical height is Y in Three.js.
- `rotationY` uses radians.

## Openings

`offsetM` is measured from the wall's start point. An opening must fit inside the wall and below the ceiling height.

## Furniture

Furniture is currently stored in the backend's flexible `objects` array. Future catalogue objects can add fields such as `catalogueId`, `assetUrl`, `brand`, `sku`, `price` and `metadata` while preserving the basic transform fields.
