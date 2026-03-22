# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build

# Copia o wrapper e o pom primeiro para cache das dependências
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copia o código e compila
COPY src ./src
RUN ./mvnw package -DskipTests -q

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S formflow && adduser -S formflow -G formflow

COPY --from=builder /build/target/*.jar app.jar

USER formflow

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
