import { OpenAPIV3 } from "openapi-types";

const errorSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
  required: ["error"],
};

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Argust API",
    version: "0.1.0",
    description: "REST API — Clean Architecture · Next.js",
  },
  servers: [{ url: "/api", description: "Local dev" }],
  components: {
    schemas: {
      Error: errorSchema,
      VerifyClaimInput: {
        type: "object",
        properties: {
          claim: { type: "string", example: "Vietnam won the 2026 World Cup." },
        },
        required: ["claim"],
      },
      VerifyResult: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["TRUE", "FALSE", "UNVERIFIED", "EVIDENCE_NOT_FOUND"],
                example: "FALSE",
              },
              explanation: { type: "string", example: "No evidence found supporting this claim." },
              source_quote: { type: "string", example: "According to VnExpress..." },
              sources: {
                type: "array",
                items: { type: "string", format: "uri" },
                example: ["https://vnexpress.net/article-1"],
              },
            },
            required: ["status", "explanation", "source_quote", "sources"],
          },
        },
        required: ["success", "data"],
      },
    },
  },
  paths: {
    "/v1/verify": {
      post: {
        summary: "Verify a claim against live news sources",
        operationId: "verifyClaim",
        tags: ["Fact-Check"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyClaimInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Verification result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyResult" },
              },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "500": {
            description: "AI provider or server error",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
  },
};
