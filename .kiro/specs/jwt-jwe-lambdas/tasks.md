# Plan de Implementación: jwt-jwe-lambdas

## Overview

Implementación incremental de dos AWS Lambda Functions (Encryption y Decryption) usando Node.js, la librería `jose` v5.x para operaciones criptográficas JWT/JWE, y AWS Secrets Manager para gestión segura de claves RSA. Cada tarea construye sobre la anterior, terminando con la integración completa y las pruebas de propiedades.

## Tasks

- [x] 1. Configurar estructura del proyecto y dependencias
  - Crear `package.json` con dependencias de producción (`jose`, `@aws-sdk/client-secrets-manager`) y desarrollo (`jest`, `fast-check`)
  - Crear `jest.config.js` con `testEnvironment: 'node'`, patrones de test para `tests/unit/**` y `tests/property/**`, y umbrales de cobertura (branches: 80, functions/lines/statements: 90)
  - Crear la estructura de directorios: `src/encryptor/`, `src/decryptor/`, `src/shared/`, `tests/unit/encryptor/`, `tests/unit/decryptor/`, `tests/unit/shared/`, `tests/property/`, `tests/fixtures/keys/`
  - _Requirements: 6.1, 7.1_

- [x] 2. Generar claves RSA de prueba y helpers de fixtures
  - Generar par de claves RSA-2048 para tests usando Node.js crypto (`generateKeyPairSync`) y guardar como `tests/fixtures/keys/test-private.pem` (PKCS#8) y `tests/fixtures/keys/test-public.pem` (SPKI)
  - Crear `tests/fixtures/testHelpers.js` que lea ambos archivos PEM y los exporte como `TEST_PRIVATE_KEY_PEM` y `TEST_PUBLIC_KEY_PEM`
  - _Requirements: 6.1, 7.1_

- [x] 3. Implementar módulo compartido de errores
  - Crear `src/shared/errors.js` con la jerarquía de clases: `AppError` (base con `statusCode`), `ValidationError` (400), `KeyStoreError` (500), `DecryptionError` (422), `SignatureError` (401), `TokenExpiredError` (401)
  - _Requirements: 1.4, 1.5, 2.5, 3.4, 3.5, 3.6, 4.4, 4.5, 4.6_

  - [ ]* 3.1 Escribir pruebas unitarias para errors.js
    - Verificar que cada clase de error tiene el `statusCode` correcto
    - Verificar que cada clase hereda de `AppError` y de `Error`
    - _Requirements: 1.4, 3.4_

- [x] 4. Implementar módulo compartido keyStore.js
  - Crear `src/shared/keyStore.js` con función `getKeys()` que recupera `PRIVATE_KEY_SECRET_NAME` y `PUBLIC_KEY_SECRET_NAME` desde AWS Secrets Manager usando `@aws-sdk/client-secrets-manager`
  - Implementar caché a nivel de módulo (`cachedKeys`) que persiste entre invocaciones del mismo contenedor Lambda
  - Implementar función `clearCache()` para limpiar el caché (uso en tests)
  - Lanzar `KeyStoreError` si cualquier secreto no puede ser recuperado
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 4.1 Escribir pruebas unitarias para keyStore.js
    - Mockear `@aws-sdk/client-secrets-manager` para simular respuestas exitosas y fallos
    - Verificar que `getKeys()` retorna `{ privateKeyPem, publicKeyPem }` en caso exitoso
    - Verificar que `getKeys()` lanza `KeyStoreError` cuando Secrets Manager falla
    - Verificar que el caché funciona: llamadas sucesivas a `getKeys()` solo invocan Secrets Manager una vez
    - Verificar que `clearCache()` fuerza una nueva llamada a Secrets Manager en la siguiente invocación
    - _Requirements: 5.5, 5.6_

- [x] 5. Implementar módulo jwtSigner.js (Encryption Lambda)
  - Crear `src/encryptor/jwtSigner.js` con función `signJWT(payload, privateKeyPem)` que:
    - Importa la clave privada PEM con `importPKCS8` de `jose`
    - Construye y firma un JWT con `new SignJWT(payload).setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).setIssuedAt().setExpirationTime(process.env.JWT_EXPIRATION || '1h').sign(privateKey)`
    - Retorna el JWT firmado como string
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 5.1 Escribir pruebas unitarias para jwtSigner.js
    - Usar `TEST_PRIVATE_KEY_PEM` y `TEST_PUBLIC_KEY_PEM` de fixtures
    - Verificar que el JWT producido puede ser verificado con la clave pública correspondiente
    - Verificar que el header del JWT contiene `alg: 'RS256'` y `typ: 'JWT'`
    - Verificar que el payload del JWT contiene los claims `iat` y `exp`
    - Verificar que los claims del payload original están presentes en el JWT
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Implementar módulo jweEncryptor.js (Encryption Lambda)
  - Crear `src/encryptor/jweEncryptor.js` con función `encryptJWT(jwt, publicKeyPem)` que:
    - Importa la clave pública PEM con `importSPKI` de `jose`
    - Encripta el JWT con `new CompactEncrypt(new TextEncoder().encode(jwt)).setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' }).encrypt(publicKey)`
    - Retorna el JWE en formato compacto (string de 5 partes separadas por `.`)
  - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 6.1 Escribir pruebas unitarias para jweEncryptor.js
    - Verificar que el JWE producido tiene exactamente 5 partes al dividir por `.`
    - Verificar que el JWE puede ser desencriptado con la clave privada correspondiente y produce el JWT original
    - Verificar que el header protegido del JWE contiene `alg: 'RSA-OAEP-256'` y `enc: 'A256GCM'`
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 7. Implementar validator.js y handler.js de la Encryption Lambda
  - Crear `src/encryptor/validator.js` con función `validateEncryptInput(event)` que:
    - Parsea `event.body` como JSON
    - Verifica que `payload` existe y es un objeto JSON (no null, no array, no primitivo)
    - Lanza `ValidationError` con mensaje `"El campo 'payload' es requerido y debe ser un objeto JSON válido"` si la validación falla
  - Crear `src/encryptor/handler.js` que orquesta: `validateEncryptInput` → `keyStore.getKeys()` → `jwtSigner.signJWT()` → `jweEncryptor.encryptJWT()` → respuesta HTTP 200 `{ jwe }`
  - Implementar bloque `try/catch` central que mapea `AppError` a su `statusCode`, errores de `jose` a errores de dominio, y cualquier otro error a HTTP 500 sin exponer detalles internos
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 7.1 Escribir pruebas unitarias para handler.js (Encryption Lambda)
    - Mockear `keyStore.getKeys()` para retornar las claves de fixtures
    - Verificar que el handler retorna HTTP 200 con campo `jwe` para un payload válido
    - Verificar que el handler retorna HTTP 400 cuando `payload` está ausente
    - Verificar que el handler retorna HTTP 400 cuando `payload` es un string, número, array o null
    - Verificar que el handler retorna HTTP 500 cuando `keyStore.getKeys()` lanza `KeyStoreError`
    - _Requirements: 1.4, 1.5, 2.4, 2.5_

- [ ] 8. Checkpoint — Verificar módulos de encriptación
  - Asegurarse de que todos los tests de `tests/unit/encryptor/` y `tests/unit/shared/` pasan. Consultar al usuario si surgen dudas.

- [ ] 9. Implementar módulo jweDecryptor.js (Decryption Lambda)
  - Crear `src/decryptor/jweDecryptor.js` con función `decryptJWE(jwe, privateKeyPem)` que:
    - Importa la clave privada PEM con `importPKCS8` de `jose`
    - Desencripta el JWE con `compactDecrypt(jwe, privateKey)`
    - Decodifica el plaintext resultante con `new TextDecoder().decode(plaintext)` para obtener el JWT
    - Mapea errores de `jose` (`JWEDecryptionFailed`, `JWEInvalid`) a `DecryptionError`
    - Retorna el JWT como string
  - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [ ]* 9.1 Escribir pruebas unitarias para jweDecryptor.js
    - Verificar que un JWE válido (producido con `jweEncryptor`) es desencriptado correctamente y retorna el JWT original
    - Verificar que un JWE con datos corruptos lanza `DecryptionError` con statusCode 422
    - Verificar que un JWE encriptado con una clave diferente lanza `DecryptionError`
    - _Requirements: 3.1, 3.6_

- [ ] 10. Implementar módulo jwtVerifier.js (Decryption Lambda)
  - Crear `src/decryptor/jwtVerifier.js` con función `verifyJWT(jwt, publicKeyPem)` que:
    - Importa la clave pública PEM con `importSPKI` de `jose`
    - Verifica el JWT con `jwtVerify(jwt, publicKey, { algorithms: ['RS256'] })`
    - Mapea `JWTExpired` de `jose` a `TokenExpiredError`
    - Mapea `JWSSignatureVerificationFailed` de `jose` a `SignatureError`
    - Retorna `{ jwt, claims: payload }` donde `jwt` es el string original y `claims` es el payload decodificado
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 10.1 Escribir pruebas unitarias para jwtVerifier.js
    - Verificar que un JWT válido retorna `{ jwt, claims }` con los claims correctos
    - Verificar que un JWT con firma inválida lanza `SignatureError` con statusCode 401
    - Verificar que un JWT expirado (con `exp` en el pasado) lanza `TokenExpiredError` con statusCode 401
    - _Requirements: 4.1, 4.4, 4.5_

- [ ] 11. Implementar validator.js y handler.js de la Decryption Lambda
  - Crear `src/decryptor/validator.js` con función `validateDecryptInput(event)` que:
    - Parsea `event.body` como JSON
    - Verifica que `jwe` existe, es un string, y tiene exactamente 5 partes al dividir por `.`
    - Lanza `ValidationError` con mensaje `"El campo 'jwe' es requerido y debe ser un JWE en formato compacto"` si la validación falla
  - Crear `src/decryptor/handler.js` que orquesta: `validateDecryptInput` → `keyStore.getKeys()` → `jweDecryptor.decryptJWE()` → `jwtVerifier.verifyJWT()` → respuesta HTTP 200 `{ jwt, claims }`
  - Implementar bloque `try/catch` central que mapea `AppError` a su `statusCode`, errores de `jose` a errores de dominio, y cualquier otro error a HTTP 500 sin exponer detalles internos
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 11.1 Escribir pruebas unitarias para handler.js (Decryption Lambda)
    - Mockear `keyStore.getKeys()` para retornar las claves de fixtures
    - Verificar que el handler retorna HTTP 200 con campos `jwt` y `claims` para un JWE válido
    - Verificar que el handler retorna HTTP 400 cuando `jwe` está ausente
    - Verificar que el handler retorna HTTP 400 cuando `jwe` tiene menos o más de 5 partes
    - Verificar que el handler retorna HTTP 422 cuando el JWE no puede ser desencriptado
    - Verificar que el handler retorna HTTP 401 cuando la firma del JWT es inválida
    - Verificar que el handler retorna HTTP 401 cuando el JWT ha expirado
    - Verificar que el handler retorna HTTP 500 cuando `keyStore.getKeys()` lanza `KeyStoreError`
    - _Requirements: 3.4, 3.5, 3.6, 4.4, 4.5, 4.6_

- [ ] 12. Checkpoint — Verificar módulos de desencriptación
  - Asegurarse de que todos los tests de `tests/unit/decryptor/` pasan. Consultar al usuario si surgen dudas.

- [ ] 13. Implementar pruebas de propiedades para la Encryption Lambda
  - Crear `tests/property/encryptor.property.test.js` usando `fast-check` integrado con Jest
  - Definir el arbitrario `validPayloadArb` como `fc.object()` con valores primitivos (strings, enteros, booleanos)
  - Mockear `keyStore.getKeys()` para retornar las claves de fixtures en todos los tests de propiedades

  - [ ]* 13.1 Escribir property test para Property 2: Formato compacto JWE
    - **Property 2: El JWE producido tiene formato compacto de cinco partes**
    - Para cualquier payload JSON válido, el campo `jwe` retornado debe tener exactamente 5 partes al dividir por `.`
    - **Validates: Requirements 2.3, 6.5, 6.1**

  - [ ]* 13.2 Escribir property test para Property 3: Headers criptográficos correctos
    - **Property 3: El JWT firmado tiene los headers criptográficos correctos**
    - Para cualquier payload JSON válido, desencriptar el JWE y decodificar el JWT debe revelar `alg: 'RS256'` y `typ: 'JWT'` en el header del JWT, y `alg: 'RSA-OAEP-256'` y `enc: 'A256GCM'` en el header del JWE
    - **Validates: Requirements 1.3, 2.2**

  - [ ]* 13.3 Escribir property test para Property 4: Claims estándar iat y exp
    - **Property 4: El JWT contiene los claims estándar `iat` y `exp`**
    - Para cualquier payload JSON válido, el JWT producido debe contener `iat` (entero positivo) y `exp` (entero mayor que `iat`)
    - **Validates: Requirements 1.1**

  - [ ]* 13.4 Escribir property test para Property 5: Inputs de payload inválidos producen HTTP 400
    - **Property 5: Inputs de payload inválidos producen HTTP 400**
    - Usar `fc.oneof(fc.constant(null), fc.string(), fc.integer(), fc.boolean(), fc.array(fc.anything()))` para generar valores no-objeto
    - Para cualquier valor no-objeto en el campo `payload`, el handler debe retornar `statusCode: 400`
    - **Validates: Requirements 1.4**

- [ ] 14. Implementar pruebas de propiedades para la Decryption Lambda y round-trip
  - Crear `tests/property/decryptor.property.test.js` usando `fast-check` integrado con Jest
  - Mockear `keyStore.getKeys()` para retornar las claves de fixtures en todos los tests de propiedades

  - [ ]* 14.1 Escribir property test para Property 1: Round-trip end-to-end preserva claims
    - **Property 1: Round-trip end-to-end preserva los claims originales**
    - Para cualquier payload JSON válido, encriptar con `encryptHandler` y luego desencriptar con `decryptHandler` debe retornar `claims` que contengan todos los campos y valores del payload original
    - **Validates: Requirements 6.6, 7.6, 4.2, 4.3, 3.1, 7.1**

  - [ ]* 14.2 Escribir property test para Property 6: JWEs con formato inválido producen HTTP 400
    - **Property 6: JWEs con formato inválido producen HTTP 400 en la Decryption Lambda**
    - Usar `fc.string()` filtrado para generar strings que no tengan exactamente 4 puntos separadores
    - Para cualquier string con formato inválido en el campo `jwe`, el handler debe retornar `statusCode: 400`
    - **Validates: Requirements 3.4**

  - [ ]* 14.3 Escribir property test para Property 7: Firma inválida produce HTTP 401
    - **Property 7: JWTs con firma inválida producen HTTP 401**
    - Para cualquier payload JSON válido, firmar el JWT con una clave privada diferente (segunda clave de fixtures) y encriptarlo con la clave pública correcta debe hacer que `decryptHandler` retorne `statusCode: 401`
    - **Validates: Requirements 4.4**

- [ ] 15. Checkpoint — Verificar todas las pruebas
  - Ejecutar la suite completa (`jest --coverage`) y asegurarse de que todos los tests unitarios y de propiedades pasan, y que los umbrales de cobertura se cumplen. Consultar al usuario si surgen dudas.

- [ ] 16. Crear AWS SAM template.yaml
  - Crear `template.yaml` en la raíz del proyecto con:
    - `AWSTemplateFormatVersion: '2010-09-09'` y `Transform: AWS::Serverless-2016-10-31`
    - Recurso `EncryptionFunction` (tipo `AWS::Serverless::Function`) con `Handler: src/encryptor/handler.handler`, `Runtime: nodejs20.x`, variables de entorno `PRIVATE_KEY_SECRET_NAME`, `PUBLIC_KEY_SECRET_NAME`, `JWT_EXPIRATION`, y evento API Gateway `POST /encrypt`
    - Recurso `DecryptionFunction` (tipo `AWS::Serverless::Function`) con `Handler: src/decryptor/handler.handler`, `Runtime: nodejs20.x`, las mismas variables de entorno, y evento API Gateway `POST /decrypt`
    - Política IAM `secretsmanager:GetSecretValue` para ambas funciones sobre los ARNs de los secretos correspondientes
    - Outputs con las URLs de los endpoints de API Gateway
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 5.2_

- [ ] 17. Crear configuración Terraform (opcional)
  - [ ]* 17.1 Crear terraform/variables.tf
    - Definir variables: `aws_region`, `private_key_pem` (sensitive), `public_key_pem` (sensitive), `jwt_expiration`
    - _Requirements: 5.1, 5.2_

  - [ ]* 17.2 Crear terraform/main.tf
    - Recurso `aws_secretsmanager_secret` y `aws_secretsmanager_secret_version` para `jwt-jwe/private-key` y `jwt-jwe/public-key`
    - Recurso `aws_iam_role` y `aws_iam_role_policy` para las Lambda Functions con permisos mínimos a Secrets Manager
    - _Requirements: 5.1, 5.2_

  - [ ]* 17.3 Crear terraform/outputs.tf
    - Outputs con los ARNs de los secretos creados en Secrets Manager
    - _Requirements: 5.1, 5.2_

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los checkpoints (tareas 8, 12, 15) garantizan validación incremental antes de continuar
- Las pruebas de propiedades (fast-check) validan propiedades universales con 100 iteraciones mínimas por propiedad
- Las pruebas unitarias validan ejemplos concretos y casos límite
- El mock de `keyStore.getKeys()` en todos los tests evita llamadas reales a AWS Secrets Manager
- Las claves RSA de fixtures (`tests/fixtures/keys/`) son exclusivamente para testing y nunca deben usarse en producción
