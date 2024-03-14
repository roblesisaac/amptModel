export const errorCodes = {
    ARRAY_ERROR: '1001',
    OBJECT_ERROR: '1002',
    CUSTOM_COMPUTE_ERROR: '1003',
    ENUM_ERROR: '1004',
    MAX_ERROR: '1005',
    MIN_ERROR: '1006',
    MAX_LENGTH_ERROR: '1007',
    MIN_LENGTH_ERROR: '1008',
    REQUIRED_ERROR: '1009',
    TYPE_ERROR: '1010',
    CUSTOM_VALIDATION_ERROR: '1011',
  };
  
  export const errorMessages = {
    '1001': {
      en: 'Validation Error: Field must be an array',
      es: 'Error de validación: El campo debe ser un array',
    },
    '1002': {
      en: 'Validation Error: Field must be an object',
      es: 'Error de validación: El campo debe ser un objeto',
    },
    '1003': {
      en: 'Validation Error: Validation failed for custom compute function.',
      es: 'Error de validación: Falló la validación para la función personalizada de cálculo.',
    },
    '1004': {
      en: 'Validation Error: Field must be one of the specified values',
      es: 'Error de validación: El campo debe ser uno de los valores especificados',
    },
    '1005': {
      en: 'Validation Error: Field exceeds the maximum allowed value',
      es: 'Error de validación: El campo supera el valor máximo permitido',
    },
    '1006': {
      en: 'Validation Error: Field falls below the minimum allowed value',
      es: 'Error de validación: El campo está por debajo del valor mínimo permitido',
    },
    '1007': {
      en: 'Validation Error: Field exceeds the maximum allowed length',
      es: 'Error de validación: El campo supera la longitud máxima permitida',
    },
    '1008': {
      en: 'Validation Error: Field falls below the minimum allowed length',
      es: 'Error de validación: El campo está por debajo de la longitud mínima permitida',
    },
    '1009': {
      en: 'Validation Error: Field is required',
      es: 'Error de validación: El campo es obligatorio',
    },
    '1010': {
      en: 'Validation Error: Field has an invalid type',
      es: 'Error de validación: El campo tiene un tipo no válido',
    },
    '1011': {
      en: 'Validation Error: Custom validation failed',
      es: 'Error de validación: Falló la validación personalizada',
    },
  };
  
  export const getErrorMessage = (code, context = null, lang = 'en') => {
    const errorMessage = errorMessages[code]?.[lang] || errorMessages[code]?.en || 'Unknown error';
  
    if (context !== null) {
      return `${errorMessage} : '${context}'`;
    }
  
    return errorMessage;
  };