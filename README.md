# jwt-jwe-lambdas

AWS Lambda functions for JWE encryption/decryption using RSA-OAEP-256 + A256GCM, built with Spec-Driven Development.

## Lambdas

| Lambda | Ruta | Descripción |
|--------|------|-------------|
| `jose-encryptor` | `POST /encrypt` | Recibe un payload JSON y retorna un token JWE encriptado |
| `jose-decryptor` | `POST /decrypt` | Recibe un token JWE y retorna el payload JSON desencriptado |

## AWS profile y despliegue

Este repo está preparado para desplegarse con un perfil AWS separado llamado `alvaro-mejia`.

1. Crear el perfil de AWS con las credenciales de Álvaro Mejía:

```bash
aws configure --profile alvaro-mejia
```

2. Usar el perfil en el despliegue local o exportar la variable de entorno:

```bash
export AWS_PROFILE=alvaro-mejia
export AWS_REGION=us-east-1
```

También puedes copiar `.env.sample` a `.env` y cargar esas variables durante el desarrollo local.

3. Desplegar con el script dedicado:

```bash
npm run deploy:alvaro
```

## Endpoints (AWS)

Los endpoints finales se generan en los outputs del deploy. Después de desplegar, el stack `jwt-jwe-lambdas-alvaro` proveerá los outputs:

- `EncryptEndpoint`
- `DecryptEndpoint`

Estos valores estarán disponibles desde la consola de CloudFormation o el log de `sam deploy`.

## Flujo criptográfico

```
payload JSON
    │
    ▼
[jose-encryptor]
  signJWT (RS256)  →  encryptJWT (RSA-OAEP-256 + A256GCM)
    │
    ▼
  JWE compacto (5 partes)
    │
    ▼
[jose-decryptor]
  decryptJWE (RSA-OAEP-256)  →  verifyJWT (RS256)
    │
    ▼
  { jwt, claims }
```

## Algoritmos

| Operación | Algoritmo |
|-----------|-----------|
| Firma JWT | RS256 (RSA + SHA-256) |
| Encriptación de clave JWE | RSA-OAEP-256 |
| Encriptación de contenido JWE | A256GCM |

## Gestión de claves

Las claves RSA se almacenan en **AWS Secrets Manager** y se recuperan en tiempo de ejecución con caché en memoria por contenedor Lambda. La clave privada nunca se expone en código ni variables de entorno.

| Secreto | Contenido |
|---------|-----------|
| `alvaro-mejia/jwt-jwe/private-key` | Clave privada RSA-2048 (PKCS#8 PEM) |
| `alvaro-mejia/jwt-jwe/public-key` | Clave pública RSA-2048 (SPKI PEM) |

## Spec-Driven Development

Los specs generados con Kiro están en [`.kiro/specs/jwt-jwe-lambdas/`](.kiro/specs/jwt-jwe-lambdas/):

- [`requirements.md`](.kiro/specs/jwt-jwe-lambdas/requirements.md) — 7 requerimientos con criterios de aceptación
- [`design.md`](.kiro/specs/jwt-jwe-lambdas/design.md) — arquitectura, contratos de interfaz, propiedades de correctitud
- [`tasks.md`](.kiro/specs/jwt-jwe-lambdas/tasks.md) — plan de implementación incremental

## Pruebas

```bash
npm test              # todos los tests
npm run test:coverage # con cobertura
npm run test:unit     # solo unitarios
npm run test:property # solo property-based
```

### Resultados

![Tests pasando](docs/screenshots/tests.jpeg)

**10 suites — 90 tests — 100% PASS**

| Suite | Tests |
|-------|-------|
| `tests/unit/encryptor/` | handler, jwtSigner, jweEncryptor |
| `tests/unit/decryptor/` | handler, jweDecryptor, jwtVerifier |
| `tests/unit/shared/` | errors, keyStore |
| `tests/property/` | encryptor (Props 2,3,4,5), decryptor (Props 1,6,7) |

## Evidencia de funcionamiento

### jose-encryptor — payload → JWE

![Encryptor en Postman](docs/screenshots/encript.jpeg)

### jose-decryptor — JWE → claims

![Decryptor en Postman](docs/screenshots/desencrypt.jpeg)

## Estructura del proyecto

```
jwt-jwe-lambdas/
├── .kiro/specs/jwt-jwe-lambdas/     # Specs SDD
├── src/
│   ├── encryptor/                   # jose-encryptor Lambda
│   │   ├── handler.js
│   │   ├── jwtSigner.js
│   │   ├── jweEncryptor.js
│   │   └── validator.js
│   ├── decryptor/                   # jose-decryptor Lambda
│   │   ├── handler.js
│   │   ├── jweDecryptor.js
│   │   ├── jwtVerifier.js
│   │   └── validator.js
│   └── shared/
│       ├── keyStore.js              # AWS Secrets Manager + caché
│       └── errors.js
├── tests/
│   ├── unit/                        # Tests unitarios
│   ├── property/                    # Property-based tests (fast-check)
│   └── fixtures/keys/               # Claves RSA solo para tests
├── docs/screenshots/                # Evidencia visual
└── template.yaml                    # AWS SAM
```

## Dependencias

| Paquete | Uso |
|---------|-----|
| `jose` ^5.9.6 | JWT/JWE (RS256, RSA-OAEP-256, A256GCM) |
| `@aws-sdk/client-secrets-manager` ^3.700.0 | Recuperación de claves RSA |
| `jest` ^29.7.0 | Tests unitarios |
| `fast-check` ^3.22.0 | Property-based testing |

## Despliegue

```bash
sam build
npm run deploy:alvaro
```
