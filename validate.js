import { errorCodes, getErrorMessage } from './errorCodes';

export default async (schema, dataToValidate, config) => {
  if (!dataToValidate) {
    return async (toValidate, config) => await validate(schema, toValidate, config);
  }

  return await validate(schema, dataToValidate, config);
};

async function validate(schema, dataToValidate, config={}) {
  const validated = {};
  const uniqueFieldsToCheck = [];
  const refs = [];
  const skipped = []; 

  if (typeof schema === 'function') {
    return { validated: await schema(dataToValidate || '') };
  }

  if (typeof dataToValidate !== 'object') {
    return {
      validated: await validateItem(schema, dataToValidate, undefined, config)
    };
  }

  for (const field in schema) {
    const rules = schema[field];

    if (isANestedArray(rules)) {
      validated[field] = [];

      if(!dataToValidate[field] && rules.default) {
        dataToValidate[field] = rules.default;
      }

      if (!Array.isArray(dataToValidate[field]) && rules.strict) {
        throw new Error(getErrorMessage(errorCodes.ARRAY_ERROR, `Field: ${field}`));
      }

      if(!dataToValidate[field]) {
        dataToValidate[field] = [];
      }

      const arrayRule = rules.type ? rules.type[0] || rules.type : rules[0];

      for (const item of dataToValidate[field]) {
        const validationResult = await validate(arrayRule || '*', item, { parentField: field, ...config });
        validated[field].push(validationResult.validated);
      }

      continue;
    }

    if (isANestedObject(schema[field])) {
      if (!isPlainObject(dataToValidate[field])) {
        throw new Error(getErrorMessage(errorCodes.OBJECT_ERROR, `Field: ${field}`));
      }

      const validationResult = await validate(rules, dataToValidate[field], { parentField: field, ...config });
      validated[field] = validationResult.validated;
      continue;
    }

    const validationResult = await validateItem(rules, dataToValidate, field, config);

    if(validationResult?._shouldSkip) {
      skipped.push(field);
      continue;
    }

    validated[field] = validationResult;

    if(rules.unique) {
      uniqueFieldsToCheck.push(field);
    }

    if(rules.ref) {
      refs.push(field);
    }

  }  

  return { uniqueFieldsToCheck, validated, refs, skipped };
}

async function validateItem(rules, dataToValidate, field, config) {
  const _shouldSkip = rules.hasOwnProperty('get') && !config.action && !rules.computed;

  if(_shouldSkip) {
    return { _shouldSkip };
  }

  field = field || config?.parentField || dataToValidate;

  let dataValue = getDataValue(dataToValidate, field);
  const globalValidationProps = Object.keys(config?.globalConfig || {});
  const localtValidationProps = Object.keys(rules);
  const validationProps = [...globalValidationProps, ...localtValidationProps];

  for(const ruleName of validationProps) {
    if(ruleName === 'computed' && config.action === 'get') {
      continue;
    }

    const ruleFunction = getRuleFunction(ruleName, rules, dataToValidate, field, dataValue, config);

    if(ruleFunction) {
      dataValue = await ruleFunction();
      setValue(dataToValidate, field, dataValue);
    }
  }

  if(typeof rules === 'function') {
    if(isAJavascriptType(rules)) {
      try {
        return rules(dataValue || '');
      } catch (e) {
        throw new Error(getErrorMessage(errorCodes.TYPE_ERROR, `Field: ${field} - ${e.message}`));
      }
    }
    
    return await executeCustomMethod(rules, dataToValidate, field, dataValue)
  }

  return dataValue;
}

async function executeCustomMethod(method, item, field, value) {
  try {
    return await method(value, { value, item, ...item });
  } catch (e) {
    const message = typeof e.message === 'string'
      ? e.message
      : JSON.stringify(e.message);

    throw new Error(getErrorMessage(errorCodes.CUSTOM_COMPUTE_ERROR, `Field: ${field} - ${message}`));
  }
}

function getDataValue(dataToValidate, field) {
  return typeof dataToValidate === 'object' && dataToValidate !== null 
  ? dataToValidate[field] 
  : dataToValidate;
}

function getRuleFunction(ruleName, rules, dataToValidate, field, dataValue, config) {
  const computed = async () => {
    return await executeCustomMethod(rules.computed, dataToValidate, field, dataValue);
  }

  const enumerator = () => {
    if (!rules.enum.includes(dataValue)) {
      throw new Error(getErrorMessage(errorCodes.ENUM_ERROR, `Field: ${field} - Value: ${dataValue} - Enum: ${rules.enum.join(', ')}`));
    }

    return dataValue;
  }

  const lowercase = () => {
    if(typeof dataValue === 'string') {
      return dataValue.toLowerCase();
    }

    return dataValue;
  }

  const max = () => {
    if (dataValue > rules.max) {
      throw new Error(getErrorMessage(errorCodes.MAX_ERROR, `Field: ${field} - Value: ${dataValue} - Max: ${rules.max}`));
    }

    return dataValue;
  }

  const min = () => {
    if (dataValue < rules.min) {
      throw new Error(getErrorMessage(errorCodes.MIN_ERROR, `Field: ${field} - Value: ${dataValue} - Min: ${rules.min}`));
    }

    return dataValue;
  }

  const maxLength = () => {
    if (dataValue.length > rules.maxLength) {
      throw new Error(getErrorMessage(errorCodes.MAX_LENGTH_ERROR, `Field: ${field} - Value: ${dataValue} - Max Length: ${rules.maxLength}`));
    }

    return dataValue;
  }

  const minLength = () => {
    if (dataValue.length < rules.minLength) {
      throw new Error(getErrorMessage(errorCodes.MIN_LENGTH_ERROR, `Field: ${field} - Value: ${dataValue} - Min Length: ${rules.minLength}`));
    }

    return dataValue;
  }

  const proper = () => {
    if (typeof dataValue !== 'string' || dataValue.length === 0) {
      return dataValue;
    }
  
    return dataValue.charAt(0).toUpperCase() + dataValue.slice(1);
  }

  const required = () => {
    if (dataValue === undefined || dataValue === null) {
      throw new Error(getErrorMessage(errorCodes.REQUIRED_ERROR, `Field: ${field}`));
    }

    return dataValue;
  }

  const setDefaultValue = () => {
    if(dataValue === undefined || dataValue === null) {
      return rules.default;
    }

    return dataValue;
  }

  const specialAction = async (action) => {
    if(config?.action !== action) {
      return dataValue;
    }

    return await executeCustomMethod(rules[action], dataToValidate, field, dataValue);
  }

  const trim = () => {
    if(typeof dataValue === 'string') {
      return dataValue.trim();
    }

    return dataValue;
  }  

  const type = () => {
    if (!isAValidDataType(rules, dataValue)) {
      if(rules.strict) {
        throw new Error(getErrorMessage(errorCodes.TYPE_ERROR, `Field: ${field} - Value: ${dataValue} - Type: ${getTypeName(rules)}`));
      }

      if(typeof rules.type === 'function') {
        return rules.type(dataValue || '');
      }
    }

    return dataValue
  }

  const uppercase = () => {
    if (typeof dataValue === 'string') {
      return dataValue.toUpperCase();
    }

    return dataValue
  }

  const validate = async () => {
    if (!await rules.validate(dataValue)) {
      throw new Error(getErrorMessage(errorCodes.CUSTOM_VALIDATION_ERROR, `Field: ${field} - Value: ${dataValue}`));
    }

    return dataValue;
  }

  return {
    // formatters
    default: setDefaultValue,
    enum: enumerator,
    lowercase,
    proper,
    trim,
    uppercase,
    // validators
    max,
    maxLength,
    min,
    minLength,
    required,
    type,
    validate,
    // computed
    computed,
    get: async () => await specialAction('get'),
    set: async () => await specialAction('set'),
  
  }[ruleName];
}

function getTypeName(rules) {
  const type = rules?.type;
  return typeof type === 'function' ? type.name.toLowerCase() : type;
}

function isAJavascriptType(rules) {
  return [String, Number, Object, Function, Boolean, Date, RegExp, Map, Set, Promise, WeakMap, WeakSet].includes(rules);
}

function isANestedArray(rules) {
  return Array.isArray(rules) || rules.type === Array || rules === Array || Array.isArray(rules.type);
}

function isANestedObject(itemValue) {
  const nativePropertiesToExclude = ['type', 'get', 'set', 'computed', 'ref', 'unique'];
  return typeof itemValue === 'object' && nativePropertiesToExclude.every(prop => !itemValue.hasOwnProperty(prop));
}

function isAValidDataType(rules, dataValue) {
  const rulesTypeName = getTypeName(rules);
  const dataTypeName = typeof dataValue;
  const hasASpecifiedType = rules?.type;
  const typeIsWild = rulesTypeName === '*';
  
  return !hasASpecifiedType || typeIsWild || dataTypeName === rulesTypeName;
}

function isPlainObject(item) {
  return !Array.isArray(item) && item !== null && typeof item === 'object';
}

function setValue(dataToValidate, field, value) {
    if (typeof dataToValidate === 'object' && dataToValidate !== null) {
      dataToValidate[field] = value;
    }
  
    return value;
}