# Documento de Requerimientos

## Introducción

Este documento describe los requerimientos para dos AWS Lambda Functions que implementan un flujo seguro de encriptación y desencriptación de datos usando estándares criptográficos JWT (JSON Web Token) y JWE (JSON Web Encryption).

**Lambda de Encriptación**: Recibe datos de entrada, firma un JWT con una clave privada RSA, y encripta el JWT resultante usando una clave pública RSA para producir un JWE.

**Lambda de Desencriptación**: Recibe un JWE, lo desencripta usando una clave privada RSA, valida la firma del JWT contenido, y devuelve el JWT verificado con sus claims.

Ambas lambdas son independientes, sin estado, y se comunican a través del formato estándar JWE compacto.

---

## Glosario

- **Encryption_Lambda**: La función AWS Lambda responsable de firmar y encriptar datos de entrada.
- **Decryption_Lambda**: La función AWS Lambda responsable de desencriptar y validar tokens recibidos.
- **JWT**: JSON Web Token — token firmado digitalmente que contiene claims en formato JSON, según RFC 7519.
- **JWE**: JSON Web Encryption — estructura compacta de cinco partes que encripta un payload (en este caso un JWT), según RFC 7516.
- **JWS**: JSON Web Signature — JWT firmado digitalmente, según RFC 7515.
- **RSA_Private_Key**: Clave privada RSA usada para firmar JWTs (en Encryption_Lambda) y para desencriptar JWEs (en Decryption_Lambda).
- **RSA_Public_Key**: Clave pública RSA usada para encriptar JWEs (en Encryption_Lambda) y para verificar firmas JWT (en Decryption_Lambda).
- **Claims**: Conjunto de pares clave-valor que representan afirmaciones sobre una entidad, contenidos en el payload del JWT.
- **Key_Store**: Servicio de almacenamiento seguro de claves (por ejemplo, AWS Secrets Manager o AWS Parameter Store) desde donde las lambdas recuperan las claves RSA.
- **Signing_Algorithm**: Algoritmo de firma digital usado para el JWT (RS256 — RSA con SHA-256).
- **Key_Encryption_Algorithm**: Algoritmo usado para encriptar la clave de contenido del JWE (RSA-OAEP-256).
- **Content_Encryption_Algorithm**: Algoritmo usado para encriptar el contenido del JWE (A256GCM).

---

## Requerimientos

### Requerimiento 1: Firma de JWT en la Lambda de Encriptación

**User Story:** Como sistema cliente, quiero enviar datos a la Lambda de Encriptación y recibir un JWE, para que los datos viajen de forma segura y autenticada.

#### Criterios de Aceptación

1. WHEN la Encryption_Lambda recibe un evento con un campo `payload` de tipo objeto JSON, THE Encryption_Lambda SHALL construir un JWT con los claims del `payload` más los claims estándar `iat` (issued at) y `exp` (expiration).
2. WHEN la Encryption_Lambda construye el JWT, THE Encryption_Lambda SHALL firmar el JWT usando el Signing_Algorithm RS256 con la RSA_Private_Key recuperada del Key_Store.
3. THE Encryption_Lambda SHALL incluir en el header del JWT el campo `alg` con valor `RS256` y el campo `typ` con valor `JWT`.
4. IF el campo `payload` está ausente o no es un objeto JSON válido en el evento de entrada, THEN THE Encryption_Lambda SHALL retornar un error HTTP 400 con un mensaje descriptivo indicando el campo inválido.
5. IF la RSA_Private_Key no puede ser recuperada del Key_Store, THEN THE Encryption_Lambda SHALL retornar un error HTTP 500 con un mensaje que indique fallo en la recuperación de la clave de firma.

---

### Requerimiento 2: Encriptación JWE en la Lambda de Encriptación

**User Story:** Como sistema cliente, quiero que el JWT firmado sea encriptado antes de ser transmitido, para que solo el receptor autorizado pueda leerlo.

#### Criterios de Aceptación

1. WHEN la Encryption_Lambda ha firmado el JWT, THE Encryption_Lambda SHALL encriptar el JWT usando el Key_Encryption_Algorithm RSA-OAEP-256 con la RSA_Public_Key recuperada del Key_Store.
2. THE Encryption_Lambda SHALL usar el Content_Encryption_Algorithm A256GCM para encriptar el contenido del JWE.
3. THE Encryption_Lambda SHALL producir un JWE en formato compacto serializado (cinco partes separadas por puntos).
4. THE Encryption_Lambda SHALL retornar el JWE compacto en el campo `jwe` del cuerpo de la respuesta con código HTTP 200.
5. IF la RSA_Public_Key no puede ser recuperada del Key_Store, THEN THE Encryption_Lambda SHALL retornar un error HTTP 500 con un mensaje que indique fallo en la recuperación de la clave de encriptación.

---

### Requerimiento 3: Desencriptación JWE en la Lambda de Desencriptación

**User Story:** Como sistema receptor, quiero enviar un JWE a la Lambda de Desencriptación y obtener el JWT original, para poder acceder a los datos de forma segura.

#### Criterios de Aceptación

1. WHEN la Decryption_Lambda recibe un evento con un campo `jwe` de tipo string en formato compacto, THE Decryption_Lambda SHALL desencriptar el JWE usando la RSA_Private_Key recuperada del Key_Store.
2. THE Decryption_Lambda SHALL usar el Key_Encryption_Algorithm RSA-OAEP-256 para desencriptar la clave de contenido del JWE.
3. THE Decryption_Lambda SHALL usar el Content_Encryption_Algorithm A256GCM para desencriptar el contenido del JWE.
4. IF el campo `jwe` está ausente o no tiene el formato compacto de cinco partes, THEN THE Decryption_Lambda SHALL retornar un error HTTP 400 con un mensaje descriptivo indicando el formato inválido.
5. IF la RSA_Private_Key no puede ser recuperada del Key_Store, THEN THE Decryption_Lambda SHALL retornar un error HTTP 500 con un mensaje que indique fallo en la recuperación de la clave de desencriptación.
6. IF el JWE no puede ser desencriptado (clave incorrecta, datos corruptos), THEN THE Decryption_Lambda SHALL retornar un error HTTP 422 con un mensaje que indique fallo en la desencriptación.

---

### Requerimiento 4: Validación de Firma JWT en la Lambda de Desencriptación

**User Story:** Como sistema receptor, quiero que la Lambda de Desencriptación valide la autenticidad del JWT, para garantizar que el token no fue alterado y proviene de una fuente confiable.

#### Criterios de Aceptación

1. WHEN la Decryption_Lambda ha desencriptado el JWE y obtenido el JWT, THE Decryption_Lambda SHALL verificar la firma del JWT usando el Signing_Algorithm RS256 con la RSA_Public_Key recuperada del Key_Store.
2. WHEN la firma del JWT es válida, THE Decryption_Lambda SHALL retornar el JWT completo (header, payload y firma) en el campo `jwt` del cuerpo de la respuesta con código HTTP 200.
3. WHEN la firma del JWT es válida, THE Decryption_Lambda SHALL retornar los claims decodificados del JWT en el campo `claims` del cuerpo de la respuesta.
4. IF la firma del JWT no es válida, THEN THE Decryption_Lambda SHALL retornar un error HTTP 401 con un mensaje que indique firma inválida.
5. IF el JWT ha expirado (claim `exp` en el pasado), THEN THE Decryption_Lambda SHALL retornar un error HTTP 401 con un mensaje que indique token expirado.
6. IF la RSA_Public_Key para verificación no puede ser recuperada del Key_Store, THEN THE Decryption_Lambda SHALL retornar un error HTTP 500 con un mensaje que indique fallo en la recuperación de la clave de verificación.

---

### Requerimiento 5: Gestión Segura de Claves

**User Story:** Como operador del sistema, quiero que las claves RSA sean gestionadas de forma segura, para que no estén expuestas en el código fuente ni en variables de entorno en texto plano.

#### Criterios de Aceptación

1. THE Encryption_Lambda SHALL recuperar la RSA_Private_Key y la RSA_Public_Key exclusivamente desde el Key_Store en tiempo de ejecución.
2. THE Decryption_Lambda SHALL recuperar la RSA_Private_Key y la RSA_Public_Key exclusivamente desde el Key_Store en tiempo de ejecución.
3. WHILE una Lambda está procesando una solicitud, THE Encryption_Lambda SHALL mantener las claves RSA únicamente en memoria y no persistirlas en logs, variables de entorno ni almacenamiento externo.
4. WHILE una Lambda está procesando una solicitud, THE Decryption_Lambda SHALL mantener las claves RSA únicamente en memoria y no persistirlas en logs, variables de entorno ni almacenamiento externo.
5. WHERE el Key_Store soporta caché de claves, THE Encryption_Lambda SHALL cachear las claves RSA en memoria durante el ciclo de vida del contenedor Lambda para reducir llamadas al Key_Store.
6. WHERE el Key_Store soporta caché de claves, THE Decryption_Lambda SHALL cachear las claves RSA en memoria durante el ciclo de vida del contenedor Lambda para reducir llamadas al Key_Store.

---

### Requerimiento 6: Pruebas Unitarias de la Lambda de Encriptación

**User Story:** Como desarrollador, quiero pruebas unitarias para la Lambda de Encriptación, para garantizar la correctitud del proceso de firma y encriptación de forma aislada.

#### Criterios de Aceptación

1. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que la Encryption_Lambda produce un JWE en formato compacto de cinco partes para cualquier payload JSON válido.
2. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que el JWT firmado por la Encryption_Lambda puede ser verificado con la RSA_Public_Key correspondiente.
3. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que la Encryption_Lambda retorna HTTP 400 cuando el campo `payload` está ausente o es inválido.
4. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que la Encryption_Lambda retorna HTTP 500 cuando el Key_Store no está disponible.
5. FOR ALL payloads JSON válidos de entrada, el JWE producido por la Encryption_Lambda SHALL contener exactamente cinco partes al ser dividido por el carácter `.` (propiedad de formato compacto).
6. FOR ALL payloads JSON válidos de entrada, desencriptar el JWE producido por la Encryption_Lambda con la RSA_Private_Key correspondiente SHALL producir un JWT cuya firma sea verificable con la RSA_Public_Key (propiedad de round-trip).

---

### Requerimiento 7: Pruebas Unitarias de la Lambda de Desencriptación

**User Story:** Como desarrollador, quiero pruebas unitarias para la Lambda de Desencriptación, para garantizar la correctitud del proceso de desencriptación y validación de firma de forma aislada.

#### Criterios de Aceptación

1. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que la Decryption_Lambda retorna los claims originales para cualquier JWE válido producido por la Encryption_Lambda.
2. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que la Decryption_Lambda retorna HTTP 401 cuando la firma del JWT es inválida.
3. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que la Decryption_Lambda retorna HTTP 401 cuando el JWT ha expirado.
4. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que la Decryption_Lambda retorna HTTP 400 cuando el campo `jwe` está ausente o tiene formato inválido.
5. THE Test_Suite SHALL incluir pruebas unitarias que verifiquen que la Decryption_Lambda retorna HTTP 422 cuando el JWE no puede ser desencriptado.
6. FOR ALL JWEs válidos producidos por la Encryption_Lambda, la Decryption_Lambda SHALL retornar los mismos claims que fueron enviados originalmente a la Encryption_Lambda (propiedad de round-trip end-to-end).
