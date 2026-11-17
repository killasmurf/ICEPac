import type { ConfigItem, ConfigItemInput } from '../../api/admin';

export interface ConfigFormValues {
  code: string;
  description: string;
  weight: string;
  is_active: boolean;
}

export type ConfigFormErrors = Partial<Record<'code' | 'description' | 'weight', string>>;

export const emptyConfigForm = (): ConfigFormValues => ({ code: '', description: '', weight: '', is_active: true });

export const configFormFromItem = (item: ConfigItem): ConfigFormValues => ({
  code: item.code,
  description: item.description,
  weight: item.weight === undefined ? '' : String(item.weight),
  is_active: item.is_active,
});

/** Mirrors the backend schemas: code 1-50 chars, description 1-255 chars, weight 0-100 on weighted tables. */
export function validateConfigForm(values: ConfigFormValues, weighted: boolean): ConfigFormErrors {
  const errors: ConfigFormErrors = {};
  const code = values.code.trim();
  const description = values.description.trim();
  if (!code) errors.code = 'Code is required';
  else if (code.length > 50) errors.code = 'Code must be 50 characters or fewer';
  if (!description) errors.description = 'Description is required';
  else if (description.length > 255) errors.description = 'Description must be 255 characters or fewer';
  if (weighted) {
    const w = values.weight.trim();
    if (w === '' || Number.isNaN(Number(w))) errors.weight = 'Weight is required';
    else if (Number(w) < 0 || Number(w) > 100) errors.weight = 'Weight must be between 0 and 100';
  }
  return errors;
}

/** Request body for create/update. Weight is only sent for weighted tables. */
export function configFormToInput(values: ConfigFormValues, weighted: boolean): ConfigItemInput {
  const body: ConfigItemInput = {
    code: values.code.trim(),
    description: values.description.trim(),
    is_active: values.is_active,
  };
  if (weighted) body.weight = Number(values.weight);
  return body;
}
