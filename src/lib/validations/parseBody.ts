import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Parses a request body as JSON and validates it against a Zod schema.
 * Returns a discriminated union: either typed data or a 400 response.
 *
 * Usage:
 *   const result = await parseBody(req, mySchema);
 *   if (!result.success) return result.response;
 *   const { field1, field2 } = result.data;
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<ParseResult<T>> {
  try {
    const raw = await req.json();
    const data = schema.parse(raw);
    return { success: true, data };
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Validation failed", details: e.flatten().fieldErrors },
          { status: 400 }
        ),
      };
    }
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      ),
    };
  }
}
