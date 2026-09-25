import { z } from 'zod';

export interface ExtractedField {
  path: string;
  label: string;
  type: string;
}

export function extractFieldsFromZod(
  schema: z.ZodTypeAny,
  prefix = '',
  depth = 0
): ExtractedField[] {
  if (depth > 5) return []; // Prevent infinite recursion

  let fields: ExtractedField[] = [];

  // Unwrap optional/nullable
  let innerSchema = schema;
  while (
    innerSchema instanceof z.ZodOptional ||
    innerSchema instanceof z.ZodNullable ||
    innerSchema instanceof z.ZodDefault
  ) {
    if (innerSchema instanceof z.ZodOptional) innerSchema = innerSchema.unwrap() as z.ZodTypeAny;
    else if (innerSchema instanceof z.ZodNullable) innerSchema = innerSchema.unwrap() as z.ZodTypeAny;
    else if (innerSchema instanceof z.ZodDefault) innerSchema = innerSchema._def.innerType as z.ZodTypeAny;
  }

  if (innerSchema instanceof z.ZodObject) {
    const shape = innerSchema.shape;
    for (const key in shape) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const propSchema = shape[key];

      let propInner = propSchema;
      while (
        propInner instanceof z.ZodOptional ||
        propInner instanceof z.ZodNullable ||
        propInner instanceof z.ZodDefault
      ) {
            if (propInner instanceof z.ZodOptional) propInner = propInner.unwrap() as z.ZodTypeAny;
            else if (propInner instanceof z.ZodNullable) propInner = propInner.unwrap() as z.ZodTypeAny;
            else if (propInner instanceof z.ZodDefault) propInner = propInner._def.innerType as z.ZodTypeAny;
      }

      if (propInner instanceof z.ZodObject) {
        fields = fields.concat(extractFieldsFromZod(propInner as z.ZodTypeAny, fullPath, depth + 1));
      } else if (propInner instanceof z.ZodArray) {
        // Add the array itself
        fields.push({ path: fullPath, label: fullPath, type: 'array' });
        // Use [] instead of [0] to signify it's an array to be joined or processed as list
        const elementSchema = propInner.element;
        fields = fields.concat(extractFieldsFromZod(elementSchema as z.ZodTypeAny, `${fullPath}[]`, depth + 1));
      } else {
        fields.push({ path: fullPath, label: fullPath, type: propInner.constructor.name.replace('Zod', '').toLowerCase() });
      }
    }
  } else if (innerSchema instanceof z.ZodArray) {
       fields.push({ path: prefix, label: prefix, type: 'array' });
       fields = fields.concat(extractFieldsFromZod(innerSchema.element as z.ZodTypeAny, `${prefix}[]`, depth + 1));
  } else {
       if (prefix) {
            fields.push({ path: prefix, label: prefix, type: innerSchema.constructor.name.replace('Zod', '').toLowerCase() });
       }
  }

  return fields;
}
