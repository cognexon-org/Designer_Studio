# Deployment notes

## Separate servers

The recommended development layout is:

```text
Node API and worker     http://localhost:3000
Python vision service  http://localhost:8001
Designer Studio         http://localhost:3002
MinIO assets            http://localhost:9000
```

The browser talks directly to the Node API and public asset URLs. The Node worker talks to the Python service internally.

## Environment

The frontend only requires:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

The Node backend already enables CORS. For production, restrict its allowed origins to the actual portal and public-viewer domains.

## Public design links

The backend returns `/design/{slug}` when a design is published. Host this frontend on the customer-facing domain so that route resolves to the included public viewer.

## CDN and object storage

The published manifest contains `modelUrl`. Configure `MINIO_PUBLIC_BASE_URL` or the production CDN base correctly before generating and publishing the GLB.

## Security checklist

- Use HTTPS for the frontend, API and assets.
- Do not place JWTs in query strings.
- Replace development OTP with a production SMS provider.
- Restrict CORS.
- Use short retention for private capture evidence.
- Scan uploaded model and media files.
- Keep public manifests free of private asset keys and internal reviewer notes.
