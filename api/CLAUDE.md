# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Java 21**, **Spring Boot 4.0.6**
- **Spring Data JPA** — persistence layer
- **Spring Security** — authentication/authorization
- **Spring MVC** (`spring-boot-starter-webmvc`) — REST controllers
- **Lombok** — boilerplate reduction (`@Data`, `@Builder`, `@RequiredArgsConstructor`, etc.)
- **Docker Compose** integration (`spring-boot-docker-compose`) — auto-starts services defined in `compose.yaml` on `./mvnw spring-boot:run`

## Common Commands

```bash
# Run the application (also starts Docker Compose services)
./mvnw spring-boot:run

# Build (skip tests)
./mvnw package -DskipTests

# Run all tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=MyServiceTest

# Run a single test method
./mvnw test -Dtest=MyServiceTest#myMethod
```

On Windows use `mvnw.cmd` instead of `./mvnw`.

## Architecture Notes

The project is in its initial scaffold state — only `ApiApplication.java` exists under `com.easytennis`. The expected layered structure is:

- `controller/` — `@RestController` classes (HTTP layer)
- `service/` — business logic
- `repository/` — `@Repository` / Spring Data JPA interfaces
- `model/` or `entity/` — `@Entity` classes
- `dto/` — request/response DTOs (keep separate from entities)
- `security/` — Spring Security config (`SecurityFilterChain` bean, JWT filters, etc.)

Spring Security is on the classpath and will deny all requests by default until a `SecurityFilterChain` bean is defined.

## Database

`compose.yaml` is currently empty. When a database service is added (e.g., PostgreSQL), Spring Boot will automatically start it via the Docker Compose integration before the app boots — no manual `docker compose up` needed during development.

Datasource properties go in `src/main/resources/application.properties` (or `application.yml`).

---

## Application Purpose

EasyTennis tracks tennis game days in court rental arenas. Users register game days with the number of courts rented, hours played, total rental price, and the players who attended. The total cost can be split among any subset of players.

---

## Domain Entities

- **GameDay** — date, number of courts, number of hours, total price, list of players
- **User** — application user (authentication principal); fields: username, email, hashed password
- **Player** — embedded within GameDay (not a separate DB table); fields: name, email

---

## Authentication

- JWT-based via Spring Security
- Public endpoints: `POST /auth/register`, `POST /auth/login` — return a signed JWT
- All other endpoints require `Authorization: Bearer <token>`
- JWT secret and expiry must live in `.env.development` / `.env.production`, never hardcoded

---

## Clean Architecture Rules

- Only three layers: `controller/`, `service/`, `repository/`
- `config/` and `util/` classes are allowed when genuinely needed
- Follow SOLID principles strictly:
  - **S** — one reason to change per class
  - **O** — extend via interfaces/abstractions, not by modifying existing classes
  - **L** — subtypes must be substitutable for their base types
  - **I** — prefer small, focused interfaces over fat ones
  - **D** — depend on abstractions; inject via constructor
- No code duplication — extract shared logic into `util/` or `service/` methods
- Use descriptive variable names throughout; avoid abbreviations

---

## Testing Standards

- Write unit tests with meaningful assertions (test behaviour, not implementation)
- Always cover edge cases: null inputs, empty lists, boundary values, duplicates, unauthorised access
- Integration tests must hit a real PostgreSQL database — **never mock the DB**
- Run `./mvnw test` (Windows: `mvnw.cmd test`) after every change

---

## Development Protocol (MANDATORY)

**Before every change**, divide the change in small tasks, and write a log entry in the commit message / PR description:

```
[LOG - <ISO 8601 timestamp>]
Change: <what the change is>
Reason: <why it is needed>
Approach: <how it will be implemented>
```

**After every change**:
1. Run all unit and integration tests (`./mvnw test`)
2. Review for new risks and uncovered edge cases; document them
3. Lint the code (Checkstyle / SpotBugs if configured)
4. Check for code smells: God classes, long methods, feature envy, magic numbers
5. Verify no secrets or environment variables are hardcoded — all must live in `.env` files
6. Review for new risks and uncovered edge cases, as well as code bad practices that can be fixed; Ask the following questions: What was the purpose of these changes? Was the purpose fulfilled? What was the expected result? Was this result achieved? Do the tools, code and design patterns align with the conventions of the project?  document your review and return it for fixing.
7. Verify no API URLs, tokens, or secrets are hardcoded — use `.env` files

**After the change review**
Write a summary of our progress, key decisions made, and next steps into a file called DECISIONS.md, with the time stamp of the change.


---

## Environment Variables

- `.env.development` — local development values (not committed)
- `.env.production` — production values (managed via secrets manager / CI)
- Reference in `application.properties` as `${ENV_VAR_NAME}`
- Examples: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRY_MS`

---

## Docker Policy

- PostgreSQL is defined in `compose.yaml`; Spring Boot auto-starts it via the Docker Compose integration on `./mvnw spring-boot:run`
- **If any Docker error occurs: NEVER fall back to H2 or any in-memory database. Stop immediately and notify the user that Docker Desktop is not running.**

---

## GitHub Workflow

- The root `easytennis/` folder is a GitHub repository
- Every development task must be done on a **new branch** created from `master`
- Open a **Pull Request to `master`** for every branch — include the pre-change log and post-change review in the PR description
- Do not merge without passing tests

---

## Running Locally

```bash
# Prerequisites: Docker Desktop running, JDK 21
cd api
./mvnw spring-boot:run        # macOS / Linux
mvnw.cmd spring-boot:run      # Windows

# Spring Boot auto-starts PostgreSQL via compose.yaml
# API available at http://localhost:8080
```

If the build fails and you have to make changes, ALWAYS prompt the user for guidance.
If docker does not work, NEVER use any other software to simulate Postgres.
