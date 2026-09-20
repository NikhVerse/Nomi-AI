# Nomi AI - Authentication & Data Isolation

## 1. Overview
Nomi AI provides complete multi-user isolation so each user manages their private workspace of personas, prompt versions, conversations, messages, and evaluations.

---

## 2. Authentication Flow

1. **Registration**:
   - Accepts `name`, `email`, `password`, and `confirm_password`.
   - Validates email format, password minimum length (8 characters), and matching confirmation.
   - Hashes password using salted `bcrypt`. Plaintext passwords are never stored or logged.

2. **Login & Token Issuance**:
   - Verifies email and matches bcrypt hash.
   - Issues a JSON Web Token (JWT) signed with the server's `SECRET_KEY` using the `HS256` algorithm.
   - Includes standard claims: `sub` (User ID), `email`, `iat` (issued at), and `exp` (expiration).

3. **Stateless Authorization**:
   - Protected endpoints require an `Authorization: Bearer <token>` header.
   - FastAPI dependency `get_current_user` decodes the token, validates expiration, and retrieves the active user record from the database.

---

## 3. Strict Resource Ownership Enforcement

To ensure true tenant privacy:
- The backend never trusts `user_id` values supplied in the request body or URL parameters.
- All write, read, update, and delete actions enforce:
  ```python
  verify_ownership(resource.user_id, current_user.id)
  ```
- If an unauthenticated user or a different authenticated user attempts to access a resource, the API responds with `401 Unauthorized` or `403 Forbidden`.
