import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express, Request, Response } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Secure Internal Chat API",
      version: "1.0.0",
      description:
        "Backend API cho hệ thống chat nội bộ bảo mật: RBAC, Argon2id, Audit Log, Socket.io",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Auth", description: "Xác thực người dùng" },
      { name: "Rooms", description: "Quản lý phòng chat" },
      { name: "Admin", description: "Quản trị hệ thống" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Cấu hình Swagger UI middleware cho Express app
 */
export function setupSwagger(app: Express): void {
  // Serve Swagger API docs as JSON
  app.get("/api-docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Secure Chat API Docs",
    })
  );

  console.log("Swagger UI available at http://localhost:3000/api-docs");
}