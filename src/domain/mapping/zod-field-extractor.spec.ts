import { test, expect } from 'vitest';
import { extractFieldsFromZod } from './zod-field-extractor';
import { z } from 'zod';

test('extractFieldsFromZod extracts basic object', () => {
    const schema = z.object({
        name: z.string(),
        age: z.number().optional()
    });
    const fields = extractFieldsFromZod(schema);
    expect(fields).toEqual([
        { path: 'name', label: 'name', type: 'string' },
        { path: 'age', label: 'age', type: 'number' }
    ]);
});

test('extractFieldsFromZod extracts nested object', () => {
    const schema = z.object({
        user: z.object({
            profile: z.object({
                email: z.string()
            })
        })
    });
    const fields = extractFieldsFromZod(schema);
    expect(fields).toEqual([
        { path: 'user.profile.email', label: 'user.profile.email', type: 'string' }
    ]);
});

test('extractFieldsFromZod extracts array element', () => {
    const schema = z.object({
        contacts: z.array(z.object({
            name: z.string(),
            phone: z.string()
        })).optional()
    });
    const fields = extractFieldsFromZod(schema);
    expect(fields).toEqual([
        { path: 'contacts', label: 'contacts', type: 'array' },
        { path: 'contacts[].name', label: 'contacts[].name', type: 'string' },
        { path: 'contacts[].phone', label: 'contacts[].phone', type: 'string' }
    ]);
});
