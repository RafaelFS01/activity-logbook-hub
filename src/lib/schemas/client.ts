
import { z } from 'zod';

// Base client schema
const BaseClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }).optional(),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().min(8, { message: 'Telefone deve ter pelo menos 8 caracteres' }),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional(),
});

// Individual client schema (pessoa física)
export const IndividualClientSchema = BaseClientSchema.extend({
  type: z.literal('individual'),
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
  cpf: z.string().optional(),
  rg: z.string().optional(),
});

// Company client schema (pessoa jurídica)
export const CompanyClientSchema = BaseClientSchema.extend({
  type: z.literal('company'),
  companyName: z.string().min(2, { message: 'Nome da empresa deve ter pelo menos 2 caracteres' }),
  cnpj: z.string().min(14, { message: 'CNPJ deve ter pelo menos 14 caracteres' }),
  responsibleName: z.string().optional(),
});

// Combined client schema (union of both types)
export const ClientSchema = z.discriminatedUnion('type', [
  IndividualClientSchema,
  CompanyClientSchema,
]);

// Types derived from the schemas
export type BaseClient = z.infer<typeof BaseClientSchema>;
export type IndividualClient = z.infer<typeof IndividualClientSchema>;
export type CompanyClient = z.infer<typeof CompanyClientSchema>;
export type Client = z.infer<typeof ClientSchema>;
